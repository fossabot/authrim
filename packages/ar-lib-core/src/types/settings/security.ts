/**
 * Security Settings Category
 *
 * Settings related to security policies and features.
 * API: GET/PATCH /api/admin/tenants/:tenantId/settings/security
 * Config Level: tenant
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * Security Settings Interface
 */
export interface SecuritySettings {
  // FAPI Settings
  'security.fapi_enabled': boolean;
  'security.fapi_strict_dpop': boolean;
  'security.fapi_allow_public_clients': boolean;

  // DPoP Settings
  'security.dpop_bound_access_tokens': boolean;
  'security.dpop_nonce_enabled': boolean;
  'security.dpop_nonce_ttl': number;
  'security.dpop_jti_ttl': number;

  // Feature Flags (Security-related)
  'security.enable_abac': boolean;
  'security.enable_rebac': boolean;
  'security.enable_policy_logging': boolean;
  'security.enable_verified_attributes': boolean;
}

/**
 * Security Settings Metadata
 */
export const SECURITY_SETTINGS_META: Record<keyof SecuritySettings, SettingMeta> = {
  // FAPI Settings
  'security.fapi_enabled': {
    key: 'security.fapi_enabled',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_FAPI',
    label: 'FAPI Mode',
    description: 'Enable Financial-grade API security profile',
    visibility: 'public',
  },
  'security.fapi_strict_dpop': {
    key: 'security.fapi_strict_dpop',
    type: 'boolean',
    default: false,
    envKey: 'FAPI_STRICT_DPOP',
    label: 'FAPI Strict DPoP',
    description: 'Require DPoP for all FAPI requests',
    visibility: 'public',
    dependsOn: [{ key: 'security.fapi_enabled', value: true }],
  },
  'security.fapi_allow_public_clients': {
    key: 'security.fapi_allow_public_clients',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_FAPI_PUBLIC_CLIENTS',
    label: 'FAPI Allow Public Clients',
    description: 'Allow public clients in FAPI mode (not recommended)',
    visibility: 'admin',
    dependsOn: [{ key: 'security.fapi_enabled', value: true }],
  },

  // DPoP Settings
  'security.dpop_bound_access_tokens': {
    key: 'security.dpop_bound_access_tokens',
    type: 'boolean',
    default: false,
    envKey: 'DPOP_BOUND_ACCESS_TOKENS',
    label: 'DPoP Bound Tokens',
    description: 'Bind access tokens to DPoP keys by default',
    visibility: 'public',
  },
  'security.dpop_nonce_enabled': {
    key: 'security.dpop_nonce_enabled',
    type: 'boolean',
    default: true,
    envKey: 'ENABLE_DPOP_NONCE',
    label: 'DPoP Nonce Required',
    description: 'Require server-provided nonce in DPoP proofs',
    visibility: 'public',
  },
  'security.dpop_nonce_ttl': {
    key: 'security.dpop_nonce_ttl',
    type: 'duration',
    default: 300,
    envKey: 'DPOP_NONCE_TTL',
    label: 'DPoP Nonce TTL',
    description: 'DPoP nonce lifetime in seconds',
    min: 60,
    max: 3600,
    unit: 'seconds',
    visibility: 'admin',
  },
  'security.dpop_jti_ttl': {
    key: 'security.dpop_jti_ttl',
    type: 'duration',
    default: 300,
    envKey: 'DPOP_JTI_DEFAULT_TTL',
    label: 'DPoP JTI TTL',
    description: 'DPoP proof JTI replay prevention window in seconds',
    min: 60,
    max: 3600,
    unit: 'seconds',
    visibility: 'admin',
  },

  // Feature Flags (Security-related)
  'security.enable_abac': {
    key: 'security.enable_abac',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_ABAC',
    label: 'Enable ABAC',
    description: 'Enable Attribute-Based Access Control policy evaluation',
    visibility: 'admin',
  },
  'security.enable_rebac': {
    key: 'security.enable_rebac',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_REBAC',
    label: 'Enable ReBAC',
    description: 'Enable Relationship-Based Access Control',
    visibility: 'admin',
  },
  'security.enable_policy_logging': {
    key: 'security.enable_policy_logging',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_POLICY_LOGGING',
    label: 'Policy Logging',
    description: 'Enable detailed logging of policy evaluations',
    visibility: 'admin',
  },
  'security.enable_verified_attributes': {
    key: 'security.enable_verified_attributes',
    type: 'boolean',
    default: false,
    envKey: 'ENABLE_VERIFIED_ATTRIBUTES',
    label: 'Verified Attributes',
    description: 'Enable verified attribute checking in policies',
    visibility: 'admin',
  },
};

/**
 * Security Category Metadata
 */
export const SECURITY_CATEGORY_META: CategoryMeta = {
  category: 'security',
  label: 'Security',
  description: 'Security policies and feature flags',
  settings: SECURITY_SETTINGS_META,
};

/**
 * Default Security settings values
 */
export const SECURITY_DEFAULTS: SecuritySettings = {
  'security.fapi_enabled': false,
  'security.fapi_strict_dpop': false,
  'security.fapi_allow_public_clients': false,
  'security.dpop_bound_access_tokens': false,
  'security.dpop_nonce_enabled': true,
  'security.dpop_nonce_ttl': 300,
  'security.dpop_jti_ttl': 300,
  'security.enable_abac': false,
  'security.enable_rebac': false,
  'security.enable_policy_logging': false,
  'security.enable_verified_attributes': false,
};
