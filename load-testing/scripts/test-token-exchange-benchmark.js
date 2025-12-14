/**
 * Token Exchange (RFC 8693) ベンチマークテスト
 *
 * 目的:
 * - マイクロサービス環境における「サービス間認証」を大量に発生させた場合の性能測定
 * - SSO後のAudience切り替え、Service Tokenの発行能力評価
 * - TOKEN_REVOCATION_STORE DOのボトルネック検証
 * - Revokedトークンの確実な拒否検証
 *
 * テスト仕様 (Section 4.7):
 * - ターゲット: POST /token
 * - Grant Type: urn:ietf:params:oauth:grant-type:token-exchange
 * - subject_token: 事前に生成されたaccess_token
 * - トークン割合: Valid 70%, Expired 10%, Invalid 10%, Revoked 10%
 *
 * 成功判定基準:
 * - 成功率: > 99%
 * - p95 レイテンシ: < 400ms
 * - p99 レイテンシ: < 700ms
 * - 不正tokenの誤受理: 0%
 * - Revokedトークンの誤受理: 0%
 * - 生成tokenの署名エラー率: 0%
 *
 * 使い方:
 * k6 run --env PRESET=rps100 scripts/test-token-exchange-benchmark.js
 * k6 run --env PRESET=rps300 scripts/test-token-exchange-benchmark.js
 */

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';
import exec from 'k6/execution';

// テスト識別情報
const TEST_NAME = 'Token Exchange (RFC 8693) Benchmark';
const TEST_ID = 'token-exchange-benchmark';

// カスタムメトリクス
const tokenExchangeDuration = new Trend('token_exchange_duration');
const tokenExchangeSuccess = new Rate('token_exchange_success');
const invalidTokenAccepted = new Counter('invalid_token_accepted'); // 不正tokenの誤受理
const revokedTokenAccepted = new Counter('revoked_token_accepted'); // revokedの誤受理
const signatureErrors = new Counter('signature_errors'); // 生成tokenの署名エラー
const clientAuthErrors = new Counter('client_auth_errors');
const invalidGrantErrors = new Counter('invalid_grant_errors');
const rateLimitErrors = new Counter('rate_limit_errors');
const serverErrors = new Counter('server_errors');
const featureDisabledErrors = new Counter('feature_disabled_errors');

// トークン種別ごとのメトリクス
const validTokenRequests = new Counter('valid_token_requests');
const validTokenSuccess = new Counter('valid_token_success');
const expiredTokenRequests = new Counter('expired_token_requests');
const expiredTokenSuccess = new Counter('expired_token_success'); // 正しく拒否された = success
const invalidTokenRequests = new Counter('invalid_token_requests');
const invalidTokenSuccess = new Counter('invalid_token_success'); // 正しく拒否された = success
const revokedTokenRequests = new Counter('revoked_token_requests');
const revokedTokenSuccess = new Counter('revoked_token_success'); // 正しく拒否された = success

// 環境変数
const BASE_URL = __ENV.BASE_URL || 'https://conformance.authrim.com';
const CLIENT_ID = __ENV.CLIENT_ID || 'test_client';
const CLIENT_SECRET = __ENV.CLIENT_SECRET || 'test_secret';
const PRESET = __ENV.PRESET || 'rps100';
const TOKEN_PATH = __ENV.TOKEN_PATH || '../seeds/access_tokens.json';
// K6 Cloud用: R2からシードをフェッチするURL
const TOKEN_URL = __ENV.TOKEN_URL || '';
// Token Exchange用のリクエストパラメータ
const TARGET_AUDIENCE = __ENV.TARGET_AUDIENCE || '';
const TARGET_SCOPE = __ENV.TARGET_SCOPE || 'openid profile';
// JWKS URLで署名検証（Optional）
const JWKS_URL = __ENV.JWKS_URL || `${BASE_URL}/.well-known/jwks.json`;

// Token Exchange grant type
const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';
const ACCESS_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';

// トークン種別の比率（仕様書準拠）
// Revokedは別タイプとして明示的に管理（テスト結果で識別可能）
const TOKEN_MIX = {
  valid: 0.7, // 70%
  expired: 0.1, // 10%
  invalid: 0.1, // 10%
  revoked: 0.1, // 10% - POST /revoke で無効化済み
};

