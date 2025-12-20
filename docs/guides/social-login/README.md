# Social Login Setup Guides

This directory contains step-by-step setup guides for configuring social login providers with Authrim.

## Supported Providers

| Provider | Type | Documentation |
|----------|------|---------------|
| [Google](./google.md) | OIDC | Standard OpenID Connect |
| [Microsoft](./microsoft.md) | OIDC | Supports personal, work, and single-tenant |
| [GitHub](./github.md) | OAuth 2.0 | Supports GitHub.com and Enterprise Server |
| [LinkedIn](./linkedin.md) | OIDC | OpenID Connect (2024) |
| [Facebook](./facebook.md) | OAuth 2.0 | Graph API v20.0 |
| [Twitter/X](./twitter.md) | OAuth 2.0 | OAuth 2.0 with PKCE |
| [Apple](./apple.md) | OIDC | Sign in with Apple |

## Quick Start

### 1. Create OAuth Application

Each provider requires you to create an OAuth/OIDC application in their developer console. See individual guides for specific instructions.

### 2. Configure Redirect URI

All providers should use this redirect URI format:

```
https://{your-domain}/auth/external/{provider-slug}/callback
```

For example:
- Google: `https://auth.example.com/auth/external/google/callback`
- GitHub: `https://auth.example.com/auth/external/github/callback`

### 3. Register Provider via Admin API

```bash
curl -X POST "https://auth.example.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "google",
    "name": "Google",
    "slug": "google",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }'
```

## Common Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | Required | Display name for the provider |
| `slug` | string | Auto-generated | URL-friendly identifier |
| `client_id` | string | Required | OAuth Client ID |
| `client_secret` | string | Required | OAuth Client Secret |
| `scopes` | string | Provider default | Space-separated OAuth scopes |
| `jit_provisioning` | boolean | `true` | Auto-create users on first login |
| `auto_link_email` | boolean | `true` | Link to existing users by email |
| `require_email_verified` | boolean | `true` | Only accept verified emails |
| `enabled` | boolean | `true` | Enable/disable the provider |

## Provider Comparison

| Feature | Google | Microsoft | GitHub | LinkedIn | Facebook | Twitter | Apple |
|---------|--------|-----------|--------|----------|----------|---------|-------|
| Protocol | OIDC | OIDC | OAuth 2.0 | OIDC | OAuth 2.0 | OAuth 2.0 | OIDC |
| ID Token | Yes | Yes | No | Yes | No | No | Yes |
| Email Verified | Yes | Yes | Via API | Yes | No | No* | Yes |
| Revocation API | Yes | Yes | No | No | Yes | Yes | Yes |
| Enterprise | No | Yes | Yes | No | No | No | No |

*Twitter email access requires elevated API permissions and app review.

## Security Best Practices

1. **Always require email verification** - Set `require_email_verified: true` to prevent account hijacking via unverified emails.

2. **Use HTTPS** - All redirect URIs must use HTTPS in production.

3. **Rotate secrets regularly** - Update client secrets periodically and after any suspected compromise.

4. **Limit scopes** - Only request the minimum scopes needed for your application.

5. **Review linked accounts** - Implement UI for users to review and unlink social accounts.

## Troubleshooting

### "redirect_uri_mismatch" Error

The redirect URI configured in the provider's developer console doesn't match the one Authrim is using. Ensure:
- The URI exactly matches (including trailing slashes)
- The protocol is correct (https in production)
- The slug matches your provider configuration

### "access_denied" Error

The user denied permission or there's a scope misconfiguration:
- Check that requested scopes are valid for the provider
- Ensure the OAuth app has the necessary permissions enabled
- Verify the user has access to the requested resources

### User Not Created

If JIT provisioning isn't working:
- Check `jit_provisioning: true` is set
- Verify `require_email_verified` isn't blocking unverified emails
- Check the provider returns required claims (sub, email)

## Related Documentation

- [External IdP Overview](../../features/external-idp.md)
- [Identity Linking](../../features/external-idp.md#identity-stitching)
- [Admin API Reference](../../reference/api/admin/providers.md)

---

**Last Updated**: 2025-12-20
