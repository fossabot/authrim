# A-6: Logout/Session Management 設計書

> **Phase A-6**: RP-Initiated, Frontchannel, Backchannel Logout の実装設計

## 1. 概要

### 1.1 目的

OIDCの3種類のログアウト方式をサポートし、SSOにおけるセッション管理とログアウト同期を実現する。

### 1.2 対象仕様

| 仕様                | RFC/Spec                                                                                       | 状態                    |
| ------------------- | ---------------------------------------------------------------------------------------------- | ----------------------- |
| RP-Initiated Logout | [OIDC RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)   | ✅ 実装済み             |
| Frontchannel Logout | [OIDC Front-Channel Logout 1.0](https://openid.net/specs/openid-connect-frontchannel-1_0.html) | 🔲 未実装               |
| Backchannel Logout  | [OIDC Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html)   | 🔲 一部実装（受信のみ） |
| Session Management  | [OIDC Session Management 1.0](https://openid.net/specs/openid-connect-session-1_0.html)        | 🔲 未実装               |

### 1.3 決定事項サマリ

| 項目                             | 決定                              |
| -------------------------------- | --------------------------------- |
| Frontchannel用フィールド同時追加 | ✅ Yes                            |
| Logout Token `exp` 有効期限      | 120秒（AdminAPIで変更可能）       |
| `sub` と `sid` 両方含める        | ✅ Yes（AdminAPIで変更可能）      |
| 送信メカニズム                   | ハイブリッド（waitUntil + Queue） |
| リトライ回数                     | 3回（AdminAPIで変更可能）         |
| 最終失敗時の処理                 | 選択可能、デフォルトはログのみ    |

### 1.4 設計レビュー結果

> **評価：A（非常に完成度が高く、実装に進んで問題なし）**

| 観点            | 評価  |
| --------------- | ----- |
| OIDC 準拠       | ★★★★★ |
| 実運用耐性      | ★★★★★ |
| Cloudflare 適合 | ★★★★★ |
| 将来拡張性      | ★★★★☆ |
| 実装リスク      | 低    |

**差別化ポイント**:

> `waitUntil + Queue + session_clients` の組み合わせは Authrim の差別化ポイント

---

## 2. アーキテクチャ

### 2.1 全体フロー

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Logout Flow Overview                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐         ┌───────────────┐         ┌──────────┐          │
│   │   User   │         │    Authrim    │         │    RPs   │          │
│   │(Browser) │         │     (OP)      │         │ (Clients)│          │
│   └────┬─────┘         └───────┬───────┘         └────┬─────┘          │
│        │                       │                      │                 │
│   1. Logout Request            │                      │                 │
│        │─────────────────────→ │                      │                 │
│        │   GET /logout         │                      │                 │
│        │   ?id_token_hint=...  │                      │                 │
│        │                       │                      │                 │
│   2. Session Invalidation      │                      │                 │
│        │                       │──────────────────────│                 │
│        │                       │  Delete from         │                 │
│        │                       │  SessionStore DO     │                 │
│        │                       │                      │                 │
│   3. Backchannel Logout        │                      │                 │
│        │                       │─────────────────────→│                 │
│        │                       │  POST logout_token   │                 │
│        │                       │  (via waitUntil)     │                 │
│        │                       │                      │                 │
│   4. Frontchannel Logout       │                      │                 │
│        │←──────────────────────│                      │                 │
│        │  HTML with iframes    │                      │                 │
│        │  for each RP          │───────(iframe)──────→│                 │
│        │                       │                      │                 │
│   5. Redirect                  │                      │                 │
│        │←──────────────────────│                      │                 │
│        │  302 to post_logout   │                      │                 │
│        │  _redirect_uri        │                      │                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 コンポーネント構成

```
packages/
├── ar-auth/
│   └── src/
│       ├── logout.ts              # 既存: RP-Initiated Logout (受信)
│       └── logout-sender.ts       # 新規: Backchannel/Frontchannel 送信
├── ar-lib-core/
│   └── src/
│       ├── services/
│       │   └── backchannel-logout-sender.ts  # 新規: Logout Token生成・送信
│       ├── repositories/
│       │   └── core/
│       │       ├── client.ts      # 変更: logout URI フィールド追加
│       │       └── session-client.ts  # 新規: セッション-クライアント紐付け
│       └── types/
│           └── logout.ts          # 新規: Logout関連型定義
└── ar-management/
    └── src/
        └── routes/settings/
            └── logout-config.ts   # 新規: ログアウト設定API
```

---

## 3. データベース設計

### 3.1 クライアントテーブル拡張

```sql
-- マイグレーション: add_logout_fields_to_clients
ALTER TABLE oauth_clients ADD COLUMN backchannel_logout_uri TEXT;
ALTER TABLE oauth_clients ADD COLUMN backchannel_logout_session_required INTEGER DEFAULT 0;
ALTER TABLE oauth_clients ADD COLUMN frontchannel_logout_uri TEXT;
ALTER TABLE oauth_clients ADD COLUMN frontchannel_logout_session_required INTEGER DEFAULT 0;
```

### 3.2 セッション-クライアント紐付けテーブル（新規）

```sql
-- マイグレーション: create_session_clients_table
--
-- 目的: ユーザーセッションに対してトークンを発行したクライアントを追跡
-- 用途: Backchannel Logout時に通知すべきRPを特定
--
-- 設計レビュー: これはこの設計の一番の価値。
-- Auth0 / Keycloak でも内部的に必須な構造であり、Authrim の設計思想（DO 分離）とも整合。
--
CREATE TABLE session_clients (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  -- トークン発行時刻（最初にトークンを発行した時刻）
  first_token_at INTEGER NOT NULL,
  -- 最後にトークンを発行した時刻（リフレッシュ時に更新）
  last_token_at INTEGER NOT NULL,
  -- RPが最後に生存確認した時刻（Dead RP の自動スキップに使用可能）
  -- 将来拡張: Token refresh / UserInfo call 時に更新
  last_seen_at INTEGER,

  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES oauth_clients(client_id) ON DELETE CASCADE,

  -- 同一セッション・クライアントの組み合わせは一意
  UNIQUE (session_id, client_id)
);

-- インデックス
CREATE INDEX idx_session_clients_session_id ON session_clients(session_id);
CREATE INDEX idx_session_clients_client_id ON session_clients(client_id);
CREATE INDEX idx_session_clients_last_seen_at ON session_clients(last_seen_at);
```

### 3.3 Logout Token JTIキャッシュ（既存KVを使用）

```typescript
// KVキー形式: bcl_jti:{jti}
// TTL: logout_token_exp_seconds + 60 (バッファ)
// 用途: Logout Tokenの再送信防止（リトライ時の重複チェック用）
```

### 3.4 Logout送信ペンディングキャッシュ（多重enqueue防止）

```typescript
// KVキー形式: logout:pending:{sessionId}:{clientId}
// TTL: 300秒（5分）
// 用途: 短時間に複数logoutが走るケースでの多重enqueue防止
//
// 設計レビュー【必須】: 同一 client + session の多重 enqueue 防止として追加
```

---

## 4. 設定値設計

### 4.1 KV設定キー

```typescript
// SETTINGS KV に格納
interface LogoutSettings {
  logout: {
    // Backchannel Logout設定
    backchannel: {
      enabled: boolean; // default: true
      logout_token_exp_seconds: number; // default: 120 (仕様推奨2分)
      include_sub_claim: boolean; // default: true
      include_sid_claim: boolean; // default: true
      request_timeout_ms: number; // default: 5000
      retry: {
        max_attempts: number; // default: 3
        initial_delay_ms: number; // default: 1000
        max_delay_ms: number; // default: 30000
        backoff_multiplier: number; // default: 2
      };
      on_final_failure: 'log_only' | 'alert'; // default: 'log_only'
    };
    // Frontchannel Logout設定
    frontchannel: {
      enabled: boolean; // default: true
      iframe_timeout_ms: number; // default: 3000
      max_concurrent_iframes: number; // default: 10
    };
    // Session Management設定
    session_management: {
      enabled: boolean; // default: true
      check_session_iframe_enabled: boolean; // default: true (conformance用)
    };
  };
}
```

### 4.2 環境変数フォールバック

```bash
# 環境変数（KVが利用できない場合のフォールバック）
LOGOUT_BACKCHANNEL_ENABLED=true
LOGOUT_TOKEN_EXP_SECONDS=120
LOGOUT_INCLUDE_SUB_CLAIM=true
LOGOUT_INCLUDE_SID_CLAIM=true
LOGOUT_REQUEST_TIMEOUT_MS=5000
LOGOUT_RETRY_MAX_ATTEMPTS=3
LOGOUT_RETRY_INITIAL_DELAY_MS=1000
LOGOUT_RETRY_MAX_DELAY_MS=30000
LOGOUT_RETRY_BACKOFF_MULTIPLIER=2
LOGOUT_ON_FINAL_FAILURE=log_only
LOGOUT_FRONTCHANNEL_ENABLED=true
LOGOUT_IFRAME_TIMEOUT_MS=3000
```

### 4.3 設定値読み込み優先順位

```
1. Cache（インメモリ、リクエスト内で有効）
2. KV（SETTINGS KV）
3. 環境変数
4. コードデフォルト値（セキュリティ寄り）
```

---

## 5. Logout Token仕様

### 5.1 クレーム構造

```typescript
interface LogoutTokenClaims {
  // 必須クレーム
  iss: string; // Issuer URL
  aud: string; // Client ID（単一RPに対して発行）
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiration (iat + exp_seconds)
  jti: string; // Unique token ID (UUID v4)
  events: {
    'http://schemas.openid.net/event/backchannel-logout': {};
  };

  // 条件付き必須（設定による）
  sub?: string; // Subject (user ID)
  sid?: string; // Session ID
}

// 注意: nonce は含めてはいけない（仕様要件）
```

> **設計レビュー【必須】**: `aud` は常に **単一 client_id** を設定する。
>
> - Backchannel Logout Token は原則「単一 RP」宛て
> - `string[]` にすると RP 実装差異によるバグの原因になる

### 5.2 署名

```typescript
// ID Tokenと同じ署名キーを使用
// アルゴリズム: RS256（設定変更不可）
// 'none' アルゴリズムは使用禁止
//
// 設計レビュー: 将来 FAPI 対応時も流用可
```

### 5.3 サンプルトークン

```json
{
  "iss": "https://auth.example.com",
  "sub": "user_12345",
  "aud": "client_abc",
  "iat": 1703318400,
  "exp": 1703318520,
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "sid": "sid_xyz789",
  "events": {
    "http://schemas.openid.net/event/backchannel-logout": {}
  }
}
```

---

## 6. 送信メカニズム

### 6.1 ハイブリッドアプローチ

```typescript
// logout.ts - メインフロー
async function frontChannelLogoutHandler(c: Context<{ Bindings: Env }>) {
  // 1. セッション削除（同期）
  await deleteSession(sessionId);

  // 2. Backchannel Logout送信（非同期、waitUntil）
  c.executionCtx.waitUntil(
    sendBackchannelLogouts(env, userId, sessionId, {
      onRetryNeeded: async (clientId, attempt) => {
        // 【必須】多重enqueue防止チェック
        const pendingKey = `logout:pending:${sessionId}:${clientId}`;
        const existing = await env.SETTINGS.get(pendingKey);
        if (existing) {
          console.log(`Logout already pending for ${clientId}, skipping enqueue`);
          return;
        }

        // ペンディングフラグを設定（TTL: 5分）
        await env.SETTINGS.put(pendingKey, JSON.stringify({ attempt, enqueuedAt: Date.now() }), {
          expirationTtl: 300,
        });

        // 必要に応じてQueueに追加
        await env.LOGOUT_RETRY_QUEUE.send({
          type: 'backchannel_logout_retry',
          clientId,
          userId,
          sessionId,
          attempt,
          scheduledAt: Date.now(),
        });
      },
    })
  );

  // 3. 即座にレスポンス返却
  return c.redirect(postLogoutRedirectUri, 302);
}
```

### 6.2 リトライフロー

```
┌────────────────────────────────────────────────────────────────┐
│                    Retry Flow                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   waitUntil()                                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  for each client with backchannel_logout_uri:           │  │
│   │    Check pending lock (KV)                              │  │
│   │    POST logout_token → success? ✓ done                  │  │
│   │                      → fail? → retry in-process (1s)    │  │
│   │                              → still fail? → Queue      │  │
│   └─────────────────────────────────────────────────────────┘  │
│                              ↓                                 │
│   Queue Consumer (Durable Objects or scheduled worker)         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Check pending lock (KV) → skip if duplicate            │  │
│   │  attempt 2: wait 5s → POST → fail? → re-queue           │  │
│   │  attempt 3: wait 30s → POST → fail? → final failure     │  │
│   │                                        ↓                │  │
│   │                              on_final_failure処理       │  │
│   │                              (log_only or alert)        │  │
│   │                              Clear pending lock         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 6.3 送信サービス実装

```typescript
// packages/ar-lib-core/src/services/backchannel-logout-sender.ts

interface BackchannelLogoutResult {
  clientId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  retryScheduled?: boolean;
  duration_ms?: number;
}

export async function sendBackchannelLogout(
  env: Env,
  clientId: string,
  logoutToken: string,
  config: LogoutConfig
): Promise<BackchannelLogoutResult> {
  const startTime = Date.now();
  const client = await getClient(env, clientId);
  if (!client?.backchannel_logout_uri) {
    return { clientId, success: true }; // No URI configured = skip
  }

  try {
    const response = await fetch(client.backchannel_logout_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-store',
      },
      body: `logout_token=${encodeURIComponent(logoutToken)}`,
      signal: AbortSignal.timeout(config.request_timeout_ms),
    });

    const duration_ms = Date.now() - startTime;

    // 200 OK または 204 No Content は成功
    if (response.status === 200 || response.status === 204) {
      return { clientId, success: true, statusCode: response.status, duration_ms };
    }

    // 400 Bad Request はリトライしない（RPがトークンを拒否）
    if (response.status === 400) {
      const errorBody = await response.text().catch(() => '');
      console.warn(`Backchannel logout rejected by ${clientId}: ${errorBody}`);
      // 失敗ログをDB/KVに記録（運用可視化用）
      await recordLogoutFailure(env, clientId, {
        statusCode: response.status,
        error: 'rejected_by_rp',
        errorDetail: errorBody,
        timestamp: Date.now(),
      });
      return {
        clientId,
        success: false,
        statusCode: response.status,
        error: 'rejected_by_rp',
        retryScheduled: false,
        duration_ms,
      };
    }

    // その他のエラーはリトライ対象
    return {
      clientId,
      success: false,
      statusCode: response.status,
      error: `HTTP ${response.status}`,
      retryScheduled: true,
      duration_ms,
    };
  } catch (error) {
    const duration_ms = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // 失敗ログを記録
    await recordLogoutFailure(env, clientId, {
      error: errorMessage,
      timestamp: Date.now(),
    });
    return {
      clientId,
      success: false,
      error: errorMessage,
      retryScheduled: true,
      duration_ms,
    };
  }
}

