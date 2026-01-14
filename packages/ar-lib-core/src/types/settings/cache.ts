/**
 * Cache Settings Category
 *
 * Settings for various cache TTLs and caching behavior.
 * API: GET/PATCH /api/admin/tenants/:tenantId/settings/cache
 * Config Level: tenant
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * Cache Settings Interface
 */
export interface CacheSettings {
  // Core Cache TTLs
  'cache.jwks': number;
  'cache.api_key': number;
  'cache.default': number;
  'cache.config': number;

  // Context Cache
  'cache.plugin_context': number;
  'cache.tenant_context': number;

  // Key Cache
  'cache.ec_key': number;
  'cache.introspection_key': number;

  // Shard Cache
  'cache.challenge_shard': number;
  'cache.refresh_token_shard': number;
  'cache.region_shard': number;

  // Status Cache
  'cache.status_list': number;
  'cache.status_list_jwks': number;

  // Feature & Version Cache
  'cache.feature_flags': number;
  'cache.version_check': number;

  // Token & Revocation Cache
  'cache.token_revocation': number;

  // User & Consent Cache
  'cache.user': number;
  'cache.consent': number;

  // Settings Cache
  'cache.partition_settings': number;
  'cache.rules': number;

  // RBAC & Introspection Cache
  'cache.rbac': number;
  'cache.introspection': number;
}

/**
 * Cache Settings Metadata
 */