/**
 * プリセット設定
 *
 * 仕様書準拠:
 * - Duration: 180秒（3分）
 * - 成功率: > 99%
 * - p95: < 400ms
 * - p99: < 700ms
 */
const PRESETS = {
  // 軽量テスト（開発・確認用）
  rps50: {
    description: '50 RPS - Quick smoke test (30s)',
    stages: [
      { target: 25, duration: '10s' },
      { target: 50, duration: '30s' },
      { target: 0, duration: '10s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<500', 'p(99)<800'],
      http_req_failed: ['rate<0.02'],
      token_exchange_success: ['rate>0.98'],
      invalid_token_accepted: ['count<1'],
      revoked_token_accepted: ['count<1'],
      signature_errors: ['count<1'],
    },
    preAllocatedVUs: 80,
    maxVUs: 100,
  },

  // ベンチマーク: 100 RPS (3分)
  rps100: {
    description: '100 RPS - Token Exchange baseline (3 min)',
    stages: [
      { target: 50, duration: '15s' },
      { target: 100, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<400', 'p(99)<700'],
      http_req_failed: ['rate<0.01'],
      token_exchange_success: ['rate>0.99'],
      invalid_token_accepted: ['count<1'],
      revoked_token_accepted: ['count<1'],
      signature_errors: ['count<1'],
    },
    preAllocatedVUs: 150,
    maxVUs: 200,
  },

  // ベンチマーク: 200 RPS (3分)
  rps200: {
    description: '200 RPS - Token Exchange moderate load (3 min)',
    stages: [
      { target: 100, duration: '15s' },
      { target: 200, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<400', 'p(99)<700'],
      http_req_failed: ['rate<0.01'],
      token_exchange_success: ['rate>0.99'],
      invalid_token_accepted: ['count<1'],
      revoked_token_accepted: ['count<1'],
      signature_errors: ['count<1'],
    },
    preAllocatedVUs: 300,
    maxVUs: 400,
  },

  // ベンチマーク: 300 RPS (3分) - SSO高負荷シナリオ
  rps300: {
    description: '300 RPS - Token Exchange SSO high load (3 min)',
    stages: [
      { target: 150, duration: '15s' },
      { target: 300, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<400', 'p(99)<700'],
      http_req_failed: ['rate<0.01'],
      token_exchange_success: ['rate>0.99'],
      invalid_token_accepted: ['count<1'],
      revoked_token_accepted: ['count<1'],
      signature_errors: ['count<1'],
    },
    preAllocatedVUs: 450,
    maxVUs: 600,
  },

  // ベンチマーク: 500 RPS (3分) - ストレステスト
  rps500: {
    description: '500 RPS - Token Exchange stress test (3 min)',
    stages: [
      { target: 250, duration: '15s' },
      { target: 500, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<400', 'p(99)<700'],
      http_req_failed: ['rate<0.01'],
      token_exchange_success: ['rate>0.99'],
      invalid_token_accepted: ['count<1'],
      revoked_token_accepted: ['count<1'],
      signature_errors: ['count<1'],
    },
    preAllocatedVUs: 700,
    maxVUs: 900,
  },
};

// プリセット検証
const selectedPreset = PRESETS[PRESET];
if (!selectedPreset) {
  throw new Error(`Unknown preset: ${PRESET}. Available: ${Object.keys(PRESETS).join(', ')}`);
}

// K6オプション
export const options = {
  scenarios: {
    token_exchange_benchmark: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: selectedPreset.preAllocatedVUs,
      maxVUs: selectedPreset.maxVUs,
      stages: selectedPreset.stages,
    },
  },
  thresholds: selectedPreset.thresholds,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)'],
};

// Basic認証ヘッダー生成
function getBasicAuthHeader() {
  const credentials = `${CLIENT_ID}:${CLIENT_SECRET}`;
  return `Basic ${encoding.b64encode(credentials)}`;
}

// ローカルモード: SharedArrayでトークンを読み込み
let allTokens = null;
let useRemoteData = false;

if (!TOKEN_URL) {
  try {
    allTokens = new SharedArray('all_tokens', function () {
      const raw = open(TOKEN_PATH);
      const data = JSON.parse(raw);
      return data.tokens;
    });

    // トークン分布の確認
    const validCount = allTokens.filter((t) => t.type === 'valid').length;
    const expiredCount = allTokens.filter((t) => t.type === 'expired').length;
    const invalidCount = allTokens.filter((t) => t.type === 'invalid').length;
    const revokedCount = allTokens.filter((t) => t.type === 'revoked').length;

    console.log(`📂 Loaded ${allTokens.length} tokens from local file:`);
    console.log(
      `   Valid:   ${validCount} (${((validCount / allTokens.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `   Expired: ${expiredCount} (${((expiredCount / allTokens.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `   Invalid: ${invalidCount} (${((invalidCount / allTokens.length) * 100).toFixed(1)}%)`
    );
    console.log(
      `   Revoked: ${revokedCount} (${((revokedCount / allTokens.length) * 100).toFixed(1)}%)`
    );
  } catch (e) {
    console.warn(`⚠️  Failed to load local tokens: ${e.message}`);
    console.warn('   Make sure to run: node scripts/seed-access-tokens.js first');
  }
} else {
  useRemoteData = true;
  console.log('☁️  K6 Cloud mode: Will fetch tokens from URL');
}

/**
 * 重み付けでトークンタイプを選択
 * Valid: 70%, Expired: 10%, Invalid: 10%, Revoked: 10%
 */
function selectTokenType() {
  const rand = Math.random() * 100;
  if (rand < 70) return 'valid';
  if (rand < 80) return 'expired';
  if (rand < 90) return 'invalid';
  return 'revoked';
}

/**
 * タイプ別にトークンを取得
 */
function selectTokenByType(tokens, type, vuId) {
  const filtered = tokens.filter((t) => t.type === type);
  if (filtered.length === 0) {
    // フォールバック: validトークンから選択
    const validTokens = tokens.filter((t) => t.type === 'valid');
    if (validTokens.length === 0) {
      return tokens[vuId % tokens.length];
    }
    return validTokens[vuId % validTokens.length];
  }
  return filtered[vuId % filtered.length];
}

/**
 * 簡易JWT検証（署名はサーバー側で検証されるため、構造チェックのみ）
 */
function validateJWTStructure(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    // ヘッダーとペイロードがBase64デコード可能か確認
    const header = JSON.parse(encoding.b64decode(parts[0], 'rawurl', 's'));
    const payload = JSON.parse(encoding.b64decode(parts[1], 'rawurl', 's'));

    // 必須フィールドの存在確認
    if (!header.alg || !header.typ) return false;
    if (!payload.iss || !payload.sub || !payload.exp) return false;

    return true;
  } catch (_) {
    return false;
  }
}

// セットアップ（テスト開始前に1回だけ実行）
export function setup() {
  console.log(``);
  console.log(`🚀 ${TEST_NAME}`);
  console.log(`📋 Preset: ${PRESET} - ${selectedPreset.description}`);
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log(`🔐 Client: ${CLIENT_ID}`);
  if (TARGET_AUDIENCE) {
    console.log(`🎯 Target Audience: ${TARGET_AUDIENCE}`);
  }
  console.log(`📝 Target Scope: ${TARGET_SCOPE}`);
  console.log(``);
  console.log(`📊 Token Mix (仕様書準拠):`);
  console.log(`   Valid:   70%`);
  console.log(`   Expired: 10%`);
  console.log(`   Invalid: 10%`);
  console.log(`   Revoked: 10%`);
  console.log(``);

  let tokens = [];

  // K6 Cloud: リモートからトークンを取得
  if (TOKEN_URL) {
    console.log(`☁️  Fetching tokens from: ${TOKEN_URL}`);
    const response = http.get(TOKEN_URL, { timeout: '120s' });
    if (response.status !== 200) {
      throw new Error(`Failed to fetch tokens: ${response.status}`);
    }
    const data = JSON.parse(response.body);
    tokens = data.tokens;
    console.log(`   Loaded ${tokens.length} tokens from remote`);
  } else if (allTokens) {
    tokens = allTokens;
  }

  if (tokens.length === 0) {
    throw new Error(
      'No tokens available. Run: node scripts/seed-access-tokens.js to generate tokens'
    );
  }

  // トークン分布の確認
  const counts = {
    valid: tokens.filter((t) => t.type === 'valid').length,
    expired: tokens.filter((t) => t.type === 'expired').length,
    invalid: tokens.filter((t) => t.type === 'invalid').length,
    revoked: tokens.filter((t) => t.type === 'revoked').length,
  };

  // ウォームアップ: Token Exchangeエンドポイントの初期化
  console.log(`🔥 Warming up Token Exchange endpoint...`);
  const validToken = tokens.find((t) => t.type === 'valid');
  if (validToken) {
    for (let i = 0; i < 5; i++) {
      const payload = buildTokenExchangePayload(validToken.access_token);
      const response = http.post(`${BASE_URL}/token`, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: getBasicAuthHeader(),
        },
        tags: { name: 'Warmup' },
      });

      // Feature flag disabled check
      if (response.status === 400) {
        const body = JSON.parse(response.body);
        if (
          body.error === 'unsupported_grant_type' &&
          body.error_description?.includes('not enabled')
        ) {
          console.error(`❌ Token Exchange is not enabled!`);
          console.error(`   Set ENABLE_TOKEN_EXCHANGE=true or enable via KV settings.`);
          throw new Error('Token Exchange feature is disabled');
        }
      }

      // Client not allowed check
      if (response.status === 403) {
        const body = JSON.parse(response.body);
        if (body.error === 'unauthorized_client') {
          console.error(`❌ Client is not allowed to use Token Exchange!`);
          console.error(`   Set token_exchange_allowed=true for client ${CLIENT_ID}`);
          throw new Error('Client not authorized for Token Exchange');
        }
      }
    }
  }
  console.log(`   Warmup complete`);
  console.log(``);

  return {
    tokens: useRemoteData ? tokens : null,
    tokenCount: tokens.length,
    counts,
    preset: PRESET,
    baseUrl: BASE_URL,
  };
}

// Token Exchange用のペイロードを構築
function buildTokenExchangePayload(subjectToken) {
  let payload = `grant_type=${encodeURIComponent(TOKEN_EXCHANGE_GRANT_TYPE)}`;
  payload += `&subject_token=${encodeURIComponent(subjectToken)}`;
  payload += `&subject_token_type=${encodeURIComponent(ACCESS_TOKEN_TYPE)}`;
  payload += `&requested_token_type=${encodeURIComponent(ACCESS_TOKEN_TYPE)}`;
  payload += `&scope=${encodeURIComponent(TARGET_SCOPE)}`;

  if (TARGET_AUDIENCE) {
    payload += `&audience=${encodeURIComponent(TARGET_AUDIENCE)}`;
  }

  return payload;
}

// メインテスト関数（各VUで繰り返し実行）
export default function (data) {
  const tokens = useRemoteData ? data.tokens : allTokens;

  // 重み付けでトークンタイプを選択（80% valid, 10% expired, 10% invalid）
  const tokenType = selectTokenType();
  const tokenData = selectTokenByType(tokens, tokenType, __VU);

  // 期待される結果
  const expectSuccess = tokenData.type === 'valid';

  // Token Exchange リクエスト
  const payload = buildTokenExchangePayload(tokenData.access_token);

  const params = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: getBasicAuthHeader(),
      Accept: 'application/json',
      Connection: 'keep-alive',
    },
    tags: {
      name: 'TokenExchangeRequest',
      preset: PRESET,
      tokenType: tokenData.type,
    },
  };

  const response = http.post(`${BASE_URL}/token`, payload, params);
  const duration = response.timings.duration;

  // メトリクス記録
  tokenExchangeDuration.add(duration);

  // レスポンス検証
  let responseBody = {};
  try {
    responseBody = JSON.parse(response.body);
  } catch (_) {
    // ignore parse errors
  }

  // 成功判定
  const isSuccess = response.status === 200 && responseBody.access_token !== undefined;

  // 不正tokenの誤受理チェック
  if (!expectSuccess && isSuccess) {
    if (tokenData.type === 'revoked') {
      revokedTokenAccepted.add(1);
      console.error(
        `⚠️  Revoked token accepted! Token should have been rejected (VU ${__VU})`
      );
    } else {
      invalidTokenAccepted.add(1);
      console.error(
        `⚠️  Invalid token accepted! Token type '${tokenData.type}' should have been rejected (VU ${__VU})`
      );
    }
  }

  // 生成tokenの署名検証（構造チェック）
  if (isSuccess) {
    const validStructure = validateJWTStructure(responseBody.access_token);
    if (!validStructure) {
      signatureErrors.add(1);
      console.error(`⚠️  Generated token has invalid structure (VU ${__VU})`);
    }
  }

  // チェック（validトークンの場合のみ成功を期待）
  let success;
  if (expectSuccess) {
    success = check(response, {
      'status is 200': (r) => r.status === 200,
      'has access_token': () => responseBody.access_token !== undefined,
      'has issued_token_type': () => responseBody.issued_token_type !== undefined,
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    });
  } else {
    // expired/invalidトークンは拒否されるべき
    success = check(response, {
      'invalid token rejected': (r) => r.status === 400,
      'error is invalid_grant': () => responseBody.error === 'invalid_grant',
    });
  }

  tokenExchangeSuccess.add(success);

  // トークン種別ごとのメトリクス記録
  switch (tokenData.type) {
    case 'valid':
      validTokenRequests.add(1);
      if (isSuccess) validTokenSuccess.add(1);
      break;
    case 'expired':
      expiredTokenRequests.add(1);
      // 正しく拒否された場合が成功
      if (response.status === 400 && responseBody.error === 'invalid_grant') {
        expiredTokenSuccess.add(1);
      }
      break;
    case 'invalid':
      invalidTokenRequests.add(1);
      // 正しく拒否された場合が成功
      if (response.status === 400) {
        invalidTokenSuccess.add(1);
      }
      break;
    case 'revoked':
      revokedTokenRequests.add(1);
      // 正しく拒否された場合が成功
      if (response.status === 400 && responseBody.error === 'invalid_grant') {
        revokedTokenSuccess.add(1);
      }
      break;
  }

  // エラー分類
  if (response.status === 401) {
    clientAuthErrors.add(1);
  }
  if (response.status === 400 && responseBody.error === 'invalid_grant') {
    invalidGrantErrors.add(1);
  }
  if (response.status === 400 && responseBody.error === 'unsupported_grant_type') {
    featureDisabledErrors.add(1);
  }
  if (response.status === 429) {
    rateLimitErrors.add(1);
  }
  if (response.status >= 500) {
    serverErrors.add(1);
  }

  // デバッグ（失敗時のみ）
  if (!success && exec.vu.iterationInInstance < 3) {
    console.error(`❌ Check failed (VU ${__VU}, iter ${exec.vu.iterationInInstance}):`);
    console.error(`   tokenType: ${tokenData.type}`);
    console.error(`   expectSuccess: ${expectSuccess}`);
    console.error(`   status: ${response.status}`);
    console.error(`   duration: ${response.timings.duration}ms`);
    if (responseBody.error) {
      console.error(`   error: ${responseBody.error}`);
      console.error(`   error_description: ${responseBody.error_description}`);
    }
  }
}

// ティアダウン（テスト終了後に1回だけ実行）
export function teardown(data) {
  console.log(``);
  console.log(`✅ ${TEST_NAME} テスト完了`);
  console.log(`📊 プリセット: ${data.preset}`);
  console.log(`🎯 ターゲット: ${data.baseUrl}`);
  console.log(`📈 トークン数: ${data.tokenCount}`);
  console.log(`📊 トークン分布:`);
  console.log(`   Valid:   ${data.counts.valid}`);
  console.log(`   Expired: ${data.counts.expired}`);
  console.log(`   Invalid: ${data.counts.invalid}`);
  console.log(`   Revoked: ${data.counts.revoked}`);
}

// サマリーハンドラー
export function handleSummary(data) {
  const preset = PRESET;
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');
  const resultsDir = __ENV.RESULTS_DIR || './results';

  return {
    [`${resultsDir}/${TEST_ID}-${preset}_${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`${resultsDir}/${TEST_ID}-${preset}_${timestamp}.log`]: textSummary(data, {
      indent: ' ',
      enableColors: false,
    }),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// テキストサマリー生成
function textSummary(data, options) {
  const indent = options.indent || '';

  let summary = '\n';
  summary += `${indent}📊 ${TEST_NAME} - サマリー\n`;
  summary += `${indent}${'='.repeat(70)}\n\n`;

  // テスト情報
  summary += `${indent}🎯 プリセット: ${PRESET}\n`;
  summary += `${indent}📝 説明: ${selectedPreset.description}\n\n`;

  // 基本統計
  const metrics = data.metrics;
  const totalRequests = metrics.http_reqs?.values?.count || 0;
  const failedRequests = metrics.http_req_failed?.values?.passes || 0;
  const successRequests = totalRequests - failedRequests;
  const successRate = ((metrics.token_exchange_success?.values?.rate || 0) * 100).toFixed(2);

  summary += `${indent}📈 リクエスト統計:\n`;
  summary += `${indent}  総リクエスト数: ${totalRequests}\n`;
  summary += `${indent}  成功: ${successRequests}\n`;
  summary += `${indent}  失敗: ${failedRequests}\n`;
  summary += `${indent}  成功率: ${successRate}%\n\n`;

  // レスポンスタイム
  summary += `${indent}⏱️  レスポンスタイム:\n`;
  summary += `${indent}  平均: ${metrics.http_req_duration?.values?.avg?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p50: ${metrics.http_req_duration?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p90: ${metrics.http_req_duration?.values?.['p(90)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p95: ${metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p99: ${metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p999: ${metrics.http_req_duration?.values?.['p(99.9)']?.toFixed(2) || 0}ms\n\n`;

  // 仕様書準拠チェック
  const p95 = metrics.http_req_duration?.values?.['p(95)'] || 0;
  const p99 = metrics.http_req_duration?.values?.['p(99)'] || 0;
  const rate = metrics.token_exchange_success?.values?.rate || 0;
  const invalidAccepted = metrics.invalid_token_accepted?.values?.count || 0;
  const revokedAccepted = metrics.revoked_token_accepted?.values?.count || 0;
  const sigErrors = metrics.signature_errors?.values?.count || 0;

  summary += `${indent}📋 仕様書準拠チェック (Section 4.7):\n`;
  summary += `${indent}  成功率 > 99%: ${rate > 0.99 ? '✅ PASS' : '❌ FAIL'} (${successRate}%)\n`;
  summary += `${indent}  p95 < 400ms: ${p95 < 400 ? '✅ PASS' : '❌ FAIL'} (${p95.toFixed(2)}ms)\n`;
  summary += `${indent}  p99 < 700ms: ${p99 < 700 ? '✅ PASS' : '❌ FAIL'} (${p99.toFixed(2)}ms)\n`;
  summary += `${indent}  不正token誤受理 = 0: ${invalidAccepted === 0 ? '✅ PASS' : '❌ FAIL'} (${invalidAccepted})\n`;
  summary += `${indent}  Revoked誤受理 = 0: ${revokedAccepted === 0 ? '✅ PASS' : '❌ FAIL'} (${revokedAccepted})\n`;
  summary += `${indent}  署名エラー = 0: ${sigErrors === 0 ? '✅ PASS' : '❌ FAIL'} (${sigErrors})\n\n`;

  // トークン種別ごとの成功率
  const validReqs = metrics.valid_token_requests?.values?.count || 0;
  const validSucc = metrics.valid_token_success?.values?.count || 0;
  const validRate = validReqs > 0 ? ((validSucc / validReqs) * 100).toFixed(2) : '0.00';

  const expiredReqs = metrics.expired_token_requests?.values?.count || 0;
  const expiredSucc = metrics.expired_token_success?.values?.count || 0;
  const expiredRate = expiredReqs > 0 ? ((expiredSucc / expiredReqs) * 100).toFixed(2) : '0.00';

  const invalidReqs = metrics.invalid_token_requests?.values?.count || 0;
  const invalidSucc = metrics.invalid_token_success?.values?.count || 0;
  const invalidRate = invalidReqs > 0 ? ((invalidSucc / invalidReqs) * 100).toFixed(2) : '0.00';

  const revokedReqs = metrics.revoked_token_requests?.values?.count || 0;
  const revokedSucc = metrics.revoked_token_success?.values?.count || 0;
  const revokedRate = revokedReqs > 0 ? ((revokedSucc / revokedReqs) * 100).toFixed(2) : '0.00';

  summary += `${indent}📊 トークン種別ごとの成功率:\n`;
  summary += `${indent}  ┌─────────────┬──────────┬──────────┬──────────┬─────────────────────────┐\n`;
  summary += `${indent}  │ Token Type  │ Requests │ Success  │ Rate     │ Expected                │\n`;
  summary += `${indent}  ├─────────────┼──────────┼──────────┼──────────┼─────────────────────────┤\n`;
  summary += `${indent}  │ Valid       │ ${String(validReqs).padStart(8)} │ ${String(validSucc).padStart(8)} │ ${validRate.padStart(6)}% │ Token Exchange成功      │\n`;
  summary += `${indent}  │ Expired     │ ${String(expiredReqs).padStart(8)} │ ${String(expiredSucc).padStart(8)} │ ${expiredRate.padStart(6)}% │ 正しく拒否(invalid_grant)│\n`;
  summary += `${indent}  │ Invalid     │ ${String(invalidReqs).padStart(8)} │ ${String(invalidSucc).padStart(8)} │ ${invalidRate.padStart(6)}% │ 正しく拒否(400)         │\n`;
  summary += `${indent}  │ Revoked     │ ${String(revokedReqs).padStart(8)} │ ${String(revokedSucc).padStart(8)} │ ${revokedRate.padStart(6)}% │ 正しく拒否(invalid_grant)│\n`;
  summary += `${indent}  └─────────────┴──────────┴──────────┴──────────┴─────────────────────────┘\n\n`;

  // 判定
  const validPass = parseFloat(validRate) >= 99;
  const expiredPass = parseFloat(expiredRate) >= 99;
  const invalidPass = parseFloat(invalidRate) >= 99;
  const revokedPass = parseFloat(revokedRate) >= 99;

  summary += `${indent}  Valid成功率 >= 99%: ${validPass ? '✅ PASS' : '❌ FAIL'} (${validRate}%)\n`;
  summary += `${indent}  Expired拒否率 >= 99%: ${expiredPass ? '✅ PASS' : '❌ FAIL'} (${expiredRate}%)\n`;
  summary += `${indent}  Invalid拒否率 >= 99%: ${invalidPass ? '✅ PASS' : '❌ FAIL'} (${invalidRate}%)\n`;
  summary += `${indent}  Revoked拒否率 >= 99%: ${revokedPass ? '✅ PASS' : '❌ FAIL'} (${revokedRate}%)\n\n`;

  // エラー統計
  summary += `${indent}❌ エラー統計:\n`;
  summary += `${indent}  クライアント認証エラー (401): ${metrics.client_auth_errors?.values?.count || 0}\n`;
  summary += `${indent}  Invalid Grant (400): ${metrics.invalid_grant_errors?.values?.count || 0}\n`;
  summary += `${indent}  Feature Disabled: ${metrics.feature_disabled_errors?.values?.count || 0}\n`;
  summary += `${indent}  レート制限 (429): ${metrics.rate_limit_errors?.values?.count || 0}\n`;
  summary += `${indent}  サーバーエラー (5xx): ${metrics.server_errors?.values?.count || 0}\n`;
  summary += `${indent}  Revoked誤受理: ${metrics.revoked_token_accepted?.values?.count || 0}\n\n`;

  // スループット
  const rps = metrics.http_reqs?.values?.rate || 0;
  summary += `${indent}🚀 スループット: ${rps.toFixed(2)} req/s\n`;

  // DO ボトルネック警告
  if (p95 > 300 || p99 > 500) {
    summary += `\n${indent}⚠️  パフォーマンス警告:\n`;
    summary += `${indent}  レイテンシが高い場合、TOKEN_REVOCATION_STORE DOのシャーディングを検討してください。\n`;
    summary += `${indent}  現在のシャーディング: 単一インスタンス (tenant:default:token-revocation)\n`;
  }

  summary += `${indent}${'='.repeat(70)}\n`;

  return summary;
}
