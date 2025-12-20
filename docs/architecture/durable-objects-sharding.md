# Durable Objects Sharding Architecture

> This document describes the sharding strategy for Authrim's 15 Durable Objects, including classification rationale, configuration, and operational guidelines.

## Overview

Authrim uses Cloudflare Durable Objects for stateful operations requiring strong consistency. To scale beyond single-instance limits and optimize for global latency, we implement **region-aware sharding** with FNV-1a hashing.

### Key Principles

1. **Self-Routing IDs**: Each resource ID embeds shard information for O(1) routing
2. **Generation-Based Migration**: Rolling updates without downtime
3. **Colocation Groups**: Related DOs share shard keys for consistency
4. **Region Affinity**: `locationHint` places DOs near request origins

---

## ⚠️ Forbidden Rules

> **CRITICAL: Violating these rules causes intermittent authentication failures**

1. **`user-client` group shard count MUST match**
   - AuthCodeStore and RefreshTokenRotator MUST have identical shard counts
   - Violation causes: "login works sometimes, fails randomly"

2. **Same shard key → same shard count**
   - `hash % 64 ≠ hash % 32` → colocation breaks
   - Always check colocation table when adding new DOs

3. **Salt changes require generation bump**
   - Shard mapping changes = potential request loss during transition
   - Salt change = new generation, never in-place modification

4. **Never shard KeyManager or VersionManager**
   - These are global singletons by design (see Classification section)

---

## DO Classification

### A. Global Singleton (2 DOs)

These DOs MUST remain single-instance. Sharding is architecturally impossible.

| DO | Reason | Consequence if Sharded |
|----|--------|------------------------|
| **KeyManager** | Single source of truth for JWK key pairs. Key rotation requires atomic operations. | Signature verification fails randomly |
| **VersionManager** | Monotonically increasing version counter. Must guarantee uniqueness. | Version gaps, deployment tracking breaks |

**Why KeyManager is Singleton:**
- JWK key pairs must be consistent across all Workers
- Key rotation (create new → deprecate old → delete) is a multi-step atomic operation
- Multiple instances would create "key split-brain" where tokens signed by one instance fail verification on another

**Why VersionManager is Singleton:**
- Worker deployment versioning requires strictly monotonic IDs
- Distributed counters introduce gaps or duplicates
- Single counter ensures: `v_n < v_{n+1}` always

### B. Region-Aware Sharding (11 DOs)

#### B-1. Core Authentication (7 DOs)

| DO | Shard Key | Prefix | Colocation |
|----|-----------|--------|------------|
| SessionStore | uuid (random) | `ses` | Independent |
| **AuthCodeStore** | `userId:clientId` | `acd` | ✅ user-client group |
| **RefreshTokenRotator** | `userId:clientId` | `rft` | ✅ user-client group |
| ChallengeStore | userId/challengeId | `cha` | Independent |
| TokenRevocationStore | uuid (random) | `rev` | Independent |
| CredentialOfferStore | `tenantId:userId` | `cof` | Independent |
| VPRequestStore | `tenantId:clientId` | `vpr` | Independent |

#### B-2. Client-Based Sharding (2 DOs - Implemented)

| DO | Shard Key | Prefix | Notes |
|----|-----------|--------|-------|
| **DPoPJTIStore** | `client_id` | `dpp` | High RPS, JTI replay prevention |
| **PARRequestStore** | `client_id` | `par` | Pushed Authorization Requests |

#### B-3. Global DO (2 DOs - Pending Sharding)

| DO | Current | Prefix | Notes |
|----|---------|--------|-------|
| **DeviceCodeStore** | Global | `dev` | Device Authorization Flow |
| **CIBARequestStore** | Global | `cba` | Client-Initiated Backchannel Auth |

> **Note**: DeviceCodeStore and CIBARequestStore currently use global DO instances.
> Sharding is blocked by user_code reverse lookup requirements:
> - User enters `user_code` (e.g., "ABCD-EFGH") to authorize device
> - System must find corresponding `device_code` without knowing which shard
> - **Future solution**: KV-based `user_code → device_code` index, then shard by `device_code`

### C. Special Sharding (3 DOs)

| DO | Shard Format | Notes |
|----|--------------|-------|
| SAMLRequestStore | `issuer:{entityId}` | Per-IdP isolation |
| RateLimiterCounter | Purpose-based (`email-code`, `scim-auth:{ip}`) | Per-purpose isolation |
| PermissionChangeHub | `{tenantId}` | Per-tenant real-time notifications |

---

## ID Format Specification

### Resource ID Format
```
g{generation}:{region}:{shard}:{type}_{uuid}
```

| Component | Description | Example |
|-----------|-------------|---------|
| `generation` | Configuration version (1-999) | `g1`, `g2` |
| `region` | Cloudflare region key | `apac`, `enam`, `weur` |
| `shard` | Shard index (0 to N-1) | `0`, `31`, `63` |
| `type` | 3-character DO type prefix | `ses`, `acd`, `rft` |
| `uuid` | Unique identifier | `abc123-def456` |

