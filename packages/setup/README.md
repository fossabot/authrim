# @authrim/setup

> CLI and Web UI for setting up Authrim OIDC Provider on Cloudflare Workers

> ⚠️ **WARNING: This project is still under active development and does not work correctly yet!**
>
> The Admin UI is incomplete and does not support login functionality. Please wait for a stable release before using in production.

[![npm version](https://img.shields.io/npm/v/@authrim/setup.svg)](https://www.npmjs.com/package/@authrim/setup)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/sgrastar/authrim/blob/main/LICENSE)

## Overview

`@authrim/setup` is the official setup tool for deploying [Authrim](https://github.com/sgrastar/authrim) to Cloudflare Workers. It provides both an interactive CLI and a Web UI to guide you through:

- Provisioning Cloudflare resources (D1 databases, KV namespaces, Queues)
- Generating cryptographic keys and secrets
- Configuring environment-specific settings
- Deploying all Authrim workers in the correct order
- Setting up the initial administrator account
- **Managing existing environments** (view, inspect, delete)

## Quick Start

```bash
# Full setup with Web UI (recommended)
npx @authrim/setup

# Manage existing environments (no source download needed)
npx @authrim/setup manage

# Or install globally
npm install -g @authrim/setup
authrim-setup
```

## Usage Modes

### 1. Web UI Mode (Default)

Run without arguments to launch the interactive Web UI:

```bash
npx @authrim/setup
```

This opens a browser with a step-by-step wizard featuring:
- **New Setup**: Create a new Authrim deployment from scratch
- **Load Config**: Resume or redeploy using an existing configuration
- **Manage Environments**: View and delete existing environments

### 2. Environment Management Mode

Manage existing Authrim environments without downloading source code:

```bash
npx @authrim/setup manage
```

Features:
- Auto-detect all Authrim environments in your Cloudflare account
- View resource counts (Workers, D1, KV, Queues, R2)
- View detailed resource information (D1 size/region, Worker deploy info)
- Delete environments with granular resource selection
- Real-time progress display

### 3. CLI Mode

For terminal-based setup or CI/CD integration:

```bash
npx @authrim/setup --cli
```

### 4. Deploy Existing Configuration

If you already have an `authrim-config.json`:

```bash
npx @authrim/setup deploy --config ./authrim-config.json --env prod
```

## Commands

### `init` (default)

Initialize a new Authrim project:

```bash
npx @authrim/setup init [options]

Options:
  --cli              Use CLI mode instead of Web UI
  --config <path>    Load existing configuration file
  --keep <path>      Keep source files at specified path
  --env <name>       Environment name (prod, staging, dev)
```

### `manage`

Manage existing Authrim environments (no source code required):

```bash
npx @authrim/setup manage [options]

Options:
  --port <number>    Web UI port (default: 3456)
  --no-browser       Do not open browser automatically
```

### `deploy`

Deploy Authrim to Cloudflare:

```bash
npx @authrim/setup deploy [options]

Options:
  -c, --config <path>  Config file path (default: "authrim-config.json")
  -e, --env <env>      Environment name
  --component <name>   Deploy single component
  --dry-run            Preview without deploying
  --skip-secrets       Skip secrets upload
  --skip-ui            Skip UI deployment
  -y, --yes            Skip confirmation prompts
```

### `download`

Download Authrim source code only:

```bash
npx @authrim/setup download [options]

Options:
  -o, --output <path>  Output directory (default: "./authrim")
  --repo <repository>  GitHub repository (default: "sgrastar/authrim")
  --ref <gitRef>       Git tag or branch (default: latest release)
  --force              Overwrite existing directory
```

### `status`

Check deployment status:

```bash
npx @authrim/setup status [options]

Options:
  -c, --config <path>  Config file path
```

### `config`

Manage configuration:

```bash
npx @authrim/setup config [options]

Options:
  --show       Show current configuration
  --validate   Validate configuration file
  --json       Output in JSON format
```

### `delete`

Delete an Authrim environment and its resources:

```bash
npx @authrim/setup delete [options]

Options:
  --env <name>    Environment name to delete
  -y, --yes       Skip confirmation prompts (for CI/CD)
  --no-workers    Keep Workers
  --no-d1         Keep D1 databases
  --no-kv         Keep KV namespaces
  --no-queues     Keep Queues
  --no-r2         Keep R2 buckets
  --all           Delete all resource types (default)
```

Examples:

```bash
# Interactive mode - prompts for environment selection
npx @authrim/setup delete

# CI/CD mode - no prompts
npx @authrim/setup delete --env staging --yes

# Partial deletion - keep D1 databases
npx @authrim/setup delete --env dev --no-d1 --yes
```

### `info`

Display detailed information about Authrim resources:

```bash
npx @authrim/setup info [options]

Options:
  --env <name>    Environment name
  --json          Output in JSON format (for scripting/CI)
  --d1            Show only D1 database information
  --workers       Show only Worker information
```

Examples:

```bash
# Interactive mode
npx @authrim/setup info

# Specific environment with JSON output (for CI/CD)
npx @authrim/setup info --env prod --json

# D1 database details only
npx @authrim/setup info --env prod --d1
```

### `secrets`

Upload secrets to Cloudflare Workers:

```bash
npx @authrim/setup secrets [options]

Options:
  --env <name>       Environment name
  --config <path>    Configuration file path
  --keys-dir <path>  Keys directory (default: ".keys")
```

## Web UI Features

### Resource Provisioning

Before creating resources, the UI shows a preview of what will be created:

```
📋 Resource Names:
  D1 Databases:
  • prod-authrim-core-db
  • prod-authrim-pii-db

  KV Namespaces:
  • prod-CLIENTS_CACHE
  • prod-SETTINGS
  • prod-AUTHRIM_CONFIG
  ...

  Cryptographic Keys:
  • .keys/private.pem (RSA Private Key)
  • .keys/public.jwk.json (JWK Public Key)
  ...
```

### Real-time Progress

All operations show real-time progress:

```
📦 Provisioning 10 resources...

📊 D1 Databases (0/2)
  ⏳ Creating: prod-authrim-core-db...
  ✅ prod-authrim-core-db (ID: 12345678...)
  ⏳ Creating: prod-authrim-pii-db...
  ✅ prod-authrim-pii-db (ID: 87654321...)
📊 D1 Databases (2/2) ✓

🗄️ KV Namespaces (0/8)
  ⏳ Creating: prod-CLIENTS_CACHE...
  ...
```

### Environment Management

View detailed resource information before deletion:

```
📋 Environment Details: prod

Workers (6):
  • prod-ar-auth
    Last deployed: 2024-01-15 14:30 (JST)
    Version: abc12345
  • prod-ar-token
    ...

D1 Databases (2):
  • prod-authrim-core-db
    Created: 2024-01-10 10:00 (JST)
    Size: 128.5 MB
    Region: WNAM
  ...

[Back] [🗑️ Delete Environment]
```

Delete environments with granular control:

```
⚠️ Delete Environment: prod

Select resources to delete:
☑ Workers (6 workers)
☑ D1 Databases (2 databases)
☑ KV Namespaces (8 namespaces)
☐ Queues (0 queues)
☐ R2 Buckets (0 buckets)

[Cancel] [🗑️ Delete Selected]
```

## Configuration Files

### authrim-config.json

The main configuration file containing all environment settings:

```json
{
  "version": "1.0.0",
  "environment": {
    "prefix": "prod"
  },
  "urls": {
    "api": {
      "custom": "https://auth.example.com",
      "auto": "https://prod-ar-router.workers.dev"
    },
    "loginUi": {
      "custom": "https://login.example.com",
      "auto": "https://prod-ar-ui.pages.dev"
    },
    "adminUi": {
      "custom": null,
      "auto": "https://prod-ar-ui.pages.dev/admin"
    }
  },
  "components": {
    "api": true,
    "loginUi": true,
    "adminUi": true,
    "saml": false,
    "async": false,
    "vc": false,
    "bridge": false,
    "policy": false
  },
  "keys": {
    "keyId": "kid-xxxxxxxx",
    "secretsPath": "./.keys/"
  }
}
```

**URL Configuration**:
- `custom`: Your custom domain (optional). Set to `null` to use the auto-generated URL.
- `auto`: Auto-generated Cloudflare URL (workers.dev / pages.dev).

**Components**:
| Component | Description |
|-----------|-------------|
| `api` | Core OIDC API (required) |
| `loginUi` | Login/consent UI |
| `adminUi` | Admin dashboard |
| `saml` | SAML 2.0 IdP support |
| `async` | Async job processing (email, webhooks) |
| `vc` | Verifiable Credentials |
| `bridge` | External IdP / Social Login (Google, GitHub, etc.) |
| `policy` | ReBAC Policy Engine |

**CORS Auto-Configuration**: When LoginUI or AdminUI use different origins from the API, CORS allowed origins are automatically configured.

### authrim-lock.json

Records provisioned resource IDs for re-deployment:

```json
{
  "version": "1.0.0",
  "env": "prod",
  "d1": {
    "DB": { "name": "prod-authrim-core-db", "id": "..." },
    "PII_DB": { "name": "prod-authrim-pii-db", "id": "..." }
  },
  "kv": {
    "CLIENTS_CACHE": { "name": "prod-CLIENTS_CACHE", "id": "..." },
    "SETTINGS": { "name": "prod-SETTINGS", "id": "..." }
  }
}
```

### .keys/ Directory

Contains sensitive cryptographic material (gitignored):

```
.keys/
├── private.pem              # RSA private key for JWT signing
├── public.jwk.json          # Public key in JWK format
├── rp_token_encryption_key.txt
├── admin_api_secret.txt
├── key_manager_secret.txt
└── setup_token.txt          # Initial admin setup token
```

## Resource Naming Convention

Resources are named using the environment prefix:

| Resource Type | Naming Pattern | Example (prod) |
|--------------|----------------|----------------|
| Workers | `{env}-ar-{component}` | `prod-ar-auth` |
| D1 Database | `{env}-authrim-{type}-db` | `prod-authrim-core-db` |
| KV Namespace | `{env}-{NAME}` | `prod-CLIENTS_CACHE` |
| Queue | `{env}-audit-queue` | `prod-audit-queue` |
| R2 Bucket | `{env}-authrim-avatars` | `prod-authrim-avatars` |

## Deployment Order

Authrim workers are deployed in a specific order to satisfy dependencies:

```
Level 0: ar-lib-core         # Durable Objects definitions (always first)
Level 1: ar-discovery        # Discovery endpoint
Level 2: ar-auth, ar-token, ar-userinfo, ar-management  # Core services (parallel)
Level 3: ar-async, ar-saml, ar-vc, ar-bridge, ar-policy # Optional (parallel)
Level 4: ar-router           # Service bindings (always last)
Level 5: ar-ui               # Cloudflare Pages (optional)
```

**Note**: Only enabled components are deployed. Service bindings in ar-router are automatically configured based on your component selection.

## Initial Admin Setup

After deployment, the CLI displays a one-time setup URL:

```
━━━ Initial Admin Setup ━━━

To create the initial administrator account, visit:

  https://auth.example.com/setup?token=abc123...

⚠️  Important:
  • This link expires in 1 hour
  • Setup can only be completed once
  • You will need to register a Passkey (biometric/security key)
```

This URL allows you to:
1. Register a Passkey as the system administrator
2. Access the Admin Dashboard
3. Create OAuth clients and configure settings

## CI/CD Integration

The CLI commands support non-interactive mode for automation:

```bash
# Deploy without prompts
npx @authrim/setup deploy --env prod --yes

# Delete environment in CI (requires explicit --env)
npx @authrim/setup delete --env staging --yes

# Get resource info as JSON for scripting
npx @authrim/setup info --env prod --json

# Example: Parse JSON output
npx @authrim/setup info --env prod --json | jq '.d1[0].databaseSize'
```

### Environment Variables

The CLI respects standard Cloudflare environment variables:
- `CLOUDFLARE_API_TOKEN` - API token for authentication
- `CLOUDFLARE_ACCOUNT_ID` - Target account ID

## Security Features

- **Session Token Authentication**: API endpoints require session tokens to prevent unauthorized access
- **Path Traversal Prevention**: Key storage directory is validated to prevent directory traversal attacks
- **Command Injection Prevention**: Browser launch URLs are validated to prevent shell injection
- **XSS Prevention**: User-controlled content is rendered safely using textContent instead of innerHTML
- **Error Sanitization**: Error messages are sanitized to prevent information leakage
- **Operation Locking**: Concurrent operations are serialized to prevent race conditions
- **Localhost-Only Web UI**: Web UI only binds to localhost for security
- **Auto Port Selection**: If default port is in use, automatically finds an available port (3456-3465)
- **Selective Deployment**: Only explicitly enabled components are deployed, minimizing attack surface

## Requirements

- Node.js >= 20.0.0
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed and authenticated
- Cloudflare account with Workers Paid plan (for D1, KV, Durable Objects)

## Development

### Local Testing

```bash
# From the authrim repository root
cd packages/setup

# Run in development mode
pnpm dev

# Build and run
pnpm build
pnpm start

# Run tests
pnpm test
```

### Using with pnpm link

```bash
# In packages/setup
pnpm build
pnpm link --global

# In another directory
authrim-setup --help
```

## Troubleshooting

### "Wrangler is not installed"

Install wrangler globally:

```bash
npm install -g wrangler
wrangler login
```

### "Not logged in to Cloudflare"

Authenticate with Cloudflare:

```bash
wrangler login
```

### "Lock file not found"

Run the init command first to provision resources:

```bash
npx @authrim/setup init --env prod
```

### "Port 3456 is already in use"

The tool automatically tries ports 3456-3465. If all are in use:

```bash
# Find process using the port
lsof -i :3456

# Kill the process
kill <PID>

# Or specify a different port
npx @authrim/setup manage --port 4000
```

### Deployment fails with "Service Bindings"

Ensure all dependent workers are deployed. The ar-router must be deployed last as it references other workers via Service Bindings.

If you see an error like `Could not resolve service binding 'OP_ASYNC'`, it means you're trying to deploy ar-router with a component enabled that hasn't been deployed yet. Either:
1. Deploy the missing component first
2. Disable the component in your configuration

## License

Apache License 2.0 - see [LICENSE](https://github.com/sgrastar/authrim/blob/main/LICENSE) for details.

## Related

- [Authrim Documentation](https://github.com/sgrastar/authrim/tree/main/docs)
- [Deployment Guide](https://github.com/sgrastar/authrim/blob/main/docs/getting-started/deployment.md)
- [Development Guide](https://github.com/sgrastar/authrim/blob/main/docs/getting-started/development.md)
