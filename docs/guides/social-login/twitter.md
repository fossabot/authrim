# X (formerly Twitter) Sign-In Setup

This guide walks you through setting up X Sign-In with Authrim.

## Overview

| Property          | Value               |
| ----------------- | ------------------- |
| Protocol          | OAuth 2.0 with PKCE |
| API Version       | Twitter API v2      |
| ID Token          | No (uses API v2)    |
| UserInfo Endpoint | `/2/users/me`       |
| PKCE Required     | Yes (mandatory)     |

> **Note**: X (formerly Twitter) requires OAuth 2.0 with PKCE for all new applications. OAuth 1.0a is still supported for legacy apps but not recommended.

## Prerequisites

- An X (Twitter) account
- A Developer account at [X Developer Portal](https://developer.x.com/)
- Your Authrim instance URL

## Step 1: Apply for Developer Access

1. Go to [X Developer Portal](https://developer.x.com/)
2. Click **Sign up** or **Developer Portal**
3. Complete the developer application process
4. Wait for approval (may take a few hours to days)

## Step 2: Create a Project and App

1. In the Developer Portal, go to **Projects & Apps**
2. Click **Create Project**
3. Enter project details:
   - **Project name**: Your project name
   - **Use case**: Select appropriate option
   - **Project description**: Brief description
4. Create an App within the project

## Step 3: Configure User Authentication Settings

1. In your App settings, go to **User authentication settings**
2. Click **Set up**
3. Configure the following:

### App Permissions

Select **Read** (minimum required for sign-in)

### Type of App

Select **Web App, Automated App or Bot**

### App Info

| Field        | Value                                                    |
| ------------ | -------------------------------------------------------- |
| Callback URI | `https://your-domain.com/auth/external/twitter/callback` |
| Website URL  | Your application URL                                     |

For local development:

```
http://127.0.0.1:8787/auth/external/twitter/callback
```

> **Note**: X requires `127.0.0.1` for local development, not `localhost`.

4. Click **Save**

## Step 4: Get Your Credentials

1. Go to **Keys and tokens** tab
2. Under **OAuth 2.0 Client ID and Client Secret**:
   - Copy the **Client ID**
   - Click **Regenerate** to get the **Client Secret**

> **Important**: X OAuth 2.0 credentials are different from API Key/Secret (OAuth 1.0a).

## Step 5: Register Provider in Authrim

### Basic Setup

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "twitter",
    "name": "X",
    "slug": "twitter",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "scopes": "users.read tweet.read offline.access",
    "jit_provisioning": true,
    "auto_link_email": false
  }'
```

### With Custom User Fields

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "twitter",
    "name": "X",
    "slug": "twitter",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "scopes": "users.read tweet.read offline.access",
    "provider_quirks": {
      "useBasicAuth": true,
      "pkceRequired": true,
      "userFields": "id,name,username,profile_image_url,description,url,location,verified"
    },
    "jit_provisioning": true,
    "auto_link_email": false
  }'
```

## Step 6: Test the Integration

1. Navigate to your application's login page
2. Click "Continue with X"
3. Complete the X authorization flow
4. Verify the user is created/logged in successfully

## Configuration Options

### Default Configuration

```json
{
  "template": "twitter",
  "name": "X",
  "providerType": "oauth2",
  "authorizationEndpoint": "https://twitter.com/i/oauth2/authorize",
  "tokenEndpoint": "https://api.twitter.com/2/oauth2/token",
  "userinfoEndpoint": "https://api.twitter.com/2/users/me",
  "scopes": "users.read tweet.read offline.access",
  "attributeMapping": {
    "sub": "data.id",
    "name": "data.name",
    "preferred_username": "data.username",
    "picture": "data.profile_image_url"
  },
  "providerQuirks": {
    "useBasicAuth": true,
    "pkceRequired": true,
    "userFields": "id,name,username,profile_image_url"
  },
  "autoLinkEmail": false,
  "jitProvisioning": true
}
```

### Provider Quirks

| Property       | Type    | Default   | Description                              |
| -------------- | ------- | --------- | ---------------------------------------- |
| `useBasicAuth` | boolean | `true`    | Use HTTP Basic auth for token exchange   |
| `pkceRequired` | boolean | `true`    | PKCE is mandatory (informational)        |
| `userFields`   | string  | See above | Comma-separated user fields              |
| `includeEmail` | boolean | `false`   | Request email (requires elevated access) |
| `expansions`   | string  | -         | API expansions (e.g., `pinned_tweet_id`) |

### Available Scopes

| Scope            | Description                          |
| ---------------- | ------------------------------------ |
| `users.read`     | Read user profile data               |
| `tweet.read`     | Read tweets (required for OAuth 2.0) |
| `offline.access` | Get refresh token                    |

### User Fields

| Field               | Description           |
| ------------------- | --------------------- |
| `id`                | Unique user ID        |
| `name`              | Display name          |
| `username`          | @handle               |
| `profile_image_url` | Avatar URL            |
| `description`       | Bio                   |
| `url`               | Profile URL           |
| `location`          | Location              |
| `verified`          | Legacy verification   |
| `verified_type`     | New verification type |
| `created_at`        | Account creation date |
| `public_metrics`    | Follower counts, etc. |

### Claim Mappings

X returns data in a nested `data` object:

| Authrim Claim        | X Response Path          | Description    |
| -------------------- | ------------------------ | -------------- |
| `sub`                | `data.id`                | Unique user ID |
| `name`               | `data.name`              | Display name   |
| `preferred_username` | `data.username`          | @handle        |
| `picture`            | `data.profile_image_url` | Avatar URL     |

## Important: Email Access

X does **not** provide email addresses by default. To access user email:

1. Apply for **Elevated** API access in Developer Portal
2. Complete the app review process
3. Once approved, add the email scope

> **Note**: Due to email limitations, `auto_link_email` is set to `false` by default for X.

## PKCE Requirement

X **requires** PKCE (Proof Key for Code Exchange) for all OAuth 2.0 flows:

- Authrim automatically handles PKCE
- Uses S256 challenge method
- No configuration needed

## Authentication Method

X requires **HTTP Basic Authentication** for the token endpoint:

```
Authorization: Basic base64(client_id:client_secret)
```

Authrim handles this automatically when `useBasicAuth: true`.

## Token Revocation

To revoke access tokens:

```bash
# Using the revocation endpoint
POST https://api.twitter.com/2/oauth2/revoke
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

token={access_token}&token_type_hint=access_token
```

Users can also revoke at: [X Settings - Connected Apps](https://twitter.com/settings/connected_apps)

## Security Considerations

1. **PKCE is Mandatory**: X enforces PKCE for all OAuth 2.0 flows, providing enhanced security.

2. **Use Basic Auth**: Token exchange requires Basic authentication with client credentials.

3. **Minimal Scopes**: `tweet.read` is required even for sign-in due to X's OAuth 2.0 implementation.

4. **No Email by Default**: Plan for usernames as primary identifiers.

5. **Token Refresh**: Use `offline.access` scope to get refresh tokens for long-lived sessions.

## Troubleshooting

### "invalid_request" - Callback URL Mismatch

**Cause**: Redirect URI doesn't match configuration.

**Solution**:

1. Go to Developer Portal → Your App → User authentication settings
2. Verify Callback URI exactly matches:
   ```
   https://your-domain.com/auth/external/twitter/callback
   ```
3. For local development, use `127.0.0.1` instead of `localhost`

### "unauthorized_client" Error

**Cause**: OAuth 2.0 not enabled or credentials incorrect.

**Solution**:

1. Ensure User authentication settings are configured
2. Use OAuth 2.0 Client ID, not API Key
3. Regenerate client secret if needed

### Missing User Data

**Cause**: Requested fields not included in API response.

**Solution**: Specify required fields in quirks:

```json
{
  "provider_quirks": {
    "userFields": "id,name,username,profile_image_url,description"
  }
}
```

### Rate Limiting

X has API rate limits:

| Endpoint        | Limit               |
| --------------- | ------------------- |
| OAuth 2.0 Token | 300 requests/15 min |
| /users/me       | 75 requests/15 min  |

### "tweet.read scope required"

**Cause**: X requires `tweet.read` for OAuth 2.0.

**Solution**: Include `tweet.read` in scopes even for sign-in only:

```json
{
  "scopes": "users.read tweet.read offline.access"
}
```

## API Access Levels

| Level      | Rate Limits | Features        |
| ---------- | ----------- | --------------- |
| Free       | Limited     | Basic OAuth 2.0 |
| Basic      | Higher      | More endpoints  |
| Pro        | Higher      | Full API access |
| Enterprise | Custom      | Custom limits   |

## Display Guidelines

When implementing X sign-in, follow X's [brand guidelines](https://developer.x.com/en/docs/twitter-for-websites/log-in-with-twitter/guides/sign-in-with-twitter):

- Use official X logo
- Button text: "Continue with X" or "Sign in with X"
- Use X brand colors (#000000 for button)

## References

- [X Developer Portal](https://developer.x.com/)
- [OAuth 2.0 Authorization](https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code)
- [OAuth 2.0 User Access Token](https://developer.x.com/en/docs/authentication/oauth-2-0/user-access-token)
- [Users Lookup API](https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me)

---

**Last Updated**: 2025-12-20
