# Microsoft Sign-In Setup

This guide walks you through setting up Microsoft Sign-In (Microsoft Entra ID / Azure AD) with Authrim.

## Overview

| Property | Value |
|----------|-------|
| Protocol | OpenID Connect 1.0 |
| Issuer | `https://login.microsoftonline.com/{tenant}/v2.0` |
| ID Token | Yes |
| UserInfo Endpoint | Yes |
| Email Verified Claim | Yes (for work/school accounts) |

## Prerequisites

- A Microsoft Azure account
- Access to Microsoft Entra admin center (Azure Portal)
- Your Authrim instance URL

## Tenant Types

Microsoft supports different tenant configurations:

| Tenant Type | Value | Description |
|-------------|-------|-------------|
| Common | `common` | All Microsoft accounts (personal + work/school) |
| Organizations | `organizations` | Work and school accounts only |
| Consumers | `consumers` | Personal Microsoft accounts only |
| Single Tenant | `{tenant-id}` | Specific organization's accounts only |

## Step 1: Register an Application

1. Go to [Microsoft Entra admin center](https://entra.microsoft.com/)
2. Navigate to **Applications** → **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: Your application name
   - **Supported account types**: Choose based on your needs
   - **Redirect URI**: Select "Web" and enter your callback URL

### Redirect URI

```
https://your-domain.com/auth/external/microsoft/callback
```

For local development:
```
http://localhost:8787/auth/external/microsoft/callback
```

5. Click **Register**
6. Copy the **Application (client) ID**

## Step 2: Create a Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and select an expiration period
4. Click **Add**
5. **Important**: Copy the secret value immediately (it won't be shown again)

## Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph** → **Delegated permissions**
4. Add these permissions:
   - `openid`
   - `email`
   - `profile`
   - `User.Read` (optional, for additional user info)
5. Click **Add permissions**

For admin-consented permissions (enterprise apps):
- Click **Grant admin consent for {tenant}**

## Step 4: Register Provider in Authrim

### Multi-Tenant (All Microsoft Accounts)

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "microsoft",
    "name": "Microsoft",
    "slug": "microsoft",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "scopes": "openid email profile",
    "provider_quirks": {
      "tenantType": "common"
    },
    "jit_provisioning": true,
    "auto_link_email": true,
    "require_email_verified": true
  }'
```

### Single Tenant (Enterprise SSO)

```bash
curl -X POST "https://your-domain.com/external-idp/admin/providers" \
  -H "Authorization: Bearer ${ADMIN_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "microsoft",
    "name": "Corporate SSO",
    "slug": "corporate-sso",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET",
    "scopes": "openid email profile",
    "provider_quirks": {
      "tenantType": "YOUR_TENANT_ID"
    },
    "jit_provisioning": true,
    "auto_link_email": true,
    "require_email_verified": true
  }'
```

## Step 5: Test the Integration

1. Navigate to your application's login page
2. Click "Sign in with Microsoft"
3. Complete the Microsoft authentication flow
4. Verify the user is created/logged in successfully

## Configuration Options

### Default Configuration

```json
{
  "template": "microsoft",
  "name": "Microsoft",
  "providerType": "oidc",
  "issuer": "https://login.microsoftonline.com/common/v2.0",
  "scopes": "openid email profile",
  "attributeMapping": {
    "sub": "sub",
    "email": "email",
    "name": "name",
    "given_name": "given_name",
    "family_name": "family_name",
    "preferred_username": "preferred_username"
  },
  "providerQuirks": {
    "tenantType": "common"
  },
  "autoLinkEmail": true,
  "jitProvisioning": true,
  "requireEmailVerified": true
}
```

### Provider Quirks

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tenantType` | string | `common` | Tenant restriction |

### Tenant Type Values

| Value | Issuer | Description |
|-------|--------|-------------|
| `common` | `.../common/v2.0` | Personal and work/school accounts |
| `organizations` | `.../organizations/v2.0` | Work/school accounts only |
| `consumers` | `.../consumers/v2.0` | Personal accounts only |
| `{tenant-id}` | `.../{tenant-id}/v2.0` | Specific organization |

