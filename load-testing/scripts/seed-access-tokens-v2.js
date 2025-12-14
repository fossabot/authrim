#!/usr/bin/env node

/**
 * Access Token シード生成スクリプト v2
 *
 * Token Exchange ベンチマーク用の多様なアクセストークンを事前生成する。
 *
 * 特徴:
 *   - 20種類のターゲットaudience
 *   - 4種類のscopeパターン
 *   - 20%のトークンにactor_token用のサービストークンを付与
 *   - 10種類のresource URI
 *
 * トークン種別（混合比率）:
 *   - Valid (with actor):  14% - 委譲フロー用
 *   - Valid (standard):    56% - 標準フロー
 *   - Expired:             10% - 期限切れ
 *   - Invalid:             10% - 不正JWT
 *   - Revoked:             10% - 失効済み
 *
 * 環境変数:
 *   BASE_URL             対象の Authrim Worker URL (default: https://conformance.authrim.com)
 *   CLIENT_ID            クライアント ID (required)
 *   CLIENT_SECRET        クライアントシークレット (required)
 *   ADMIN_API_SECRET     Admin API シークレット (required)
 *   TOKEN_COUNT          生成するトークン総数 (default: 1000)
 *   CONCURRENCY          並列数 (default: 20)
 *   OUTPUT_DIR           出力ディレクトリ (default: ../seeds)
 *
 * 使い方:
 *   CLIENT_ID=xxx CLIENT_SECRET=yyy ADMIN_API_SECRET=zzz node scripts/seed-access-tokens-v2.js
 */

import { SignJWT, importPKCS8 } from 'jose';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const BASE_URL = process.env.BASE_URL || 'https://conformance.authrim.com';
const CLIENT_ID = process.env.CLIENT_ID || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET || '';
const TOKEN_COUNT = Number.parseInt(process.env.TOKEN_COUNT || '1000', 10);
const CONCURRENCY = Number.parseInt(process.env.CONCURRENCY || '20', 10);
const REVOKE_CONCURRENCY = Number.parseInt(process.env.REVOKE_CONCURRENCY || '5', 10);
const REVOKE_DELAY_MS = Number.parseInt(process.env.REVOKE_DELAY_MS || '200', 10);
const USER_ID_PREFIX = process.env.USER_ID_PREFIX || 'user-bench';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(SCRIPT_DIR, '..', 'seeds');
const TEST_USERS_PATH = process.env.TEST_USERS_PATH || path.join(SCRIPT_DIR, '..', 'seeds', 'test_users.json');

// トークン種別の比率
const TOKEN_MIX = {
  valid_with_actor: 0.14,  // 委譲フロー用
  valid_standard: 0.56,    // 標準フロー
  expired: 0.1,
  invalid: 0.1,
  revoked: 0.1,
};

// ターゲットaudience (20種類)
const TARGET_AUDIENCES = [
  'https://api.example.com/gateway',
  'https://api.example.com/users',
  'https://api.example.com/payments',
  'https://api.example.com/orders',
  'https://api.example.com/inventory',
  'https://api.example.com/shipping',
  'https://api.example.com/notifications',
  'https://api.example.com/analytics',
  'https://api.example.com/reports',
  'https://api.example.com/billing',
  'https://api.example.com/support',
  'https://api.example.com/cms',
  'https://api.example.com/search',
  'https://api.example.com/recommendations',
  'https://api.example.com/reviews',
  'https://api.example.com/loyalty',
  'https://api.example.com/promotions',
  'https://api.example.com/subscriptions',
  'https://api.example.com/messaging',
  'https://api.example.com/files',
];

// Scopeパターン (4種類) - 標準OIDCスコープの組み合わせ
const SCOPE_PATTERNS = [
  'openid profile email address phone',  // フル（全スコープ）
  'openid profile email',                // 標準
  'openid profile',                      // 軽量
  'openid',                              // 最小・認証のみ
];

