# Check API Reference

**Version**: 0.1.0
**Last Updated**: 2025-12-19
**Phase**: 8.3 Real-time Check API Model

---

## Overview

Check API provides a unified interface for real-time permission checking, combining multiple authorization models:

- **ID-Level Permissions**: Fine-grained permissions on specific resources
- **RBAC (Role-Based)**: Role-based permission checking
- **ReBAC (Relationship-Based)**: Zanzibar-style relationship checking
- **ABAC (Attribute-Based)**: Context-aware permission evaluation

### Architecture

```mermaid
flowchart TB
    subgraph Clients["Client Applications"]
        RS["Resource Server"]
        APP["Application"]
        SDK["Client SDK"]
    end

    subgraph CheckAPI["Check API"]
        subgraph Endpoints["Endpoints"]
            E1["/api/check"]
            E2["/api/check/batch"]
            E3["/api/check/subscribe"]
        end

        subgraph Engine["UnifiedCheckService"]
            ID["ID-Level Check"]
            RBAC["RBAC Check"]
            REBAC["ReBAC Check"]
            ABAC["ABAC/Computed"]
        end

        subgraph Cache["3-Layer Cache"]
            L1["In-Memory (LRU)"]
            L2["KV Cache"]
            L3["D1 Database"]
        end
    end

    subgraph WS["WebSocket Push"]
        HUB["PermissionChangeHub DO"]
    end

    Clients --> CheckAPI
    Endpoints --> Engine
    Engine --> Cache
    HUB -.->|"Real-time\nNotifications"| Clients
```

### Evaluation Order

The Check API evaluates permissions in the following order (first match wins):

1. **ID-Level Permission** - Direct permission on specific resource
2. **Role-Based (RBAC)** - Permission via assigned roles
3. **ReBAC** - Relationship-based check (optional)
4. **Computed/ABAC** - Attribute and context-based evaluation

---

## Authentication

Check API supports dual authentication methods:

### API Key Authentication

For machine-to-machine (M2M) communication. API keys have a `chk_` prefix.

```http
Authorization: Bearer chk_xxxxxxxxxxxxxxxxxxxx
```

### Access Token Authentication

For dynamic clients using OAuth 2.0 access tokens.

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### DPoP (Demonstration of Proof of Possession)

For high-security scenarios:

```http
Authorization: DPoP eyJhbGciOiJSUzI1NiIsInR5cCI6ImF0K2p3dCJ9...
DPoP: eyJhbGciOiJFUzI1NiIsInR5cCI6ImRwb3Arand0IiwiandrIjp7...
```

### Authentication Priority

When multiple authentication methods are present:

```
DPoP > Access Token > API Key
```

---

## Permission Format

### String Format (Recommended)

Permissions use a colon-separated format:

```
resource:action           # Type-level permission
resource:id:action        # ID-level permission
```

**Examples:**
```
documents:read            # Can read any document (type-level)
documents:doc_123:read    # Can read specific document doc_123 (ID-level)
orders:create             # Can create orders
billing:invoices:write    # Can write to billing invoices
```

**Constraints:**
- Components must contain only URL-safe characters: `[a-zA-Z0-9_-]`
- Colons (`:`) are reserved as delimiters

### Structured Format

For complex resource identifiers:

```json
{
  "permission": {
    "resource": "documents",
    "id": "doc_123",
    "action": "read"
  }
}
```

### Wildcard Permissions

```
documents:*              # All actions on documents
*:*                      # All actions on all resources (superuser)
```

---

## Endpoints

### POST /api/check

Evaluate a single permission check.

**Request:**
```http
POST /api/check
Authorization: Bearer chk_xxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "subject_id": "user_123",
  "permission": "documents:doc_456:read"
}
```

**Full Request Schema:**
```json
{
  "subject_id": "user_123",
  "subject_type": "user",
  "permission": "documents:doc_456:read",
  "tenant_id": "default",
  "resource_context": {
    "type": "document",
    "owner_id": "user_456",
    "org_id": "org_789",
    "attributes": {
      "status": "published",
      "classification": "internal"
    }
  },
  "rebac": {
    "relation": "viewer",
    "object": "document:doc_456"
  }
}
```