/**
 * 失敗ログをKVに記録（運用可視化用）
 * 設計レビュー【推奨】: Admin UI に「失敗した RP 一覧」「最後のエラー」を可視化
 */
async function recordLogoutFailure(
  env: Env,
  clientId: string,
  failure: {
    statusCode?: number;
    error: string;
    errorDetail?: string;
    timestamp: number;
  }
): Promise<void> {
  const key = `logout:failures:${clientId}`;
  // 最新の失敗のみ保持（TTL: 7日）
  await env.SETTINGS.put(key, JSON.stringify(failure), {
    expirationTtl: 7 * 24 * 60 * 60,
  });
}
```

---

## 7. Admin API設計

### 7.1 設定取得/更新

```http
# 設定取得
GET /admin/settings/logout
Authorization: Bearer {admin_token}

Response:
{
  "backchannel": {
    "enabled": true,
    "logout_token_exp_seconds": 120,
    "include_sub_claim": true,
    "include_sid_claim": true,
    "request_timeout_ms": 5000,
    "retry": {
      "max_attempts": 3,
      "initial_delay_ms": 1000,
      "max_delay_ms": 30000,
      "backoff_multiplier": 2
    },
    "on_final_failure": "log_only"
  },
  "frontchannel": {
    "enabled": true,
    "iframe_timeout_ms": 3000,
    "max_concurrent_iframes": 10
  },
  "session_management": {
    "enabled": true,
    "check_session_iframe_enabled": true
  }
}

