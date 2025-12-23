# Authrim Error System Specification

> **Version**: 1.0.0
> **Last Updated**: 2024-12-22
> **Status**: Production

## Overview

Authrim implements a comprehensive error handling system designed for:

- **RFC/OIDC Compliance**: Full adherence to OAuth 2.0 (RFC 6749), OpenID Connect, and RFC 9457 (Problem Details)
- **Multi-language Support**: Localized error messages (English, Japanese)
- **Security-first Design**: Prevention of information leakage attacks
- **SDK Integration**: Structured metadata for AI agents and client SDKs
- **Observability**: Configurable error tracking and trace IDs

## Architecture

```
┌────────────────┐      ┌────────────────────┐      ┌──────────────────┐
│  ErrorFactory  │─────▶│   ErrorDescriptor  │─────▶│  Endpoint Layer  │
│ (Error Creation)│      │ (Normalized Data)  │      │  (Serialization) │
└────────────────┘      └────────────────────┘      └──────────────────┘
                                                            │
                               ┌────────────────────────────┼────────────────────────────┐
                               ▼                            ▼                            ▼
                        ┌─────────────┐             ┌─────────────────┐          ┌─────────────┐
                        │ OAuth Format│             │ Problem Details │          │  Redirect   │
                        │   (JSON)    │             │     (JSON)      │          │   (Query)   │
                        └─────────────┘             └─────────────────┘          └─────────────┘
```

### Key Principles

1. **Separation of Concerns**: ErrorFactory creates normalized `ErrorDescriptor` objects; serialization happens at the endpoint layer
2. **Format Independence**: The same error can be serialized to OAuth, RFC 9457, or redirect formats
3. **Type Safety**: All error types are strongly typed and exported for SDK consumption

## Error Code System

### Code Format

Authrim uses a hybrid approach:

| Type             | Format          | Example           | Usage                         |
| ---------------- | --------------- | ----------------- | ----------------------------- |
| RFC Standard     | snake_case      | `invalid_request` | OAuth/OIDC protocol errors    |
| Authrim Specific | `AR` + 6 digits | `AR000001`        | Internal error identification |

### AR Code Structure

```
AR<NNNNNN>
│  │
│  └─ 6-digit sequence (000001-999999)
└─ Authrim prefix

Example: AR000001, AR020001, AR110001
```

### Code Number Allocation

| Range               | Category | Description                    |
| ------------------- | -------- | ------------------------------ |
| AR000001 ~ AR009999 | AUTH     | Authentication & Authorization |
| AR010001 ~ AR019999 | TOKEN    | Token issuance & validation    |
| AR020001 ~ AR029999 | CLIENT   | Client management              |
| AR030001 ~ AR039999 | USER     | User management                |
| AR040001 ~ AR049999 | SESSION  | Session management             |
| AR050001 ~ AR059999 | POLICY   | Policy & ReBAC                 |
| AR060001 ~ AR069999 | ADMIN    | Admin API                      |
| AR070001 ~ AR079999 | SAML     | SAML integration               |
| AR080001 ~ AR089999 | VC       | Verifiable Credentials         |
| AR090001 ~ AR099999 | BRIDGE   | External IdP integration       |
| AR100001 ~ AR109999 | CONFIG   | Configuration                  |
| AR110001 ~ AR119999 | RATE     | Rate limiting                  |
| AR900001 ~ AR999999 | INTERNAL | Internal errors (reserved)     |

## Response Formats

### OAuth Format (Default)

Standard OAuth 2.0 error response format, used for OIDC core endpoints.

```typescript
interface OAuthErrorResponse {
  // RFC 6749 Standard Fields
  error: string; // RFC standard code (e.g., invalid_request)
  error_description: string; // Localized message

  // Optional (RFC compliant)
  error_uri?: string; // Documentation URL
  state?: string; // For Authorization Endpoint

  // Authrim Extensions
  error_code?: string; // Internal code (AR000001 format)
  error_id?: string; // Support trace ID (configurable)
}
```

**Example Response:**

```json
{
  "error": "invalid_grant",
  "error_description": "The provided authorization grant is invalid, expired, or revoked.",
  "error_code": "AR010001",
  "error_id": "lxf2a1b3c4d5"
}
```

### RFC 9457 Problem Details Format

