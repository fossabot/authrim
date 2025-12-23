# Client Authentication

Secure methods for OAuth 2.0 clients to authenticate to the authorization server.

## Overview

| Specification                                                               | Status         | Methods                            |
| --------------------------------------------------------------------------- | -------------- | ---------------------------------- |
| [OAuth 2.0 (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749)       | ✅ Implemented | Basic, POST                        |
| [JWT Client Auth (RFC 7523)](https://datatracker.ietf.org/doc/html/rfc7523) | ✅ Implemented | client_secret_jwt, private_key_jwt |
| [MTLS (RFC 8705)](https://datatracker.ietf.org/doc/html/rfc8705)            | ⏳ Planned     | Certificate-bound                  |

Client authentication verifies that token requests come from legitimate clients, preventing unauthorized token issuance.

---

## Benefits

| Benefit             | Description                            |
| ------------------- | -------------------------------------- |
| **Token Security**  | Only authorized clients receive tokens |
| **Non-Repudiation** | JWT auth provides cryptographic proof  |
| **Key Rotation**    | Asymmetric methods enable rotation     |
| **FAPI Compliance** | Required for financial-grade security  |
| **Flexibility**     | Choose method based on security needs  |

---

## Supported Methods

| Method                | Security Level | Use Case                   |
| --------------------- | -------------- | -------------------------- |
| `client_secret_basic` | Standard       | Traditional web apps       |
| `client_secret_post`  | Standard       | When headers impractical   |
| `client_secret_jwt`   | High           | Symmetric JWT auth         |
| `private_key_jwt`     | Highest        | Asymmetric JWT auth (FAPI) |
| `none`                | N/A            | Public clients only        |

---

## Practical Use Cases

### Use Case 1: Traditional Web Application with Basic Auth

**Scenario**: A PHP/Django/Rails web application with a secure backend needs to exchange authorization codes for tokens. The client secret is stored in environment variables.

**Why Basic Auth**: Simple, well-supported, sufficient for most web applications. The secret is transmitted in the Authorization header, not the body.

```mermaid
sequenceDiagram
    participant App as Web Application
    participant Authrim as Authorization Server

    App->>App: Receive authorization code

    App->>Authrim: POST /token<br/>Authorization: Basic base64(client_id:secret)<br/><br/>grant_type=authorization_code<br/>code=xxx

    Authrim->>Authrim: Decode Authorization header<br/>Validate client credentials<br/>Verify code

    Authrim-->>App: {<br/>  access_token: "...",<br/>  id_token: "..."<br/>}
```

**Implementation**:

```typescript
// Node.js with client_secret_basic
async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const clientId = process.env.CLIENT_ID!;
  const clientSecret = process.env.CLIENT_SECRET!;

  // Create Basic auth header
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://app.example.com/callback',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description}`);
  }

  return response.json();
}
```

```python
# Python with requests
import base64
import requests

def exchange_code_for_tokens(code: str) -> dict:
    client_id = os.environ["CLIENT_ID"]
    client_secret = os.environ["CLIENT_SECRET"]

    # Basic auth
    credentials = base64.b64encode(
        f"{client_id}:{client_secret}".encode()
    ).decode()

    response = requests.post(
        "https://auth.example.com/token",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": "https://app.example.com/callback"
        }
    )

    response.raise_for_status()
    return response.json()
```

---

### Use Case 2: Microservices with Private Key JWT

**Scenario**: A financial services company has microservices that need machine-to-machine authentication. Security requirements mandate asymmetric cryptography with key rotation capabilities.

**Why Private Key JWT**: Highest security. The private key never leaves the client. Keys can be rotated without coordinating with the IdP. Required for FAPI compliance.

```mermaid
sequenceDiagram
    participant Service as Microservice
    participant HSM as Key Vault/HSM
    participant Authrim as Authorization Server

    Service->>HSM: Get private key

    HSM-->>Service: Private key reference

    Service->>Service: Build JWT:<br/>iss=client_id<br/>sub=client_id<br/>aud=token_endpoint<br/>exp=now+60s

    Service->>HSM: Sign JWT

    HSM-->>Service: Signed JWT

    Service->>Authrim: POST /token<br/>client_assertion_type=<br/>urn:ietf:params:oauth:client-assertion-type:jwt-bearer<br/>client_assertion=eyJhbG...

    Authrim->>Authrim: Fetch client's public key (JWKS)<br/>Verify JWT signature<br/>Validate claims

    Authrim-->>Service: access_token
```

**Implementation**:

```typescript
// Client with private_key_jwt authentication
import * as jose from 'jose';

async function getClientCredentialsToken(): Promise<string> {
  const clientId = 'payment-service';
  const tokenEndpoint = 'https://auth.bank.example.com/token';

  // Load private key (in production, use HSM/Key Vault)
  const privateKey = await jose.importPKCS8(process.env.CLIENT_PRIVATE_KEY!, 'RS256');

  // Build client assertion JWT
  const now = Math.floor(Date.now() / 1000);
  const clientAssertion = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'RS256', kid: 'key-2024-01' })
    .setIssuer(clientId)
    .setSubject(clientId)
    .setAudience(tokenEndpoint)
    .setIssuedAt(now)
    .setExpirationTime(now + 60) // 1 minute
    .setJti(crypto.randomUUID())
    .sign(privateKey);

  // Token request
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'payments:write',
      client_id: clientId,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    }),
  });

  const tokens = await response.json();
  return tokens.access_token;
}

