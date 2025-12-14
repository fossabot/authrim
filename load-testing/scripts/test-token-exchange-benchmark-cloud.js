/**
 * Token Exchange (RFC 8693) ベンチマークテスト - K6 Cloud版
 *
 * 目的:
 * - マイクロサービス環境における「サービス間認証」を大量に発生させた場合の性能測定
 * - SSO後のAudience切り替え、Service Tokenの発行能力評価
 * - TOKEN_REVOCATION_STORE DOのボトルネック検証
 * - Revokedトークンの確実な拒否検証
 * - **K6 Cloud経由で分散負荷テストを実行**
 *
 * テスト仕様 (Section 4.7):
 * - ターゲット: POST /token
 * - Grant Type: urn:ietf:params:oauth:grant-type:token-exchange
 * - subject_token: 事前に生成されたaccess_token
 * - トークン割合: Valid 70%, Expired 10%, Invalid 10%, Revoked 10%
 *
 * K6 Cloud実行方法:
 * 1. K6_CLOUD_TOKEN環境変数を設定
 * 2. R2にaccess_tokens.jsonをアップロード
 * 3. k6 cloud --env PRESET=rps1000 scripts/test-token-exchange-benchmark-cloud.js
 *
 * ローカル実行（デバッグ用）:
 * k6 run --env PRESET=rps500 scripts/test-token-exchange-benchmark-cloud.js
 */

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import encoding from 'k6/encoding';
import exec from 'k6/execution';

// テスト識別情報
const TEST_NAME = 'Token Exchange (RFC 8693) Benchmark [Cloud]';
const TEST_ID = 'token-exchange-benchmark-cloud';

// カスタムメトリクス
const tokenExchangeDuration = new Trend('token_exchange_duration');
const tokenExchangeSuccess = new Rate('token_exchange_success');
const invalidTokenAccepted = new Counter('invalid_token_accepted');
const revokedTokenAccepted = new Counter('revoked_token_accepted');
const signatureErrors = new Counter('signature_errors');
const clientAuthErrors = new Counter('client_auth_errors');
const invalidGrantErrors = new Counter('invalid_grant_errors');
const rateLimitErrors = new Counter('rate_limit_errors');
const serverErrors = new Counter('server_errors');
const featureDisabledErrors = new Counter('feature_disabled_errors');

// トークン種別ごとのメトリクス
const validTokenRequests = new Counter('valid_token_requests');
const validTokenSuccess = new Counter('valid_token_success');
const expiredTokenRequests = new Counter('expired_token_requests');
const expiredTokenSuccess = new Counter('expired_token_success');
const invalidTokenRequests = new Counter('invalid_token_requests');
const invalidTokenSuccess = new Counter('invalid_token_success');
const revokedTokenRequests = new Counter('revoked_token_requests');
const revokedTokenSuccess = new Counter('revoked_token_success');

// 環境変数（k6 Cloud用にデフォルト値を設定）
const BASE_URL = __ENV.BASE_URL || 'https://conformance.authrim.com';
const CLIENT_ID = __ENV.CLIENT_ID || 'b42bdc5e-7183-46ef-859c-fd21d4589cd6';
const CLIENT_SECRET =
  __ENV.CLIENT_SECRET || '6ec3c4aed67c40d9ae8891e4641292ae15cf215264ba4618b7c89356b54b0bde';
const PRESET = __ENV.PRESET || 'rps500';

// K6 Cloud用: R2からシードをフェッチするURL
const TOKEN_URL =
  __ENV.TOKEN_URL || 'https://pub-999cabb8466b46c4a2b32b63ef5579cc.r2.dev/access_tokens_v16.json';

// Token Exchange用のリクエストパラメータ（フォールバック用）
const DEFAULT_AUDIENCE = __ENV.TARGET_AUDIENCE || '';
const DEFAULT_SCOPE = __ENV.TARGET_SCOPE || 'openid profile';