**Example**: `g1:apac:3:ses_abc123-def456`

### Instance Name Format
```
{tenantId}:{region}:{typeAbbrev}:{shard}
```

**Example**: `default:apac:ses:3`

### Type Prefix Reference (3-character)

| DO | ID Prefix | Instance Abbrev |
|----|-----------|-----------------|
| SessionStore | `ses` | `ses` |
| AuthCodeStore | `acd` | `acd` |
| RefreshTokenRotator | `rft` | `rft` |
| ChallengeStore | `cha` | `cha` |
| TokenRevocationStore | `rev` | `rev` |
| CredentialOfferStore | `cof` | `cof` |
| VPRequestStore | `vpr` | `vpr` |
| DPoPJTIStore | `dpp` | `dpp` |
| PARRequestStore | `par` | `par` |
| DeviceCodeStore | `dev` | `dev` |
| CIBARequestStore | `cba` | `cba` |

---

## Sharding Strategy

### Shard Key Design

| Pattern | Key | Use Case | Colocation |
|---------|-----|----------|------------|
| **Random** | uuid | Session, Revocation | None (even distribution) |
| **User-Client** | `userId:clientId` | AuthCode, RefreshToken | REQUIRED |
| **Client** | `client_id` | PAR, DeviceCode, CIBA, DPoP | Future extensible |
| **Tenant-User** | `tenantId:userId` | CredentialOffer | None |
| **Tenant-Client** | `tenantId:clientId` | VPRequest | None |

### Hash Algorithm

FNV-1a (32-bit) provides:
- Fast computation
- Good distribution for short strings
- Deterministic results

```typescript
function fnv1a(str: string): number {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  return hash >>> 0;
}
```

### Region Distribution

Default percentages (configurable per tenant):

| Region | Percentage | Coverage |
|--------|------------|----------|
| `apac` | 20% | Asia-Pacific |
| `enam` | 40% | North America East |
| `weur` | 40% | Western Europe |

---

## Colocation Groups

### user-client Group (CRITICAL)

```
┌─────────────────────────────────────────────┐
│ Group: user-client                          │
│ Key: userId:clientId                        │
│ Members: AuthCodeStore, RefreshTokenRotator │
│ Shards: 64 (MUST be identical)              │
│                                             │
│ Invariant: hash(key) % 64 routes both DOs   │
│ to the same shard index                     │
└─────────────────────────────────────────────┘
```

**Why colocation matters:**
- Authorization code is issued → stored in AuthCodeStore shard N
- Token request exchanges code → RefreshToken stored in RefreshTokenRotator shard N
- Same shard enables atomic token family management

**If shard counts differ:**
- `hash("user1:client1") % 64 = 15`
- `hash("user1:client1") % 32 = 15` (coincidence, works)
- `hash("user2:client2") % 64 = 47`
- `hash("user2:client2") % 32 = 15` (different! breaks)

### Independent Groups

```
┌─────────────────────────────────────────────┐
│ random-high-rps: TokenRevocation            │
│ → Random UUID keys, shard count independent │
├─────────────────────────────────────────────┤
│ random-medium-rps: Session, Challenge       │
│ → Random UUID/userId keys                   │
├─────────────────────────────────────────────┤
│ client-based: PAR, DeviceCode, CIBA, DPoP   │
│ → client_id keys                            │
│ ⚠️ Future: client_id + salt extensible      │
├─────────────────────────────────────────────┤
│ vc: CredentialOffer, VPRequest              │
│ → tenant:user/client keys                   │
└─────────────────────────────────────────────┘
```

---

## Configuration

### KV Key
```
region_shard_config:{tenantId}
```

### Configuration Structure

```json
{
  "version": 2,
  "currentGeneration": 1,
  "baseRegions": {
    "apac": 20,
    "enam": 40,
    "weur": 40
  },
  "groups": {
    "user-client": {
      "totalShards": 64,
      "members": ["authcode", "refresh"],
      "description": "Colocated by userId:clientId"
    },
    "random-high-rps": {
      "totalShards": 64,
      "members": ["revocation"],
      "description": "High RPS endpoints with random UUID keys"
    },
    "random-medium-rps": {
      "totalShards": 32,
      "members": ["session", "challenge"],
      "description": "Medium RPS endpoints"
    },
    "client-based": {
      "totalShards": 32,
      "members": ["par", "device", "ciba", "dpop"],
      "description": "client_id based sharding"
    },
    "vc": {
      "totalShards": 16,
      "members": ["credoffer", "vprequest"],
      "description": "Verifiable Credentials"
    }
  },
  "previousGenerations": [
    {
      "generation": 0,
      "totalShards": 20,
      "validUntil": "2025-02-01T00:00:00Z"
    }
  ]
}
```

### Admin API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/sharding/config` | GET | Retrieve current configuration |
| `/admin/sharding/config` | PUT | Update configuration |
| `/admin/sharding/migrate` | POST | Trigger generation migration |

