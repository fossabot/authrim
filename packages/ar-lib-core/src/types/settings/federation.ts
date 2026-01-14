/**
 * Federation Settings Category
 *
 * Settings related to identity federation (SAML, SCIM, etc.).
 * API: GET/PATCH /api/admin/tenants/:tenantId/settings/federation
 * Config Level: tenant
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * Federation Settings Interface
 */
export interface FederationSettings {
  // SAML Settings
  'federation.saml_enabled': boolean;
  'federation.saml_assertion_ttl': number;
  'federation.saml_request_ttl': number;
  'federation.saml_artifact_ttl': number;
  'federation.saml_artifact_resolution_timeout': number;

  // SCIM Settings
  'federation.scim_lockout_seconds': number;
  'federation.scim_failure_window_seconds': number;
  'federation.scim_token_min_expiry': number;
  'federation.scim_token_max_expiry': number;
  'federation.scim_token_default_expiry': number;
  'federation.scim_default_page_size': number;
  'federation.scim_max_page_size': number;
  'federation.scim_max_filter_complexity': number;

  // Federation General
  'federation.allow_unverified_email': boolean;
  'federation.auto_link_accounts': boolean;
  'federation.require_signed_requests': boolean;
  'federation.metadata_cache_ttl': number;
}

/**
 * Federation Settings Metadata
 */
