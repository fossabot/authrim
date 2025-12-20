# Facebook Login Setup

This guide walks you through setting up Facebook Login with Authrim.

## Overview

| Property | Value |
|----------|-------|
| Protocol | OAuth 2.0 |
| API Version | v20.0 |
| ID Token | No (uses Graph API) |
| UserInfo Endpoint | Graph API `/me` |
| Email Verified Claim | No |

## Prerequisites

- A Facebook account
- A Meta Developer account
- A Facebook App (or create one)
- Your Authrim instance URL

## Step 1: Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **My Apps** → **Create App**
3. Select **Consumer** or **Business** as your app type
4. Enter your app details:
   - **App name**: Your application name
   - **App contact email**: Your email
5. Click **Create app**

## Step 2: Set Up Facebook Login

1. In your app dashboard, find **Facebook Login** under Products
2. Click **Set Up**
3. Select **Web** as the platform
4. Enter your site URL and click **Save**

## Step 3: Configure OAuth Settings

1. Go to **Facebook Login** → **Settings** in the left sidebar
2. Configure the following:

### Valid OAuth Redirect URIs

Add your Authrim callback URL:

```
https://your-domain.com/auth/external/facebook/callback
```

For local development (requires HTTPS even locally):
```
https://localhost:8787/auth/external/facebook/callback
```

3. Enable these settings:
   - **Client OAuth Login**: Yes
   - **Web OAuth Login**: Yes
   - **Enforce HTTPS**: Yes

4. Click **Save Changes**

## Step 4: Get Your Credentials

1. Go to **Settings** → **Basic**
2. Copy the **App ID** (this is your Client ID)
3. Click **Show** next to App Secret and copy it

## Step 5: Configure App Secret Proof (Recommended)

For enhanced security:

1. Go to **Settings** → **Advanced**
2. Enable **Require App Secret**
3. This requires `appsecret_proof` with all API calls

## Step 6: Register Provider in Authrim

### Basic Setup

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "facebook",
    "name": "Facebook",
    "slug": "facebook",
    "client_id": "YOUR_APP_ID",
    "client_secret": "YOUR_APP_SECRET",
    "scopes": "email public_profile",
    "jit_provisioning": true,
    "auto_link_email": true,
    "require_email_verified": false
  }'
```

### With App Secret Proof (Recommended)

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "facebook",
    "name": "Facebook",
    "slug": "facebook",
    "client_id": "YOUR_APP_ID",
    "client_secret": "YOUR_APP_SECRET",
    "scopes": "email public_profile",
    "provider_quirks": {
      "apiVersion": "v20.0",
      "useAppSecretProof": true,
      "fields": ["id", "name", "email", "first_name", "last_name", "picture.type(large)"]
    },
    "jit_provisioning": true,
    "auto_link_email": true,
    "require_email_verified": false
  }'
```

## Step 7: Test the Integration

1. Navigate to your application's login page
2. Click "Continue with Facebook"
3. Complete the Facebook authorization flow
4. Verify the user is created/logged in successfully

## Configuration Options

### Default Configuration

```json
{
  "template": "facebook",
  "name": "Facebook",
  "providerType": "oauth2",
  "authorizationEndpoint": "https://www.facebook.com/v20.0/dialog/oauth",
  "tokenEndpoint": "https://graph.facebook.com/v20.0/oauth/access_token",
  "userinfoEndpoint": "https://graph.facebook.com/v20.0/me",
  "scopes": "email public_profile",
  "attributeMapping": {
    "sub": "id",
    "email": "email",
    "name": "name",
    "given_name": "first_name",
    "family_name": "last_name",
    "picture": "picture.data.url"
  },
  "providerQuirks": {
    "apiVersion": "v20.0",
    "useAppSecretProof": true,
    "fields": ["id", "name", "email", "first_name", "last_name", "picture.type(large)"]
  },
  "autoLinkEmail": true,
  "jitProvisioning": true,
  "requireEmailVerified": false
}
```

### Provider Quirks

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `apiVersion` | string | `v20.0` | Graph API version |
| `useAppSecretProof` | boolean | `true` | Use HMAC-SHA256 proof |
| `fields` | string[] | See above | Fields to request from `/me` |

