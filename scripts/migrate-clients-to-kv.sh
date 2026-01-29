#!/bin/bash
# =============================================================================
# D1 → KV Client Data Migration Script
# =============================================================================
#
# Purpose: Migrate oauth_clients data from D1 to CLIENTS_CACHE KV
#
# This script is part of the Phase 3 optimization to minimize D1 reads by
# implementing Write-Through caching. After migration, all clients will be
# available in KV cache with D1 serving only as a fallback.
#
# Usage:
#   ./scripts/migrate-clients-to-kv.sh --env=<environment>
#   ./scripts/migrate-clients-to-kv.sh --env=<environment> --dry-run
#
# Options:
#   --env=<name>    Environment name (required, e.g., dev, conformance, prod)
#   --dry-run       Preview changes without writing to KV
#   --verbose       Show detailed output for each client
#
# DEPRECATION NOTICE:
#   This script is intended for one-time migration during the D1→KV Write-Through
#   transition (Phase 3). Once all environments have been migrated, this script
#   can be safely removed.
#   Target removal date: After all production environments migrated
# =============================================================================

set -e

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/lib/authrim-paths.sh" ]; then
  source "${SCRIPT_DIR}/lib/authrim-paths.sh"
fi

# Parse command line arguments
DRY_RUN=false
VERBOSE=false
DEPLOY_ENV=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --env=*)
            DEPLOY_ENV="${1#*=}"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "❌ Unknown parameter: $1"
            echo ""
            echo "Usage: $0 --env=<environment> [--dry-run] [--verbose]"
            echo ""
            echo "Options:"
            echo "  --env=<name>    Environment name (required, e.g., dev, conformance, prod)"
            echo "  --dry-run       Preview changes without writing to KV"
            echo "  --verbose       Show detailed output for each client"
            echo ""
            echo "Examples:"
            echo "  $0 --env=dev"
            echo "  $0 --env=conformance --dry-run"
            echo "  $0 --env=prod --verbose"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [ -z "$DEPLOY_ENV" ]; then
    echo "❌ Error: --env parameter is required"
    echo ""
    echo "Usage: $0 --env=<environment> [--dry-run] [--verbose]"
    exit 1
fi

# Validate environment name (security: prevent path traversal)
if type validate_env_name &>/dev/null; then
    validate_env_name "$DEPLOY_ENV" || exit 1
elif [[ "$DEPLOY_ENV" =~ \.\. ]] || [[ "$DEPLOY_ENV" =~ / ]] || [[ "$DEPLOY_ENV" =~ \\ ]]; then
    echo "❌ Error: Invalid environment name '${DEPLOY_ENV}': path traversal characters not allowed"
    exit 1
fi

echo "⚡️ Authrim D1 → KV Client Migration - Environment: $DEPLOY_ENV"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE: No changes will be made"
    echo ""
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler is not installed"
    echo "Please install it with: npm install -g wrangler"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "❌ Error: jq is not installed"
    echo "Please install it with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Get D1 database ID from lock.json
echo "📋 Getting D1 database ID..."
D1_DB_NAME="${DEPLOY_ENV}-authrim-core"

if type get_d1_id &>/dev/null; then
    D1_DB_ID=$(get_d1_id "$DEPLOY_ENV" "DB")
else
    # Fallback: try to get from wrangler d1 list
    D1_DB_ID=$(wrangler d1 list --json 2>/dev/null | jq -r ".[] | select(.name == \"${D1_DB_NAME}\") | .uuid" || echo "")
fi

if [ -z "$D1_DB_ID" ]; then
    echo "❌ Error: D1 database '${D1_DB_NAME}' not found"
    echo "Make sure the environment is set up correctly."
    exit 1
fi
echo "   D1 Database: ${D1_DB_NAME} (${D1_DB_ID})"

# Get KV namespace ID from lock.json
echo "📋 Getting KV namespace ID..."
KV_NS_TITLE="${DEPLOY_ENV}-CLIENTS_CACHE"

if type get_kv_id &>/dev/null; then
    KV_NS_ID=$(get_kv_id "$DEPLOY_ENV" "CLIENTS_CACHE")
else
    # Fallback: try to get from wrangler kv namespace list
    KV_NS_ID=$(wrangler kv namespace list --json 2>/dev/null | jq -r ".[] | select(.title == \"${KV_NS_TITLE}\") | .id" || echo "")
fi

if [ -z "$KV_NS_ID" ]; then
    echo "❌ Error: KV namespace '${KV_NS_TITLE}' not found"
    echo "Make sure the CLIENTS_CACHE KV namespace is set up."
    exit 1
fi
echo "   KV Namespace: ${KV_NS_TITLE} (${KV_NS_ID})"
echo ""

