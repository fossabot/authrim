/**
 * Passkey フルログイン ベンチマークテスト - VM版
 *
 * 目的:
 * - Authrim の Passkey ログインフローを再現し、負荷ポイントを測定
 * - Passkey認証 → セッション発行 → 認可コード発行 → トークン発行の全フロー
 * - 事前シードされた既存ユーザーを使用
 * - **US リージョンの VM から実行して k6 Cloud と同条件で比較**
 *
 * 必要環境:
 * - カスタムk6バイナリ (./bin/k6-passkeys)
 *   ビルド方法: ./scripts/build-k6-passkeys.sh
 *
 * 事前準備（シード）:
 *   ./bin/k6-passkeys run \
 *     --env MODE=seed \
 *     --env BASE_URL=https://conformance.authrim.com \
 *     --env ADMIN_API_SECRET=xxx \
 *     --env PASSKEY_USER_COUNT=500 \
 *     scripts/test-passkey-full-login-benchmark-vm.js
 *
 * ベンチマーク実行:
 *   ./bin/k6-passkeys run \
 *     --env MODE=benchmark \
 *     --env BASE_URL=https://conformance.authrim.com \
 *     --env CLIENT_ID=xxx \
 *     --env CLIENT_SECRET=xxx \
 *     --env PRESET=rps50 \
 *     scripts/test-passkey-full-login-benchmark-vm.js
 *
 * テストフロー（5ステップ）:
 * 1. GET /authorize - 認可リクエスト開始
 * 2. POST /api/auth/passkey/login/options - チャレンジ取得
 * 3. createAssertionResponse() - 署名生成（CPU処理）
 * 4. POST /api/auth/passkey/login/verify - 署名検証 + セッション発行
 * 5. GET /authorize (Cookie付き) - 認可コード発行
 * 6. POST /token - トークン発行
 */

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';
import { randomBytes, sha256 } from 'k6/crypto';
import exec from 'k6/execution';
import passkeys from 'k6/x/passkeys';

// 実行モード
const MODE = __ENV.MODE || 'benchmark'; // 'seed' or 'benchmark'

// テスト識別情報
const TEST_NAME = 'Passkey Full Login Benchmark [VM]';
const TEST_ID = 'passkey-full-login-benchmark-vm';

// カスタムメトリクス
const authorizeInitLatency = new Trend('authorize_init_latency');
const passkeyOptionsLatency = new Trend('passkey_options_latency');
const passkeyVerifyLatency = new Trend('passkey_verify_latency');
const authorizeCodeLatency = new Trend('authorize_code_latency');
const tokenLatency = new Trend('token_latency');
const fullFlowLatency = new Trend('full_flow_latency');

// 成功率
const passkeySuccess = new Rate('passkey_success');
const authorizeSuccess = new Rate('authorize_success');
const tokenSuccess = new Rate('token_success');
const flowSuccess = new Rate('flow_success');

// エラーカウント
const signatureErrors = new Counter('signature_errors');
const challengeErrors = new Counter('challenge_errors');
const sessionErrors = new Counter('session_errors');
const codeErrors = new Counter('code_errors');
const rateLimitErrors = new Counter('rate_limit_errors');
const serverErrors = new Counter('server_errors');

// 環境変数
const BASE_URL = __ENV.BASE_URL || 'https://conformance.authrim.com';
const CLIENT_ID = __ENV.CLIENT_ID || '';
const CLIENT_SECRET = __ENV.CLIENT_SECRET || '';
const REDIRECT_URI = __ENV.REDIRECT_URI || 'https://localhost:3000/callback';
const ADMIN_API_SECRET = __ENV.ADMIN_API_SECRET || '';
const PRESET = __ENV.PRESET || 'rps50';
const USER_ID_PREFIX = __ENV.USER_ID_PREFIX || 'pk-vm';

// シード設定
const PASSKEY_USER_COUNT = Number.parseInt(__ENV.PASSKEY_USER_COUNT || '500', 10);
const SEED_CONCURRENCY = Number.parseInt(__ENV.SEED_CONCURRENCY || '5', 10);
const CREDENTIAL_FILE = __ENV.CREDENTIAL_FILE || './seeds/passkey_credentials_vm.json';

// RP ID
function extractHostname(url) {
  const match = url.match(/^https?:\/\/([^/:]+)/);
  return match ? match[1] : url;
}
const RP_ID = extractHostname(BASE_URL);
const ORIGIN = BASE_URL.replace(/^http:/, 'https:');

