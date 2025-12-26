# OIDC Native SSO SDK Specification

> **Version**: 1.0.0-draft
> **Status**: Ready for SDK Development
> **Specification**: [OIDC Native SSO 1.0 (draft-07)](https://openid.net/specs/openid-connect-native-sso-1_0.html)

## Overview

This document specifies how SDK developers should implement OIDC Native SSO 1.0 support for mobile and desktop applications using Authrim as the OpenID Provider.

### What is Native SSO?

Native SSO enables seamless single sign-on across multiple native applications on the same device. When a user logs into App A, App B can obtain tokens without requiring the user to enter credentials again.

```
┌─────────────────────────────────────────────────────────────┐
│                         Device                               │
│                                                             │
│  ┌─────────────┐              ┌─────────────┐              │
│  │   App A     │              │   App B     │              │
│  │             │              │             │              │
│  │  1. Login   │              │  3. Read    │              │
│  │     ↓       │              │  device_    │              │
│  │  2. Store   │──────────────│  secret     │              │
│  │  device_    │   Keychain/  │     ↓       │              │
│  │  secret     │   Keystore   │  4. Token   │              │
│  │             │              │  Exchange   │              │
│  └─────────────┘              └─────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Flow Sequence

### Phase 1: Initial Login (App A)

```
┌─────┐          ┌─────────────┐          ┌─────────────┐
│App A│          │ AuthServer  │          │  Keychain   │
└──┬──┘          └──────┬──────┘          └──────┬──────┘
   │                    │                        │
   │ 1. Authorization Request                    │
   │──────────────────>│                        │
   │                    │                        │
   │ 2. User authenticates                       │
   │<──────────────────│                        │
   │                    │                        │
   │ 3. Authorization Code                       │
   │<──────────────────│                        │
   │                    │                        │
   │ 4. Token Request                            │
   │──────────────────>│                        │
   │                    │                        │
   │ 5. Response:                                │
   │    - access_token                           │
   │    - id_token (with ds_hash)                │
   │    - device_secret                          │
   │<──────────────────│                        │
   │                    │                        │
   │ 6. Store device_secret                      │
   │────────────────────────────────────────────>│
   │                    │                        │
```

### Phase 2: SSO Login (App B)

```
┌─────┐          ┌─────────────┐          ┌─────────────┐
│App B│          │ AuthServer  │          │  Keychain   │
└──┬──┘          └──────┬──────┘          └──────┬──────┘
   │                    │                        │
   │ 1. Read device_secret                       │
   │<────────────────────────────────────────────│
   │                    │                        │
   │ 2. Read ID Token from Keychain              │
   │<────────────────────────────────────────────│
   │                    │                        │
   │ 3. Token Exchange Request                   │
   │    grant_type: token-exchange               │
   │    subject_token: <id_token>                │
   │    subject_token_type: id_token             │
   │    actor_token: <device_secret>             │
   │    actor_token_type: device-secret          │
   │──────────────────>│                        │
   │                    │                        │
   │ 4. Validate:                                │
   │    - device_secret                          │
   │    - id_token signature                     │
   │    - user identity                          │
   │                    │                        │
   │ 5. Response:                                │
   │    - access_token                           │
   │    - id_token (new)                         │
   │    - refresh_token                          │
   │<──────────────────│                        │
   │                    │                        │
```

## API Reference

### Token Endpoint Extension

#### Request (Phase 1 - Initial Login)

Standard Authorization Code Grant. No special parameters required. The server automatically includes `device_secret` in the response when:

1. Native SSO is enabled (server-side configuration)
2. The client has `native_sso_enabled: true`
3. This is a fresh authentication (not a refresh)

#### Response (Phase 1)

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "scope": "openid profile email",
  "device_secret": "ds_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789..."
}
```

**ID Token Claims (with Native SSO)**:

```json
{
  "iss": "https://auth.example.com",
  "sub": "user123",
  "aud": "client-app-a",
  "exp": 1700000000,
  "iat": 1699996400,
  "nonce": "abc123",
  "at_hash": "T7yT1P6RpYeKj7YJz-N4RA",
  "ds_hash": "4bqtP8yXmKxN2tR9wQ-VsA"
}
```

#### Request (Phase 2 - SSO Login via Token Exchange)

```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
&subject_token_type=urn:ietf:params:oauth:token-type:id_token
&actor_token=ds_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789...
&actor_token_type=urn:openid:params:token-type:device-secret
&client_id=client-app-b
&scope=openid profile email
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `grant_type` | Yes | Must be `urn:ietf:params:oauth:grant-type:token-exchange` |
| `subject_token` | Yes | The ID Token from App A |
| `subject_token_type` | Yes | Must be `urn:ietf:params:oauth:token-type:id_token` |
| `actor_token` | Yes | The device_secret from Keychain/Keystore |
| `actor_token_type` | Yes | Must be `urn:openid:params:token-type:device-secret` |
| `client_id` | Yes | App B's client ID |
| `scope` | No | Requested scopes (optional, defaults to original) |

#### Response (Phase 2)

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "YW5vdGhlciByZWZyZXNoIHRva2Vu...",
  "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",
  "scope": "openid profile email"
}
```

### Discovery Metadata

When Native SSO is enabled, the following claims appear in `/.well-known/openid-configuration`:

```json
{
  "native_sso_token_exchange_supported": true,
  "native_sso_device_secret_supported": true,
  "claims_supported": ["...", "ds_hash"]
}
```

## SDK Implementation Guide

### 1. Device Secret Storage

#### iOS (Keychain)

```swift
import Security

class NativeSSOKeychain {
    private static let service = "com.example.app.native-sso"
    private static let deviceSecretKey = "device_secret"
    private static let idTokenKey = "id_token"

    // Access group for sharing between apps
    private static let accessGroup = "TEAM_ID.com.example.sso"

    static func storeDeviceSecret(_ secret: String) throws {
        let data = secret.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: deviceSecretKey,
            kSecAttrAccessGroup as String: accessGroup,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        SecItemDelete(query as CFDictionary) // Remove existing

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.unableToStore
        }
    }

    static func readDeviceSecret() throws -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: deviceSecretKey,
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let secret = String(data: data, encoding: .utf8) else {
            return nil
        }

        return secret
    }

    static func storeIDToken(_ token: String) throws {
        // Similar implementation with idTokenKey
    }

    static func readIDToken() throws -> String? {
        // Similar implementation with idTokenKey
    }

    static func clearAll() {
        // Delete device_secret and id_token
    }
}
```

#### Android (Keystore)

```kotlin
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class NativeSSOKeystore(private val context: Context) {

    companion object {
        private const val PREFS_NAME = "native_sso_prefs"
        private const val DEVICE_SECRET_KEY = "device_secret"
        private const val ID_TOKEN_KEY = "id_token"
    }

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        PREFS_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun storeDeviceSecret(secret: String) {
        encryptedPrefs.edit().putString(DEVICE_SECRET_KEY, secret).apply()
    }

    fun readDeviceSecret(): String? {
        return encryptedPrefs.getString(DEVICE_SECRET_KEY, null)
    }

    fun storeIDToken(token: String) {
        encryptedPrefs.edit().putString(ID_TOKEN_KEY, token).apply()
    }

    fun readIDToken(): String? {
        return encryptedPrefs.getString(ID_TOKEN_KEY, null)
    }

    fun clearAll() {
        encryptedPrefs.edit().clear().apply()
    }
}
```

### 2. ds_hash Verification

When receiving an ID Token in a Token Exchange response, clients SHOULD verify the `ds_hash` claim:

```swift
// Swift
import CryptoKit

func verifyDsHash(idToken: String, deviceSecret: String) -> Bool {
    guard let payload = decodeJWTPayload(idToken),
          let dsHashFromToken = payload["ds_hash"] as? String else {
        return false
    }

    // Calculate ds_hash: base64url(left_half(SHA-256(device_secret)))
    let data = deviceSecret.data(using: .utf8)!
    let hash = SHA256.hash(data: data)
    let leftHalf = Array(hash.prefix(16)) // 16 bytes = left half of SHA-256
    let calculatedDsHash = Data(leftHalf).base64URLEncodedString()

    return dsHashFromToken == calculatedDsHash
}

extension Data {
    func base64URLEncodedString() -> String {
        return self.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
```

```kotlin
// Kotlin
import java.security.MessageDigest
import android.util.Base64

fun verifyDsHash(idToken: String, deviceSecret: String): Boolean {
    val payload = decodeJWTPayload(idToken)
    val dsHashFromToken = payload?.get("ds_hash") as? String ?: return false

    // Calculate ds_hash: base64url(left_half(SHA-256(device_secret)))
    val digest = MessageDigest.getInstance("SHA-256")
    val hash = digest.digest(deviceSecret.toByteArray(Charsets.UTF_8))
    val leftHalf = hash.copyOfRange(0, 16) // 16 bytes = left half of SHA-256
    val calculatedDsHash = Base64.encodeToString(leftHalf, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

    return dsHashFromToken == calculatedDsHash
}
```

### 3. Error Handling

| Error Code | Description | Recovery Action |
|------------|-------------|-----------------|
| `invalid_grant` | Device secret expired or revoked | Re-authenticate with full login flow |
| `invalid_request` | Missing or invalid parameters | Check request format |
| `invalid_token` | ID Token expired or invalid | Request new ID Token from App A |
| `access_denied` | Cross-client SSO not allowed | Re-authenticate with full login flow |

**Example Error Response**:

```json
{
  "error": "invalid_grant",
  "error_description": "Device secret has expired",
  "error_uri": "https://auth.example.com/docs/errors#device_secret_expired"
}
```

### 4. Best Practices

#### Security

1. **Store Securely**: Always use platform-specific secure storage (iOS Keychain, Android Keystore)
2. **Access Groups**: Configure appropriate access groups for cross-app sharing
3. **Verify ds_hash**: Always verify the `ds_hash` claim to detect tampering
4. **Handle Revocation**: Gracefully handle device_secret revocation (fallback to full login)

#### User Experience

1. **Silent SSO**: Attempt Token Exchange first before showing login UI
2. **Graceful Fallback**: If Token Exchange fails, fall back to standard login
3. **Clear Feedback**: Inform users when SSO is being used ("Signing in automatically...")

#### Implementation Checklist

- [ ] Implement secure storage for device_secret and ID Token
- [ ] Configure Keychain Access Group (iOS) or SharedPreferences (Android)
- [ ] Implement Token Exchange request
- [ ] Implement ds_hash verification
- [ ] Handle all error cases with graceful fallback
- [ ] Test cross-app SSO flow
- [ ] Test device_secret expiration handling
- [ ] Test device_secret revocation handling

## Admin API Reference

### Native SSO Settings

```http
GET /api/admin/settings/native-sso
Authorization: Bearer <admin_token>
```

```http
PUT /api/admin/settings/native-sso
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "enabled": true,
  "deviceSecretTTLDays": 30,
  "maxDeviceSecretsPerUser": 10,
  "maxSecretsBehavior": "revoke_oldest",
  "allowCrossClientNativeSSO": false,
  "rateLimit": {
    "maxAttemptsPerMinute": 10,
    "blockDurationMinutes": 15
  }
}
```

### Device Secret Management

```http
GET /api/admin/users/{userId}/device-secrets
Authorization: Bearer <admin_token>
```

```http
DELETE /api/admin/device-secrets/{id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "User requested revocation"
}
```

## Configuration Reference

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable/disable Native SSO feature |
| `deviceSecretTTLDays` | number | `30` | Device secret lifetime in days (1-90) |
| `maxDeviceSecretsPerUser` | number | `10` | Maximum device secrets per user (1-50) |
| `maxSecretsBehavior` | string | `revoke_oldest` | Behavior when limit exceeded: `revoke_oldest` or `reject` |
| `allowCrossClientNativeSSO` | boolean | `false` | Allow SSO between different client apps |
| `rateLimit.maxAttemptsPerMinute` | number | `10` | Rate limit for Token Exchange (1-100) |
| `rateLimit.blockDurationMinutes` | number | `15` | Block duration after rate limit (1-60) |

## Appendix

### Token Type URNs

| Token Type | URN |
|------------|-----|
| Access Token | `urn:ietf:params:oauth:token-type:access_token` |
| Refresh Token | `urn:ietf:params:oauth:token-type:refresh_token` |
| ID Token | `urn:ietf:params:oauth:token-type:id_token` |
| Device Secret | `urn:openid:params:token-type:device-secret` |

### Related Specifications

- [OIDC Native SSO 1.0 (draft-07)](https://openid.net/specs/openid-connect-native-sso-1_0.html)
- [RFC 8693 - OAuth 2.0 Token Exchange](https://tools.ietf.org/html/rfc8693)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