**Request Fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `subject_id` | string | Yes | - | Subject (user/service) identifier |
| `subject_type` | string | No | `user` | `user` or `service` |
| `permission` | string\|object | Yes | - | Permission to check |
| `tenant_id` | string | No | `default` | Tenant identifier |
| `resource_context` | object | No | - | Additional context for ABAC |
| `rebac` | object | No | - | Optional ReBAC check parameters |

**Response:**
```json
{
  "allowed": true,
  "resolved_via": ["id_level"],
  "final_decision": "allow",
  "cache_ttl": 60
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `allowed` | boolean | Whether access is permitted |
| `resolved_via` | string[] | How permission was resolved (`direct`, `role`, `rebac`, `id_level`, `computed`) |
| `final_decision` | string | `allow` or `deny` |
| `cache_ttl` | number | Recommended cache TTL in seconds |
| `reason` | string | Reason for denial (only on deny) |
| `debug` | object | Debug info (when `CHECK_API_DEBUG_MODE=true`) |

---

### POST /api/check/batch

Evaluate multiple permission checks in a single request.

**Request:**
```http
POST /api/check/batch
Authorization: Bearer chk_xxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "checks": [
    { "subject_id": "user_123", "permission": "documents:read" },
    { "subject_id": "user_123", "permission": "documents:doc_456:write" },
    { "subject_id": "user_123", "permission": "billing:admin" }
  ],
  "stop_on_deny": false
}
```

**Request Fields:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `checks` | CheckApiRequest[] | Yes | - | Array of check requests (max 100) |
| `stop_on_deny` | boolean | No | `false` | Stop processing on first deny |

**Response:**
```json
{
  "results": [
    {
      "allowed": true,
      "resolved_via": ["role"],
      "final_decision": "allow"
    },
    {
      "allowed": true,
      "resolved_via": ["id_level"],
      "final_decision": "allow"
    },
    {
      "allowed": false,
      "resolved_via": [],
      "final_decision": "deny",
      "reason": "no_matching_permission"
    }
  ],
  "summary": {
    "total": 3,
    "allowed": 2,
    "denied": 1,
    "evaluation_time_ms": 12
  }
}
```

**Rate Limiting Note:**

Batch requests consume rate limit proportionally to the number of checks:
```
rate_limit_cost = checks.length
```

---

### GET /api/check/subscribe

WebSocket endpoint for real-time permission change notifications.

**Connection:**
```
wss://policy.example.com/api/check/subscribe?token=chk_xxxxxxxxxxxx&tenant_id=default
```

> **Note:** Token is passed as query parameter because WebSocket upgrade requests cannot include custom headers.

**Client → Server Messages:**

```typescript
// Subscribe to permission changes
{
  "type": "subscribe",
  "subjects": ["user_123", "user_456"],
  "resources": ["document:*", "project:proj_789"],
  "relations": ["viewer", "editor"]
}

// Keepalive ping
{
  "type": "ping",
  "timestamp": 1702579200000
}

// Unsubscribe
{
  "type": "unsubscribe",
  "subscription_id": "sub_xxxxxxxx"
}
```

**Server → Client Messages:**

```typescript
// Subscription confirmed
{
  "type": "subscribed",
  "subscription_id": "sub_xxxxxxxx",
  "subscriptions": {
    "subjects": ["user_123", "user_456"],
    "resources": ["document:*", "project:proj_789"],
    "relations": ["viewer", "editor"]
  }
}

// Permission change notification
{
  "type": "permission_change",
  "event": "grant",
  "subject_id": "user_123",
  "resource": "document:doc_456",
  "relation": "viewer",
  "permission": "documents:doc_456:read",
  "timestamp": 1702579200000,
  "invalidate_cache": true
}