# 設定更新（部分更新）
PATCH /admin/settings/logout
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "backchannel": {
    "logout_token_exp_seconds": 180,
    "retry": {
      "max_attempts": 5
    },
    "on_final_failure": "alert"
  }
}

Response: 200 OK
{
  "updated": true,
  "settings": { ... }
}
```

### 7.2 クライアント設定更新

```http
# クライアントのLogout URI設定
PATCH /admin/clients/{client_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "backchannel_logout_uri": "https://rp.example.com/logout/backchannel",
  "backchannel_logout_session_required": true,
  "frontchannel_logout_uri": "https://rp.example.com/logout/frontchannel",
  "frontchannel_logout_session_required": false
}
```

> **設計レビュー【任意】**: `backchannel_logout_uri` 設定時に以下を実施するとUX向上
>
> - HTTPS 検証（localhost 例外のみ許可）
> - Reachability check（オプション、設定で無効化可能）

### 7.3 動的クライアント登録対応

```http
# RFC 7591 Dynamic Client Registration
POST /register
Content-Type: application/json

{
  "redirect_uris": ["https://rp.example.com/callback"],
  "client_name": "Example RP",
  "backchannel_logout_uri": "https://rp.example.com/logout/backchannel",
  "backchannel_logout_session_required": true,
  "frontchannel_logout_uri": "https://rp.example.com/logout/frontchannel",
  "frontchannel_logout_session_required": false
}
```

### 7.4 Logout失敗状況の可視化（運用機能）

```http
# 失敗したRPの一覧取得
GET /admin/logout/failures
Authorization: Bearer {admin_token}

