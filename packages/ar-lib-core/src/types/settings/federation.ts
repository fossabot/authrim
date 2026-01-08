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
  'federation.saml_enabled': false,
  'federation.saml_assertion_ttl': 300,
  'federation.saml_request_ttl': 300,
  'federation.allow_unverified_email': false,
  'federation.auto_link_accounts': false,
  'federation.require_signed_requests': true,
  'federation.metadata_cache_ttl': 86400,
};