// Pong response
{
  "type": "pong",
  "timestamp": 1702579200000
}

// Error
{
  "type": "error",
  "code": "invalid_subscription",
  "message": "Invalid subscription ID"
}
```

**Subscription Matching:**

Subscriptions support pattern matching:

| Pattern | Matches |
|---------|---------|
| `user_123` | Exact subject match |
| `*` | All subjects |
| `document:*` | All documents (wildcard prefix) |
| `document:doc_456` | Exact resource match |

---

### GET /api/check/subscribe/stats

Get WebSocket hub statistics.

**Request:**
```http
GET /api/check/subscribe/stats?tenant_id=default
Authorization: Bearer chk_xxxxxxxxxxxxxxxxxxxx
```

**Response:**
```json
{
  "tenant_id": "default",
  "websocket_enabled": true,
  "active_connections": 42,
  "subscriptions": 38
}
```

---

## API Key Management

API keys are managed via the Admin API.

### Create API Key

```http
POST /api/admin/check-api-keys
Authorization: Bearer <ADMIN_API_SECRET>
Content-Type: application/json

{
  "name": "Production Resource Server",
  "client_id": "rs_production",
  "allowed_operations": ["check", "batch"],
  "rate_limit_tier": "moderate",
  "expires_in_days": 365
}
```

**Response:**
```json
{
  "id": "key_xxxxxxxx",
  "name": "Production Resource Server",
  "client_id": "rs_production",
  "key": "chk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "key_prefix": "chk_xxxx",
  "allowed_operations": ["check", "batch"],
  "rate_limit_tier": "moderate",
  "expires_at": 1734566400,
  "created_at": 1702944000
}
```

> **Important:** The full API key is only returned once at creation time. Store it securely.

### List API Keys

```http
GET /api/admin/check-api-keys
Authorization: Bearer <ADMIN_API_SECRET>
```

### Revoke API Key

```http
DELETE /api/admin/check-api-keys/{key_id}
Authorization: Bearer <ADMIN_API_SECRET>
```

### Rotate API Key

```http
POST /api/admin/check-api-keys/{key_id}/rotate
Authorization: Bearer <ADMIN_API_SECRET>
```

---

## Rate Limiting

### Tiers

| Tier | Requests/min | Use Case |
|------|--------------|----------|
| `strict` | 100 | Testing, development |
| `moderate` | 500 | Standard production |
| `lenient` | 2000 | High-volume services |

### Rate Limit Headers

```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1702579260
```

### 429 Too Many Requests

```json
{
  "error": "rate_limit_exceeded",
  "error_description": "Rate limit exceeded. Please retry after 23 seconds.",
  "retry_after": 23
}
```

---

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `ENABLE_CHECK_API` | `false` | Enable Check API functionality |
| `CHECK_API_DEBUG_MODE` | `false` | Include debug info in responses |
| `CHECK_API_WEBSOCKET_ENABLED` | `false` | Enable WebSocket Push |
| `CHECK_API_AUDIT_ENABLED` | `true` | Enable audit logging |

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "unauthorized",
  "error_description": "Invalid or missing authentication token"
}
```

### 403 Forbidden

```json
{
  "error": "forbidden",
  "error_description": "API key does not have permission for batch operation"
}
```

### 400 Bad Request

```json
{
  "error": "invalid_request",
  "error_description": "Invalid permission format: resource cannot be empty"
}
```

### 503 Service Unavailable

```json
{
  "error": "feature_disabled",
  "error_description": "Check API is not enabled. Set ENABLE_CHECK_API=true to enable."
}
```

---

## Integration Examples

### cURL

**Single Check:**
```bash
curl -X POST https://policy.example.com/api/check \
  -H "Authorization: Bearer chk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_id": "user_123",
    "permission": "documents:doc_456:read"
  }'
```

**Batch Check:**
```bash
curl -X POST https://policy.example.com/api/check/batch \
  -H "Authorization: Bearer chk_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "checks": [
      { "subject_id": "user_123", "permission": "documents:read" },
      { "subject_id": "user_123", "permission": "documents:write" }
    ]
  }'
```

