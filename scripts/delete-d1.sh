#!/bin/bash
#
# Authrim D1 Database Deletion Script
# This script safely deletes D1 databases for the Authrim project
#
# Usage:
#   ./delete-d1.sh                    - Interactive mode (prompts for environment and confirmation)
#   ./delete-d1.sh --env=<name>       - Delete D1 database for specific environment using lock.json
#   ./delete-d1.sh local              - Delete local database with confirmation
#   ./delete-d1.sh remote             - Delete remote database with confirmation
#   ./delete-d1.sh --dry-run          - Dry run mode (shows what would be deleted)
#   ./delete-d1.sh local --force      - Force deletion without confirmation (USE WITH CAUTION)
#

set -e

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/lib/authrim-paths.sh" ]; then
  source "${SCRIPT_DIR}/lib/authrim-paths.sh"
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
DRY_RUN=false
FORCE=false
ENV=""
DEPLOY_ENV=""

for arg in "$@"; do
    case $arg in
        --env=*)
            DEPLOY_ENV="${arg#*=}"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        local|remote)
            ENV=$arg
            shift
            ;;
        *)
            if [ -n "$arg" ]; then
                echo -e "${RED}❌ Unknown option: $arg${NC}"
                echo "Usage: $0 [--env=<name>] [local|remote] [--dry-run] [--force]"
                exit 1
            fi
            ;;
    esac
done

# Validate environment name if specified (security: prevent path traversal)
if [ -n "$DEPLOY_ENV" ]; then
    if type validate_env_name &>/dev/null; then
        validate_env_name "$DEPLOY_ENV" || exit 1
    elif [[ "$DEPLOY_ENV" =~ \.\. ]] || [[ "$DEPLOY_ENV" =~ / ]] || [[ "$DEPLOY_ENV" =~ \\ ]]; then
        echo -e "${RED}❌ Error: Invalid environment name '${DEPLOY_ENV}': path traversal characters not allowed${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}⚡️ Authrim D1 Database Deletion${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No actual deletions will occur${NC}"
    echo ""
fi

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Error: wrangler is not installed${NC}"
    echo "Please install it with: npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Error: Not logged in to Cloudflare${NC}"
    echo "Please run: wrangler login"
    exit 1
fi

# If environment not specified, prompt for it
if [ -z "$ENV" ]; then
    echo "Select environment to delete:"
    echo "  1) local"
    echo "  2) remote"
    echo "  3) Cancel"
    echo ""
    read -p "Enter your choice (1-3): " -r choice

    case $choice in
        1)
            ENV="local"
            ;;
        2)
            ENV="remote"
            ;;
        3|*)
            echo -e "${BLUE}❌ Cancelled${NC}"
            exit 0
            ;;
    esac
    echo ""
fi

# Get database name from lock.json if DEPLOY_ENV is specified, otherwise prompt
DB_NAME=""
if [ -n "$DEPLOY_ENV" ] && type lock_file_exists &>/dev/null && lock_file_exists "$DEPLOY_ENV"; then
    # Try to get DB name from lock.json
    DB_NAME=$(get_d1_name "$DEPLOY_ENV" "DB" 2>/dev/null)
    if [ -n "$DB_NAME" ]; then
        echo -e "${BLUE}📋 Found database in lock.json: $DB_NAME${NC}"
    fi
fi

# If not found in lock.json, prompt for database name
if [ -z "$DB_NAME" ]; then
    read -p "Database name [authrim-users-db]: " DB_NAME_INPUT
    DB_NAME=${DB_NAME_INPUT:-authrim-users-db}
fi

echo -e "${BLUE}📊 Checking for D1 database: $DB_NAME${NC}"
echo ""

# Check if database exists
DB_EXISTS=false
DB_INFO=""
if wrangler d1 info "$DB_NAME" &> /dev/null; then
    DB_EXISTS=true
    DB_INFO=$(wrangler d1 info "$DB_NAME" 2>&1)
fi

if [ "$DB_EXISTS" = false ]; then
    echo -e "${YELLOW}ℹ️  Database not found: $DB_NAME${NC}"
    echo ""
    echo "If you expected to find this database, please check:"
    echo "  1. You are logged in to the correct Cloudflare account"
    echo "  2. The database was created using the setup scripts"
    echo "  3. The database name is correct"
    echo ""
    exit 0
fi

# Try to extract database ID
DB_LIST_JSON=$(wrangler d1 list --json 2>/dev/null || echo "")
DB_ID=""

if [ -n "$DB_LIST_JSON" ]; then
    if command -v jq &> /dev/null; then
        DB_ID=$(echo "$DB_LIST_JSON" | jq -r ".[] | select(.name == \"$DB_NAME\") | .uuid" 2>/dev/null | head -1)
    else
        DB_ID=$(echo "$DB_LIST_JSON" | grep -A 1 "\"name\": \"$DB_NAME\"" | grep -oE '"uuid": "([a-f0-9-]{36})"' | grep -oE '[a-f0-9-]{36}')
    fi
fi

# Fallback: extract from info output
if [ -z "$DB_ID" ]; then
    DB_ID=$(echo "$DB_INFO" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1)
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠️  DELETION SUMMARY${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The following D1 database will be deleted:"
echo ""
echo -e "  ${RED}✗${NC} Database Name: $DB_NAME"
if [ -n "$DB_ID" ]; then
    echo "    Database ID: $DB_ID"
fi
echo "    Environment: $ENV"
echo ""
echo -e "${RED}⚠️  WARNING: This action cannot be undone!${NC}"
echo -e "${RED}⚠️  All data in this database will be permanently deleted!${NC}"

# Try to show table information
echo ""
echo -e "${BLUE}📊 Database contents:${NC}"
TABLES=$(wrangler d1 execute "$DB_NAME" --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" 2>/dev/null || echo "")
if [ -n "$TABLES" ]; then
    echo "$TABLES"
else
    echo "  (Unable to retrieve table information)"
fi
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No actual deletions occurred${NC}"
    exit 0
fi

# Confirmation prompt (skip if --force is used)
if [ "$FORCE" = false ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    if [ "$ENV" = "remote" ]; then
        echo -e "${RED}⚠️  YOU ARE ABOUT TO DELETE THE REMOTE DATABASE!${NC}"
        echo ""
        read -p "Type 'DELETE REMOTE' to confirm, or anything else to cancel: " -r
        echo ""
        if [ "$REPLY" != "DELETE REMOTE" ]; then
            echo -e "${BLUE}❌ Deletion cancelled${NC}"
            exit 0
        fi
    else
        read -p "Type 'DELETE' to confirm deletion, or anything else to cancel: " -r
        echo ""
        if [ "$REPLY" != "DELETE" ]; then
            echo -e "${BLUE}❌ Deletion cancelled${NC}"
            exit 0
        fi
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🗑️  Deleting D1 database...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Delete the database using wrangler
if wrangler d1 delete "$DB_NAME" --skip-confirmation; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✅ Database deleted successfully!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Database deleted: $DB_NAME"
    echo ""
    echo "Next steps:"
    echo "  1. Remove D1 bindings from wrangler.toml files if needed"
    echo "  2. To recreate the database, run: ./scripts/setup-d1.sh"
    echo ""
else
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${RED}❌ Failed to delete database${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Possible reasons:"
    echo "  1. The database is currently being used by deployed workers"
    echo "  2. You don't have permission to delete this database"
    echo "  3. Network or API error"
    echo ""
    echo "Try:"
    echo "  1. Delete or undeploy workers using this database first"
    echo "  2. Check your Cloudflare account permissions"
    echo "  3. Wait a few minutes and try again"
    echo ""
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
