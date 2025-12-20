# LinkedIn Sign-In Setup

This guide walks you through setting up LinkedIn Sign-In with Authrim.

## Overview

| Property | Value |
|----------|-------|
| Protocol | OpenID Connect 1.0 (since 2024) |
| Issuer | `https://www.linkedin.com/oauth` |
| ID Token | Yes |
| UserInfo Endpoint | Yes |
| Email Verified Claim | Yes |

> **Note**: LinkedIn migrated to OpenID Connect in 2024. If you have an existing OAuth 2.0 integration, consider upgrading to OIDC for improved security and standardization.

## Prerequisites

- A LinkedIn account
- A LinkedIn Company Page (recommended)
- Access to LinkedIn Developer Portal
- Your Authrim instance URL

## Step 1: Create a LinkedIn App

1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Click **Create App**
3. Fill in the required information:
   - **App name**: Your application name
   - **LinkedIn Page**: Select or create a company page
   - **Privacy policy URL**: Your privacy policy URL
   - **App logo**: Upload your app logo
4. Check the agreement checkbox and click **Create app**

## Step 2: Configure OAuth 2.0 Settings

1. In your app dashboard, go to the **Auth** tab
2. Under **OAuth 2.0 settings**, find the **Redirect URLs** section
3. Click **Add redirect URL**
4. Enter your Authrim callback URL:

```
https://your-domain.com/auth/external/linkedin/callback
```

For local development:
```
http://localhost:8787/auth/external/linkedin/callback
```

## Step 3: Request OpenID Connect Product

1. Go to the **Products** tab
2. Find **Sign In with LinkedIn using OpenID Connect**
3. Click **Request access**
4. Wait for approval (usually instant for OIDC)

## Step 4: Get Your Credentials

1. Go back to the **Auth** tab
2. Copy the **Client ID**
3. Click **Show** next to Client Secret and copy it

## Step 5: Register Provider in Authrim

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "linkedin",
    "name": "LinkedIn",
    "slug": "linkedin",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "scopes": "openid profile email",
    "jit_provisioning": true,
    "auto_link_email": true,
    "require_email_verified": true
  }'
```

## Step 6: Test the Integration

1. Navigate to your application's login page
2. Click "Sign in with LinkedIn"
3. Complete the LinkedIn authorization flow
4. Verify the user is created/logged in successfully

## Configuration Options

### Default Configuration

```json
{
  "template": "linkedin",
  "name": "LinkedIn",
  "providerType": "oidc",
  "issuer": "https://www.linkedin.com/oauth",
  "authorizationEndpoint": "https://www.linkedin.com/oauth/v2/authorization",
  "tokenEndpoint": "https://www.linkedin.com/oauth/v2/accessToken",
  "userinfoEndpoint": "https://api.linkedin.com/v2/userinfo",
  "jwksUri": "https://www.linkedin.com/oauth/openid/jwks",
  "scopes": "openid profile email",
  "attributeMapping": {
    "sub": "sub",
    "email": "email",
    "email_verified": "email_verified",
    "name": "name",
    "given_name": "given_name",
    "family_name": "family_name",
    "picture": "picture",
    "locale": "locale"
  },
  "autoLinkEmail": true,
  "jitProvisioning": true,
  "requireEmailVerified": true
}
```

### Available Scopes

| Scope | Description |
|-------|-------------|
| `openid` | Required for OIDC |
| `profile` | User's name and profile picture |
| `email` | User's email address |

### Claim Mappings

| Authrim Claim | LinkedIn Claim | Description |
|---------------|----------------|-------------|
| `sub` | `sub` | Unique user identifier |
| `email` | `email` | Primary email address |
| `email_verified` | `email_verified` | Whether email is verified |
| `name` | `name` | Full name |
| `given_name` | `given_name` | First name |
| `family_name` | `family_name` | Last name |
| `picture` | `picture` | Profile picture URL |
| `locale` | `locale` | User's locale preference |

## Token Lifecycle

LinkedIn has a unique token lifecycle:

| Property | Value |
|----------|-------|
| Access Token TTL | 60 days |
| Refresh Token | Not provided |
| Revocation Endpoint | Not available |

> **Important**: LinkedIn does NOT provide a token revocation endpoint. Tokens expire naturally after 60 days. To "logout" a user, simply discard the tokens on your side.

## Security Considerations

1. **Verify Emails**: Always require verified emails (`require_email_verified: true`).

2. **Token Expiration**: Plan for token re-authorization since LinkedIn doesn't provide refresh tokens.

3. **Minimal Scopes**: Only request `openid profile email` unless additional data is needed.

4. **HTTPS Required**: LinkedIn requires HTTPS for production redirect URIs.

## Troubleshooting

### "unauthorized_client" Error

**Cause**: App not authorized for requested scopes or OIDC product not enabled.

**Solution**:
1. Go to LinkedIn Developer Portal → Your App → Products
2. Ensure "Sign In with LinkedIn using OpenID Connect" is approved
3. Wait a few minutes after approval before testing

### "redirect_uri_mismatch" Error

**Cause**: Redirect URI doesn't match configured URLs.

**Solution**:
1. Go to LinkedIn Developer Portal → Your App → Auth
2. Verify the redirect URL exactly matches:
   ```
   https://your-domain.com/auth/external/linkedin/callback
   ```
3. Check for trailing slashes or protocol mismatches

### Email Not Returned

**Cause**: Email scope not included.

**Solution**: Ensure `email` is in the scopes:
```json
{
  "scopes": "openid profile email"
}
```

### "invalid_client" Error

**Cause**: Incorrect credentials or app suspended.

**Solution**:
1. Verify Client ID and Secret are correct
2. Check if app is still active in Developer Portal
3. Regenerate credentials if needed

### Profile Picture Not Returned

**Cause**: User hasn't uploaded a profile picture.

**Solution**: Handle missing `picture` claim gracefully in your application.

## Migration from OAuth 2.0

If migrating from the legacy OAuth 2.0 API:

1. Request the "Sign In with LinkedIn using OpenID Connect" product
2. Update your scopes from `r_liteprofile r_emailaddress` to `openid profile email`
3. Update endpoint URLs to use the OIDC endpoints
4. Update claim mappings (field names changed in OIDC)

### Legacy vs OIDC Claim Mapping

| Data | Legacy Field | OIDC Field |
|------|--------------|------------|
| User ID | `id` | `sub` |
| Email | `emailAddress` | `email` |
| First Name | `firstName.localized.en_US` | `given_name` |
| Last Name | `lastName.localized.en_US` | `family_name` |

## Compliance Notes

LinkedIn's OIDC implementation follows the standard, making it compatible with:
- GDPR data access requests
- User consent management
- Standard OIDC libraries

## References

- [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
- [Sign In with LinkedIn using OpenID Connect](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2)
- [LinkedIn OAuth 2.0 Authorization](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow)

---

**Last Updated**: 2025-12-20