Response:
{
  "failures": [
    {
      "client_id": "client_abc",
      "client_name": "Example RP",
      "last_failure": {
        "timestamp": 1703318400000,
        "statusCode": 503,
        "error": "HTTP 503",
        "errorDetail": "Service Unavailable"
      }
    }
  ],
  "total": 1
}

# 特定クライアントの失敗履歴クリア
DELETE /admin/logout/failures/{client_id}
Authorization: Bearer {admin_token}

Response: 204 No Content
```

---

## 8. 型定義

### 8.1 Logout関連型

```typescript
// packages/ar-lib-core/src/types/logout.ts

/**
 * Logout Token Claims
 * OIDC Back-Channel Logout 1.0 Section 2.4
 *
 * 設計レビュー【必須】: aud は単一 string に固定
 * - Backchannel Logout Token は原則「単一 RP」宛て
 * - string[] にすると RP 実装差異によるバグの原因になる
 */
export interface LogoutTokenClaims {
  iss: string;
  aud: string; // 単一 client_id（配列ではない）
  iat: number;
  exp: number;
  jti: string;
  events: {
    'http://schemas.openid.net/event/backchannel-logout': Record<string, never>;
  };
  sub?: string;
  sid?: string;
  // nonce MUST NOT be present
}

/**
 * Backchannel Logout設定
 */
