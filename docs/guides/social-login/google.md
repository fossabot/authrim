# Google Sign-In Setup

This guide walks you through setting up Google Sign-In with Authrim.

## Overview

| Property             | Value                         |
| -------------------- | ----------------------------- |
| Protocol             | OpenID Connect 1.0            |
| Issuer               | `https://accounts.google.com` |
| ID Token             | Yes                           |
| UserInfo Endpoint    | Yes                           |
| Email Verified Claim | Yes                           |

## Prerequisites

- A Google Cloud Console account
- Access to create OAuth 2.0 credentials
- Your Authrim instance URL

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter a project name and click **Create**

## Step 2: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal for Google Workspace)
3. Fill in the required fields:
   - **App name**: Your application name
   - **User support email**: Your email address
   - **Developer contact information**: Your email
4. Click **Save and Continue**

### Configure Scopes

1. Click **Add or Remove Scopes**
2. Add these scopes:
   - `openid`
   - `email`
   - `profile`
3. Click **Update** → **Save and Continue**

### Test Users (External Apps)

For external apps in testing mode:

1. Add test users who can access the app before publishing
2. Click **Save and Continue**

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application** as the application type
4. Enter a name for the client

### Configure Authorized Redirect URIs

Add your Authrim callback URL:

```
https://your-domain.com/auth/external/google/callback
```

For local development:

```
http://localhost:8787/auth/external/google/callback
```

5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## Step 4: Register Provider in Authrim

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "google",
    "name": "Google",
    "slug": "google",
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "client_secret": "GOCSPX-xxxxxxxxxxxx",
    "scopes": "openid email profile",
    "jit_provisioning": true,
    "auto_link_email": true,
    "require_email_verified": true
  }'
```

## Step 5: Test the Integration

1. Navigate to your application's login page
2. Click "Sign in with Google"
3. Complete the Google authentication flow
4. Verify the user is created/logged in successfully

## Configuration Options

### Default Configuration

```json
{
  "template": "google",
  "name": "Google",
  "providerType": "oidc",
  "issuer": "https://accounts.google.com",
  "scopes": "openid email profile",
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

| Scope     | Description                               |
| --------- | ----------------------------------------- |
| `openid`  | Required for OIDC                         |
| `email`   | User's email address                      |
| `profile` | User's basic profile info (name, picture) |

### Claim Mappings

| Authrim Claim    | Google Claim     | Description               |
| ---------------- | ---------------- | ------------------------- |
| `sub`            | `sub`            | Unique user identifier    |
| `email`          | `email`          | Primary email address     |
| `email_verified` | `email_verified` | Whether email is verified |
| `name`           | `name`           | Full name                 |
| `given_name`     | `given_name`     | First name                |
| `family_name`    | `family_name`    | Last name                 |
| `picture`        | `picture`        | Profile picture URL       |
| `locale`         | `locale`         | User's locale preference  |

## Advanced Configuration

### Restrict to Specific Domain (Google Workspace)

To restrict login to a specific Google Workspace domain:

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "google",
    "name": "Company Google",
    "slug": "company-google",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "scopes": "openid email profile",
    "provider_quirks": {
      "hostedDomain": "yourcompany.com"
    }
  }'
```

### Request Additional Claims

For additional user information, use the People API:

1. Enable the People API in Google Cloud Console
2. Add additional scopes as needed

## Security Considerations

1. **Use HTTPS in Production**: Google requires HTTPS for OAuth redirect URIs in production.

2. **Verify Email Addresses**: Always set `require_email_verified: true` to prevent account hijacking.

3. **Rotate Secrets**: Periodically rotate your client secret in Google Cloud Console.

4. **Review Permissions**: Regularly audit the scopes your application requests.

## Troubleshooting

### "redirect_uri_mismatch" Error

**Cause**: The redirect URI doesn't match what's configured in Google Cloud Console.

**Solution**:

1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Ensure the redirect URI exactly matches:
   ```
   https://your-domain.com/auth/external/google/callback
   ```

### "access_denied" Error

**Cause**: User denied consent or app is in testing mode.

**Solution**:

- For testing apps, ensure the user is added as a test user
- For production apps, verify the consent screen is published

### "invalid_client" Error

**Cause**: Incorrect client ID or secret.

**Solution**:

1. Verify the client ID includes `.apps.googleusercontent.com`
2. Re-copy the client secret from Google Cloud Console
3. Ensure no extra whitespace in credentials

### User Email Not Returned

**Cause**: Email scope not requested.

**Solution**: Ensure `email` is included in the scopes:

```json
{
  "scopes": "openid email profile"
}
```

## Token Revocation

To revoke user access programmatically:

```bash
# Google doesn't provide a standard revocation endpoint via Authrim
# Users can revoke access at: https://myaccount.google.com/permissions
```

## References

- [Google Identity - OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Google Identity - OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Last Updated**: 2025-12-20