# Fetch all clients from D1
echo "📥 Fetching clients from D1..."
CLIENTS_JSON=$(wrangler d1 execute "${D1_DB_NAME}" \
    --command "SELECT * FROM oauth_clients" \
    --json 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to query D1 database"
    exit 1
fi

# Extract results array
CLIENTS=$(echo "$CLIENTS_JSON" | jq -c '.[0].results // []')
CLIENT_COUNT=$(echo "$CLIENTS" | jq 'length')

echo "   Found ${CLIENT_COUNT} clients"
echo ""

if [ "$CLIENT_COUNT" -eq 0 ]; then
    echo "✅ No clients to migrate"
    exit 0
fi

# Migration counters
MIGRATED=0
SKIPPED=0
ERRORS=0

echo "🔄 Migrating clients to KV..."
echo ""

# Process each client
echo "$CLIENTS" | jq -c '.[]' | while read -r row; do
    CLIENT_ID=$(echo "$row" | jq -r '.client_id')
    CLIENT_NAME=$(echo "$row" | jq -r '.client_name // "unknown"')
    TENANT_ID=$(echo "$row" | jq -r '.tenant_id // "default"')

    # Build KV key: tenant:{tenantId}:client:{clientId}
    KV_KEY="tenant:${TENANT_ID}:client:${CLIENT_ID}"

    if [ "$VERBOSE" = true ]; then
        echo "   Processing: ${CLIENT_NAME} (${CLIENT_ID})"
    fi

    # Transform D1 row to ClientMetadata format
    # - Parse JSON string fields to arrays
    # - Convert integer booleans to true/false
    # - Handle null values
    CLIENT_JSON=$(echo "$row" | jq '{
        client_id,
        client_secret_hash: (if .client_secret_hash == null then null else .client_secret_hash end),
        client_name,
        tenant_id,
        redirect_uris: (if .redirect_uris then (.redirect_uris | fromjson) else [] end),
        grant_types: (if .grant_types then (.grant_types | fromjson) else [] end),
        response_types: (if .response_types then (.response_types | fromjson) else [] end),
        scope: (if .scope == null then null else .scope end),
        logo_uri: (if .logo_uri == null then null else .logo_uri end),
        client_uri: (if .client_uri == null then null else .client_uri end),
        policy_uri: (if .policy_uri == null then null else .policy_uri end),
        tos_uri: (if .tos_uri == null then null else .tos_uri end),
        contacts: (if .contacts then (.contacts | fromjson) else null end),
        post_logout_redirect_uris: (if .post_logout_redirect_uris then (.post_logout_redirect_uris | fromjson) else null end),
        subject_type: (if .subject_type == null then "public" else .subject_type end),
        sector_identifier_uri: (if .sector_identifier_uri == null then null else .sector_identifier_uri end),
        token_endpoint_auth_method,
        jwks: (if .jwks then (.jwks | fromjson) else null end),
        jwks_uri: (if .jwks_uri == null then null else .jwks_uri end),
        is_trusted: (.is_trusted == 1),
        skip_consent: (.skip_consent == 1),
        allow_claims_without_scope: (.allow_claims_without_scope == 1),
        token_exchange_allowed: (.token_exchange_allowed == 1),
        allowed_subject_token_clients: (if .allowed_subject_token_clients then (.allowed_subject_token_clients | fromjson) else null end),
        allowed_token_exchange_resources: (if .allowed_token_exchange_resources then (.allowed_token_exchange_resources | fromjson) else null end),
        delegation_mode: (if .delegation_mode == null then "delegation" else .delegation_mode end),
        client_credentials_allowed: (.client_credentials_allowed == 1),
        allowed_scopes: (if .allowed_scopes then (.allowed_scopes | fromjson) else null end),
        default_scope: (if .default_scope == null then null else .default_scope end),
        default_audience: (if .default_audience == null then null else .default_audience end),
        backchannel_token_delivery_mode: (if .backchannel_token_delivery_mode == null then null else .backchannel_token_delivery_mode end),
        backchannel_client_notification_endpoint: (if .backchannel_client_notification_endpoint == null then null else .backchannel_client_notification_endpoint end),
        backchannel_authentication_request_signing_alg: (if .backchannel_authentication_request_signing_alg == null then null else .backchannel_authentication_request_signing_alg end),
        backchannel_user_code_parameter: (.backchannel_user_code_parameter == 1),
        userinfo_signed_response_alg: (if .userinfo_signed_response_alg == null then null else .userinfo_signed_response_alg end),
        backchannel_logout_uri: (if .backchannel_logout_uri == null then null else .backchannel_logout_uri end),
        backchannel_logout_session_required: (.backchannel_logout_session_required == 1),
        frontchannel_logout_uri: (if .frontchannel_logout_uri == null then null else .frontchannel_logout_uri end),
        frontchannel_logout_session_required: (.frontchannel_logout_session_required == 1),
        allowed_redirect_origins: (if .allowed_redirect_origins then (.allowed_redirect_origins | fromjson) else null end),
        software_id: (if .software_id == null then null else .software_id end),
        software_version: (if .software_version == null then null else .software_version end),
        requestable_scopes: (if .requestable_scopes then (.requestable_scopes | fromjson) else null end),
        require_pkce: (.require_pkce == 1),
        created_at,
        updated_at
    } | with_entries(select(.value != null))')

    if [ "$DRY_RUN" = true ]; then
        echo "   [DRY-RUN] Would write: $KV_KEY"
        if [ "$VERBOSE" = true ]; then
            echo "   Data: $(echo "$CLIENT_JSON" | jq -c '.')"
        fi
    else
        # Write to KV
        if echo "$CLIENT_JSON" | wrangler kv key put "$KV_KEY" --stdin --namespace-id="$KV_NS_ID" 2>/dev/null; then
            echo "   ✅ Migrated: ${CLIENT_NAME} (${CLIENT_ID})"
        else
            echo "   ❌ Failed: ${CLIENT_NAME} (${CLIENT_ID})"
        fi
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN COMPLETE: ${CLIENT_COUNT} clients would be migrated"
else
    echo "✅ Migration complete: ${CLIENT_COUNT} clients processed"
fi
echo ""
echo "Note: D1 data remains unchanged. KV cache is now populated for"
echo "      Write-Through caching. D1 will serve as fallback only."
echo ""