// Client registration with JWKS
const clientRegistration = {
  client_id: 'payment-service',
  client_name: 'Payment Processing Service',
  token_endpoint_auth_method: 'private_key_jwt',
  token_endpoint_auth_signing_alg: 'RS256',

  // Option 1: JWKS URI (recommended for key rotation)
  jwks_uri: 'https://payment-service.internal/jwks.json',

  // Option 2: Inline JWKS
  jwks: {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'key-2024-01',
        alg: 'RS256',
        n: '...',
        e: 'AQAB',
      },
    ],
  },
};
```

---

### Use Case 3: B2B Integration with Client Secret JWT

**Scenario**: A partner company integrates with your API. They need stronger security than basic auth but cannot manage asymmetric keys. Client secret JWT provides a middle ground.

**Why Client Secret JWT**: Stronger than basic auth (the secret isn't transmitted directly), but simpler than private_key_jwt (no key pair management).

```mermaid
sequenceDiagram
    participant Partner as Partner System
    participant Authrim as Authorization Server

    Partner->>Partner: Build JWT:<br/>iss=client_id<br/>sub=client_id<br/>aud=token_endpoint

    Partner->>Partner: Sign JWT with HMAC<br/>(using client_secret)

    Partner->>Authrim: POST /token<br/>client_assertion_type=jwt-bearer<br/>client_assertion=eyJhbG...

    Authrim->>Authrim: Get client_secret from DB<br/>Verify HMAC signature<br/>Validate claims

    Authrim-->>Partner: access_token
```

**Implementation**:

```typescript
// Client with client_secret_jwt authentication
import * as jose from 'jose';

async function getTokenWithSecretJwt(): Promise<string> {
  const clientId = 'partner-integration';
  const clientSecret = process.env.CLIENT_SECRET!;
  const tokenEndpoint = 'https://auth.example.com/token';

  // Create symmetric key from client secret
  const secretKey = new TextEncoder().encode(clientSecret);

  // Build client assertion JWT
  const clientAssertion = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(clientId)
    .setSubject(clientId)
    .setAudience(tokenEndpoint)
    .setIssuedAt()
    .setExpirationTime('1m')
    .setJti(crypto.randomUUID())
    .sign(secretKey);

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'api:read',
      client_id: clientId,
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: clientAssertion,
    }),
  });

  const tokens = await response.json();
  return tokens.access_token;
}
```

---

## Authentication Methods Detail

### client_secret_basic

```http
POST /token HTTP/1.1
Authorization: Basic Y2xpZW50X2lkOmNsaWVudF9zZWNyZXQ=
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=xxx
```

### client_secret_post

```http
POST /token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=xxx&
client_id=my_client&
client_secret=my_secret
```

### client_secret_jwt

```http
POST /token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=my_client&
client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&
client_assertion=eyJhbGciOiJIUzI1NiJ9...
```

### private_key_jwt

```http
POST /token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=my_client&
client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&
client_assertion=eyJhbGciOiJSUzI1NiJ9...
```

---

## Client Assertion JWT Claims

| Claim | Required    | Description                |
| ----- | ----------- | -------------------------- |
| `iss` | ✅          | Client ID                  |
| `sub` | ✅          | Client ID                  |
| `aud` | ✅          | Token endpoint URL         |
| `exp` | ✅          | Expiration (max 5 minutes) |
| `iat` | Recommended | Issued at                  |
| `jti` | Recommended | Unique token ID            |

---

## Security Considerations

| Method                | Secret Transmission | Key Rotation        | FAPI Compliant |
| --------------------- | ------------------- | ------------------- | -------------- |
| `client_secret_basic` | In header           | Requires IdP update | ❌             |
| `client_secret_post`  | In body             | Requires IdP update | ❌             |
| `client_secret_jwt`   | Never transmitted   | Requires IdP update | ❌             |
| `private_key_jwt`     | Never transmitted   | Client-managed      | ✅             |

---

## Configuration

### Client Registration

```json
{
  "client_id": "my-client",
  "token_endpoint_auth_method": "private_key_jwt",
  "token_endpoint_auth_signing_alg": "RS256",
  "jwks_uri": "https://my-client.example.com/.well-known/jwks.json"
}
```

### Discovery Metadata

```json
{
  "token_endpoint_auth_methods_supported": [
    "client_secret_basic",
    "client_secret_post",
    "client_secret_jwt",
    "private_key_jwt"
  ],
  "token_endpoint_auth_signing_alg_values_supported": ["HS256", "RS256", "ES256"]
}
```

---

## Implementation Files

| Component      | File                                       | Description            |
| -------------- | ------------------------------------------ | ---------------------- |
| Token Endpoint | `packages/op-token/src/token.ts`           | Auth handling          |
| Client Auth    | `packages/shared/src/utils/client-auth.ts` | Validation             |
| JWT Verify     | `packages/shared/src/utils/jwt.ts`         | Assertion verification |

---

## References

- [OAuth 2.0 (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749)
- [JWT Bearer Client Auth (RFC 7523)](https://datatracker.ietf.org/doc/html/rfc7523)
- [OAuth 2.0 MTLS (RFC 8705)](https://datatracker.ietf.org/doc/html/rfc8705)
- [FAPI 2.0 Security Profile](https://openid.net/specs/fapi-2_0-security-profile.html)

---

**Last Updated**: 2025-12-20
**Status**: ✅ Fully Implemented
**Implementation**: `packages/op-token/src/`, `packages/shared/src/utils/`
