# SDK Error Handling Guide

> **Version**: 1.0.0
> **Last Updated**: 2024-12-22
> **Audience**: SDK Developers, Client Application Developers, AI Agent Integrators

## Overview

This guide explains how to handle errors from Authrim in your client applications, SDKs, and AI agents. Authrim provides structured error responses with machine-readable metadata to enable intelligent error handling.

## Table of Contents

- [Error Response Structure](#error-response-structure)
- [Understanding error_meta](#understanding-error_meta)
- [Retry Strategy](#retry-strategy)
- [User Action Handling](#user-action-handling)
- [Multi-language Support](#multi-language-support)
- [Code Examples](#code-examples)
- [Best Practices](#best-practices)

---

## Error Response Structure

### OAuth Format (OIDC Endpoints)

All OIDC core endpoints (`/token`, `/authorize`, `/userinfo`, etc.) return errors in OAuth format:

```json
{
  "error": "invalid_grant",
  "error_description": "The provided authorization grant is invalid, expired, or revoked.",
  "error_code": "AR010001",
  "error_id": "lxf2a1b3c4d5"
}
```

| Field               | Type    | Description                                     |
| ------------------- | ------- | ----------------------------------------------- |
| `error`             | string  | RFC standard error code (e.g., `invalid_grant`) |
| `error_description` | string  | Human-readable message (localized)              |
| `error_code`        | string? | Authrim internal code (e.g., `AR010001`)        |
| `error_id`          | string? | Trace ID for support (if enabled)               |
| `state`             | string? | OAuth state parameter (if provided)             |

### Problem Details Format (Admin/Policy APIs)

Admin and Policy APIs return RFC 9457 Problem Details format with additional metadata:

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

| Field        | Type    | Description                          |
| ------------ | ------- | ------------------------------------ |
| `type`       | string  | Error category URI                   |
| `title`      | string  | Short summary                        |
| `status`     | number  | HTTP status code                     |
| `detail`     | string  | Detailed message (localized)         |
| `instance`   | string? | URI of error instance                |
| `error`      | string? | RFC error code (OAuth compatibility) |
| `error_code` | string? | Authrim internal code                |
| `error_id`   | string? | Trace ID for support                 |
| `error_meta` | object? | Machine-readable metadata            |

---

## Understanding error_meta

The `error_meta` field provides structured information for intelligent error handling:

```typescript
interface ErrorMeta {
  retryable: boolean; // Can the same request be retried?
  transient?: boolean; // Is this a temporary issue?
  user_action?: UserAction; // What should the user do?
  severity: Severity; // How serious is this error?
}
```

### retryable Field

**Definition**: Whether the **exact same request** can be automatically retried with exponential backoff.

| Value   | Meaning                           | Example                                   |
| ------- | --------------------------------- | ----------------------------------------- |
| `true`  | Automatic retry is appropriate    | Network timeout, rate limit (after delay) |
| `false` | User action required before retry | Invalid credentials, expired session      |

**Important**: `retryable: true` means programmatic retry. If `retryable: false`, do NOT automatically retry the same request.

### transient Field

**Definition**: Whether the error is temporary and may resolve on its own.

| Value               | Meaning         | Action                         |
| ------------------- | --------------- | ------------------------------ |
| `true`              | Temporary issue | Show "try again later" to user |
| `false` / undefined | Permanent issue | User must take specific action |

**Example Combinations**:

```typescript
// Network timeout - auto-retry immediately
{ retryable: true, transient: undefined }

// External IdP down - don't auto-retry, but inform user it's temporary
{ retryable: false, transient: true, user_action: 'retry' }

// Invalid password - user must correct input
{ retryable: false, transient: undefined, user_action: 'retry' }

// Account locked - contact administrator
{ retryable: false, transient: undefined, user_action: 'contact_admin' }
```

### user_action Field

**Definition**: The recommended action for the end user.

| Action          | Description                       | UI/UX Guidance            |
| --------------- | --------------------------------- | ------------------------- |
| `login`         | User must log in again            | Redirect to login page    |
| `reauth`        | Step-up authentication needed     | Show MFA prompt           |
| `consent`       | User consent required             | Show consent dialog       |
| `retry`         | User can try the action again     | Show "Try Again" button   |
| `contact_admin` | Administrator intervention needed | Show support contact info |
| `update_client` | Client configuration issue        | Developer action required |
| `none`          | No user action can resolve this   | Show error message only   |

### severity Field

**Definition**: The importance level for logging and alerting.

| Level      | Meaning              | Typical Use                            |
| ---------- | -------------------- | -------------------------------------- |
| `info`     | Expected behavior    | Login required, consent needed         |
| `warn`     | Attention needed     | Invalid input, rate limited            |
| `error`    | Something went wrong | Server error, external service failure |
| `critical` | Security incident    | Token reuse, brute force detected      |

---

## Retry Strategy

### Decision Flow

```
┌─────────────────────────────────┐
│  Receive Error Response         │
└───────────────┬─────────────────┘
                │
                ▼
        ┌───────────────┐
        │ retryable?    │
        └───────┬───────┘
                │
       ┌────────┴────────┐
       │                 │
       ▼                 ▼
    [true]            [false]
       │                 │
       ▼                 ▼
  Auto-retry        ┌───────────────┐
  with backoff      │ user_action?  │
       │            └───────┬───────┘
       │                    │
       ▼                    ▼
  ┌──────────┐         Handle based
  │ Success? │         on action type
  └────┬─────┘
       │
  ┌────┴────┐
  │         │
  ▼         ▼
[yes]     [no]
  │         │
  ▼         ▼
Done    Max retries?
           │
      ┌────┴────┐
      │         │
      ▼         ▼
    [yes]     [no]
      │         │
      ▼         ▼
   Fail    Retry with
           increased delay
```

### Exponential Backoff Implementation

```typescript
async function fetchWithRetry<T>(request: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await request();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const errorMeta = extractErrorMeta(error);

      if (!errorMeta?.retryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s...
      const delay = Math.pow(2, attempt) * 1000;

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;

      await sleep(delay + jitter);
    }
  }

  throw lastError;
}

function extractErrorMeta(error: unknown): ErrorMeta | undefined {
  if (error instanceof AuthrimError) {
    return error.meta;
  }
  // Handle other error formats...
  return undefined;
}
```

### Rate Limit Handling

When receiving HTTP 429 with `Retry-After` header:

```typescript
async function handleRateLimit(response: Response): Promise<void> {
  const retryAfter = response.headers.get('Retry-After');

  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    await sleep(seconds * 1000);
  } else {
    // Default backoff
    await sleep(5000);
  }
}
```

---

## User Action Handling

### Action-Based UI Flow

```typescript
function handleError(error: AuthrimError): void {
  const { user_action } = error.meta;

  switch (user_action) {
    case 'login':
      // Clear local session and redirect to login
      clearSession();
      router.navigate('/login');
      break;

    case 'reauth':
      // Prompt for additional authentication (MFA)
      showMFADialog();
      break;

    case 'consent':
      // Redirect to consent page
      router.navigate(`/consent?${error.state}`);
      break;

    case 'retry':
      // Show retry button
      showRetryButton();
      break;

    case 'contact_admin':
      // Show support information
      showSupportContact(error.error_id);
      break;

    case 'update_client':
      // Developer needs to fix client configuration
      console.error('Client configuration error:', error);
      showGenericError();
      break;

    case 'none':
    default:
      // No recovery possible
      showErrorMessage(error.detail);
      break;
  }
}
```

### AI Agent Integration

For AI agents, use `error_meta` to determine appropriate responses:

```typescript
function handleErrorForAgent(error: AuthrimError): AgentResponse {
  const { retryable, user_action, severity } = error.meta;

  // Log based on severity
  if (severity === 'critical') {
    alertSecurityTeam(error);
  }

  // Determine agent behavior
  if (retryable) {
    return { action: 'RETRY', delay: calculateBackoff() };
  }

  switch (user_action) {
    case 'login':
      return { action: 'REQUEST_AUTHENTICATION' };
    case 'consent':
      return { action: 'REQUEST_CONSENT', scopes: error.requestedScopes };
    case 'retry':
      return { action: 'PROMPT_USER_RETRY' };
    default:
      return { action: 'REPORT_ERROR', message: error.detail };
  }
}
```

---

## Multi-language Support

### Configuring Locale

Set the error locale via Admin API:

```bash
# Set to Japanese
curl -X PUT https://your-domain/api/admin/settings/error-locale \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"value": "ja"}'
```

### Response Examples

**English (default)**:

```json
{
  "error": "login_required",
  "error_description": "Your session has expired. Please log in again."
}
```

**Japanese**:

```json
{
  "error": "login_required",
  "error_description": "セッションが期限切れです。再度ログインしてください。"
}
```

### Supported Locales

| Code | Language          |
| ---- | ----------------- |
| `en` | English (default) |
| `ja` | Japanese          |

---

## Code Examples

### JavaScript/TypeScript SDK

```typescript
import { AuthrimClient, AuthrimError } from '@authrim/sdk';

const client = new AuthrimClient({
  clientId: 'your-client-id',
  // ...
});

async function getUserProfile() {
  try {
    const profile = await client.getUserInfo();
    return profile;
  } catch (error) {
    if (error instanceof AuthrimError) {
      console.log('Error code:', error.errorCode); // AR010002
      console.log('RFC error:', error.rfcError); // invalid_grant
      console.log('Retryable:', error.meta.retryable);
      console.log('User action:', error.meta.user_action);
      console.log('Trace ID:', error.errorId);

      // Handle based on user_action
      if (error.meta.user_action === 'login') {
        redirectToLogin();
      }
    }
    throw error;
  }
}
```

### Python SDK

```python
from authrim import AuthrimClient, AuthrimError

client = AuthrimClient(client_id="your-client-id")

try:
    profile = client.get_user_info()
except AuthrimError as e:
    print(f"Error code: {e.error_code}")  # AR010002
    print(f"RFC error: {e.rfc_error}")    # invalid_grant
    print(f"Retryable: {e.meta.retryable}")
    print(f"User action: {e.meta.user_action}")
    print(f"Trace ID: {e.error_id}")

    if e.meta.user_action == "login":
        redirect_to_login()
```

### Go SDK

```go
package main

import (
    "github.com/authrim/authrim-go"
)

func main() {
    client := authrim.NewClient(authrim.Config{
        ClientID: "your-client-id",
    })

    profile, err := client.GetUserInfo()
    if err != nil {
        if authErr, ok := err.(*authrim.Error); ok {
            fmt.Printf("Error code: %s\n", authErr.ErrorCode)    // AR010002
            fmt.Printf("RFC error: %s\n", authErr.RFCError)      // invalid_grant
            fmt.Printf("Retryable: %v\n", authErr.Meta.Retryable)
            fmt.Printf("User action: %s\n", authErr.Meta.UserAction)
            fmt.Printf("Trace ID: %s\n", authErr.ErrorID)

            if authErr.Meta.UserAction == authrim.UserActionLogin {
                redirectToLogin()
            }
        }
        return
    }
}
```

### React Integration

```tsx
import { useAuthrim, AuthrimError } from '@authrim/react';

function ProtectedComponent() {
  const { getAccessToken } = useAuthrim();
  const [error, setError] = useState<AuthrimError | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getAccessToken();
        // Use token...
      } catch (err) {
        if (err instanceof AuthrimError) {
          setError(err);
        }
      }
    }
    fetchData();
  }, []);

  if (error) {
    return <ErrorHandler error={error} />;
  }

  return <div>Protected content</div>;
}

function ErrorHandler({ error }: { error: AuthrimError }) {
  const { user_action } = error.meta;

  switch (user_action) {
    case 'login':
      return <Redirect to="/login" />;
    case 'retry':
      return (
        <div>
          <p>{error.detail}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      );
    case 'contact_admin':
      return (
        <div>
          <p>{error.detail}</p>
          <p>Error ID: {error.errorId}</p>
          <a href="mailto:support@example.com">Contact Support</a>
        </div>
      );
    default:
      return <p>{error.detail}</p>;
  }
}
```

---

## Best Practices

### 1. Always Check error_meta

```typescript
// ❌ Bad: Only checking HTTP status
if (response.status === 401) {
  redirectToLogin();
}

// ✅ Good: Use error_meta for precise handling
if (error.meta.user_action === 'login') {
  redirectToLogin();
} else if (error.meta.user_action === 'reauth') {
  showMFAPrompt();
}
```

### 2. Log error_id for Support

```typescript
// Always include error_id in logs and UI for support cases
console.error('Authrim error:', {
  code: error.errorCode,
  errorId: error.errorId, // Include for support queries
  severity: error.meta.severity,
});

// Show to user for critical errors
if (error.meta.severity === 'critical') {
  showErrorWithSupportInfo(error.detail, error.errorId);
}
```

### 3. Handle Graceful Degradation

```typescript
async function fetchWithFallback() {
  try {
    return await primaryRequest();
  } catch (error) {
    if (error instanceof AuthrimError && error.meta.transient) {
      // Temporary issue - try fallback or cached data
      return getCachedData() || showTemporaryUnavailable();
    }
    throw error;
  }
}
```

### 4. Respect Retry-After Headers

```typescript
// Always check for Retry-After on 429/503 responses
if (response.status === 429 || response.status === 503) {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    await delay(parseInt(retryAfter, 10) * 1000);
    return retry();
  }
}
```

### 5. Security: Don't Expose Internal Details

```typescript
// ❌ Bad: Showing internal error details to users
showAlert(`Error: ${error.detail} - Stack: ${error.stack}`);

// ✅ Good: Show user-friendly message, log details internally
console.error('Internal error:', error);
showAlert(getUserFriendlyMessage(error.meta.user_action));
```

### 6. Use Type Guards

```typescript
// Type guard for type-safe error handling
function isAuthrimError(error: unknown): error is AuthrimError {
  return error instanceof Error && 'errorCode' in error && 'meta' in error;
}

try {
  await apiCall();
} catch (error) {
  if (isAuthrimError(error)) {
    // TypeScript knows error is AuthrimError here
    handleAuthrimError(error);
  } else {
    handleUnknownError(error);
  }
}
```

---

## See Also

- [Error Specification](../errors/error-specification.md) - Technical specification
- [Error Codes Reference](../errors/error-codes-reference.md) - Complete error code list
- [Admin API Documentation](../reference/admin-api.md) - Error configuration endpoints
