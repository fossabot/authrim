/**
 * Consent Settings Category
 *
 * Settings related to user consent management.
 * API: GET/PATCH /api/admin/tenants/:tenantId/settings/consent
 * Config Level: tenant
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * Consent Settings Interface
 */
export interface ConsentSettings {
  // Consent Display
  'consent.show_scopes': boolean;
  'consent.show_client_info': boolean;
  'consent.remember_decision': boolean;
  'consent.remember_duration': number;

  // Consent Requirements
  'consent.require_explicit': boolean;
  'consent.granular_scopes': boolean;

  // Consent Cache
  'consent.cache_ttl': number;
  'consent.skip_for_first_party': boolean;
}

/**
 * Consent Settings Metadata
 */
export const CONSENT_SETTINGS_META: Record<keyof ConsentSettings, SettingMeta> = {
  'consent.show_scopes': {
    key: 'consent.show_scopes',
    type: 'boolean',
    default: true,
    envKey: 'CONSENT_SHOW_SCOPES',
    label: 'Show Scopes',
    description: 'Display requested scopes on consent screen',
    visibility: 'public',
  },
  'consent.show_client_info': {
    key: 'consent.show_client_info',
    type: 'boolean',
    default: true,
    envKey: 'CONSENT_SHOW_CLIENT_INFO',
    label: 'Show Client Info',
    description: 'Display client application information on consent screen',
    visibility: 'public',
  },
  'consent.remember_decision': {
    key: 'consent.remember_decision',
    type: 'boolean',
    default: true,
    envKey: 'CONSENT_REMEMBER_DECISION',
    label: 'Remember Consent Decision',
    description: 'Allow users to remember their consent decision',
    visibility: 'public',
  },
  'consent.remember_duration': {
    key: 'consent.remember_duration',
    type: 'duration',
    default: 2592000,
    envKey: 'CONSENT_REMEMBER_DURATION',
    label: 'Remember Duration',
    description: 'How long to remember consent decision in seconds (default: 30 days)',
    min: 3600,
    max: 31536000,
    unit: 'seconds',
    visibility: 'public',
  },
  'consent.require_explicit': {
    key: 'consent.require_explicit',
    type: 'boolean',
    default: true,
    envKey: 'CONSENT_REQUIRE_EXPLICIT',
    label: 'Require Explicit Consent',
    description: 'Require explicit user consent for all authorizations',
    visibility: 'public',
  },
  'consent.granular_scopes': {
    key: 'consent.granular_scopes',
    type: 'boolean',
    default: false,
    envKey: 'CONSENT_GRANULAR_SCOPES',
    label: 'Granular Scope Selection',
    description: 'Allow users to select individual scopes',
    visibility: 'public',
  },
  'consent.cache_ttl': {
    key: 'consent.cache_ttl',
    type: 'duration',
    default: 86400,
    envKey: 'CONSENT_CACHE_TTL',
    label: 'Consent Cache TTL',
    description: 'Consent status cache lifetime in seconds (default: 24 hours)',
    min: 3600,
    max: 604800,
    unit: 'seconds',
    visibility: 'admin',
  },
  'consent.skip_for_first_party': {
    key: 'consent.skip_for_first_party',
    type: 'boolean',
    default: false,
    envKey: 'CONSENT_SKIP_FIRST_PARTY',
    label: 'Skip for First-Party Apps',
    description: 'Skip consent screen for first-party applications',
    visibility: 'admin',
  },
};

/**
 * Consent Category Metadata
 */
export const CONSENT_CATEGORY_META: CategoryMeta = {
  category: 'consent',
  label: 'Consent',
  description: 'User consent management settings',
  settings: CONSENT_SETTINGS_META,
};

/**
 * Default Consent settings values
 */
export const CONSENT_DEFAULTS: ConsentSettings = {
  'consent.show_scopes': true,
  'consent.show_client_info': true,
  'consent.remember_decision': true,
  'consent.remember_duration': 2592000,
  'consent.require_explicit': true,
  'consent.granular_scopes': false,
  'consent.cache_ttl': 86400,
  'consent.skip_for_first_party': false,
};