/**
 * プリセット設計 - Mail OTP と同等の構成
 */
const PRESETS = {
  // スモークテスト
  rps10: {
    description: '10 RPS - Smoke test (30s)',
    stages: [
      { target: 5, duration: '10s' },
      { target: 10, duration: '30s' },
      { target: 0, duration: '10s' },
    ],
    thresholds: {
      full_flow_latency: ['p(95)<5000'],
      flow_success: ['rate>0.90'],
    },
    preAllocatedVUs: 50,
    maxVUs: 80,
    userCount: 100,
  },

  // ベンチマーク: 50 RPS
  rps50: {
    description: '50 RPS - Standard (2 min)',
    stages: [
      { target: 25, duration: '15s' },
      { target: 50, duration: '120s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      full_flow_latency: ['p(95)<5000'],
      flow_success: ['rate>0.95'],
    },
    preAllocatedVUs: 200,
    maxVUs: 400,
    userCount: 500,
  },

  // ベンチマーク: 100 RPS
  rps100: {
    description: '100 RPS - High throughput (2 min)',
    stages: [
      { target: 50, duration: '15s' },
      { target: 100, duration: '120s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      full_flow_latency: ['p(95)<5000'],
      flow_success: ['rate>0.95'],
    },
    preAllocatedVUs: 400,
    maxVUs: 600,
    userCount: 1000,
  },

  // ベンチマーク: 125 RPS (Mail OTP比較用)
  rps125: {
    description: '125 RPS - Mail OTP comparison (2 min)',
    stages: [
      { target: 62, duration: '15s' },
      { target: 125, duration: '120s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      full_flow_latency: ['p(95)<5000'],
      flow_success: ['rate>0.95'],
    },
    preAllocatedVUs: 500,
    maxVUs: 800,
    userCount: 1250,
  },

  // ベンチマーク: 150 RPS
  rps150: {
    description: '150 RPS - Stress test (2 min)',
    stages: [
      { target: 75, duration: '15s' },
      { target: 150, duration: '120s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      full_flow_latency: ['p(95)<5000'],
      flow_success: ['rate>0.90'],
    },
    preAllocatedVUs: 600,
    maxVUs: 1000,
    userCount: 1500,
  },

  // ベンチマーク: 200 RPS
  rps200: {
    description: '200 RPS - High stress (3 min)',
    stages: [
      { target: 100, duration: '15s' },
      { target: 200, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      full_flow_latency: ['p(95)<6000'],
      flow_success: ['rate>0.90'],
    },
    preAllocatedVUs: 800,
    maxVUs: 1200,
    userCount: 2000,
  },
};

// プリセット検証
const selectedPreset = PRESETS[PRESET];
if (!selectedPreset && MODE === 'benchmark') {
  throw new Error(`Unknown preset: ${PRESET}. Available: ${Object.keys(PRESETS).join(', ')}`);
}

// K6オプション（モード別）
export const options =
  MODE === 'seed'
    ? {
        // シードモード: 順次登録
        scenarios: {
          seed: {
            executor: 'shared-iterations',
            vus: SEED_CONCURRENCY,
            iterations: PASSKEY_USER_COUNT,
            maxDuration: '30m',
          },
        },
        setupTimeout: '60s',
        teardownTimeout: '120s',
      }
    : {
        // ベンチマークモード
        scenarios: {
          warmup: {
            executor: 'constant-arrival-rate',
            rate: 5,
            timeUnit: '1s',
            duration: '20s',
            preAllocatedVUs: 20,
            maxVUs: 30,
            startTime: '0s',
            gracefulStop: '5s',
          },
          passkey_full_login: {
            executor: 'ramping-arrival-rate',
            startRate: 0,
            timeUnit: '1s',
            preAllocatedVUs: selectedPreset?.preAllocatedVUs || 200,
            maxVUs: selectedPreset?.maxVUs || 400,
            stages: selectedPreset?.stages || [],
            startTime: '25s',
          },
        },
        thresholds: selectedPreset?.thresholds || {},
        summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)'],
        setupTimeout: '300s',
      };

// ============================================================================
// ユーティリティ関数
// ============================================================================

function generateCodeVerifier() {
  const buffer = randomBytes(32);
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = encoding.b64encode(binary, 'std');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateCodeChallenge(verifier) {
  return sha256(verifier, 'base64rawurl');
}

function generateRandomHex(numBytes) {
  const buffer = randomBytes(numBytes);
  const arr = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < arr.length; i++) {
    hex += arr[i].toString(16).padStart(2, '0');
  }
  return hex;
}

// ============================================================================
// シードモード用関数
// ============================================================================

// シード結果を保持（teardownで保存）
const seedResults = [];

function createUser(index, timestamp) {
  const email = `${USER_ID_PREFIX}-${timestamp}-${index}@test.authrim.internal`;

  const res = http.post(
    `${BASE_URL}/api/admin/users`,
    JSON.stringify({
      email,
      name: `Passkey VM User ${index}`,
      email_verified: true,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_API_SECRET}`,
      },
      tags: { name: 'SeedCreateUser' },
    }
  );

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Failed to create user: ${res.status} - ${res.body}`);
  }

  const data = JSON.parse(res.body);
  return { userId: data.user.id, email };
}

function registerPasskey(userId, email, credential, rp) {
  // 登録オプション取得
  const optionsRes = http.post(
    `${BASE_URL}/api/auth/passkey/register/options`,
    JSON.stringify({ email, userId }),
    {
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      tags: { name: 'SeedRegisterOptions' },
    }
  );

  if (optionsRes.status !== 200) {
    throw new Error(`Register options failed: ${optionsRes.status} - ${optionsRes.body}`);
  }

  const optionsData = JSON.parse(optionsRes.body);
  const attestation = passkeys.createAttestationResponse(rp, credential, JSON.stringify(optionsData.options));

  // 登録完了
  const verifyRes = http.post(
    `${BASE_URL}/api/auth/passkey/register/verify`,
    JSON.stringify({
      userId,
      credential: JSON.parse(attestation),
      deviceName: `VM Device ${exec.vu.idInTest}`,
    }),
    {
      headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
      tags: { name: 'SeedRegisterVerify' },
    }
  );

  if (verifyRes.status !== 200) {
    throw new Error(`Register verify failed: ${verifyRes.status} - ${verifyRes.body}`);
  }
}

// ============================================================================
// セットアップ
// ============================================================================

let credentialData = null;

export function setup() {
  console.log(``);
  console.log(`🚀 ${TEST_NAME}`);
  console.log(`📋 Mode: ${MODE}`);
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log(`🌐 RP ID: ${RP_ID}`);
  console.log(``);

  if (MODE === 'seed') {
    // シードモード
    if (!ADMIN_API_SECRET) {
      throw new Error('ADMIN_API_SECRET is required for seeding');
    }
    console.log(`📝 Seeding ${PASSKEY_USER_COUNT} passkey users...`);
    console.log(`   Concurrency: ${SEED_CONCURRENCY}`);
    console.log(`   Output: ${CREDENTIAL_FILE}`);
    console.log(``);

    return {
      mode: 'seed',
      timestamp: Date.now(),
      rpJson: passkeys.exportRelyingParty(passkeys.newRelyingParty('Authrim', RP_ID, ORIGIN)),
    };
  } else {
    // ベンチマークモード
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('CLIENT_ID and CLIENT_SECRET are required');
    }

    console.log(`📋 Preset: ${PRESET} - ${selectedPreset.description}`);
    console.log(`🔑 Client: ${CLIENT_ID}`);
    console.log(``);

    // クレデンシャルファイル読み込み
    let users = [];
    try {
      const content = open(CREDENTIAL_FILE);
      const data = JSON.parse(content);
      users = data.users || [];
      console.log(`📂 Loaded ${users.length} credentials from ${CREDENTIAL_FILE}`);
    } catch (e) {
      throw new Error(`Failed to load credentials from ${CREDENTIAL_FILE}: ${e.message}`);
    }

    if (users.length === 0) {
      throw new Error('No users in credential file. Run with MODE=seed first.');
    }

    // ユーザー数をプリセットに合わせて制限
    const userCount = Math.min(users.length, selectedPreset.userCount);
    const selectedUsers = users.slice(0, userCount);
    console.log(`📦 Using ${selectedUsers.length} users for benchmark`);
    console.log(``);

    // ウォームアップ
    console.log(`🔥 Warming up...`);
    for (let i = 0; i < Math.min(5, selectedUsers.length); i++) {
      const user = selectedUsers[i];
      http.get(`${BASE_URL}/authorize?response_type=code&client_id=${CLIENT_ID}&scope=openid`, {
        redirects: 0,
        tags: { name: 'Warmup' },
      });
      http.post(`${BASE_URL}/api/auth/passkey/login/options`, JSON.stringify({ email: user.email }), {
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
        tags: { name: 'Warmup' },
      });
    }
    console.log(`   Warmup complete`);
    console.log(``);

    return {
      mode: 'benchmark',
      users: selectedUsers,
      userCount: selectedUsers.length,
      preset: PRESET,
      baseUrl: BASE_URL,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
    };
  }
}

// ============================================================================
// メインテスト関数
// ============================================================================

export default function (data) {
  if (data.mode === 'seed') {
    // シードモード: ユーザー登録
    const index = exec.vu.idInTest;
    const rp = passkeys.importRelyingParty(data.rpJson);

    try {
      const { userId, email } = createUser(index, data.timestamp);
      const credential = passkeys.newCredential();

      registerPasskey(userId, email, credential, rp);

      // 結果を保存用配列に追加
      seedResults.push({
        userId,
        email,
        credentialJson: passkeys.exportCredential(credential),
        rpJson: data.rpJson,
      });

      if (index % 50 === 0 || index === PASSKEY_USER_COUNT) {
        console.log(`   [${seedResults.length}/${PASSKEY_USER_COUNT}] registered`);
      }
    } catch (e) {
      console.error(`❌ User ${index}: ${e.message}`);
    }
    return;
  }

  // ベンチマークモード
  const { users, userCount, clientId, redirectUri, baseUrl } = data;

  const userIndex = (__VU - 1) % userCount;
  const user = users[userIndex];

  // クレデンシャル復元
  const credential = passkeys.importCredential(user.credentialJson);
  const rp = passkeys.importRelyingParty(user.rpJson);

  const flowStartTime = Date.now();
  let success = true;
  let sessionCookie = null;
  let authCode = null;

  // PKCE パラメータ
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateRandomHex(16);
  const nonce = generateRandomHex(16);

  // Step 1: GET /authorize (初期化)
  const authorizeInitUrl =
    `${baseUrl}/authorize?` +
    `response_type=code&` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=openid&` +
    `state=${state}&` +
    `nonce=${nonce}&` +
    `code_challenge=${codeChallenge}&` +
    `code_challenge_method=S256`;

  const step1Response = http.get(authorizeInitUrl, {
    headers: { Accept: 'text/html', Connection: 'keep-alive' },
    redirects: 0,
    tags: { name: 'AuthorizeInit' },
  });
  authorizeInitLatency.add(step1Response.timings.duration);

  if (step1Response.status !== 200 && step1Response.status !== 302) {
    success = false;
    if (step1Response.status >= 500) serverErrors.add(1);
    if (step1Response.status === 429) rateLimitErrors.add(1);
  }

  // Step 2: POST /api/auth/passkey/login/options
  let challengeId = null;

  if (success) {
    const step2Response = http.post(
      `${baseUrl}/api/auth/passkey/login/options`,
      JSON.stringify({ email: user.email }),
      {
        headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Connection: 'keep-alive' },
        tags: { name: 'PasskeyOptions' },
      }
    );
    passkeyOptionsLatency.add(step2Response.timings.duration);

    if (step2Response.status !== 200) {
      success = false;
      challengeErrors.add(1);
      if (step2Response.status >= 500) serverErrors.add(1);
      if (step2Response.status === 429) rateLimitErrors.add(1);
    } else {
      try {
        const optionsData = JSON.parse(step2Response.body);
        challengeId = optionsData.challengeId;

        // Step 3: 署名生成
        let assertion;
        try {
          assertion = passkeys.createAssertionResponse(
            rp,
            credential,
            user.userId,
            JSON.stringify(optionsData.options)
          );
        } catch (e) {
          success = false;
          signatureErrors.add(1);
          if (exec.vu.iterationInInstance < 3) {
            console.error(`❌ Assertion failed (VU ${__VU}): ${e.message}`);
          }
        }

        // Step 4: POST /api/auth/passkey/login/verify
        if (success && assertion) {
          const step4Response = http.post(
            `${baseUrl}/api/auth/passkey/login/verify`,
            JSON.stringify({ challengeId, credential: JSON.parse(assertion) }),
            {
              headers: { 'Content-Type': 'application/json', Origin: ORIGIN, Connection: 'keep-alive' },
              tags: { name: 'PasskeyVerify' },
            }
          );
          passkeyVerifyLatency.add(step4Response.timings.duration);

          const step4Success = check(step4Response, {
            'passkey verify status 200': (r) => r.status === 200,
          });
          passkeySuccess.add(step4Success);

          if (!step4Success) {
            success = false;
            sessionErrors.add(1);
            if (step4Response.status >= 500) serverErrors.add(1);
            if (step4Response.status === 429) rateLimitErrors.add(1);
          } else {
            try {
              const verifyData = JSON.parse(step4Response.body);
              sessionCookie = `authrim_session=${verifyData.sessionId}`;
            } catch (e) {
              success = false;
            }
          }
        }
      } catch (e) {
        success = false;
      }
    }
  }

  // Step 5: GET /authorize (認可コード発行)
  if (success && sessionCookie) {
    const step5Response = http.get(authorizeInitUrl, {
      headers: { Cookie: sessionCookie, Accept: 'text/html', Connection: 'keep-alive' },
      redirects: 0,
      tags: { name: 'AuthorizeCode' },
    });
    authorizeCodeLatency.add(step5Response.timings.duration);

    const location = step5Response.headers.Location || step5Response.headers.location || '';
    const hasCode = location.includes('code=');

    const step5Success = check(step5Response, {
      'authorize status 302': (r) => r.status === 302,
      'has authorization code': () => hasCode,
    });
    authorizeSuccess.add(step5Success);

    if (!step5Success) {
      success = false;
      codeErrors.add(1);
      if (step5Response.status >= 500) serverErrors.add(1);
      if (step5Response.status === 429) rateLimitErrors.add(1);
    } else {
      const codeMatch = location.match(/code=([^&]+)/);
      if (codeMatch) {
        authCode = decodeURIComponent(codeMatch[1]);
      } else {
        success = false;
        codeErrors.add(1);
      }
    }
  }

  // Step 6: POST /token
  if (success && authCode) {
    const tokenPayload =
      `grant_type=authorization_code&` +
      `code=${encodeURIComponent(authCode)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `code_verifier=${codeVerifier}`;

    const basicAuth = encoding.b64encode(`${clientId}:${CLIENT_SECRET}`, 'std');

    const step6Response = http.post(`${baseUrl}/token`, tokenPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
        Connection: 'keep-alive',
      },
      tags: { name: 'Token' },
    });
    tokenLatency.add(step6Response.timings.duration);

    const step6Success = check(step6Response, {
      'token status 200': (r) => r.status === 200,
      'has access_token': (r) => {
        try {
          return JSON.parse(r.body).access_token !== undefined;
        } catch {
          return false;
        }
      },
    });
    tokenSuccess.add(step6Success);

    if (!step6Success) {
      success = false;
      if (step6Response.status >= 500) serverErrors.add(1);
      if (step6Response.status === 429) rateLimitErrors.add(1);
    }
  }

  // フロー完了
  const flowDuration = Date.now() - flowStartTime;
  fullFlowLatency.add(flowDuration);
  flowSuccess.add(success);
}

// ============================================================================
// ティアダウン
// ============================================================================

export function teardown(data) {
  if (data.mode === 'seed') {
    // シード結果をファイルに保存
    console.log(``);
    console.log(`💾 Saving ${seedResults.length} credentials to ${CREDENTIAL_FILE}...`);

    const output = {
      metadata: {
        generated_at: new Date().toISOString(),
        base_url: BASE_URL,
        rp_id: RP_ID,
        total: seedResults.length,
      },
      users: seedResults,
    };

    // Note: k6ではファイル書き込みができないため、標準出力に出力
    // VMでは出力をリダイレクトしてファイルに保存する
    console.log('--- CREDENTIAL_DATA_START ---');
    console.log(JSON.stringify(output));
    console.log('--- CREDENTIAL_DATA_END ---');
    console.log(``);
    console.log(`✅ Seed complete. Save the JSON output above to ${CREDENTIAL_FILE}`);
    console.log(`   Or run: ./bin/k6-passkeys run ... 2>&1 | ./scripts/extract-credentials.sh`);
  } else {
    console.log(``);
    console.log(`✅ ${TEST_NAME} テスト完了`);
    console.log(`📊 プリセット: ${data.preset}`);
    console.log(`🎯 ターゲット: ${data.baseUrl}`);
    console.log(`📈 ユーザー数: ${data.userCount}`);
  }
}

// ============================================================================
// サマリーハンドラー
// ============================================================================

export function handleSummary(data) {
  if (MODE === 'seed') {
    return {}; // シードモードではサマリー不要
  }

  const preset = PRESET;
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');
  const resultsDir = __ENV.RESULTS_DIR || './results';

  return {
    [`${resultsDir}/${TEST_ID}-${preset}_${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`${resultsDir}/${TEST_ID}-${preset}_${timestamp}.log`]: textSummary(data, { indent: ' ', enableColors: false }),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const metrics = data.metrics;

  let summary = '\n';
  summary += `${indent}📊 ${TEST_NAME} - サマリー\n`;
  summary += `${indent}${'='.repeat(70)}\n\n`;

  summary += `${indent}🎯 プリセット: ${PRESET}\n`;
  summary += `${indent}📝 説明: ${selectedPreset.description}\n`;
  summary += `${indent}🖥️  実行環境: VM\n\n`;

  const totalIterations = metrics.iterations?.values?.count || 0;
  const flowSuccessRate = ((metrics.flow_success?.values?.rate || 0) * 100).toFixed(2);

  summary += `${indent}📈 フロー統計:\n`;
  summary += `${indent}  総イテレーション数: ${totalIterations}\n`;
  summary += `${indent}  フロー成功率: ${flowSuccessRate}%\n\n`;

  summary += `${indent}⏱️  ステップ別レイテンシ:\n`;
  summary += `${indent}  1. Authorize Init:\n`;
  summary += `${indent}     p50: ${metrics.authorize_init_latency?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}     p95: ${metrics.authorize_init_latency?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  2. Passkey Options:\n`;
  summary += `${indent}     p50: ${metrics.passkey_options_latency?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}     p95: ${metrics.passkey_options_latency?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  3. Passkey Verify:\n`;
  summary += `${indent}     p50: ${metrics.passkey_verify_latency?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}     p95: ${metrics.passkey_verify_latency?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  4. Authorize Code:\n`;
  summary += `${indent}     p50: ${metrics.authorize_code_latency?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}     p95: ${metrics.authorize_code_latency?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  5. Token:\n`;
  summary += `${indent}     p50: ${metrics.token_latency?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}     p95: ${metrics.token_latency?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  Full Flow:\n`;
  summary += `${indent}     p50: ${metrics.full_flow_latency?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}     p95: ${metrics.full_flow_latency?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}     p99: ${metrics.full_flow_latency?.values?.['p(99)']?.toFixed(2) || 0}ms\n\n`;

  const passkeyRate = ((metrics.passkey_success?.values?.rate || 0) * 100).toFixed(2);
  const authorizeRate = ((metrics.authorize_success?.values?.rate || 0) * 100).toFixed(2);
  const tokenRate = ((metrics.token_success?.values?.rate || 0) * 100).toFixed(2);

  summary += `${indent}✅ ステップ別成功率:\n`;
  summary += `${indent}  Passkey認証: ${passkeyRate}%\n`;
  summary += `${indent}  認可コード: ${authorizeRate}%\n`;
  summary += `${indent}  トークン発行: ${tokenRate}%\n\n`;

  summary += `${indent}❌ エラー統計:\n`;
  summary += `${indent}  署名エラー: ${metrics.signature_errors?.values?.count || 0}\n`;
  summary += `${indent}  チャレンジエラー: ${metrics.challenge_errors?.values?.count || 0}\n`;
  summary += `${indent}  セッションエラー: ${metrics.session_errors?.values?.count || 0}\n`;
  summary += `${indent}  認可コードエラー: ${metrics.code_errors?.values?.count || 0}\n`;
  summary += `${indent}  レート制限 (429): ${metrics.rate_limit_errors?.values?.count || 0}\n`;
  summary += `${indent}  サーバーエラー (5xx): ${metrics.server_errors?.values?.count || 0}\n\n`;

  const rps = metrics.iterations?.values?.rate || 0;
  summary += `${indent}🚀 スループット: ${rps.toFixed(2)} flows/s\n`;
  summary += `${indent}${'='.repeat(70)}\n`;

  return summary;
}