Enhanced format with structured metadata, used for Admin/Policy/VC APIs.

```typescript
interface ProblemDetailsResponse {
  // RFC 9457 Standard Fields
  type: string; // Semantic category URI
  title: string; // Short summary
  status: number; // HTTP status code
  detail: string; // Localized detailed message
  instance?: string; // Error occurrence URI

  // OAuth Compatibility
  error?: string; // RFC standard error code
  error_code?: string; // Stable ID (AR000001 format)
  error_id?: string; // Trace ID

  // AI Agent / SDK Metadata
  error_meta?: {
    retryable: boolean; // Whether retry is appropriate
    user_action?: string; // Recommended user action
    severity: 'info' | 'warn' | 'error' | 'critical';
  };
}
```

**Example Response:**

```json
{
  "type": "https://authrim.com/problems/token/expired",
  "title": "Token Expired",
  "status": 401,
  "detail": "The access token has expired. Please obtain a new token.",
  "error": "invalid_grant",
  "error_code": "AR010002",
  "error_id": "lxf2a1b3c4d5",
  "error_meta": {
    "retryable": false,
    "user_action": "login",
    "severity": "warn"
  }
}
```

### Type URI Naming Convention

Format: `https://authrim.com/problems/<category>/<error-slug>`

Examples:

- `https://authrim.com/problems/auth/session-expired`
- `https://authrim.com/problems/token/invalid-grant`
- `https://authrim.com/problems/rate-limit/exceeded`

## Error Metadata (error_meta)

### Structure

```typescript
interface ErrorMeta {
  retryable: boolean; // Automatic retry appropriate?
  transient?: boolean; // Temporary failure?
  user_action?: UserAction; // Recommended action
  severity: Severity; // Log/alert level
}

type UserAction =
  | 'login' // Re-login required
  | 'reauth' // Re-authentication required (step-up/MFA)
  | 'consent' // Consent screen needed
  | 'retry' // Manual retry (not automatic)
  | 'contact_admin' // Contact administrator
  | 'update_client' // Update client configuration
  | 'none'; // No automatic recovery

type Severity = 'info' | 'warn' | 'error' | 'critical';
```

### Retryable Definition (Strict)

| Value              | Meaning                                                            | Example                                         |
| ------------------ | ------------------------------------------------------------------ | ----------------------------------------------- |
| `retryable: true`  | Same request can be automatically retried with exponential backoff | Network timeout, rate limit (after Retry-After) |
| `retryable: false` | User action or configuration change required                       | Invalid credentials, expired session            |

### Transient Field

Used when `retryable: false` but the issue may resolve over time:

```typescript
{
  retryable: false,      // Don't auto-retry immediately
  transient: true,       // Will likely resolve over time
  user_action: 'retry'   // User can manually retry later
}
```

Example: External IdP temporary outage

## RFC Error Usage Rules

### Error Selection by Context

| Situation                         | RFC Error                 | HTTP Status |
| --------------------------------- | ------------------------- | ----------- |
| Session expired                   | `login_required`          | 401         |
| MFA required                      | `interaction_required`    | 401         |
| /authorize authentication failure | `interaction_required`    | 400         |
| /token grant failure              | `invalid_grant`           | 400         |
| Client authentication failure     | `invalid_client`          | 401         |
| User locked/inactive              | `access_denied`           | 403         |
| Internal server error             | `server_error`            | 500         |
| Temporary unavailability          | `temporarily_unavailable` | 503         |

### Endpoint-Specific Rules

| Endpoint                          | Error Type             | Reason                |
| --------------------------------- | ---------------------- | --------------------- |
| `/token`                          | `invalid_grant`        | Grant-related errors  |
| `/authorize` (during interaction) | `interaction_required` | UI/Agent signal       |
| Any (session/auth state)          | `login_required`       | Authentication needed |

## Security Design

### Security Levels

```typescript
enum ErrorSecurityLevel {
  PUBLIC = 'public', // Full details can be returned
  MASKED = 'masked', // Replace with generic message
  INTERNAL = 'internal', // Log only, return generic error
}
```

### Attack Prevention

| Original Message                  | Risk                        | Secure Message                          |
| --------------------------------- | --------------------------- | --------------------------------------- |
| `Client not found`                | Client ID enumeration       | `Client authentication failed`          |
| `User not found`                  | User enumeration            | `Invalid credentials`                   |
| `Authorization code already used` | Replay detection disclosure | `Invalid or expired authorization code` |
| `Invalid password`                | Password guessing           | `Invalid credentials`                   |