### Claim Mappings

| Authrim Claim | Microsoft Claim | Description |
|---------------|-----------------|-------------|
| `sub` | `sub` or `oid` | Unique identifier (oid for single-tenant) |
| `email` | `email` | Primary email address |
| `name` | `name` | Display name |
| `given_name` | `given_name` | First name |
| `family_name` | `family_name` | Last name |
| `preferred_username` | `preferred_username` | UPN or email |

## Advanced Configuration

### Using Object ID (oid) as Subject

For enterprise apps, you may want to use the Azure AD object ID:

```json
{
  "attribute_mapping": {
    "sub": "oid",
    "email": "email",
    "name": "name"
  }
}
```

### Request Group Claims

To include group memberships in the token:

1. Go to **Token configuration** in Azure Portal
2. Click **Add groups claim**
3. Select the group types to include
4. Configure the attribute mapping:

```json
{
  "attribute_mapping": {
    "sub": "sub",
    "email": "email",
    "groups": "groups"
  }
}
```

### Conditional Access Integration

For enterprise deployments with Conditional Access:

1. Configure Conditional Access policies in Azure Portal
2. Use `acr_values` in Authrim to request specific authentication levels:

```
/auth/external/corporate-sso/start?acr_values=urn:microsoft:policies:mfa
```

## Security Considerations

1. **Single-Tenant for Enterprise**: Use single-tenant configuration for enterprise apps to restrict access to your organization.

2. **Secret Rotation**: Client secrets expire. Set a reminder to rotate before expiration.

3. **Least Privilege**: Only request necessary permissions in API permissions.

4. **Monitor Sign-in Logs**: Use Azure AD sign-in logs to monitor authentication activity.

## Troubleshooting

### "AADSTS50011: The redirect URI doesn't match"

**Cause**: Redirect URI mismatch between Authrim and Azure.

**Solution**:
1. Go to App Registration → Authentication
2. Verify the redirect URI exactly matches:
   ```
   https://your-domain.com/auth/external/microsoft/callback
   ```
3. Check for trailing slashes

### "AADSTS700016: Application not found"

**Cause**: Invalid client ID or app registration issue.

**Solution**:
1. Verify the Application (client) ID is correct
2. Ensure the app registration is not deleted
3. Check the tenant configuration matches

### "AADSTS7000215: Invalid client secret"

**Cause**: Expired or incorrect client secret.

**Solution**:
1. Create a new client secret in Azure Portal
2. Update the secret in Authrim
3. Ensure no whitespace in the secret value

### Personal Accounts Blocked

**Cause**: Tenant type set to `organizations`.

**Solution**: Change `tenantType` to `common` to allow personal accounts:
```json
{
  "provider_quirks": {
    "tenantType": "common"
  }
}
```

### Email Claim Missing

**Cause**: Personal accounts may not have verified email.

**Solution**:
1. Set `require_email_verified: false` for personal accounts
2. Or use `preferred_username` as fallback

## Token Revocation

Users can revoke access at:
- [Microsoft Account Security](https://account.live.com/consent/Manage) (personal)
- [Azure Portal - Enterprise Applications](https://portal.azure.com/#blade/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade) (work/school)

## Enterprise SSO Features

### Automatic User Provisioning

For enterprise customers with Azure AD:

```json
{
  "template": "microsoft",
  "name": "Enterprise SSO",
  "provider_quirks": {
    "tenantType": "CUSTOMER_TENANT_ID"
  },
  "jit_provisioning": true,
  "auto_link_email": true,
  "attribute_mapping": {
    "sub": "oid",
    "email": "email",
    "name": "name",
    "department": "department",
    "job_title": "jobTitle"
  }
}
```

### Multi-Customer B2B Setup

For B2B SaaS with multiple enterprise customers:

1. Create a separate provider for each customer
2. Use the customer's tenant ID
3. Implement domain-based IdP routing

## References

- [Microsoft Identity Platform Overview](https://learn.microsoft.com/en-us/entra/identity-platform/)
- [Register an Application](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [ID Token Claims](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)
- [Microsoft Graph Permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)

---

**Last Updated**: 2025-12-20