// リソースURI (10種類)
const RESOURCE_URIS = [
  'https://resource.example.com/api/v1',
  'https://resource.example.com/api/v2',
  'https://data.example.com/graphql',
  'https://storage.example.com/files',
  'https://events.example.com/stream',
  'https://batch.example.com/jobs',
  'https://realtime.example.com/ws',
  'https://cdn.example.com/assets',
  'https://auth.example.com/token',
  'https://metrics.example.com/ingest',
];

// サービスクライアント (actor_token用)
const SERVICE_CLIENTS = [
  { id: 'service-gateway', name: 'API Gateway Service' },
  { id: 'service-bff', name: 'Backend for Frontend' },
  { id: 'service-worker', name: 'Background Worker' },
  { id: 'service-scheduler', name: 'Task Scheduler' },
  { id: 'service-notifier', name: 'Notification Service' },
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ CLIENT_ID と CLIENT_SECRET は必須です。環境変数を設定してください。');
  process.exit(1);
}

if (!ADMIN_API_SECRET) {
  console.error('❌ ADMIN_API_SECRET は必須です。環境変数を設定してください。');
  process.exit(1);
}

const adminAuthHeader = { Authorization: `Bearer ${ADMIN_API_SECRET}` };

/**
 * Generate secure random string (base64url)
 */