export const CACHE_SETTINGS_META: Record<keyof CacheSettings, SettingMeta> = {
  // Core Cache TTLs
  'cache.jwks': {
    key: 'cache.jwks',
    type: 'duration',
    default: 60000,
    envKey: 'CACHE_JWKS_TTL_MS',
    label: 'JWKS Cache TTL',
    description: 'Cache TTL for JWKS (JSON Web Key Set)',
    min: 10000,
    max: 3600000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.api_key': {
    key: 'cache.api_key',
    type: 'duration',
    default: 300000,
    envKey: 'CACHE_API_KEY_TTL_MS',
    label: 'API Key Cache TTL',
    description: 'Cache TTL for API key validation',
    min: 60000,
    max: 3600000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.default': {
    key: 'cache.default',
    type: 'duration',
    default: 60000,
    envKey: 'CACHE_DEFAULT_TTL_MS',
    label: 'Default Cache TTL',
    description: 'Default cache TTL when not specified',
    min: 10000,
    max: 600000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.config': {
    key: 'cache.config',
    type: 'duration',
    default: 180000,
    envKey: 'CACHE_CONFIG_TTL_MS',
    label: 'Config Cache TTL',
    description: 'Cache TTL for configuration values',
    min: 60000,
    max: 600000,
    unit: 'ms',
    visibility: 'admin',
  },

  // Context Cache
  'cache.plugin_context': {
    key: 'cache.plugin_context',
    type: 'duration',
    default: 60000,
    envKey: 'CACHE_PLUGIN_CONTEXT_TTL_MS',
    label: 'Plugin Context Cache TTL',
    description: 'Cache TTL for plugin context data',
    min: 10000,
    max: 600000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.tenant_context': {
    key: 'cache.tenant_context',
    type: 'duration',
    default: 10000,
    envKey: 'CACHE_TENANT_CONTEXT_TTL_MS',
    label: 'Tenant Context Cache TTL',
    description: 'Cache TTL for tenant context',
    min: 5000,
    max: 60000,
    unit: 'ms',
    visibility: 'admin',
  },

  // Key Cache
  'cache.ec_key': {
    key: 'cache.ec_key',
    type: 'duration',
    default: 3600000,
    envKey: 'CACHE_EC_KEY_TTL_MS',
    label: 'EC Key Cache TTL',
    description: 'Cache TTL for EC keys',
    min: 600000,
    max: 86400000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.introspection_key': {
    key: 'cache.introspection_key',
    type: 'duration',
    default: 1800000,
    envKey: 'CACHE_INTROSPECTION_KEY_TTL_MS',
    label: 'Introspection Key Cache TTL',
    description: 'Cache TTL for introspection keys',
    min: 300000,
    max: 7200000,
    unit: 'ms',
    visibility: 'admin',
  },

  // Shard Cache
  'cache.challenge_shard': {
    key: 'cache.challenge_shard',
    type: 'duration',
    default: 10000,
    envKey: 'CACHE_CHALLENGE_SHARD_TTL_MS',
    label: 'Challenge Shard Cache TTL',
    description: 'Cache TTL for challenge shard mapping',
    min: 5000,
    max: 60000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.refresh_token_shard': {
    key: 'cache.refresh_token_shard',
    type: 'duration',
    default: 10000,
    envKey: 'CACHE_REFRESH_TOKEN_SHARD_TTL_MS',
    label: 'Refresh Token Shard Cache TTL',
    description: 'Cache TTL for refresh token shard mapping',
    min: 5000,
    max: 60000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.region_shard': {
    key: 'cache.region_shard',
    type: 'duration',
    default: 10000,
    envKey: 'CACHE_REGION_SHARD_TTL_MS',
    label: 'Region Shard Cache TTL',
    description: 'Cache TTL for region shard mapping',
    min: 5000,
    max: 60000,
    unit: 'ms',
    visibility: 'admin',
  },

  // Status Cache
  'cache.status_list': {
    key: 'cache.status_list',
    type: 'duration',
    default: 300000,
    envKey: 'CACHE_STATUS_LIST_TTL_MS',
    label: 'Status List Cache TTL',
    description: 'Cache TTL for token status list',
    min: 60000,
    max: 1800000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.status_list_jwks': {
    key: 'cache.status_list_jwks',
    type: 'duration',
    default: 3600000,
    envKey: 'CACHE_STATUS_LIST_JWKS_TTL_MS',
    label: 'Status List JWKS Cache TTL',
    description: 'Cache TTL for status list signing keys',
    min: 600000,
    max: 86400000,
    unit: 'ms',
    visibility: 'admin',
  },

  // Feature & Version Cache
  'cache.feature_flags': {
    key: 'cache.feature_flags',
    type: 'duration',
    default: 180000,
    envKey: 'CACHE_FEATURE_FLAGS_TTL_MS',
    label: 'Feature Flags Cache TTL',
    description: 'Cache TTL for feature flags',
    min: 30000,
    max: 600000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.version_check': {
    key: 'cache.version_check',
    type: 'duration',
    default: 5000,
    envKey: 'CACHE_VERSION_CHECK_TTL_MS',
    label: 'Version Check Cache TTL',
    description: 'Cache TTL for version checking',
    min: 1000,
    max: 30000,
    unit: 'ms',
    visibility: 'admin',
  },

  // Token & Revocation Cache
  'cache.token_revocation': {
    key: 'cache.token_revocation',
    type: 'duration',
    default: 10000,
    envKey: 'CACHE_TOKEN_REVOCATION_TTL_MS',
    label: 'Token Revocation Cache TTL',
    description: 'Cache TTL for token revocation status',
    min: 5000,
    max: 60000,
    unit: 'ms',
    visibility: 'admin',
  },

  // User & Consent Cache
  'cache.user': {
    key: 'cache.user',
    type: 'duration',
    default: 3600000,
    envKey: 'CACHE_USER_TTL_MS',
    label: 'User Cache TTL',
    description: 'Cache TTL for user data',
    min: 300000,
    max: 86400000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.consent': {
    key: 'cache.consent',
    type: 'duration',
    default: 86400000,
    envKey: 'CACHE_CONSENT_TTL_MS',
    label: 'Consent Cache TTL',
    description: 'Cache TTL for consent records',
    min: 3600000,
    max: 604800000,
    unit: 'ms',
    visibility: 'admin',
  },

  // Settings Cache
  'cache.partition_settings': {
    key: 'cache.partition_settings',
    type: 'duration',
    default: 10000,
    envKey: 'CACHE_PARTITION_SETTINGS_TTL_MS',
    label: 'Partition Settings Cache TTL',
    description: 'Cache TTL for partition settings',
    min: 5000,
    max: 60000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.rules': {
    key: 'cache.rules',
    type: 'duration',
    default: 300000,
    envKey: 'CACHE_RULES_TTL_MS',
    label: 'Rules Cache TTL',
    description: 'Cache TTL for rule evaluation results',
    min: 60000,
    max: 1800000,
    unit: 'ms',
    visibility: 'admin',
  },

  // RBAC & Introspection Cache
  'cache.rbac': {
    key: 'cache.rbac',
    type: 'duration',
    default: 300000,
    envKey: 'CACHE_RBAC_TTL_MS',
    label: 'RBAC Cache TTL',
    description: 'Cache TTL for RBAC permission data',
    min: 60000,
    max: 1800000,
    unit: 'ms',
    visibility: 'admin',
  },
  'cache.introspection': {
    key: 'cache.introspection',
    type: 'duration',
    default: 60000,
    envKey: 'CACHE_INTROSPECTION_TTL_MS',
    label: 'Introspection Cache TTL',
    description: 'Cache TTL for token introspection results',
    min: 10000,
    max: 600000,
    unit: 'ms',
    visibility: 'admin',
  },
};

/**
 * Cache Category Metadata
 */
export const CACHE_CATEGORY_META: CategoryMeta = {
  category: 'cache',
  label: 'Cache Settings',
  description: 'Cache TTL and caching behavior settings',
  settings: CACHE_SETTINGS_META,
};

/**
 * Default Cache settings values
 */
export const CACHE_DEFAULTS: CacheSettings = {
  'cache.jwks': 60000,
  'cache.api_key': 300000,
  'cache.default': 60000,
  'cache.config': 180000,
  'cache.plugin_context': 60000,
  'cache.tenant_context': 10000,
  'cache.ec_key': 3600000,
  'cache.introspection_key': 1800000,
  'cache.challenge_shard': 10000,
  'cache.refresh_token_shard': 10000,
  'cache.region_shard': 10000,
  'cache.status_list': 300000,
  'cache.status_list_jwks': 3600000,
  'cache.feature_flags': 180000,
  'cache.version_check': 5000,
  'cache.token_revocation': 10000,
  'cache.user': 3600000,
  'cache.consent': 86400000,
  'cache.partition_settings': 10000,
  'cache.rules': 300000,
  'cache.rbac': 300000,
  'cache.introspection': 60000,
};
