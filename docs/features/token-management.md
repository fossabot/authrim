# Token Management

## Overview

Authrim implements comprehensive token management features for OAuth 2.0 and OpenID Connect, including refresh token flow, token introspection, and token revocation.

### Specifications

| Feature             | RFC                                                          | Endpoint           |
| ------------------- | ------------------------------------------------------------ | ------------------ |
| Refresh Token       | [RFC 6749 §6](https://tools.ietf.org/html/rfc6749#section-6) | `POST /token`      |
| Token Introspection | [RFC 7662](https://tools.ietf.org/html/rfc7662)              | `POST /introspect` |
| Token Revocation    | [RFC 7009](https://tools.ietf.org/html/rfc7009)              | `POST /revoke`     |

---

## Benefits

### Security Advantages

1. **🔄 Refresh Token Rotation**
   - Old tokens invalidated on each refresh
   - Prevents refresh token replay attacks
   - OAuth 2.0 Security BCP compliant

2. **🔍 Real-Time Token Validation**
   - Introspect tokens before processing sensitive requests
   - Immediate revocation detection
   - Supports resource server validation

3. **🛡️ Immediate Revocation**
   - Invalidate compromised tokens instantly
   - Supports user logout flows
   - Authorization code reuse protection

---

## Practical Use Cases

### Use Case 1: Mobile Banking Session Management

**Scenario**: A mobile banking app needs long-lived access without requiring frequent re-authentication, but must immediately revoke access when the user logs out or reports a stolen device.

**Challenge**: Access tokens expire quickly (1 hour). Users don't want to re-login daily. But when a device is reported stolen, access must be revoked immediately.

**Token Management Solution**:

```typescript
class BankingSessionManager {
  private refreshToken: string;
  private accessToken: string;
  private tokenExpiry: number;

  async ensureValidToken(): Promise<string> {
    // Refresh token 5 minutes before expiry
    if (Date.now() > this.tokenExpiry - 300000) {
      await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  async refreshAccessToken(): Promise<void> {
    const response = await fetch('https://bank.authrim.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: CLIENT_ID,
      }),
    });

    const tokens = await response.json();

    // Rotation: old refresh token is now invalid
    this.refreshToken = tokens.refresh_token; // New token
    this.accessToken = tokens.access_token;
    this.tokenExpiry = Date.now() + tokens.expires_in * 1000;
  }

  async logout(): Promise<void> {
    // Revoke both tokens
    await Promise.all([
      this.revokeToken(this.accessToken, 'access_token'),
      this.revokeToken(this.refreshToken, 'refresh_token'),
    ]);
  }

  private async revokeToken(token: string, hint: string): Promise<void> {
    await fetch('https://bank.authrim.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, token_type_hint: hint }),
    });
  }
}
```

**Backend - Stolen Device Report**:

```python
def handle_stolen_device_report(user_id: str):
    # Get all active refresh tokens for user
    tokens = get_user_refresh_tokens(user_id)

    # Revoke all tokens
    for token in tokens:
        requests.post(
            'https://bank.authrim.com/revoke',
            data={'token': token, 'token_type_hint': 'refresh_token'},
            auth=(CLIENT_ID, CLIENT_SECRET)
        )

    # Next time the stolen device tries to refresh, it will fail
```

**Result**: Users stay logged in for weeks without re-authentication. When a device is reported stolen, all tokens are revoked immediately, and the stolen device cannot refresh or access the API.

---

### Use Case 2: Microservices API Gateway Token Validation

**Scenario**: An API gateway needs to validate access tokens before routing requests to backend microservices. The gateway must detect revoked tokens and extract token metadata (scopes, user info).

**Challenge**: Validating JWTs locally only checks signature and expiry. It can't detect revoked tokens or get real-time token status.

**Token Management Solution**:

```python
class APIGateway:
    def __init__(self):
        self.introspection_cache = TTLCache(maxsize=10000, ttl=30)  # 30s cache

    async def validate_request(self, request: Request) -> TokenInfo:
        token = extract_bearer_token(request)

        # Check cache first
        if token in self.introspection_cache:
            return self.introspection_cache[token]

        # Introspect token
        response = await httpx.post(
            'https://auth.example.com/introspect',
            data={
                'token': token,
                'token_type_hint': 'access_token'
            },
            auth=(GATEWAY_CLIENT_ID, GATEWAY_CLIENT_SECRET)
        )

        token_info = response.json()

        if not token_info.get('active'):
            raise HTTPException(401, 'Token is inactive or revoked')

        # Cache for 30 seconds
        self.introspection_cache[token] = token_info

        return token_info

    async def route_request(self, request: Request):
        token_info = await self.validate_request(request)

        # Check scopes for this endpoint
        required_scope = get_required_scope(request.path)
        if required_scope not in token_info.get('scope', '').split():
            raise HTTPException(403, f'Missing required scope: {required_scope}')

        # Add user context to request headers
        request.headers['X-User-ID'] = token_info['sub']
        request.headers['X-Client-ID'] = token_info['client_id']

        # Route to backend service
        return await self.proxy_to_backend(request)
```

**Introspection Response**:

```json
{
  "active": true,
  "scope": "openid profile orders:read orders:write",
  "client_id": "mobile_app",
  "token_type": "Bearer",
  "exp": 1703116800,
  "sub": "user-12345",
  "iss": "https://auth.example.com"
}
```

**Result**: Gateway validates tokens in real-time, caches results briefly for performance, and can immediately detect revoked tokens.

---

### Use Case 3: SaaS Multi-Tenant Token Lifecycle

**Scenario**: A SaaS platform serves multiple tenants. When an admin removes a user from a tenant, all their active sessions must be terminated immediately.

**Challenge**: Users may have active sessions across multiple devices and applications. Access tokens issued before removal are still valid until they expire.

**Token Management Solution**:

```javascript
// Admin removes user from tenant
async function removeUserFromTenant(tenantId, userId) {
  // 1. Remove user from tenant in database
  await db.tenantUsers.delete({ tenantId, userId });

  // 2. Get all active tokens for this user in this tenant
  const tokens = await db.tokens.find({
    userId,
    tenantId,
    status: 'active',
  });

  // 3. Revoke all tokens
  await Promise.all(
    tokens.map((token) =>
      fetch('https://auth.saas.com/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${btoa(ADMIN_CLIENT_ID + ':' + ADMIN_CLIENT_SECRET)}`,
        },
        body: new URLSearchParams({
          token: token.refreshToken,
          token_type_hint: 'refresh_token',
        }),
      })
    )
  );

  // 4. Any active session will fail on next API call or token refresh
  console.log(`Revoked ${tokens.length} tokens for user ${userId}`);
}