---

## Generation Migration

### Write Path
- Always writes to **current generation only**
- New resources get new generation ID prefix

### Read Path
- Attempts current generation first
- Falls back to `previousGenerations` if not found
- Ordered by recency

### Migration Timeline

```
Day 0: Deploy new generation config
        ↓
Day 0-7: Dual-read (current + previous)
        ↓
Day 7+: Old data expires via TTL
        ↓
Day 14: Remove previousGeneration entry
```

### TTL Considerations

| DO Type | TTL | Notes |
|---------|-----|-------|
| Session | 1 hour | Short-lived, natural expiry |
| AuthCode | 10 minutes | Very short-lived |
| RefreshToken | 30 days | Longest TTL, consider migration timing |
| DPoP JTI | `token_lifetime + 5min` | Hard cap: 1 hour |

---

## Failure Modes

### Config Missing (KV unavailable)

**Behavior**: Fall back to hardcoded defaults
- `DEFAULT_TOTAL_SHARDS = 20`
- `DEFAULT_REGION_DISTRIBUTION = { apac: 20, enam: 40, weur: 40 }`

**Impact**: Reduced performance, consistency maintained

### Shard Mismatch Detection

Runtime validation for `user-client` group:

```typescript
function validateColocatedGroupShardCount(config: RegionShardConfig): void {
  const userClientGroup = config.groups?.['user-client'];
  if (userClientGroup) {
    const shardCounts = userClientGroup.members.map(
      m => getShardCountForType(config, m)
    );
    if (new Set(shardCounts).size > 1) {
      // CRITICAL: This breaks authentication
      console.error('CRITICAL: user-client group shard count mismatch!');

      // Fail-Closed in production
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Shard configuration invalid');
      }
    }
  }
}
```

**Policy**:
- **Production**: Fail-Closed (500 error + clear message)
- **Development**: Warn + continue (for debugging)

---

## Monitoring

### Recommended Metrics

| Metric | Labels | Description |
|--------|--------|-------------|
| `do_shard_config_invalid` | `tenantId`, `group` | Config validation failures |
| `do_request_duration` | `do_type`, `region`, `shard` | Latency per shard |
| `do_shard_distribution` | `do_type` | Request distribution (check for hotspots) |
| `do_generation_fallback` | `do_type`, `from_gen`, `to_gen` | Previous generation reads |

### Alerting Rules

```yaml
- alert: ShardConfigInvalid
  expr: increase(do_shard_config_invalid[5m]) > 0
  severity: critical
  description: "Shard configuration mismatch detected"

- alert: ShardHotspot
  expr: do_shard_distribution{quantile="0.99"} / do_shard_distribution{quantile="0.50"} > 10
  severity: warning
  description: "Shard distribution imbalance detected"
```

---

## Future Extensibility

### client_id Sharding Salt

For high-volume RPs (single client_id with extreme RPS):

```typescript
// Future extension
const shardKey = salt
  ? `${clientId}:${salt}`
  : clientId;
```

**Requirements**:
1. Salt change = new generation
2. Shard mapping changes = potential request loss during transition
3. Document salt in client metadata

### Per-DO Shard Count Override

```json
{
  "groups": {
    "client-based": {
      "totalShards": 32,
      "overrides": {
        "dpop": 64  // Higher for this specific DO
      }
    }
  }
}
```

### ID Prefix Migration (2-char → 3-char)

**Current State** (as of Phase 9):

| DO | Current Prefix | Target Prefix | Status |
|----|----------------|---------------|--------|
| SessionStore | `session_` | `ses_` | Pending |
| AuthCodeStore | `ac_` | `acd_` | Pending |
| RefreshTokenRotator | `rt_` | `rft_` | Pending |
| ChallengeStore | `ch_` | `cha_` | Pending |
| TokenRevocationStore | `at_` | `rev_` | Pending |
| CredentialOfferStore | `co_` | `cof_` | Pending |
| VPRequestStore | `vp_` | `vpr_` | Pending |
| DPoPJTIStore | `dpp_` | `dpp_` | ✅ Done |
| PARRequestStore | `par_` | `par_` | ✅ Done |

**Migration Strategy**:
1. Bump generation via Admin API (`POST /admin/sharding/migrate`)
2. New resources use 3-char prefix (current generation)
3. Read path supports both current + previous generation prefixes
4. Old resources expire via TTL (no manual cleanup needed)

**Timeline**: Deferred until operational need. No breaking changes expected.

---

## Implementation Checklist

- [ ] Runtime guard for user-client shard count mismatch (Fail-Closed)
- [ ] Metric `do_shard_config_invalid{tenantId, group}` counter
- [ ] Document client-based group future extensibility (salt = generation bump)
- [ ] DPoP JTI TTL / Hard Cap / generation read policy documented
- [ ] `region_shard_config` fallback behavior documented
- [ ] "Forbidden Rules" section at document top
- [ ] TYPE_ABBREV constants in region-sharding.ts
