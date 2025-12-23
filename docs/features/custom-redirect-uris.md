# Custom Redirect URIs (Authrim Extension)

> **Note**: This is an Authrim extension, NOT part of the OIDC/OAuth 2.0 standard specification.

## Overview

Custom Redirect URIs allow clients to specify alternative redirect destinations for error and cancellation scenarios in the OAuth 2.0 / OIDC authorization flow. This provides a better user experience by enabling clients to display context-aware error pages.

### Key Points

- **`error_uri` and `cancel_uri` are NOT token delivery endpoints**
- **Tokens are ALWAYS returned to `redirect_uri` only**
- These URIs are for UX improvement (error/cancel navigation), not for protocol-level token handling

## Parameters

| Parameter | Description | Use Case |
|-----------|-------------|----------|
| `error_uri` | Redirect destination on technical errors | Authentication failure, session expiry, server error |
| `cancel_uri` | Redirect destination on user cancellation | Consent denial, login cancellation |

### Determining Which URI to Use

| Scenario | URI Used | Reason |
|----------|----------|--------|
| User denies consent | `cancel_uri` | Explicit user decision |
| User cancels login | `cancel_uri` | Explicit user decision |
| Session expired | `error_uri` | Technical error |
| Server error | `error_uri` | Technical error |
| Invalid configuration | `error_uri` | Technical error |
| Invalid scope | `error_uri` (via `redirect_uri`) | Technical error |

**Decision Rule**: User cancellation is determined by explicit `isUserCancellation` flag in the code, NOT by the `access_denied` error code alone.

## Security Model

### Validation Rules

1. **Same-origin always allowed**: If the custom URI has the same origin as `redirect_uri`, it's automatically allowed
2. **Pre-registered origins**: Different origins must be registered in `allowed_redirect_origins`
3. **HTTPS required**: All custom URIs must use HTTPS (except `localhost` for development)
4. **No fragments**: Fragment identifiers (`#`) are forbidden

### Open Redirect Prevention

```
Validation Flow:
1. Parse customUri → Check HTTPS → Check no fragment
2. Compare origin: customUri.origin === redirectUri.origin → ALLOW (same_origin)
3. Check allowlist: customUri.origin in allowed_redirect_origins → ALLOW (pre_registered)
4. Otherwise → REJECT (Open Redirect prevention)
```

## Client Configuration

### Via Dynamic Client Registration (DCR)

Use the Authrim extension parameter `x_allowed_redirect_origins`:

```json
POST /register
{
  "client_name": "My App",
  "redirect_uris": ["https://app.example.com/callback"],
  "x_allowed_redirect_origins": [
    "https://errors.example.com",
    "https://admin.example.com"
  ]
}
```

### Via Admin API

**Create client with allowed origins:**
```json
POST /admin/clients
{
  "client_name": "My App",
  "redirect_uris": ["https://app.example.com/callback"],
  "allowed_redirect_origins": [
    "https://errors.example.com",
    "https://admin.example.com"
  ]
}
```

**Update existing client:**
```json
PUT /admin/clients/{client_id}
{
  "allowed_redirect_origins": [
    "https://errors.example.com",
    "https://admin.example.com"
  ]
}
```

**Clear allowed origins (set to null or empty array):**
```json
PUT /admin/clients/{client_id}
{
  "allowed_redirect_origins": []
}
```

### Origin Format Requirements

- Must be valid URL origins (protocol + host + port)
- Must use HTTPS (except localhost)
- No path, query, or fragment
- Duplicates are automatically removed
- Origins are normalized (lowercase)

**Valid examples:**
- `https://example.com`
- `https://example.com:8443`
- `http://localhost:3000`

**Invalid examples:**
- `https://example.com/path` (contains path)
- `http://example.com` (not HTTPS, not localhost)
- `https://example.com?query=1` (contains query)

## Usage in Authorization Request

```
GET /authorize?
  client_id=xxx&
  redirect_uri=https://app.example.com/callback&
  error_uri=https://app.example.com/auth-error&
  cancel_uri=https://app.example.com/auth-cancelled&
  response_type=code&
  scope=openid%20profile
```

## Response Behavior

### On Error (using `error_uri`)

```
302 Found
Location: https://app.example.com/auth-error?error=server_error&error_description=...&state=xyz
```

### On User Cancellation (using `cancel_uri`)

```
302 Found
Location: https://app.example.com/auth-cancelled?error=access_denied&error_description=User%20denied%20the%20consent%20request&state=xyz
```

### State Parameter

The `state` parameter is ALWAYS included in the redirect, following the same rules as `redirect_uri`. This ensures CSRF protection is maintained.

## Database Schema

```sql
-- Migration 015
ALTER TABLE oauth_clients ADD COLUMN allowed_redirect_origins TEXT;
```

The column stores a JSON array of origin strings:
```json
["https://errors.example.com", "https://admin.example.com"]
```

## Error Handling

### Parse Failure (Strict Mode)

If `allowed_redirect_origins` JSON parsing fails, it's treated as an empty array. This is a security-first approach: corrupted data doesn't lead to permissive behavior.

```typescript
// JSON parse failure → empty array (strict mode)
function parseClientAllowedOrigins(jsonString: string | null): string[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(o => typeof o === 'string');
  } catch {
    console.warn('[Custom Redirect] Parse failed, treating as empty');
    return [];
  }
}
```

### Invalid Custom URI

If `error_uri` or `cancel_uri` validation fails, the authorization request is rejected with an HTML error page (cannot redirect to an invalid URI).

## WebSDK Responsibility

**Important**: Success redirects (`postLoginRedirect`, `postRegisterRedirect`) are handled by the WebSDK, NOT by the OP API. The API only handles:
- `error_uri`: Technical error redirects
- `cancel_uri`: User cancellation redirects

The WebSDK handles:
- `postLoginRedirect`: Where to go after successful login
- `postRegisterRedirect`: Where to go after successful registration
- `postErrorRedirect`: Client-side error handling

This separation ensures the OP focuses on OIDC protocol while the SDK handles UX navigation.

## Security Checklist

- [x] Open Redirect attack prevention (Same-origin + Allowlist validation)
- [x] HTTPS enforced (localhost excepted)
- [x] Fragment identifiers forbidden
- [x] Logging on validation failures (for debugging)
- [x] Consistent with existing redirect_uri validation
- [x] Token never sent to error_uri/cancel_uri (always to redirect_uri)
- [x] cancel_uri usage based on explicit isUserCancellation flag
- [x] state always included for CSRF protection
- [x] Parse failure → empty array (strict mode)

## Related Files

- `packages/ar-lib-core/src/utils/custom-redirect.ts`: Validation utility
- `packages/ar-lib-core/src/utils/__tests__/custom-redirect.test.ts`: Unit tests
- `packages/ar-auth/src/authorize.ts`: Authorization endpoint integration
- `packages/ar-auth/src/consent.ts`: Consent flow integration
- `packages/ar-management/src/register.ts`: DCR integration
- `packages/ar-management/src/admin.ts`: Admin API integration (POST/PUT /admin/clients)
- `migrations/015_custom_redirect_uris.sql`: Database migration
