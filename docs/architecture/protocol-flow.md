# Protocol Flow Specification

End-to-end protocol flows for all supported OAuth 2.0 and OpenID Connect grants.

## Overview

| Category | Flows Supported |
|----------|-----------------|
| **OIDC Flows** | Authorization Code, Implicit, Hybrid |
| **OAuth 2.0 Grants** | Client Credentials, Refresh Token, Device Code |
| **Advanced Grants** | CIBA, Token Exchange, PAR, JAR/JARM |
| **Security Extensions** | PKCE, DPoP, mTLS |

Authrim implements comprehensive OAuth 2.0 and OpenID Connect flows with enterprise-grade security extensions.

---

## Primary Actors

| Actor | Description |
|-------|-------------|
| **User Agent (UA)** | Web browser or native application |
| **Relying Party (RP)** | Client application requesting authentication |
| **Authrim (OP)** | OpenID Provider / Authorization Server |
| **Resource Server (RS)** | Protected API accepting access tokens |
| **Authenticator** | Passkey, OTP, or external IdP |

---

## 1. Authorization Code Flow (with PKCE)

The most common flow for web and mobile applications.

```mermaid
sequenceDiagram
    participant User
    participant RP as Relying Party
    participant OP as Authrim
    participant DO as Durable Objects

    Note over RP: Generate code_verifier & code_challenge

    RP->>OP: GET /authorize?<br/>response_type=code&<br/>client_id=xxx&<br/>code_challenge=xxx&<br/>code_challenge_method=S256

    OP->>User: Display login page

    User->>OP: Authenticate (passkey/password/OTP)

    OP->>User: Display consent screen

    User->>OP: Grant consent

    OP->>DO: Store authorization code<br/>(AuthorizationCodeStore)

    OP-->>RP: Redirect with code<br/>?code=xxx&state=xxx

    RP->>OP: POST /token<br/>grant_type=authorization_code&<br/>code=xxx&<br/>code_verifier=xxx

    OP->>DO: Consume code (one-time)

    OP->>DO: Get signing key (KeyManager)

    OP-->>RP: {<br/>  access_token,<br/>  id_token,<br/>  refresh_token,<br/>  token_type,<br/>  expires_in<br/>}

    RP->>OP: GET /userinfo<br/>Authorization: Bearer {access_token}

    OP-->>RP: { sub, name, email, ... }
```

### Request Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `response_type` | ✅ | `code` |
| `client_id` | ✅ | Client identifier |
| `redirect_uri` | ✅ | Callback URL |
| `scope` | ✅ | Space-separated scopes (include `openid`) |
| `state` | Recommended | CSRF protection |
| `nonce` | Recommended | Replay protection for ID token |
| `code_challenge` | ✅ | PKCE challenge (S256) |
| `code_challenge_method` | ✅ | `S256` or `plain` |

---

## 2. Implicit Flow (Legacy)

For JavaScript SPAs without backend (deprecated, use Auth Code + PKCE instead).

```mermaid
sequenceDiagram
    participant User
    participant SPA as SPA Client
    participant OP as Authrim

    SPA->>OP: GET /authorize?<br/>response_type=id_token token&<br/>client_id=xxx&<br/>nonce=xxx

    OP->>User: Login & Consent

    OP-->>SPA: Redirect with tokens in fragment<br/>#access_token=xxx&id_token=xxx

    SPA->>SPA: Extract tokens from URL fragment
```

### Security Notes

- Tokens exposed in URL fragment (security risk)
- No refresh tokens issued
- Use Authorization Code + PKCE for new applications

---

## 3. Hybrid Flow

Combines Authorization Code and Implicit for immediate token availability.