export interface BackchannelLogoutConfig {
  enabled: boolean;
  logout_token_exp_seconds: number;
  include_sub_claim: boolean;
  include_sid_claim: boolean;
  request_timeout_ms: number;
  retry: RetryConfig;
  on_final_failure: 'log_only' | 'alert';
}

/**
 * リトライ設定
 */
export interface RetryConfig {
  max_attempts: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
}

/**
 * Frontchannel Logout設定
 *
 * 注意【推奨】: iframe_timeout_ms は UX 制御用であり、セキュリティ保証ではない
 * - iframe のロード成功/失敗を OP が検知することは不可能（Frontchannel の本質的制約）
 * - セキュリティが重要な場合は Backchannel Logout を使用すること
 */
export interface FrontchannelLogoutConfig {
  enabled: boolean;
  iframe_timeout_ms: number;
  max_concurrent_iframes: number;
}

/**
 * Session Management設定
 *
 * 注意: Session Management は Conformance 専用機能として割り切り
 * - 実運用ではほぼ使われない（サードパーティ Cookie 制限）
 * - check_session_iframe_enabled で無効化可能
 */
export interface SessionManagementConfig {
  enabled: boolean;
  check_session_iframe_enabled: boolean;
}

/**
 * 統合Logout設定
 */
export interface LogoutConfig {
  backchannel: BackchannelLogoutConfig;
  frontchannel: FrontchannelLogoutConfig;
  session_management: SessionManagementConfig;
}

/**
 * Logout送信結果
 */
export interface LogoutSendResult {
  clientId: string;
  success: boolean;
  method: 'backchannel' | 'frontchannel';
  statusCode?: number;
  error?: string;
  retryScheduled?: boolean;
  duration_ms?: number;
}

/**
 * Logout失敗記録
 */