// Client-side: Handle revocation gracefully
async function makeApiCall(endpoint) {
  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 401) {
      // Token revoked or expired
      const refreshResult = await refreshToken();
      if (refreshResult.error === 'invalid_grant') {
        // Refresh token also revoked - force logout
        showMessage('Your access has been revoked. Please contact admin.');
        logout();
        return;
      }
    }

    return response.json();
  } catch (error) {
    handleError(error);
  }
}
```

**Result**: When an admin removes a user, their sessions on all devices are terminated within seconds. The user sees a clear message explaining what happened.

---

## API Reference

### Refresh Token

**POST /token**

```http
POST /token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=eyJhbGciOiJSUzI1NiJ9...
&client_id=my_client
&scope=openid profile  (optional, for scope downgrading)
```

**Success Response**:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJSUzI1NiJ9...",
  "scope": "openid profile"
}
```

**Note**: A new refresh token is always issued (rotation).

---

### Token Introspection

**POST /introspect**

```http
POST /introspect HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

token=eyJhbGciOiJSUzI1NiJ9...
&token_type_hint=access_token
```

**Active Token Response**:

```json
{
  "active": true,
  "scope": "openid profile email",
  "client_id": "my_client",
  "token_type": "Bearer",
  "exp": 1234567890,
  "sub": "user-123",
  "iss": "https://your-tenant.authrim.com"
}
```

**Inactive Token Response**:

```json
{
  "active": false
}
```

---

### Token Revocation

**POST /revoke**

```http
POST /revoke HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(client_id:client_secret)>

token=eyJhbGciOiJSUzI1NiJ9...
&token_type_hint=refresh_token
```

**Response**: Always `200 OK` with empty body (per RFC 7009).

---

## Security Considerations

### Refresh Token Rotation

| Aspect        | Behavior                   |
| ------------- | -------------------------- |
| Old token     | Immediately invalidated    |
| New token     | Returned with each refresh |
| Replay attack | Detected and blocked       |
| Compliance    | OAuth 2.0 Security BCP     |

### Authorization Code Reuse Detection

When an authorization code is reused, all tokens from the original exchange are automatically revoked:

```typescript
if (authCode.used && authCode.tokenJti) {
  await revokeToken(authCode.tokenJti);
  throw new Error('Authorization code reused - tokens revoked');
}
```

---

## Configuration

### Settings

| Setting                | Default  | Description                     |
| ---------------------- | -------- | ------------------------------- |
| `access_token_expiry`  | `3600`   | Access token lifetime (1 hour)  |
| `refresh_token_expiry` | `604800` | Refresh token lifetime (7 days) |

### Discovery Metadata

```json
{
  "introspection_endpoint": "https://your-tenant.authrim.com/introspect",
  "revocation_endpoint": "https://your-tenant.authrim.com/revoke",
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "client_secret_post"]
}
```

---

## Testing

### Test Scenarios

| Scenario                 | Expected Result            |
| ------------------------ | -------------------------- |
| Valid refresh            | New access + refresh token |
| Expired refresh token    | 400 invalid_grant          |
| Revoked refresh token    | 400 invalid_grant          |
| Introspect active token  | active: true with claims   |
| Introspect revoked token | active: false              |
| Revoke any token         | 200 OK (always)            |

### Running Tests

```bash
pnpm --filter @authrim/op-token run test
pnpm --filter @authrim/op-management run test
```

---

## Troubleshooting

### "invalid_grant: Refresh token is invalid or expired"

**Causes**:

- Token expired (default: 7 days)
- Token already used (rotation)
- Token was revoked

**Solution**: User must re-authenticate.

### "invalid_scope: Requested scope exceeds original"

**Cause**: Trying to get more scopes than originally granted.
**Solution**: Only request subset of original scopes, or re-authenticate.

### Token appears valid but API rejects it

**Cause**: Token was revoked but client cached it.
**Solution**: Use introspection to check real-time status.

---

## References

- [RFC 6749 - OAuth 2.0](https://tools.ietf.org/html/rfc6749)
- [RFC 7662 - Token Introspection](https://tools.ietf.org/html/rfc7662)
- [RFC 7009 - Token Revocation](https://tools.ietf.org/html/rfc7009)
- [OAuth 2.0 Security Best Current Practice](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)

---

**Last Updated**: 2025-12-20
**Status**: ✅ Implemented
**Implementation**: `packages/op-token/src/token.ts`, `packages/op-management/src/routes/introspect.ts`, `packages/op-management/src/routes/revoke.ts`