```mermaid
sequenceDiagram
    participant User
    participant RP as Relying Party
    participant OP as Authrim

    RP->>OP: GET /authorize?<br/>response_type=code id_token&<br/>client_id=xxx&<br/>nonce=xxx

    OP->>User: Login & Consent

    OP-->>RP: Redirect with code + id_token<br/>?code=xxx#id_token=xxx

    Note over RP: Validate id_token immediately<br/>Exchange code for access_token later

    RP->>OP: POST /token<br/>grant_type=authorization_code

    OP-->>RP: { access_token, refresh_token }
```

### Response Type Combinations

| response_type | Code | ID Token (fragment) | Access Token (fragment) |
|--------------|------|---------------------|------------------------|
| `code` | ✅ | | |
| `id_token` | | ✅ | |
| `token` | | | ✅ |
| `code id_token` | ✅ | ✅ | |
| `code token` | ✅ | | ✅ |
| `id_token token` | | ✅ | ✅ |
| `code id_token token` | ✅ | ✅ | ✅ |

---

## 4. Client Credentials Flow

Machine-to-machine authentication without user involvement.

```mermaid
sequenceDiagram
    participant Service as Backend Service
    participant OP as Authrim

    Service->>OP: POST /token<br/>grant_type=client_credentials&<br/>scope=api:read

    Note over OP: Authenticate client via<br/>client_secret_basic or private_key_jwt

    OP-->>Service: {<br/>  access_token,<br/>  token_type: "Bearer",<br/>  expires_in: 3600<br/>}
```

### Client Authentication Methods

| Method | Security | Use Case |
|--------|----------|----------|
| `client_secret_basic` | Standard | Traditional apps |
| `client_secret_post` | Standard | When headers impractical |
| `client_secret_jwt` | High | Symmetric JWT auth |
| `private_key_jwt` | Highest | FAPI compliance |

---

## 5. Refresh Token Flow

Exchange refresh token for new access token (with rotation).

```mermaid
sequenceDiagram
    participant RP as Relying Party
    participant OP as Authrim
    participant RTR as RefreshTokenRotator

    RP->>OP: POST /token<br/>grant_type=refresh_token&<br/>refresh_token=rt_v1

    OP->>RTR: Validate & rotate token

    alt Token is current
        RTR->>RTR: Generate new token (rt_v2)
        RTR->>RTR: Mark rt_v1 as used
        RTR-->>OP: New token + rotation count
    else Token already used (theft)
        RTR->>RTR: Revoke entire token family
        RTR-->>OP: Error: theft detected
    end

    alt Success
        OP-->>RP: {<br/>  access_token,<br/>  refresh_token: rt_v2,<br/>  token_type,<br/>  expires_in<br/>}
    else Theft Detected
        OP-->>RP: 400 { error: "invalid_grant" }
    end
```

### Token Family Tracking

Refresh token rotation tracks token families to detect theft:

```
rt_v1 → rt_v2 → rt_v3 (current)
         ↑
     If reused: REVOKE ALL
```

---

## 6. Device Authorization Flow

For devices with limited input (TVs, IoT, CLI tools).

```mermaid
sequenceDiagram
    participant Device as Smart TV
    participant User as User's Phone
    participant OP as Authrim
    participant DCS as DeviceCodeStore

    Device->>OP: POST /device_authorization<br/>client_id=xxx&scope=openid

    OP->>DCS: Store device_code, user_code

    OP-->>Device: {<br/>  device_code,<br/>  user_code: "ABCD-1234",<br/>  verification_uri,<br/>  expires_in,<br/>  interval<br/>}

    Device->>Device: Display: "Go to https://auth.example.com/device<br/>Enter code: ABCD-1234"

    User->>OP: Visit verification_uri

    OP->>User: Enter user code

    User->>OP: Submit ABCD-1234

    OP->>User: Login & Consent

    User->>OP: Authorize device

    OP->>DCS: Mark device_code as authorized

    loop Polling (every 5 seconds)
        Device->>OP: POST /token<br/>grant_type=device_code&<br/>device_code=xxx

        alt Still pending
            OP-->>Device: 400 { error: "authorization_pending" }
        else User authorized
            OP-->>Device: { access_token, id_token, ... }
        else User denied
            OP-->>Device: 400 { error: "access_denied" }
        end
    end
```