### TypeScript

```typescript
interface CheckApiClient {
  check(request: CheckRequest): Promise<CheckResponse>;
  batchCheck(requests: CheckRequest[]): Promise<BatchCheckResponse>;
}

async function createCheckApiClient(apiKey: string): Promise<CheckApiClient> {
  const baseUrl = 'https://policy.example.com';

  return {
    async check(request) {
      const response = await fetch(`${baseUrl}/api/check`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      return response.json();
    },

    async batchCheck(requests) {
      const response = await fetch(`${baseUrl}/api/check/batch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ checks: requests }),
      });
      return response.json();
    },
  };
}

// Usage
const client = await createCheckApiClient('chk_your_api_key');

const result = await client.check({
  subject_id: 'user_123',
  permission: 'documents:doc_456:read',
});

if (result.allowed) {
  // Access granted
} else {
  // Access denied: result.reason
}
```

### WebSocket Client

```typescript
class CheckApiWebSocketClient {
  private ws: WebSocket | null = null;
  private subscriptionId: string | null = null;

  constructor(
    private baseUrl: string,
    private token: string,
    private tenantId: string = 'default'
  ) {}

  async connect(): Promise<void> {
    const url = `${this.baseUrl}/api/check/subscribe?token=${this.token}&tenant_id=${this.tenantId}`;
    this.ws = new WebSocket(url.replace('https://', 'wss://'));

    return new Promise((resolve, reject) => {
      this.ws!.onopen = () => resolve();
      this.ws!.onerror = (e) => reject(e);
    });
  }

  subscribe(options: {
    subjects?: string[];
    resources?: string[];
    relations?: string[];
  }): void {
    this.ws?.send(
      JSON.stringify({
        type: 'subscribe',
        ...options,
      })
    );
  }

  onPermissionChange(callback: (event: PermissionChangeEvent) => void): void {
    this.ws?.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'permission_change') {
        callback(data);
      }
    });
  }

  disconnect(): void {
    this.ws?.close();
  }
}

// Usage
const wsClient = new CheckApiWebSocketClient(
  'https://policy.example.com',
  'chk_your_api_key'
);

await wsClient.connect();

wsClient.subscribe({
  subjects: ['user_123'],
  resources: ['document:*'],
});

wsClient.onPermissionChange((event) => {
  console.log(`Permission ${event.event}: ${event.subject_id} -> ${event.resource}`);
  if (event.invalidate_cache) {
    // Invalidate local permission cache
  }
});
```

---

## Comparison with Other Authorization Models

| Feature | Check API | Token Embedding (8.2) | ReBAC API |
|---------|-----------|----------------------|-----------|
| Latency | Low (~10ms) | Zero (embedded) | Medium (~20ms) |
| Real-time Updates | Yes (WebSocket) | No (token refresh) | Yes |
| Offline Support | No | Yes | No |
| Dynamic Permissions | Yes | Limited | Yes |
| Use Case | Real-time checks | Cached permissions | Relationship queries |

### When to Use Check API

- **Real-time permission changes** must be reflected immediately
- **Dynamic permissions** based on resource context
- **Complex authorization logic** requiring multiple checks
- **Audit trail** requirements

### When to Use Token Embedding

- **High-frequency permission checks** (embedded = zero latency)
- **Offline-capable** applications
- **Simple permission models** that don't change frequently

---

## Limitations

### WebSocket Connections

- Maximum connections per tenant hub: ~32,768 (Cloudflare DO limit)
- For larger deployments, consider sharding strategy

### Batch Check

- Maximum checks per request: 100
- Rate limit cost = number of checks

---

## Related Documents

- [Token Embedding API](./TOKEN_EMBEDDING.md)
- [ReBAC Architecture](../../../architecture/rebac.md)
- [Policy Service Overview](./README.md)

---

> **Last Updated**: 2025-12-19
