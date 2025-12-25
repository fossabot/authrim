/**
 * SCIM Settings Category
 *
 * Settings related to SCIM 2.0 provisioning.
 * API: GET/PATCH /api/admin/tenants/:tenantId/settings/scim
 * Config Level: tenant
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * SCIM Settings Interface
 */
export interface SCIMSettings {
  // SCIM General
  'scim.enabled': boolean;
  'scim.max_results': number;

  // SCIM Authentication
  'scim.bearer_token_enabled': boolean;
  'scim.oauth_enabled': boolean;

  // SCIM Features
  'scim.patch_enabled': boolean;
  'scim.bulk_enabled': boolean;
  'scim.filter_enabled': boolean;
}

/**
 * SCIM Settings Metadata
 */
export const SCIM_SETTINGS_META: Record<keyof SCIMSettings, SettingMeta> = {
  'scim.enabled': {
    key: 'scim.enabled',
    type: 'boolean',
    default: false,
    envKey: 'SCIM_ENABLED',
    label: 'SCIM Enabled',
    description: 'Enable SCIM 2.0 provisioning API',
    visibility: 'public',
  },
  'scim.max_results': {
    key: 'scim.max_results',
    type: 'number',
    default: 100,
    envKey: 'SCIM_MAX_RESULTS',
    label: 'Max Results',
    description: 'Maximum number of resources returned per request',
    min: 10,
    max: 1000,
    visibility: 'admin',
  },
  'scim.bearer_token_enabled': {
    key: 'scim.bearer_token_enabled',
    type: 'boolean',
    default: true,
    envKey: 'SCIM_BEARER_TOKEN_ENABLED',
    label: 'Bearer Token Auth',
    description: 'Enable bearer token authentication for SCIM',
    visibility: 'admin',
  },
  'scim.oauth_enabled': {
    key: 'scim.oauth_enabled',
    type: 'boolean',
    default: false,
    envKey: 'SCIM_OAUTH_ENABLED',
    label: 'OAuth Auth',
    description: 'Enable OAuth 2.0 authentication for SCIM',
    visibility: 'admin',
  },
  'scim.patch_enabled': {
    key: 'scim.patch_enabled',
    type: 'boolean',
    default: true,
    envKey: 'SCIM_PATCH_ENABLED',
    label: 'PATCH Support',
    description: 'Enable SCIM PATCH operations',
    visibility: 'admin',
  },
  'scim.bulk_enabled': {
    key: 'scim.bulk_enabled',
    type: 'boolean',
    default: false,
    envKey: 'SCIM_BULK_ENABLED',
    label: 'Bulk Support',
    description: 'Enable SCIM bulk operations',
    visibility: 'admin',
  },
  'scim.filter_enabled': {
    key: 'scim.filter_enabled',
    type: 'boolean',
    default: true,
    envKey: 'SCIM_FILTER_ENABLED',
    label: 'Filter Support',
    description: 'Enable SCIM filter queries',
    visibility: 'admin',
  },
};

/**
 * SCIM Category Metadata
 */
export const SCIM_CATEGORY_META: CategoryMeta = {
  category: 'scim',
  label: 'SCIM',
  description: 'SCIM 2.0 provisioning settings',
  settings: SCIM_SETTINGS_META,
};

/**
 * Default SCIM settings values
 */
export const SCIM_DEFAULTS: SCIMSettings = {
  'scim.enabled': false,
  'scim.max_results': 100,
  'scim.bearer_token_enabled': true,
  'scim.oauth_enabled': false,
  'scim.patch_enabled': true,
  'scim.bulk_enabled': false,
  'scim.filter_enabled': true,
};
