# GitHub Sign-In Setup

This guide walks you through setting up GitHub Sign-In with Authrim.

## Overview

| Property | Value |
|----------|-------|
| Protocol | OAuth 2.0 |
| ID Token | No (uses UserInfo) |
| UserInfo Endpoint | Yes |
| Enterprise | Supports GitHub Enterprise Server |

## Prerequisites

- A GitHub account
- For organizations: Admin access to create OAuth Apps
- Your Authrim instance URL

## Step 1: Create a GitHub OAuth App

### For GitHub.com

1. Go to [GitHub Settings](https://github.com/settings/profile)
2. Navigate to **Developer settings** → **OAuth Apps**
3. Click **New OAuth App**
4. Fill in the details:
   - **Application name**: Your application name
   - **Homepage URL**: Your application URL
   - **Authorization callback URL**: Your Authrim callback URL

### Authorization Callback URL

```
https://your-domain.com/auth/external/github/callback
```

For local development:
```
http://localhost:8787/auth/external/github/callback
```

5. Click **Register application**
6. Copy the **Client ID**
7. Click **Generate a new client secret**
8. Copy the **Client Secret** immediately

## Step 2: Register Provider in Authrim

### Basic Setup

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "github",
    "name": "GitHub",
    "slug": "github",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "jit_provisioning": true,
    "auto_link_email": true
  }'
```

### With Email Access

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "github",
    "name": "GitHub",
    "slug": "github",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "scopes": "read:user user:email",
    "provider_quirks": {
      "fetchPrimaryEmail": true
    },
    "jit_provisioning": true,
    "auto_link_email": true
  }'
```

## Step 3: Test the Integration

1. Navigate to your application's login page
2. Click "Sign in with GitHub"
3. Complete the GitHub authorization flow
4. Verify the user is created/logged in successfully

## Configuration Options

### Default Configuration

```json
{
  "template": "github",
  "name": "GitHub",
  "providerType": "oauth2",
  "authorizationEndpoint": "https://github.com/login/oauth/authorize",
  "tokenEndpoint": "https://github.com/login/oauth/access_token",
  "userinfoEndpoint": "https://api.github.com/user",
  "scopes": "read:user user:email",
  "attributeMapping": {
    "sub": "id",
    "email": "email",
    "name": "name",
    "preferred_username": "login",
    "picture": "avatar_url",
    "profile": "html_url"
  },
  "providerQuirks": {
    "fetchPrimaryEmail": true,
    "allowUnverifiedEmail": false
  },
  "autoLinkEmail": true,
  "jitProvisioning": true
}
```

### Provider Quirks

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `fetchPrimaryEmail` | boolean | `true` | Fetch email from /user/emails endpoint |
| `allowUnverifiedEmail` | boolean | `false` | Accept unverified emails |
| `enterpriseHost` | string | - | GitHub Enterprise Server hostname |

### Available Scopes

| Scope | Description |
|-------|-------------|
| `read:user` | Read user profile data |
| `user:email` | Read user email addresses (including private) |
| `read:org` | Read organization membership |

### Claim Mappings

| Authrim Claim | GitHub Claim | Description |
|---------------|--------------|-------------|
| `sub` | `id` | Unique GitHub user ID (numeric) |
| `email` | `email` | Primary email (may require fetchPrimaryEmail) |
| `name` | `name` | Display name |
| `preferred_username` | `login` | GitHub username |
| `picture` | `avatar_url` | Avatar URL |
| `profile` | `html_url` | GitHub profile URL |

## GitHub Enterprise Server

For GitHub Enterprise Server (GHES), configure custom endpoints:

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "github",
    "name": "GitHub Enterprise",
    "slug": "github-enterprise",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "provider_quirks": {
      "enterpriseHost": "github.yourcompany.com"
    },
    "jit_provisioning": true,
    "auto_link_email": true
  }'
```

This automatically configures:
- Authorization: `https://github.yourcompany.com/login/oauth/authorize`
- Token: `https://github.yourcompany.com/login/oauth/access_token`
- UserInfo: `https://github.yourcompany.com/api/v3/user`
- Emails: `https://github.yourcompany.com/api/v3/user/emails`

## Email Handling

GitHub has unique email handling:

1. **Public Email**: Returned in `/user` endpoint if set as public
2. **Private Email**: Requires `user:email` scope and `/user/emails` endpoint
3. **Verified vs Unverified**: GitHub tracks email verification status

### Fetching Primary Email

When `fetchPrimaryEmail: true`, Authrim:
1. Calls `/user/emails` endpoint
2. Finds the primary, verified email
3. Falls back to primary unverified if `allowUnverifiedEmail: true`

```json
{
  "provider_quirks": {
    "fetchPrimaryEmail": true,
    "allowUnverifiedEmail": false
  }
}
```

## Security Considerations

1. **Verify Emails**: Keep `allowUnverifiedEmail: false` to prevent account hijacking.

2. **Minimal Scopes**: Only request necessary scopes:
   - `read:user` for basic profile
   - `user:email` if email is needed

3. **Token Security**: GitHub tokens don't expire by default. Users can revoke access at any time.

4. **Organization Restrictions**: Use organization OAuth apps for enterprise deployments.

## Troubleshooting

### Email Not Returned

**Cause**: GitHub email is set to private.

**Solution**:
1. Add `user:email` scope
2. Enable `fetchPrimaryEmail` in quirks:
```json
{
  "scopes": "read:user user:email",
  "provider_quirks": {
    "fetchPrimaryEmail": true
  }
}
```

### "bad_verification_code" Error

**Cause**: Authorization code already used or expired.

**Solution**:
- Restart the login flow
- Check for redirect loop issues
- Verify callback URL is correct

### "redirect_uri_mismatch" Error

**Cause**: Callback URL doesn't match OAuth App configuration.

**Solution**:
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Edit your app
3. Ensure callback URL exactly matches:
   ```
   https://your-domain.com/auth/external/github/callback
   ```

### Rate Limiting

**Cause**: GitHub API rate limits (60 requests/hour unauthenticated, 5000/hour authenticated).

**Solution**:
- Authrim uses authenticated requests with the access token
- Monitor rate limit headers in responses
- Contact GitHub support for higher limits if needed

## Organization OAuth Apps

For organization-level apps:

1. Go to your organization's Settings
2. Navigate to **Developer settings** → **OAuth Apps**
3. Create the app under the organization
4. This allows organization admins to manage access

### Restrict to Organization Members

GitHub doesn't natively restrict OAuth to organization members, but you can:

1. Use `read:org` scope to get organization membership
2. Implement custom logic to verify membership post-login

## Token Management

### Token Characteristics

| Property | Value |
|----------|-------|
| Token Type | Bearer |
| Expiration | Never (unless revoked) |
| Refresh Token | Not provided |

### Revocation

Users can revoke access at:
- [GitHub Applications Settings](https://github.com/settings/applications)

GitHub doesn't provide a programmatic revocation endpoint via OAuth.

## References

- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub REST API - Users](https://docs.github.com/en/rest/users/users)
- [GitHub Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [GitHub Enterprise Server](https://docs.github.com/en/enterprise-server/apps/oauth-apps)

---

**Last Updated**: 2025-12-20