### Error ID Configuration

```typescript
type ErrorIdMode = 'all' | '5xx' | 'security_only' | 'none';
// Default: '5xx' (trace ID only for server errors)
```

**Security-tracked errors** (fixed list):

- `invalid_client`
- `invalid_grant`
- `unauthorized_client`
- `access_denied`
- `client/authentication-failed`
- `user/invalid-credentials`
- `user/locked`
- `token/reuse-detected`
- `rate-limit/exceeded`
- `policy/invalid-api-key`
- `admin/authentication-required`

### Logging Rules

```typescript
// Production: Don't log sensitive details
if (isProduction) {
  console.error(`Error [${statusCode}]:`, { error: errorCode, errorId });
} else {
  console.error(`Error [${statusCode}]:`, { error: errorCode, description });
}
```

## Response Format Configuration

### Endpoint-Based Defaults

| Endpoint                            | Default Format  | Accept Header Override         |
| ----------------------------------- | --------------- | ------------------------------ |
| `/authorize`, `/token`, `/userinfo` | OAuth           | **Disabled** (OIDC compliance) |
| `/introspect`, `/revoke`            | OAuth           | **Disabled**                   |
| `/admin/*`                          | Problem Details | Enabled                        |
| `/policy/*`                         | Problem Details | Enabled                        |
| `/vc/*`                             | Problem Details | Enabled                        |
| `/scim/*`                           | Problem Details | Enabled                        |
| Other                               | OAuth           | Enabled                        |

### OIDC Core Endpoint Restriction

For OIDC compliance, the following endpoints **always** use OAuth format:

- `/authorize`
- `/token`
- `/userinfo`
- `/introspect`
- `/revoke`

The `Accept: application/problem+json` header is ignored for these endpoints.

### Admin API Configuration

```
PUT /api/admin/settings/error-locale
{ "value": "ja" }  // "en" | "ja"

PUT /api/admin/settings/error-response-format
{ "value": "problem_details" }  // "oauth" | "problem_details"

PUT /api/admin/settings/error-id-mode
{ "value": "all" }  // "all" | "5xx" | "security_only" | "none"
```

## Multi-language Support

### Supported Locales

| Code | Language | Status    |
| ---- | -------- | --------- |
| `en` | English  | Default   |
| `ja` | Japanese | Supported |

### Message Resolution

1. Check KV for `error_locale` setting
2. Fall back to environment variable `ERROR_LOCALE`
3. Default to `en`

### Placeholder Syntax

```typescript
// Message definition
"AR110001": "Rate limit exceeded. Please retry after {retry_after} seconds"

// Usage
factory.create('AR110001', { variables: { retry_after: 60 } })
// → "Rate limit exceeded. Please retry after 60 seconds"
```

## Integration with Hono

### Middleware Usage

```typescript
import { errorMiddleware, AuthrimError, AR_ERROR_CODES } from '@authrim/ar-lib-core';

const app = new Hono();
app.use('*', errorMiddleware());

app.get('/api/resource', (c) => {
  // Throw typed error - automatically serialized
  throw new AuthrimError(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);
});
```

### Direct Error Response

```typescript
import { createErrorResponse, AR_ERROR_CODES } from '@authrim/ar-lib-core';

app.get('/api/resource', async (c) => {
  // Create error response with context-aware configuration
  return createErrorResponse(c, AR_ERROR_CODES.AUTH_SESSION_EXPIRED);
});
```

## SDK Type Exports

The following types are exported for SDK consumption:

```typescript
// Core types
export type { ErrorDescriptor, ErrorMeta, UserAction, Severity };

// Response formats
export type { OAuthErrorResponse, ProblemDetailsResponse };

// Configuration types
export type { ErrorLocale, ErrorIdMode, ErrorSecurityLevel };

// Constants
export { AR_ERROR_CODES, RFC_ERROR_CODES, SECURITY_TRACKED_ERRORS };
```

## See Also

- [Error Codes Reference](./error-codes-reference.md) - Complete error code list
- [SDK Error Handling Guide](../sdk/error-handling-guide.md) - Client integration guide