### Available Scopes

| Scope | Description |
|-------|-------------|
| `public_profile` | User's public profile (name, picture, etc.) |
| `email` | User's primary email address |

### Claim Mappings

| Authrim Claim | Facebook Field | Description |
|---------------|----------------|-------------|
| `sub` | `id` | Unique Facebook user ID |
| `email` | `email` | Primary email (may be null) |
| `name` | `name` | Full name |
| `given_name` | `first_name` | First name |
| `family_name` | `last_name` | Last name |
| `picture` | `picture.data.url` | Profile picture URL |

## Important: Email Verification

Facebook does NOT provide an `email_verified` claim. This means:

1. Set `require_email_verified: false` for Facebook
2. Consider additional email verification in your app
3. Be cautious with `auto_link_email` as emails may be unverified

## GDPR Compliance

Facebook requires GDPR compliance features:

### Data Deletion Callback

Configure a Data Deletion Callback URL in your Facebook App:

1. Go to **Settings** → **Basic**
2. Enter **Data Deletion Callback URL**:
   ```
   https://your-domain.com/webhooks/facebook/data-deletion
   ```

This endpoint receives signed requests when users delete their data.

### Permission Revocation

To revoke user permissions programmatically:

```bash
# Revoke all permissions
DELETE https://graph.facebook.com/v20.0/me/permissions
Authorization: Bearer {user_access_token}
appsecret_proof: {hmac_sha256(access_token, app_secret)}

# Revoke specific permission
DELETE https://graph.facebook.com/v20.0/me/permissions/{permission}
```

## App Secret Proof

When `useAppSecretProof: true`, Authrim automatically includes an `appsecret_proof` parameter with Graph API requests. This is an HMAC-SHA256 hash:

```
appsecret_proof = HMAC-SHA256(access_token, app_secret)
```

This prevents token hijacking attacks and is highly recommended.

## Security Considerations

1. **Enable App Secret Proof**: Always use `useAppSecretProof: true` in production.

2. **HTTPS Required**: Facebook requires HTTPS for all OAuth redirect URIs.

3. **App Review**: For public apps, you'll need to submit for App Review.

4. **Email Verification**: Implement your own email verification since Facebook doesn't guarantee verified emails.

5. **Token Expiration**: Facebook access tokens expire. Handle token refresh or re-authentication.

## App Review

For production apps:

1. Go to **App Review** → **Permissions and Features**
2. Request `email` permission if not already approved
3. Provide verification details and submit for review

## Troubleshooting

### "Invalid redirect_uri" Error

**Cause**: Redirect URI not in Valid OAuth Redirect URIs list.

**Solution**:
1. Go to Facebook Login → Settings
2. Add your exact redirect URI:
   ```
   https://your-domain.com/auth/external/facebook/callback
   ```

### Email Not Returned

**Cause**: User hasn't shared email or email scope missing.

**Solution**:
1. Ensure `email` is in scopes
2. Check user granted email permission
3. Note: Some users may not have an email on Facebook

### "App Not Setup" Error

**Cause**: App is in development mode.

**Solution**:
1. Go to Settings → Basic
2. Toggle **App Mode** to **Live**
3. For testing, add testers under **Roles**

### Profile Picture Not Loading

**Cause**: Picture URL expires or incorrect field format.

**Solution**: Use `picture.type(large)` in fields:
```json
{
  "provider_quirks": {
    "fields": ["id", "name", "email", "picture.type(large)"]
  }
}
```

### Rate Limiting

Facebook has API rate limits:

| Platform | Limit |
|----------|-------|
| Login (per app) | 200 calls/user/hour |
| Graph API (per app) | Varies by app category |

## Testing

### Test Users

1. Go to **Roles** → **Test Users**
2. Click **Add** to create test users
3. Use these accounts for testing without affecting real users

### Debug Mode

To debug tokens:
- [Facebook Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)

## References

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api/)
- [Securing Requests with appsecret_proof](https://developers.facebook.com/docs/graph-api/securing-requests)
- [Data Deletion Callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback)

---

**Last Updated**: 2025-12-20
