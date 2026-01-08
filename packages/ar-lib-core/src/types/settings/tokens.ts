/**
 * Tokens Settings Category
 *
 * Settings related to token exchange and introspection.
 * API: GET/PATCH /api/admin/tenants/:tenantId/settings/tokens
 * Config Level: tenant
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * Tokens Settings Interface
 */
export interface TokensSettings {
  // Token Exchange
  'tokens.exchange_enabled': boolean;
  'tokens.exchange_delegation_enabled': boolean;
  'tokens.exchange_impersonation_enabled': boolean;

  // Token Introspection
  'tokens.introspection_cache_ttl': number;
  'tokens.introspection_require_client_auth': boolean;
}

/**
 * Tokens Settings Metadata
 */
export const TOKENS_SETTINGS_META: Record<keyof TokensSettings, SettingMeta> = {
  'tokens.exchange_enabled': {
    key: 'tokens.exchange_enabled',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_TOKEN_EXCHANGE',
    label: 'Token Exchange Enabled',
    description: 'Enable OAuth 2.0 Token Exchange (RFC 8693)',
    visibility: 'public',
  },
  'tokens.exchange_delegation_enabled': {
    key: 'tokens.exchange_delegation_enabled',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_TOKEN_EXCHANGE_DELEGATION',
    label: 'Delegation Enabled',
    description: 'Allow delegation use case in token exchange',
    visibility: 'admin',
    dependsOn: [{ key: 'tokens.exchange_enabled', value: true }],
  },
  'tokens.exchange_impersonation_enabled': {
    key: 'tokens.exchange_impersonation_enabled',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_TOKEN_EXCHANGE_IMPERSONATION',
    label: 'Impersonation Enabled',
    description: 'Allow impersonation use case in token exchange (security sensitive)',
    visibility: 'admin',
    dependsOn: [{ key: 'tokens.exchange_enabled', value: true }],
  },
  'tokens.introspection_cache_ttl': {
    key: 'tokens.introspection_cache_ttl',
    type: 'duration',
    default: 60,
    envKey: 'INTROSPECTION_CACHE_TTL',
    label: 'Introspection Cache TTL',
    description: 'Token introspection result cache lifetime in seconds',
    min: 0,
    max: 300,
    unit: 'seconds',
    visibility: 'admin',
  },
  'tokens.introspection_require_client_auth': {
    key: 'tokens.introspection_require_client_auth',
    type: 'boolean',
    default: true,
    envKey: 'INTROSPECTION_REQUIRE_CLIENT_AUTH',
    label: 'Require Client Auth for Introspection',
    description: 'Require client authentication for token introspection',
    visibility: 'admin',
  },
};

/**
 * Tokens Category Metadata
 */
export const TOKENS_CATEGORY_META: CategoryMeta = {
  category: 'tokens',
  label: 'Tokens',
  description: 'Token exchange and introspection settings',
  settings: TOKENS_SETTINGS_META,
};

/**
 * Default Tokens settings values
 */
export const TOKENS_DEFAULTS: TokensSettings = {
  'tokens.exchange_enabled': false,
  'tokens.exchange_delegation_enabled': false,
  'tokens.exchange_impersonation_enabled': false,
  'tokens.introspection_cache_ttl': 60,
  'tokens.introspection_require_client_auth': true,
};
