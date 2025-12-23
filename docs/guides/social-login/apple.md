# Sign in with Apple Setup

This guide walks you through setting up Sign in with Apple with Authrim.

## Overview

| Property            | Value                        |
| ------------------- | ---------------------------- |
| Protocol            | OpenID Connect 1.0           |
| Issuer              | `https://appleid.apple.com`  |
| ID Token            | Yes                          |
| UserInfo Endpoint   | No (claims in ID token only) |
| Private Email Relay | Yes                          |

> **Important**: Apple has unique requirements including dynamic JWT client secrets and a `form_post` response mode. Authrim handles these automatically.

## Prerequisites

- An Apple Developer account ($99/year)
- Access to Apple Developer Console
- Your Authrim instance URL (must be HTTPS)

## Step 1: Create an App ID

1. Go to [Apple Developer Console](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** → Click **+** to create new
4. Select **App IDs** → **App**
5. Enter:
   - **Description**: Your app name
   - **Bundle ID**: `com.yourcompany.yourapp`
6. Under **Capabilities**, enable **Sign in with Apple**
7. Click **Continue** → **Register**

## Step 2: Create a Services ID

1. In Identifiers, click **+** again
2. Select **Services IDs**
3. Enter:
   - **Description**: Your web service name
   - **Identifier**: `com.yourcompany.yourapp.service`
4. Click **Continue** → **Register**

### Configure the Services ID

1. Find your new Services ID and click on it
2. Enable **Sign in with Apple**
3. Click **Configure**
4. Select your Primary App ID
5. Add your domains and return URLs:

| Field       | Value                                                  |
| ----------- | ------------------------------------------------------ |
| Domains     | `your-domain.com`                                      |
| Return URLs | `https://your-domain.com/auth/external/apple/callback` |

6. Click **Save** → **Continue** → **Save**

## Step 3: Create a Sign in with Apple Key

1. Navigate to **Keys** → Click **+**
2. Enter a **Key Name**
3. Enable **Sign in with Apple**
4. Click **Configure** → Select your Primary App ID
5. Click **Save** → **Continue** → **Register**
6. **Download the key file** (.p8) immediately
7. Note your **Key ID** (10 characters)

> **Critical**: The private key can only be downloaded once. Store it securely.

## Step 4: Gather Your Credentials

You need four pieces of information:

| Credential      | Where to Find               | Format                                  |
| --------------- | --------------------------- | --------------------------------------- |
| **Team ID**     | Membership page (top right) | 10 characters (e.g., `A1B2C3D4E5`)      |
| **Client ID**   | Services ID identifier      | e.g., `com.yourcompany.yourapp.service` |
| **Key ID**      | Keys page                   | 10 characters (e.g., `ABC123DEF4`)      |
| **Private Key** | Downloaded .p8 file         | PEM format                              |

## Step 5: Encrypt the Private Key

Before storing in Authrim, encrypt your private key:

```bash
# Your .p8 file contents look like:
# -----BEGIN PRIVATE KEY-----
# MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
# -----END PRIVATE KEY-----

# Authrim requires this to be encrypted with your RP_TOKEN_ENCRYPTION_KEY
# The encryption is handled via the Admin API automatically
```

## Step 6: Register Provider in Authrim

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "apple",
    "name": "Apple",
    "slug": "apple",
    "client_id": "com.yourcompany.yourapp.service",
    "scopes": "openid name email",
    "provider_quirks": {
      "teamId": "A1B2C3D4E5",
      "keyId": "ABC123DEF4",
      "privateKeyEncrypted": "'"$(cat AuthKey_ABC123DEF4.p8)"'",
      "clientSecretTtl": 2592000,
      "useFormPost": true
    },
    "jit_provisioning": true,
    "auto_link_email": true,
    "require_email_verified": true
  }'