export interface LogoutFailureRecord {
  clientId: string;
  clientName?: string;
  lastFailure: {
    timestamp: number;
    statusCode?: number;
    error: string;
    errorDetail?: string;
  };
}
```

---

## 9. セキュリティ考慮事項

### 9.1 Logout Token署名検証

- **必須**: RPはLogout Tokenの署名を検証しなければならない
- **署名アルゴリズム**: RS256のみサポート（`none`は禁止）
- **キー**: ID Token署名と同じJWKSを使用

### 9.2 Replay Attack防止

```typescript
// JTIキャッシュによる重複チェック
const jtiCacheKey = `bcl_jti:${jti}`;
const existing = await env.SETTINGS.get(jtiCacheKey);
if (existing) {
  throw new Error('Logout token replay detected');
}
await env.SETTINGS.put(jtiCacheKey, '1', {
  expirationTtl: logoutTokenExpSeconds + 60,
});
```

### 9.3 HTTPS要件

- `backchannel_logout_uri`はHTTPS必須
- `frontchannel_logout_uri`はHTTPS必須
- 開発環境のみlocalhostでHTTP許可

### 9.4 タイムアウト

- Backchannel: 5秒（設定可能）
- Frontchannel iframe: 3秒（設定可能）
- 長時間ブロックを防止

### 9.5 Session Invalidation の完全性

> **設計レビュー【必須】**: Logout の本質は「通知」ではなく **Session invalidation の完全性**

セッション削除後、以下のエンドポイントが確実に失敗することを保証：

- `/token` (Refresh Token)
- `/token` (Token Exchange)
- `/userinfo`

---

## 10. 実装フェーズ

### Phase 1: Backchannel Logout送信（優先）

1. DBマイグレーション（クライアントフィールド追加、session_clientsテーブル）
2. Logout Token生成ロジック
3. 送信サービス実装
4. リトライ機構実装（多重enqueue防止含む）
5. Admin API実装
6. テスト

### Phase 2: Frontchannel Logout

1. Frontchannel送信ロジック（iframe生成）
2. タイムアウト処理
3. テスト

### Phase 3: Session Management（Conformance用）

1. `/session/check` エンドポイント実装
2. `session_state` パラメータ生成
3. Session iframe HTML
4. テスト

---

## 11. テスト計画

### 11.1 ユニットテスト

- [ ] Logout Token生成
- [ ] Logout Token `aud` が常に単一 string であること
- [ ] 署名検証
- [ ] 設定値読み込み（KV → 環境変数 → デフォルト）
- [ ] リトライロジック
- [ ] 多重enqueue防止ロジック

### 11.2 統合テスト

- [ ] Backchannel Logout E2Eフロー
- [ ] リトライ→最終失敗フロー
- [ ] 複数RP同時通知
- [ ] Frontchannel iframe生成

### 11.3 Session Invalidation 完全性テスト

> **設計レビュー【必須】**: 追加すべきテスト

- [ ] Session削除後に `/token` (Refresh Token) が失敗すること
- [ ] Session削除後に `/token` (Token Exchange) が失敗すること
- [ ] Session削除後に `/userinfo` が失敗すること

### 11.4 Conformance Test

- [ ] OIDC Conformance Suite: Back-Channel Logout
- [ ] OIDC Conformance Suite: Front-Channel Logout
- [ ] OIDC Conformance Suite: Session Management

---

## 12. 注意事項・制約

### 12.1 Frontchannel Logout の制約

> **設計レビュー【推奨】**: README / Admin UI に明示すべき

iframe 方式の Frontchannel Logout には以下の本質的制約があります：

1. **OP が成功/失敗を検知できない**
   - ブラウザの Same-Origin Policy により、iframe の読み込み結果を親ウィンドウから確認できない
   - `iframe_timeout_ms` は「待ち時間の上限」であり、RP での処理成功を保証しない

2. **サードパーティ Cookie 制限**
   - Safari, Brave, 将来の Chrome では、iframe 内のリクエストに Cookie が付与されない可能性
   - これにより RP 側でセッション特定ができず、logout が機能しない

3. **推奨事項**
   - セキュリティが重要な場合は **Backchannel Logout** を使用
   - Frontchannel は UX 向上のための「ベストエフォート」として位置づけ

### 12.2 Session Management の位置づけ

Session Management（check_session_iframe）は：

- **Conformance 専用機能**として割り切り
- 実運用では機能しない環境が増えている
- 設定で無効化可能（`check_session_iframe_enabled: false`）

---

## 13. 参考文献

- [OIDC Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html)
- [OIDC Front-Channel Logout 1.0](https://openid.net/specs/openid-connect-frontchannel-1_0.html)
- [OIDC RP-Initiated Logout 1.0](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
- [OIDC Session Management 1.0](https://openid.net/specs/openid-connect-session-1_0.html)