---

## 7. CIBA Flow

Client-Initiated Backchannel Authentication for decoupled flows.

```mermaid
sequenceDiagram
    participant RP as Banking App
    participant OP as Authrim
    participant CBS as CIBARequestStore
    participant User as User's Phone

    RP->>OP: POST /bc-authorize<br/>login_hint=user@example.com&<br/>scope=openid payment

    OP->>CBS: Store CIBA request

    OP-->>RP: {<br/>  auth_req_id,<br/>  expires_in,<br/>  interval<br/>}

    OP->>User: Push notification:<br/>"Approve payment of $100?"

    User->>OP: Authenticate & Approve

    OP->>CBS: Mark request as authorized

    loop Polling
        RP->>OP: POST /token<br/>grant_type=ciba&<br/>auth_req_id=xxx

        alt Pending
            OP-->>RP: 400 { error: "authorization_pending" }
        else Approved
            OP-->>RP: { access_token, id_token }
        end
    end
```

### CIBA Modes

| Mode | Description |
|------|-------------|
| **Poll** | Client polls token endpoint |
| **Ping** | OP calls client's callback when ready |
| **Push** | OP pushes tokens to client's callback |

---

## 8. Token Exchange Flow

Exchange tokens for different audiences, scopes, or delegation.

```mermaid
sequenceDiagram
    participant Gateway as API Gateway
    participant OP as Authrim
    participant Orders as Orders API

    Gateway->>Gateway: Receive user request with access_token

    Gateway->>OP: POST /token<br/>grant_type=token-exchange&<br/>subject_token={user_token}&<br/>audience=orders-api

    OP->>OP: Validate subject_token<br/>Check exchange policy

    OP-->>Gateway: {<br/>  access_token: {orders_token},<br/>  issued_token_type,<br/>  token_type<br/>}

    Gateway->>Orders: Request with orders_token
```

### Exchange Types

| Type | Use Case |
|------|----------|
| Audience Exchange | Service-to-service calls |
| Scope Reduction | Least privilege |
| Delegation | `may_act` claim |
| Impersonation | Admin support tools |

---

## 9. PAR Flow

Pushed Authorization Requests for enhanced security.

```mermaid
sequenceDiagram
    participant RP as Relying Party
    participant OP as Authrim
    participant PAR as PARRequestStore

    RP->>OP: POST /par<br/>client_id=xxx&<br/>redirect_uri=xxx&<br/>scope=openid&<br/>response_type=code

    OP->>OP: Authenticate client

    OP->>PAR: Store request parameters

    OP-->>RP: {<br/>  request_uri: "urn:ietf:params:oauth:request_uri:xxx",<br/>  expires_in: 60<br/>}

    RP->>OP: GET /authorize?<br/>client_id=xxx&<br/>request_uri=urn:ietf:params:oauth:request_uri:xxx

    OP->>PAR: Retrieve & consume request

    Note over OP: Continue with normal auth flow
```

### PAR Benefits

- Request parameters not exposed in browser
- Request authenticated before user interaction
- Supports large/complex requests
- Required for FAPI 2.0

---

## 10. JAR/JARM Flow

JWT-secured Authorization Request and Response Mode.

```mermaid
sequenceDiagram
    participant RP as Relying Party
    participant OP as Authrim

    Note over RP: Create signed Request Object JWT

    RP->>OP: GET /authorize?<br/>client_id=xxx&<br/>request=eyJhbGciOiJSUzI1NiJ9...

    OP->>OP: Fetch RP's public key (JWKS)

    OP->>OP: Verify Request Object signature

    OP->>OP: Extract parameters from JWT

    Note over OP: Normal auth flow

    OP->>OP: Create signed Response JWT

    OP-->>RP: Redirect with JWT response<br/>?response=eyJhbGciOiJSUzI1NiJ9...

    RP->>RP: Verify Response JWT signature
```