export const FEDERATION_SETTINGS_META: Record<keyof FederationSettings, SettingMeta> = {
  'federation.saml_enabled': {
    key: 'federation.saml_enabled',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_SAML',
    label: 'SAML Enabled',
    description: 'Enable SAML 2.0 federation',
    visibility: 'public',
  },
  'federation.saml_assertion_ttl': {
    key: 'federation.saml_assertion_ttl',
    type: 'duration',
    default: 300,
    envKey: 'SAML_ASSERTION_TTL',
    label: 'SAML Assertion TTL',
    description: 'SAML assertion lifetime in seconds',
    min: 60,
    max: 600,
    unit: 'seconds',
    visibility: 'admin',
  },
  'federation.saml_request_ttl': {
    key: 'federation.saml_request_ttl',
    type: 'duration',
    default: 300,
    envKey: 'SAML_REQUEST_TTL',
    label: 'SAML Request TTL',
    description: 'SAML authentication request lifetime in seconds',
    min: 60,
    max: 600,
    unit: 'seconds',
    visibility: 'admin',
  },
  'federation.saml_artifact_ttl': {
    key: 'federation.saml_artifact_ttl',
    type: 'duration',
    default: 120,
    envKey: 'SAML_ARTIFACT_TTL',
    label: 'SAML Artifact TTL',
    description: 'SAML artifact lifetime in seconds',
    min: 30,
    max: 300,
    unit: 'seconds',
    visibility: 'admin',
  },
  'federation.saml_artifact_resolution_timeout': {
    key: 'federation.saml_artifact_resolution_timeout',
    type: 'duration',
    default: 5000,
    envKey: 'SAML_ARTIFACT_RESOLUTION_TIMEOUT',
    label: 'SAML Artifact Resolution Timeout',
    description: 'Timeout for SAML artifact resolution request in milliseconds',
    min: 1000,
    max: 30000,
    unit: 'ms',
    visibility: 'admin',
  },

  // SCIM Settings
  'federation.scim_lockout_seconds': {
    key: 'federation.scim_lockout_seconds',
    type: 'duration',
    default: 900,
    envKey: 'SCIM_LOCKOUT_SECONDS',
    label: 'SCIM Lockout Duration',
    description: 'Lockout duration after SCIM authentication failures in seconds',
    min: 60,
    max: 86400,
    unit: 'seconds',
    visibility: 'admin',
  },
  'federation.scim_failure_window_seconds': {
    key: 'federation.scim_failure_window_seconds',
    type: 'duration',
    default: 300,
    envKey: 'SCIM_FAILURE_WINDOW_SECONDS',
    label: 'SCIM Failure Window',
    description: 'Time window for counting SCIM authentication failures',
    min: 60,
    max: 3600,
    unit: 'seconds',
    visibility: 'admin',
  },
  'federation.scim_token_min_expiry': {
    key: 'federation.scim_token_min_expiry',
    type: 'duration',
    default: 3600,
    envKey: 'SCIM_TOKEN_MIN_EXPIRY',
    label: 'SCIM Token Min Expiry',
    description: 'Minimum SCIM token lifetime in seconds (1 hour)',
    min: 300,
    max: 86400,
    unit: 'seconds',
    visibility: 'admin',
  },
  'federation.scim_token_max_expiry': {
    key: 'federation.scim_token_max_expiry',
    type: 'duration',
    default: 31536000,
    envKey: 'SCIM_TOKEN_MAX_EXPIRY',
    label: 'SCIM Token Max Expiry',
    description: 'Maximum SCIM token lifetime in seconds (1 year)',
    min: 86400,
    max: 31536000,
    unit: 'seconds',
    visibility: 'admin',
  },
  'federation.scim_token_default_expiry': {
    key: 'federation.scim_token_default_expiry',
    type: 'duration',
    default: 7776000,
    envKey: 'SCIM_TOKEN_DEFAULT_EXPIRY',
    label: 'SCIM Token Default Expiry',
    description: 'Default SCIM token lifetime in seconds (90 days)',
    min: 3600,
    max: 31536000,
    unit: 'seconds',
    visibility: 'admin',
  },
  'federation.scim_default_page_size': {
    key: 'federation.scim_default_page_size',
    type: 'number',
    default: 100,
    envKey: 'SCIM_DEFAULT_PAGE_SIZE',
    label: 'SCIM Default Page Size',
    description: 'Default number of items per SCIM list response',
    min: 10,
    max: 1000,
    visibility: 'admin',
  },
  'federation.scim_max_page_size': {
    key: 'federation.scim_max_page_size',
    type: 'number',
    default: 1000,
    envKey: 'SCIM_MAX_PAGE_SIZE',
    label: 'SCIM Max Page Size',
    description: 'Maximum items per SCIM list response',
    min: 100,
    max: 5000,
    visibility: 'admin',
  },
  'federation.scim_max_filter_complexity': {
    key: 'federation.scim_max_filter_complexity',
    type: 'number',
    default: 5,
    envKey: 'SCIM_MAX_FILTER_COMPLEXITY',
    label: 'SCIM Max Filter Complexity',
    description: 'Maximum nesting depth for SCIM filter expressions',
    min: 1,
    max: 10,
    visibility: 'admin',
  },
  'federation.allow_unverified_email': {
    key: 'federation.allow_unverified_email',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_FEDERATION_UNVERIFIED_EMAIL',
    label: 'Allow Unverified Email',
    description: 'Allow federation with unverified email addresses',
    visibility: 'admin',
  },
  'federation.auto_link_accounts': {
    key: 'federation.auto_link_accounts',
    type: 'boolean',
    default: false,
    envKey: 'FEDERATION_AUTO_LINK_ACCOUNTS',
    label: 'Auto-Link Accounts',
    description: 'Automatically link accounts with matching email',
    visibility: 'admin',
  },
  'federation.require_signed_requests': {
    key: 'federation.require_signed_requests',
    type: 'boolean',
    default: true,
    envKey: 'FEDERATION_REQUIRE_SIGNED_REQUESTS',
    label: 'Require Signed Requests',
    description: 'Require cryptographic signatures on federation requests',
    visibility: 'admin',
  },
  'federation.metadata_cache_ttl': {
    key: 'federation.metadata_cache_ttl',
    type: 'duration',
    default: 86400,
    envKey: 'FEDERATION_METADATA_CACHE_TTL',
    label: 'Metadata Cache TTL',
    description: 'Federation metadata cache lifetime in seconds (default: 24 hours)',
    min: 3600,
    max: 604800,
    unit: 'seconds',
    visibility: 'admin',
  },
};

/**
 * Federation Category Metadata
 */
export const FEDERATION_CATEGORY_META: CategoryMeta = {
  category: 'federation',
  label: 'Federation',
  description: 'Identity federation settings (SAML, account linking)',
  settings: FEDERATION_SETTINGS_META,
};

/**
 * Default Federation settings values
 */
export const FEDERATION_DEFAULTS: FederationSettings = {
  // SAML
  'federation.saml_enabled': false,
  'federation.saml_assertion_ttl': 300,
  'federation.saml_request_ttl': 300,
  'federation.saml_artifact_ttl': 120,
  'federation.saml_artifact_resolution_timeout': 5000,
  // SCIM
  'federation.scim_lockout_seconds': 900,
  'federation.scim_failure_window_seconds': 300,
  'federation.scim_token_min_expiry': 3600,
  'federation.scim_token_max_expiry': 31536000,
  'federation.scim_token_default_expiry': 7776000,
  'federation.scim_default_page_size': 100,
  'federation.scim_max_page_size': 1000,
  'federation.scim_max_filter_complexity': 5,
  // General
  'federation.allow_unverified_email': false,
  'federation.auto_link_accounts': false,
  'federation.require_signed_requests': true,
  'federation.metadata_cache_ttl': 86400,
};