```

> **Note**: `client_secret` is not required for Apple; it's generated dynamically from the private key.

## Step 7: Test the Integration

1. Navigate to your application's login page
2. Click "Sign in with Apple"
3. Complete the Apple authentication flow
4. Verify the user is created/logged in successfully

## Configuration Options

### Default Configuration

```json
{
  "template": "apple",
  "name": "Apple",
  "providerType": "oidc",
  "issuer": "https://appleid.apple.com",
  "authorizationEndpoint": "https://appleid.apple.com/auth/authorize",
  "tokenEndpoint": "https://appleid.apple.com/auth/token",
  "jwksUri": "https://appleid.apple.com/auth/keys",
  "scopes": "openid name email",
  "attributeMapping": {
    "sub": "sub",
    "email": "email",
    "email_verified": "email_verified"
  },
  "providerQuirks": {
    "teamId": "REQUIRED",
    "keyId": "REQUIRED",
    "privateKeyEncrypted": "REQUIRED",
    "clientSecretTtl": 2592000,
    "useFormPost": true
  },
  "autoLinkEmail": true,
  "jitProvisioning": true,
  "requireEmailVerified": true
}
```

### Provider Quirks

| Property              | Type    | Required | Description                                 |
| --------------------- | ------- | -------- | ------------------------------------------- |
| `teamId`              | string  | Yes      | Apple Developer Team ID (10 chars)          |
| `keyId`               | string  | Yes      | Sign in with Apple Key ID (10 chars)        |
| `privateKeyEncrypted` | string  | Yes      | P-256 private key (will be encrypted)       |
| `clientSecretTtl`     | number  | No       | JWT validity in seconds (default: 30 days)  |
| `useFormPost`         | boolean | No       | Use form_post response mode (default: true) |

### Available Scopes

| Scope    | Description                    |
| -------- | ------------------------------ |
| `openid` | Required for OIDC              |
| `name`   | User's name (first auth only!) |
| `email`  | User's email address           |

### Claim Mappings

| Authrim Claim    | Apple Claim      | Description                             |
| ---------------- | ---------------- | --------------------------------------- |
| `sub`            | `sub`            | Unique user identifier (stable per app) |
| `email`          | `email`          | Email (may be private relay)            |
| `email_verified` | `email_verified` | Always true for Apple emails            |

## Important: Name is Only Provided Once

Apple only provides the user's name on **first authorization**. This data is:

- Sent in the POST body (not the ID token)
- Only sent once per user per app
- Not available on subsequent logins

Authrim automatically captures this data. Store it in your user record on first login.

## Private Email Relay

Apple offers "Hide My Email" which provides:

- A unique, random email address (e.g., `abc123@privaterelay.appleid.com`)
- Emails forwarded to user's real address
- User can disable forwarding anytime

### Handling Private Relay Emails

```json
{
  "attributeMapping": {
    "sub": "sub",
    "email": "email",
    "is_private_email": "is_private_email"
  }
}
```

Check `is_private_email` claim to detect relay addresses.

## Dynamic Client Secret (JWT)

Apple requires a JWT as the client secret. Authrim generates this automatically using:

| Claim | Value                        |
| ----- | ---------------------------- |
| `iss` | Your Team ID                 |
| `sub` | Your Client ID (Services ID) |
| `aud` | `https://appleid.apple.com`  |
| `iat` | Current timestamp            |
| `exp` | iat + clientSecretTtl        |

The JWT is signed with your private key using ES256 (P-256 curve).

## Response Mode: form_post

When requesting `name` or `email` scopes, Apple **requires** `response_mode=form_post`:

- Callback is a POST request (not GET)
- Authrim handles this automatically
- Set `useFormPost: true` (default)

## Real User Status

Apple provides a `real_user_status` claim:

| Value | Meaning                                   |
| ----- | ----------------------------------------- |
| 0     | Unsupported (device doesn't support)      |
| 1     | Unknown (couldn't determine)              |
| 2     | Likely Real (high confidence real person) |

Use this for fraud prevention.

## Security Considerations

1. **Protect Your Private Key**: Store the .p8 file securely. Never commit to version control.

2. **Key Rotation**: Apple keys don't expire, but rotate them if compromised.

3. **Verify email_verified**: Always true for Apple-provided emails, but check anyway.

4. **Handle Private Relay**: Users may use relay emails; don't assume real email access.

5. **First-Auth Data**: Capture and store name data on first login.

## Token Revocation

Apple provides a revocation endpoint:

```bash
POST https://appleid.apple.com/auth/revoke
Content-Type: application/x-www-form-urlencoded

client_id=<client_id>&
client_secret=<jwt>&
token=<access_token_or_refresh_token>&
token_type_hint=access_token
```

Users can revoke at: [Apple ID - Sign-In & Security](https://appleid.apple.com/account/manage)

## Troubleshooting

### "invalid_client" Error

**Cause**: Client secret JWT generation failed.

**Solution**:

1. Verify Team ID is exactly 10 characters
2. Verify Key ID is exactly 10 characters
3. Ensure private key is valid PEM format
4. Check private key matches the Key ID

### "invalid_grant" Error

**Cause**: Authorization code expired or already used.

**Solution**:

- Auth codes expire in 5 minutes
- Each code can only be used once
- Restart the flow

### "redirect_uri_mismatch" Error

**Cause**: Return URL not configured in Services ID.

**Solution**:

1. Go to Identifiers → Your Services ID → Configure
2. Add exact URL:
   ```
   https://your-domain.com/auth/external/apple/callback
   ```
3. Include domain in Domains list

### Name Not Received

**Cause**: User already authorized the app before.

**Solution**:

- Name is only sent on first authorization
- Users can reset at: Settings → Apple ID → Password & Security → Apps Using Your Apple ID

### "response_mode must be form_post"

**Cause**: Missing response_mode parameter when using name/email scope.

**Solution**: Ensure `useFormPost: true` in quirks (default).

## iOS/macOS App Integration

For native apps:

1. Use the same Team ID
2. Create an App ID (not Services ID)
3. Use AuthenticationServices framework
4. Bundle ID as client_id

```swift
let request = ASAuthorizationAppleIDProvider().createRequest()
request.requestedScopes = [.fullName, .email]
```

## References

- [Sign in with Apple Documentation](https://developer.apple.com/sign-in-with-apple/)
- [Configuring Your Webpage for Sign in with Apple](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_js/configuring_your_webpage_for_sign_in_with_apple)
- [Generate and Validate Tokens](https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens)
- [Apple ID REST API](https://developer.apple.com/documentation/sign_in_with_apple/sign_in_with_apple_rest_api)

---

**Last Updated**: 2025-12-20