// Actor Token タイプ
const ACTOR_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';

// K6 Cloud Project ID（環境変数で上書き可能）
const K6_CLOUD_PROJECT_ID = __ENV.K6_CLOUD_PROJECT_ID || '';

// Token Exchange grant type
const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';
const ACCESS_TOKEN_TYPE = 'urn:ietf:params:oauth:token-type:access_token';

/**
 * プリセット設定 - K6 Cloud最適化版
 *
 * K6 Cloudの分散実行により、ローカル版より高いRPSが可能
 * - クライアント側のTCP制限なし
 * - 複数リージョンからの分散負荷
 *
 * 成功判定基準:
 * - Valid成功率: > 99%
 * - Expired/Invalid/Revoked拒否率: > 99%
 * - p95 レイテンシ: < 400ms
 * - p99 レイテンシ: < 700ms
 */
const PRESETS = {
  // 軽量テスト（確認用）
  rps100: {
    description: '100 RPS - Cloud smoke test (1 min)',
    stages: [
      { target: 50, duration: '10s' },
      { target: 100, duration: '60s' },
      { target: 0, duration: '10s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<400', 'p(99)<700'],
      http_req_failed: ['rate<0.35'],
      valid_token_success: ['count>0'],
    },
    preAllocatedVUs: 150,
    maxVUs: 200,
  },

  // ベンチマーク: 500 RPS (3分)
  rps500: {
    description: '500 RPS - Token Exchange baseline (3 min)',
    stages: [
      { target: 250, duration: '15s' },
      { target: 500, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<400', 'p(99)<700'],
      http_req_failed: ['rate<0.35'],
      valid_token_success: ['count>0'],
    },
    preAllocatedVUs: 600,
    maxVUs: 800,
  },

  // ベンチマーク: 1000 RPS (3分)
  rps1000: {
    description: '1000 RPS - Token Exchange high throughput (3 min)',
    stages: [
      { target: 500, duration: '15s' },
      { target: 1000, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<400', 'p(99)<700'],
      http_req_failed: ['rate<0.35'],
      valid_token_success: ['count>0'],
    },
    preAllocatedVUs: 1200,
    maxVUs: 1500,
  },

  // ベンチマーク: 1500 RPS (3分)
  rps1500: {
    description: '1500 RPS - Token Exchange stress test (3 min)',
    stages: [
      { target: 750, duration: '15s' },
      { target: 1500, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<400', 'p(99)<700'],
      http_req_failed: ['rate<0.35'],
      valid_token_success: ['count>0'],
    },
    preAllocatedVUs: 1800,
    maxVUs: 2200,
  },

  // ベンチマーク: 2000 RPS (3分)
  rps2000: {
    description: '2000 RPS - Token Exchange high stress (3 min)',
    stages: [
      { target: 1000, duration: '15s' },
      { target: 2000, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<500', 'p(99)<800'],
      http_req_failed: ['rate<0.35'],
      valid_token_success: ['count>0'],
    },
    preAllocatedVUs: 2400,
    maxVUs: 3000,
  },

  // ベンチマーク: 2500 RPS (3分)
  rps2500: {
    description: '2500 RPS - Token Exchange capacity limit (3 min)',
    stages: [
      { target: 1250, duration: '15s' },
      { target: 2500, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<500', 'p(99)<800'],
      http_req_failed: ['rate<0.35'],
      valid_token_success: ['count>0'],
    },
    preAllocatedVUs: 3000,
    maxVUs: 3800,
  },

  // ベンチマーク: 3000 RPS (3分)
  rps3000: {
    description: '3000 RPS - Token Exchange maximum capacity (3 min)',
    stages: [
      { target: 1500, duration: '15s' },
      { target: 3000, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<600', 'p(99)<1000'],
      http_req_failed: ['rate<0.35'],
      valid_token_success: ['count>0'],
    },
    preAllocatedVUs: 3600,
    maxVUs: 4500,
  },

  // ベンチマーク: 3500 RPS (3分)
  rps3500: {
    description: '3500 RPS - Token Exchange high capacity (3 min)',
    stages: [
      { target: 1750, duration: '15s' },
      { target: 3500, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<700', 'p(99)<1200'],
      http_req_failed: ['rate<0.35'],
      valid_token_success: ['count>0'],
    },
    preAllocatedVUs: 4200,
    maxVUs: 5200,
  },

  // ベンチマーク: 4000 RPS (3分)
  rps4000: {
    description: '4000 RPS - Token Exchange extreme capacity (3 min)',
    stages: [
      { target: 2000, duration: '15s' },
      { target: 4000, duration: '180s' },
      { target: 0, duration: '15s' },
    ],
    thresholds: {
      http_req_duration: ['p(95)<800', 'p(99)<1500'],
      http_req_failed: ['rate<0.35'],
      valid_token_success: ['count>0'],
    },
    preAllocatedVUs: 4800,
    maxVUs: 6000,
  },
};

// プリセット検証
const selectedPreset = PRESETS[PRESET];
if (!selectedPreset) {
  throw new Error(`Unknown preset: ${PRESET}. Available: ${Object.keys(PRESETS).join(', ')}`);
}

// ウォームアップ設定
const WARMUP_DURATION = '30s';
const WARMUP_RPS = 50;
const WARMUP_VUS = 100;

// K6オプション - ウォームアップ + 本測定の2シナリオ構成
export const options = {
  scenarios: {
    // シナリオ1: ウォームアップ（コールドスタート対策）
    warmup: {
      executor: 'constant-arrival-rate',
      rate: WARMUP_RPS,
      timeUnit: '1s',
      duration: WARMUP_DURATION,
      preAllocatedVUs: WARMUP_VUS,
      maxVUs: WARMUP_VUS * 2,
      tags: { scenario: 'warmup' },
      exec: 'warmupScenario',
    },
    // シナリオ2: 本測定（ウォームアップ完了後に開始）
    token_exchange_benchmark: {
      executor: 'ramping-arrival-rate',
      startRate: 0,
      timeUnit: '1s',
      preAllocatedVUs: selectedPreset.preAllocatedVUs,
      maxVUs: selectedPreset.maxVUs,
      stages: selectedPreset.stages,
      startTime: WARMUP_DURATION,
      tags: { scenario: 'benchmark' },
      exec: 'benchmarkScenario',
    },
  },
  thresholds: {
    // 本測定シナリオのみにthresholdsを適用
    'http_req_duration{scenario:benchmark}': selectedPreset.thresholds.http_req_duration,
    'http_req_failed{scenario:benchmark}': selectedPreset.thresholds.http_req_failed,
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'p(99.9)'],
  // K6 Cloud設定
  cloud: {
    projectID: K6_CLOUD_PROJECT_ID ? parseInt(K6_CLOUD_PROJECT_ID, 10) : undefined,
    name: `${TEST_ID}-${PRESET}`,
    distribution: {
      // US Oregon region (Cloudflare Workers edge location)
      'amazon:us:portland': { loadZone: 'amazon:us:portland', percent: 100 },
    },
  },
};

// Basic認証ヘッダー生成
function getBasicAuthHeader() {
  const credentials = `${CLIENT_ID}:${CLIENT_SECRET}`;
  return `Basic ${encoding.b64encode(credentials)}`;
}

// Token Exchange用のペイロードを構築（v2: トークンオブジェクト対応）
function buildTokenExchangePayload(tokenObj) {
  // tokenObjが文字列の場合は旧フォーマット互換
  const subjectToken = typeof tokenObj === 'string' ? tokenObj : tokenObj.access_token;
  const targetAudience = tokenObj.target_audience || DEFAULT_AUDIENCE;
  const targetScope = tokenObj.scope || DEFAULT_SCOPE;
  const resource = tokenObj.resource || '';
  const actorToken = tokenObj.actor_token?.token || null;

  let payload = `grant_type=${encodeURIComponent(TOKEN_EXCHANGE_GRANT_TYPE)}`;
  payload += `&subject_token=${encodeURIComponent(subjectToken)}`;
  payload += `&subject_token_type=${encodeURIComponent(ACCESS_TOKEN_TYPE)}`;
  payload += `&requested_token_type=${encodeURIComponent(ACCESS_TOKEN_TYPE)}`;
  payload += `&scope=${encodeURIComponent(targetScope)}`;

  if (targetAudience) {
    payload += `&audience=${encodeURIComponent(targetAudience)}`;
  }

  if (resource) {
    payload += `&resource=${encodeURIComponent(resource)}`;
  }

  // Actor Token（委譲フロー）
  if (actorToken) {
    payload += `&actor_token=${encodeURIComponent(actorToken)}`;
    payload += `&actor_token_type=${encodeURIComponent(ACTOR_TOKEN_TYPE)}`;
  }

  return payload;
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
function selectTokenByType(tokensByType, type, vuId) {
  const tokens = tokensByType[type] || tokensByType['valid'];
  if (!tokens || tokens.length === 0) {
    return tokensByType['valid'][vuId % tokensByType['valid'].length];
  }
  return tokens[vuId % tokens.length];
}

/**
 * 簡易JWT検証（署名はサーバー側で検証されるため、構造チェックのみ）
 */
function validateJWTStructure(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    const header = JSON.parse(encoding.b64decode(parts[0], 'rawurl', 's'));
    const payload = JSON.parse(encoding.b64decode(parts[1], 'rawurl', 's'));

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
  console.log(`☁️  K6 Cloud Mode: Fetching tokens from R2`);
  console.log(``);

  // K6 Cloud: R2からトークンを取得
  console.log(`📥 Fetching tokens from: ${TOKEN_URL}`);
  const response = http.get(TOKEN_URL, { timeout: '120s' });
  if (response.status !== 200) {
    throw new Error(`Failed to fetch tokens: ${response.status} - ${response.body}`);
  }

  const data = JSON.parse(response.body);
  const tokens = data.tokens || data; // {tokens: [...]} または [...] 形式に対応

  console.log(`   Loaded ${tokens.length} tokens from R2`);

  if (tokens.length === 0) {
    throw new Error('No tokens found in R2. Upload access_tokens.json to R2 first.');
  }

  // トークンをタイプ別に分類（v2: オブジェクト全体を保持）
  const tokensByType = {
    valid: [],
    expired: [],
    invalid: [],
    revoked: [],
  };

  let actorTokenCount = 0;
  const audienceSet = new Set();
  const scopeSet = new Set();

  for (const t of tokens) {
    // v2: valid_standard は valid として扱う
    let type = t.type || 'valid';
    if (type === 'valid_standard') type = 'valid';
    // v2フォーマット: オブジェクト全体を保持
    // v1フォーマット互換: 文字列ならラップ
    const tokenObj = typeof t === 'string' ? { access_token: t, type: 'valid' } : t;
    if (tokensByType[type]) {
      tokensByType[type].push(tokenObj);
    }
    // バリエーション統計
    if (tokenObj.actor_token) actorTokenCount++;
    if (tokenObj.target_audience) audienceSet.add(tokenObj.target_audience);
    if (tokenObj.scope) scopeSet.add(tokenObj.scope);
  }

  console.log(`📊 Token Distribution:`);
  console.log(`   Valid:   ${tokensByType.valid.length} (with actor: ${actorTokenCount})`);
  console.log(`   Expired: ${tokensByType.expired.length}`);
  console.log(`   Invalid: ${tokensByType.invalid.length}`);
  console.log(`   Revoked: ${tokensByType.revoked.length}`);
  console.log(`📈 Variations:`);
  console.log(`   Audiences: ${audienceSet.size}`);
  console.log(`   Scopes:    ${scopeSet.size}`);
  console.log(``);

  // ウォームアップ: Token Exchangeエンドポイントの初期化
  console.log(`🔥 Warming up Token Exchange endpoint...`);
  if (tokensByType.valid.length > 0) {
    for (let i = 0; i < Math.min(10, tokensByType.valid.length); i++) {
      const tokenObj = tokensByType.valid[i];
      const payload = buildTokenExchangePayload(tokenObj);
      const res = http.post(`${BASE_URL}/token`, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: getBasicAuthHeader(),
        },
        tags: { name: 'Warmup' },
      });

      // Feature flag disabled check
      if (res.status === 400) {
        const body = JSON.parse(res.body);
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
      if (res.status === 403) {
        const body = JSON.parse(res.body);
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
    tokensByType,
    tokenCount: tokens.length,
    preset: PRESET,
    baseUrl: BASE_URL,
  };
}

// 共通のToken Exchangeリクエスト処理
function executeTokenExchangeRequest(data, scenarioTag) {
  const tokensByType = data.tokensByType;

  // 重み付けでトークンタイプを選択
  const tokenType = selectTokenType();
  const tokenObj = selectTokenByType(tokensByType, tokenType, __VU);

  // 期待される結果
  const expectSuccess = tokenType === 'valid';

  // Token Exchange リクエスト（v2: オブジェクトを渡す）
  const payload = buildTokenExchangePayload(tokenObj);

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
      tokenType: tokenType,
      scenario: scenarioTag,
    },
  };

  const response = http.post(`${BASE_URL}/token`, payload, params);
  const duration = response.timings.duration;

  // メトリクス記録
  tokenExchangeDuration.add(duration, { scenario: scenarioTag });

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
    if (tokenType === 'revoked') {
      revokedTokenAccepted.add(1, { scenario: scenarioTag });
      console.error(`⚠️  Revoked token accepted! (VU ${__VU})`);
    } else {
      invalidTokenAccepted.add(1, { scenario: scenarioTag });
      console.error(`⚠️  Invalid token accepted! type='${tokenType}' (VU ${__VU})`);
    }
  }

  // 生成tokenの署名検証（構造チェック）
  if (isSuccess) {
    const validStructure = validateJWTStructure(responseBody.access_token);
    if (!validStructure) {
      signatureErrors.add(1, { scenario: scenarioTag });
    }
  }

  // チェック
  let success;
  if (expectSuccess) {
    success = check(
      response,
      {
        'status is 200': (r) => r.status === 200,
        'has access_token': () => responseBody.access_token !== undefined,
        'has issued_token_type': () => responseBody.issued_token_type !== undefined,
        'response time < 1000ms': (r) => r.timings.duration < 1000,
      },
      { scenario: scenarioTag }
    );
  } else {
    // expired/invalid/revokedトークンは拒否されるべき
    success = check(
      response,
      {
        'invalid token rejected': (r) => r.status === 400,
        'error is invalid_grant': () => responseBody.error === 'invalid_grant',
      },
      { scenario: scenarioTag }
    );
  }

  tokenExchangeSuccess.add(success, { scenario: scenarioTag });

  // トークン種別ごとのメトリクス記録
  switch (tokenType) {
    case 'valid':
      validTokenRequests.add(1, { scenario: scenarioTag });
      if (isSuccess) validTokenSuccess.add(1, { scenario: scenarioTag });
      break;
    case 'expired':
      expiredTokenRequests.add(1, { scenario: scenarioTag });
      if (response.status === 400 && responseBody.error === 'invalid_grant') {
        expiredTokenSuccess.add(1, { scenario: scenarioTag });
      }
      break;
    case 'invalid':
      invalidTokenRequests.add(1, { scenario: scenarioTag });
      if (response.status === 400) {
        invalidTokenSuccess.add(1, { scenario: scenarioTag });
      }
      break;
    case 'revoked':
      revokedTokenRequests.add(1, { scenario: scenarioTag });
      if (response.status === 400 && responseBody.error === 'invalid_grant') {
        revokedTokenSuccess.add(1, { scenario: scenarioTag });
      }
      break;
  }

  // エラー分類
  if (response.status === 401) {
    clientAuthErrors.add(1, { scenario: scenarioTag });
  }
  if (response.status === 400 && responseBody.error === 'invalid_grant') {
    invalidGrantErrors.add(1, { scenario: scenarioTag });
  }
  if (response.status === 400 && responseBody.error === 'unsupported_grant_type') {
    featureDisabledErrors.add(1, { scenario: scenarioTag });
  }
  if (response.status === 429) {
    rateLimitErrors.add(1, { scenario: scenarioTag });
  }
  if (response.status >= 500) {
    serverErrors.add(1, { scenario: scenarioTag });
  }
}

// ウォームアップシナリオ（コールドスタート対策）
export function warmupScenario(data) {
  executeTokenExchangeRequest(data, 'warmup');
}

// 本測定シナリオ（thresholds適用対象）
export function benchmarkScenario(data) {
  executeTokenExchangeRequest(data, 'benchmark');
}

// ティアダウン（テスト終了後に1回だけ実行）
export function teardown(data) {
  console.log(``);
  console.log(`✅ ${TEST_NAME} テスト完了`);
  console.log(`📊 プリセット: ${data.preset}`);
  console.log(`🎯 ターゲット: ${data.baseUrl}`);
  console.log(`📈 トークン数: ${data.tokenCount}`);
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

  // 基本統計（benchmarkシナリオのみ）
  const metrics = data.metrics;
  const totalRequests =
    metrics['http_reqs{scenario:benchmark}']?.values?.count ||
    metrics.http_reqs?.values?.count ||
    0;
  const failedRequests =
    metrics['http_req_failed{scenario:benchmark}']?.values?.passes ||
    metrics.http_req_failed?.values?.passes ||
    0;
  const successRequests = totalRequests - failedRequests;
  const successRate = ((metrics.token_exchange_success?.values?.rate || 0) * 100).toFixed(2);

  summary += `${indent}📈 リクエスト統計 (benchmark):\n`;
  summary += `${indent}  総リクエスト数: ${totalRequests}\n`;
  summary += `${indent}  成功: ${successRequests}\n`;
  summary += `${indent}  失敗: ${failedRequests}\n`;
  summary += `${indent}  成功率: ${successRate}%\n\n`;

  // レスポンスタイム
  const durationMetric =
    metrics['http_req_duration{scenario:benchmark}'] || metrics.http_req_duration;
  summary += `${indent}⏱️  レスポンスタイム:\n`;
  summary += `${indent}  平均: ${durationMetric?.values?.avg?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p50: ${durationMetric?.values?.['p(50)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p90: ${durationMetric?.values?.['p(90)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p95: ${durationMetric?.values?.['p(95)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p99: ${durationMetric?.values?.['p(99)']?.toFixed(2) || 0}ms\n`;
  summary += `${indent}  p999: ${durationMetric?.values?.['p(99.9)']?.toFixed(2) || 0}ms\n\n`;

  // 仕様書準拠チェック
  const p95 = durationMetric?.values?.['p(95)'] || 0;
  const p99 = durationMetric?.values?.['p(99)'] || 0;
  const invalidAccepted = metrics.invalid_token_accepted?.values?.count || 0;
  const revokedAccepted = metrics.revoked_token_accepted?.values?.count || 0;
  const sigErrors = metrics.signature_errors?.values?.count || 0;

  summary += `${indent}📋 仕様書準拠チェック:\n`;
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
  const rps =
    metrics['http_reqs{scenario:benchmark}']?.values?.rate || metrics.http_reqs?.values?.rate || 0;
  summary += `${indent}🚀 スループット: ${rps.toFixed(2)} req/s\n`;

  summary += `${indent}${'='.repeat(70)}\n`;

  return summary;
}