function generateSecureRandomString(length = 32) {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate JTI (JWT ID)
 */
function generateJti() {
  return `at_${generateSecureRandomString(32)}`;
}

/**
 * Pick random item from array
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Fetch signing key with private key from Admin API
 */
async function fetchSigningKey() {
  console.log('🔑 Fetching signing key from Admin API...');

  const res = await fetch(`${BASE_URL}/api/admin/test/signing-key`, {
    method: 'GET',
    headers: adminAuthHeader,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch signing key: ${res.status} - ${error}`);
  }

  const data = await res.json();
  console.log(`   kid: ${data.kid}`);
  return data;
}

/**
 * Create a signed Access Token JWT locally
 */
async function createAccessToken(privateKey, kid, options) {
  const { userId, scope, expiresIn, issuer, audience } = options;
  const now = Math.floor(Date.now() / 1000);
  const jti = generateJti();
  const exp = now + expiresIn;

  const token = await new SignJWT({
    iss: issuer,
    sub: userId,
    aud: audience || issuer,
    client_id: CLIENT_ID,
    scope,
    iat: now,
    exp,
    jti,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt', kid })
    .sign(privateKey);

  return { token, jti, exp, scope, audience: audience || issuer };
}

/**
 * Create a service token (for actor_token)
 */
async function createServiceToken(privateKey, kid, options) {
  const { serviceClient, scope, expiresIn, issuer } = options;
  const now = Math.floor(Date.now() / 1000);
  const jti = generateJti();
  const exp = now + expiresIn;

  const token = await new SignJWT({
    iss: issuer,
    sub: `client:${serviceClient.id}`,
    aud: issuer,
    client_id: serviceClient.id,
    scope: scope || 'openid',
    iat: now,
    exp,
    jti,
    // Service token indicator
    azp: serviceClient.id,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'at+jwt', kid })
    .sign(privateKey);

  return { token, jti, exp, serviceClient };
}

/**
 * Create an invalid token (random string that looks like JWT)
 */
function createInvalidToken() {
  const header = generateSecureRandomString(20);
  const payload = generateSecureRandomString(100);
  const signature = generateSecureRandomString(43);
  return `${header}.${payload}.${signature}`;
}

/**
 * Revoke a token via /revoke endpoint
 */
async function revokeAccessToken(token) {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const res = await fetch(`${BASE_URL}/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: `token=${encodeURIComponent(token)}&token_type_hint=access_token`,
  });

  if (!res.ok) {
    throw new Error(`Failed to revoke token: ${res.status}`);
  }
}

/**
 * Determine token type based on distribution
 */
function determineTokenType(index, totalCount) {
  const validActorCount = Math.floor(totalCount * TOKEN_MIX.valid_with_actor);
  const validStandardCount = Math.floor(totalCount * TOKEN_MIX.valid_standard);
  const expiredCount = Math.floor(totalCount * TOKEN_MIX.expired);
  const invalidCount = Math.floor(totalCount * TOKEN_MIX.invalid);

  if (index < validActorCount) return 'valid_with_actor';
  if (index < validActorCount + validStandardCount) return 'valid_standard';
  if (index < validActorCount + validStandardCount + expiredCount) return 'expired';
  if (index < validActorCount + validStandardCount + expiredCount + invalidCount) return 'invalid';
  return 'revoked';
}

/**
 * Load test users from file
 */
function loadTestUsers() {
  try {
    const data = fs.readFileSync(TEST_USERS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.warn(`⚠️  Could not load test_users.json: ${e.message}`);
    console.warn('   Falling back to generated user IDs');
    return null;
  }
}

const testUsers = loadTestUsers();

/**
 * Get user ID for a given index
 */
function getUserId(index) {
  if (testUsers && testUsers.length > 0) {
    const user = testUsers[index % testUsers.length];
    return user.userId;
  }
  return `${USER_ID_PREFIX}-${index}`;
}

/**
 * Generate a single token based on type
 */
async function generateSingleToken(privateKey, kid, issuer, index, tokenType) {
  const userId = getUserId(index);
  const scope = randomPick(SCOPE_PATTERNS);
  const targetAudience = randomPick(TARGET_AUDIENCES);
  const resource = randomPick(RESOURCE_URIS);

  if (tokenType === 'invalid') {
    return {
      access_token: createInvalidToken(),
      type: 'invalid',
      user_id: userId,
      jti: null,
      exp: null,
      scope: null,
      target_audience: targetAudience,
      resource,
      actor_token: null,
    };
  }

  const expiresIn =
    tokenType === 'expired'
      ? -3600 // 1 hour ago (expired)
      : 30 * 24 * 3600; // 30 days

  const { token, jti, exp, audience } = await createAccessToken(privateKey, kid, {
    userId,
    scope,
    expiresIn,
    issuer,
    audience: issuer, // Subject token always has issuer as audience
  });

  // Generate actor_token for delegation flow
  let actorToken = null;
  if (tokenType === 'valid_with_actor') {
    const serviceClient = randomPick(SERVICE_CLIENTS);
    const actorResult = await createServiceToken(privateKey, kid, {
      serviceClient,
      scope: 'openid',
      expiresIn: 30 * 24 * 3600,
      issuer,
    });
    actorToken = {
      token: actorResult.token,
      jti: actorResult.jti,
      service_client: actorResult.serviceClient,
    };
  }

  return {
    access_token: token,
    type: tokenType === 'valid_with_actor' ? 'valid' : tokenType,
    has_actor: tokenType === 'valid_with_actor',
    user_id: userId,
    jti,
    exp,
    scope,
    target_audience: targetAudience,
    resource,
    actor_token: actorToken,
  };
}

/**
 * Generate a batch of tokens in parallel
 */
async function generateBatch(privateKey, kid, issuer, batchSize, startIndex, totalCount) {
  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    const tokenIndex = startIndex + i;
    const tokenType = determineTokenType(tokenIndex, totalCount);

    promises.push(
      generateSingleToken(privateKey, kid, issuer, tokenIndex, tokenType).catch((err) => ({
        error: err.message,
        type: tokenType,
      }))
    );
  }
  return Promise.all(promises);
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Revoke tokens that should be revoked
 */
async function revokeTokensBatch(tokens) {
  const revokedTokens = tokens.filter((t) => t.type === 'revoked' && t.access_token);
  if (revokedTokens.length === 0) return 0;

  console.log(`\n🔐 Revoking ${revokedTokens.length} tokens (concurrency: ${REVOKE_CONCURRENCY}, delay: ${REVOKE_DELAY_MS}ms)...`);

  let revokedCount = 0;
  const totalBatches = Math.ceil(revokedTokens.length / REVOKE_CONCURRENCY);

  for (let batch = 0; batch < totalBatches; batch++) {
    const start = batch * REVOKE_CONCURRENCY;
    const end = Math.min(start + REVOKE_CONCURRENCY, revokedTokens.length);
    const batchTokens = revokedTokens.slice(start, end);

    const promises = batchTokens.map((t) =>
      revokeAccessToken(t.access_token)
        .then(() => {
          revokedCount++;
          return true;
        })
        .catch((err) => {
          console.error(`   ❌ Failed to revoke token: ${err.message}`);
          return false;
        })
    );

    await Promise.all(promises);

    if ((batch + 1) % 10 === 0 || batch === totalBatches - 1) {
      console.log(`   [${revokedCount}/${revokedTokens.length}] revoked`);
    }

    if (batch < totalBatches - 1) {
      await sleep(REVOKE_DELAY_MS);
    }
  }

  return revokedCount;
}

async function main() {
  console.log(`🚀 Access Token Seed Generator v2 (Multi-Variation)`);
  console.log(`   BASE_URL       : ${BASE_URL}`);
  console.log(`   CLIENT_ID      : ${CLIENT_ID}`);
  if (testUsers) {
    console.log(`   TEST_USERS     : ${testUsers.length} users from test_users.json`);
  } else {
    console.log(`   USER_ID_PREFIX : ${USER_ID_PREFIX}`);
  }
  console.log(`   TOKEN_COUNT    : ${TOKEN_COUNT}`);
  console.log(`   CONCURRENCY    : ${CONCURRENCY}`);
  console.log(`   OUTPUT_DIR     : ${OUTPUT_DIR}`);
  console.log('');
  console.log(`📊 Token Distribution:`);
  console.log(`   Valid (actor): ${Math.floor(TOKEN_COUNT * TOKEN_MIX.valid_with_actor)} (${TOKEN_MIX.valid_with_actor * 100}%)`);
  console.log(`   Valid (std):   ${Math.floor(TOKEN_COUNT * TOKEN_MIX.valid_standard)} (${TOKEN_MIX.valid_standard * 100}%)`);
  console.log(`   Expired:       ${Math.floor(TOKEN_COUNT * TOKEN_MIX.expired)} (${TOKEN_MIX.expired * 100}%)`);
  console.log(`   Invalid:       ${Math.floor(TOKEN_COUNT * TOKEN_MIX.invalid)} (${TOKEN_MIX.invalid * 100}%)`);
  console.log(`   Revoked:       ${TOKEN_COUNT - Math.floor(TOKEN_COUNT * (1 - TOKEN_MIX.revoked))} (${TOKEN_MIX.revoked * 100}%)`);
  console.log('');
  console.log(`🎯 Variations:`);
  console.log(`   Audiences:     ${TARGET_AUDIENCES.length} types`);
  console.log(`   Scopes:        ${SCOPE_PATTERNS.length} patterns`);
  console.log(`   Resources:     ${RESOURCE_URIS.length} URIs`);
  console.log(`   Services:      ${SERVICE_CLIENTS.length} clients (for actor_token)`);
  console.log('');

  // Step 1: Fetch signing key
  const signingKey = await fetchSigningKey();
  const privateKey = await importPKCS8(signingKey.privatePEM, 'RS256');

  console.log('');
  console.log('📦 Generating access tokens...');

  const tokens = [];
  let errorCount = 0;
  const startTime = Date.now();
  const issuer = BASE_URL.replace(/^http:/, 'https:');

  // Generate in batches
  const totalBatches = Math.ceil(TOKEN_COUNT / CONCURRENCY);
  let currentIndex = 0;

  for (let batch = 0; batch < totalBatches; batch++) {
    const remaining = TOKEN_COUNT - currentIndex;
    const batchSize = Math.min(CONCURRENCY, remaining);

    const results = await generateBatch(
      privateKey,
      signingKey.kid,
      issuer,
      batchSize,
      currentIndex,
      TOKEN_COUNT
    );
    currentIndex += batchSize;

    for (const result of results) {
      if (result.error) {
        errorCount++;
        console.error(`   ❌ ${result.error}`);
      } else {
        tokens.push(result);
      }
    }

    const progress = tokens.length;
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = progress / elapsed;

    if ((batch + 1) % 5 === 0 || batch === totalBatches - 1) {
      console.log(
        `   [${progress}/${TOKEN_COUNT}] ${rate.toFixed(1)}/s, errors: ${errorCount}, elapsed: ${elapsed.toFixed(1)}s`
      );
    }
  }

  // Step 2: Revoke tokens marked as 'revoked'
  const revokedCount = await revokeTokensBatch(tokens);

  const totalTime = (Date.now() - startTime) / 1000;

  if (tokens.length === 0) {
    throw new Error('No tokens generated. Aborting.');
  }

  // Count by type
  const typeCounts = {
    valid: tokens.filter((t) => t.type === 'valid' || t.type === 'valid_standard').length,
    valid_with_actor: tokens.filter((t) => t.has_actor).length,
    expired: tokens.filter((t) => t.type === 'expired').length,
    invalid: tokens.filter((t) => t.type === 'invalid').length,
    revoked: tokens.filter((t) => t.type === 'revoked').length,
  };

  // Count variations
  const audienceCounts = {};
  const scopeCounts = {};
  const resourceCounts = {};
  for (const t of tokens) {
    if (t.target_audience) {
      audienceCounts[t.target_audience] = (audienceCounts[t.target_audience] || 0) + 1;
    }
    if (t.scope) {
      scopeCounts[t.scope] = (scopeCounts[t.scope] || 0) + 1;
    }
    if (t.resource) {
      resourceCounts[t.resource] = (resourceCounts[t.resource] || 0) + 1;
    }
  }

  // Build output
  const output = {
    tokens,
    metadata: {
      version: 2,
      generated_at: new Date().toISOString(),
      base_url: BASE_URL,
      client_id: CLIENT_ID,
      counts: typeCounts,
      total: tokens.length,
      variations: {
        audiences: Object.keys(audienceCounts).length,
        scopes: Object.keys(scopeCounts).length,
        resources: Object.keys(resourceCounts).length,
      },
      audience_list: TARGET_AUDIENCES,
      scope_patterns: SCOPE_PATTERNS,
      resource_list: RESOURCE_URIS,
      service_clients: SERVICE_CLIENTS,
    },
  };

  // Save to file
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, 'access_tokens_v2.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log('');
  console.log(`✅ Generated ${tokens.length} access tokens in ${totalTime.toFixed(2)}s`);
  console.log(`   Valid (total): ${typeCounts.valid} (with actor: ${typeCounts.valid_with_actor})`);
  console.log(`   Expired:       ${typeCounts.expired}`);
  console.log(`   Invalid:       ${typeCounts.invalid}`);
  console.log(`   Revoked:       ${typeCounts.revoked} (${revokedCount} actually revoked via API)`);
  console.log(`   Rate:          ${(tokens.length / totalTime).toFixed(1)} tokens/sec`);
  console.log(`   Errors:        ${errorCount}`);
  console.log('');
  console.log(`📊 Variation Coverage:`);
  console.log(`   Audiences:     ${Object.keys(audienceCounts).length}/${TARGET_AUDIENCES.length}`);
  console.log(`   Scopes:        ${Object.keys(scopeCounts).length}/${SCOPE_PATTERNS.length}`);
  console.log(`   Resources:     ${Object.keys(resourceCounts).length}/${RESOURCE_URIS.length}`);
  console.log('');
  console.log(`📁 Saved to: ${outputPath}`);
  console.log('🎉 done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