---

## 11. DPoP Flow

Demonstrating Proof of Possession for token binding.

```mermaid
sequenceDiagram
    participant RP as Client
    participant OP as Authrim
    participant DPOP as DPoPJTIStore

    Note over RP: Generate ephemeral key pair

    RP->>RP: Create DPoP proof JWT<br/>{ htu, htm, iat, jti }

    RP->>OP: POST /token<br/>DPoP: eyJhbGciOiJFUzI1NiJ9...

    OP->>DPOP: Check JTI not reused

    OP->>OP: Verify DPoP proof

    OP-->>RP: {<br/>  access_token,<br/>  token_type: "DPoP"<br/>}

    Note over RP: Access token bound to DPoP key

    RP->>RP: Create new DPoP proof<br/>{ ath: hash(access_token) }

    RP->>OP: GET /userinfo<br/>DPoP: eyJ...new-proof<br/>Authorization: DPoP {token}

    OP->>OP: Verify DPoP proof + token binding
```

---

## State Machine

### Authorization Session States

```mermaid
stateDiagram-v2
    [*] --> INITIATED: /authorize request
    INITIATED --> AUTHENTICATING: Show login
    AUTHENTICATING --> AUTHENTICATED: User authenticated
    AUTHENTICATED --> CONSENTING: Show consent
    CONSENTING --> AUTHORIZED: User consents
    AUTHORIZED --> CODE_ISSUED: Generate code
    CODE_ISSUED --> TOKEN_EXCHANGED: /token exchange
    TOKEN_EXCHANGED --> [*]

    AUTHENTICATING --> FAILED: Auth failed
    CONSENTING --> DENIED: User denies
    FAILED --> [*]
    DENIED --> [*]
```

---

## Error Handling

### OAuth 2.0 Error Responses

| Error | Description |
|-------|-------------|
| `invalid_request` | Missing/invalid parameters |
| `invalid_client` | Client authentication failed |
| `invalid_grant` | Code/token invalid or expired |
| `unauthorized_client` | Client not allowed for grant |
| `unsupported_grant_type` | Grant type not supported |
| `invalid_scope` | Requested scope invalid |
| `access_denied` | User denied authorization |
| `server_error` | Internal server error |

### Error Response Format

```json
{
  "error": "invalid_grant",
  "error_description": "Authorization code has expired",
  "error_uri": "https://docs.authrim.com/errors/invalid_grant"
}
```

---

## Temporal Constraints

| Element | TTL | Notes |
|---------|-----|-------|
| Authorization Code | 60 seconds | One-time use |
| PAR Request URI | 60 seconds | One-time use |
| Access Token | 1 hour | Configurable |
| ID Token | 1 hour | Matches access token |
| Refresh Token | 30 days | Rotated on use |
| Device Code | 15 minutes | Polling interval: 5s |
| CIBA Request | 2 minutes | Polling interval: 2s |

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Architecture Overview](./overview.md) | System architecture |
| [Durable Objects](./durable-objects.md) | Consistency layer |
| [Token Management](../features/token-management.md) | Token lifecycle |
| [PKCE](../features/pkce.md) | PKCE implementation |

---

## References

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OAuth 2.0 (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE (RFC 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [Device Authorization (RFC 8628)](https://datatracker.ietf.org/doc/html/rfc8628)
- [CIBA Core](https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html)
- [Token Exchange (RFC 8693)](https://datatracker.ietf.org/doc/html/rfc8693)
- [PAR (RFC 9126)](https://datatracker.ietf.org/doc/html/rfc9126)
- [DPoP (RFC 9449)](https://datatracker.ietf.org/doc/html/rfc9449)

---

**Last Updated**: 2025-12-20
**Status**: Production
**Flows**: 11 complete flows documented
