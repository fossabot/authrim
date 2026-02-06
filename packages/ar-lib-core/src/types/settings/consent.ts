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

  // Policy Versioning
  'consent.versioning_enabled': boolean;

  // Consent Expiration
  'consent.expiration_enabled': boolean;
  'consent.default_expiration_days': number;

  // Data Export (GDPR)
  'consent.data_export_enabled': boolean;
  'consent.data_export_retention_days': number;
  'consent.data_export_sync_threshold_kb': number;

  // Additional Settings
  'consent.record_retention': number;
  'consent.require_on_scope_change': boolean;
  'consent.supported_display_types': string;
  'consent.ui_locales': string;

  // RBAC Consent Screen Features
  'consent.rbac_org_selector': boolean;
  'consent.rbac_acting_as': boolean;
  'consent.rbac_show_roles': boolean;

  // Consent Management (SAP CDC-like)
  'consent.consent_management_enabled': boolean;
  'consent.default_enforcement': string;
  'consent.show_deletion_link': boolean;
  'consent.deletion_url': string;
  'consent.default_language': string;

  // Migration Control
  'consent.legacy_dual_write': boolean;
  'consent.read_prefer_new': boolean;
  'consent.dual_write_diff_log': boolean;

  // IP Evidence
  'consent.ip_hash_retention_days': number;
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
  'consent.versioning_enabled': {
    key: 'consent.versioning_enabled',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_CONSENT_VERSIONING',
    label: 'Policy Versioning',
    description: 'Enable policy version tracking and re-consent on policy updates',
    visibility: 'admin',
  },
  'consent.expiration_enabled': {
    key: 'consent.expiration_enabled',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_CONSENT_EXPIRATION',
    label: 'Consent Expiration',
    description: 'Enable automatic consent expiration',
    visibility: 'admin',
  },
  'consent.default_expiration_days': {
    key: 'consent.default_expiration_days',
    type: 'number',
    default: 0,
    envKey: 'CONSENT_DEFAULT_EXPIRATION_DAYS',
    label: 'Default Expiration (Days)',
    description: 'Default consent expiration in days (0 = no expiration)',
    min: 0,
    max: 3650,
    visibility: 'admin',
  },
  'consent.data_export_enabled': {
    key: 'consent.data_export_enabled',
    type: 'boolean',
    default: true,
    envKey: 'ENABLE_CONSENT_DATA_EXPORT',
    label: 'Data Export (GDPR)',
    description: 'Allow users to export their personal data',
    visibility: 'admin',
  },
  'consent.data_export_retention_days': {
    key: 'consent.data_export_retention_days',
    type: 'number',
    default: 7,
    envKey: 'CONSENT_DATA_EXPORT_RETENTION_DAYS',
    label: 'Export Retention (Days)',
    description: 'How long to keep generated export files',
    min: 1,
    max: 30,
    visibility: 'admin',
  },
  'consent.data_export_sync_threshold_kb': {
    key: 'consent.data_export_sync_threshold_kb',
    type: 'number',
    default: 512,
    envKey: 'CONSENT_DATA_EXPORT_SYNC_THRESHOLD_KB',
    label: 'Sync Export Threshold (KB)',
    description: 'Maximum size for synchronous export (larger exports run async)',
    min: 64,
    max: 2048,
    visibility: 'admin',
  },

  // Additional Settings
  'consent.record_retention': {
    key: 'consent.record_retention',
    type: 'duration',
    default: 31536000,
    envKey: 'CONSENT_RECORD_RETENTION',
    label: 'Record Retention',
    description: 'Consent record retention period in seconds (default: 1 year)',
    min: 2592000,
    max: 157680000,
    unit: 'seconds',
    visibility: 'admin',
  },
  'consent.require_on_scope_change': {
    key: 'consent.require_on_scope_change',
    type: 'boolean',
    default: true,
    envKey: 'CONSENT_REQUIRE_ON_SCOPE_CHANGE',
    label: 'Require on Scope Change',
    description: 'Re-prompt consent when requested scopes change',
    visibility: 'public',
  },
  'consent.supported_display_types': {
    key: 'consent.supported_display_types',
    type: 'string',
    default: 'page,popup,touch,wap',
    envKey: 'SUPPORTED_DISPLAY_TYPES',
    label: 'Supported Display Types',
    description: 'Comma-separated list of supported OIDC display types',
    visibility: 'admin',
  },
  'consent.ui_locales': {
    key: 'consent.ui_locales',
    type: 'string',
    default: 'en,ja',
    envKey: 'CONSENT_UI_LOCALES',
    label: 'UI Locales',
    description: 'Comma-separated list of supported UI locales',
    visibility: 'public',
  },

  // RBAC Consent Screen Features
  'consent.rbac_org_selector': {
    key: 'consent.rbac_org_selector',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_RBAC_CONSENT_ORG_SELECTOR',
    label: 'Organization Selector',
    description: 'Show organization selector for multi-org users on consent screen',
    visibility: 'public',
  },
  'consent.rbac_acting_as': {
    key: 'consent.rbac_acting_as',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_RBAC_CONSENT_ACTING_AS',
    label: 'Acting-As (Delegation)',
    description: 'Enable acting-as delegation feature on consent screen',
    visibility: 'public',
  },
  'consent.rbac_show_roles': {
    key: 'consent.rbac_show_roles',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_RBAC_CONSENT_SHOW_ROLES',
    label: 'Show Roles',
    description: 'Display user roles on consent screen',
    visibility: 'public',
  },

  // Consent Management
  'consent.consent_management_enabled': {
    key: 'consent.consent_management_enabled',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_CONSENT_MANAGEMENT',
    label: 'Consent Management',
    description: 'Enable SAP CDC-like consent management with arbitrary consent items',
    visibility: 'admin',
  },
  'consent.default_enforcement': {
    key: 'consent.default_enforcement',
    type: 'enum',
    default: 'block',
    envKey: 'CONSENT_DEFAULT_ENFORCEMENT',
    label: 'Default Enforcement',
    description: 'Default enforcement mode for required consent items',
    enum: ['block', 'allow_continue'],
    visibility: 'admin',
  },
  'consent.show_deletion_link': {
    key: 'consent.show_deletion_link',
    type: 'boolean',
    default: false,
    envKey: 'CONSENT_SHOW_DELETION_LINK',
    label: 'Show Deletion Link',
    description: 'Show account deletion link when required consent is blocked',
    visibility: 'admin',
  },
  'consent.deletion_url': {
    key: 'consent.deletion_url',
    type: 'string',
    default: '',
    envKey: 'CONSENT_DELETION_URL',
    label: 'Deletion URL',
    description: 'URL for account deletion when consent is blocked',
    visibility: 'admin',
  },
  'consent.default_language': {
    key: 'consent.default_language',
    type: 'string',
    default: 'en',
    envKey: 'CONSENT_DEFAULT_LANGUAGE',
    label: 'Default Consent Language',
    description: 'Default language for consent content (BCP 47 code)',
    visibility: 'admin',
  },

  // Migration Control
  'consent.legacy_dual_write': {
    key: 'consent.legacy_dual_write',
    type: 'boolean',
    default: true,
    envKey: 'CONSENT_LEGACY_DUAL_WRITE',
    label: 'Legacy Dual Write',
    description: 'Write consent records to both new and legacy tables during migration',
    visibility: 'internal',
  },
  'consent.read_prefer_new': {
    key: 'consent.read_prefer_new',
    type: 'boolean',
    default: true,
    envKey: 'CONSENT_READ_PREFER_NEW',
    label: 'Prefer New Tables',
    description: 'Prefer reading from new consent tables (fallback to legacy)',
    visibility: 'internal',
  },
  'consent.dual_write_diff_log': {
    key: 'consent.dual_write_diff_log',
    type: 'boolean',
    default: false,
    envKey: 'CONSENT_DUAL_WRITE_DIFF_LOG',
    label: 'Dual Write Diff Log',
    description: 'Log differences between new and legacy consent writes for debugging',
    visibility: 'internal',
  },

  // IP Evidence
  'consent.ip_hash_retention_days': {
    key: 'consent.ip_hash_retention_days',
    type: 'number',
    default: 365,
    envKey: 'CONSENT_IP_HASH_RETENTION_DAYS',
    label: 'IP Hash Retention (Days)',
    description: 'How long to retain IP address hashes in consent records',
    min: 30,
    max: 3650,
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
  'consent.versioning_enabled': false,
  'consent.expiration_enabled': false,
  'consent.default_expiration_days': 0,
  'consent.data_export_enabled': true,
  'consent.data_export_retention_days': 7,
  'consent.data_export_sync_threshold_kb': 512,
  // Additional Settings
  'consent.record_retention': 31536000,
  'consent.require_on_scope_change': true,
  'consent.supported_display_types': 'page,popup,touch,wap',
  'consent.ui_locales': 'en,ja',
  // RBAC Consent Screen Features
  'consent.rbac_org_selector': false,
  'consent.rbac_acting_as': false,
  'consent.rbac_show_roles': false,
  // Consent Management
  'consent.consent_management_enabled': false,
  'consent.default_enforcement': 'block',
  'consent.show_deletion_link': false,
  'consent.deletion_url': '',
  'consent.default_language': 'en',
  // Migration Control
  'consent.legacy_dual_write': true,
  'consent.read_prefer_new': true,
  'consent.dual_write_diff_log': false,
  // IP Evidence
  'consent.ip_hash_retention_days': 365,
};
