/**
 * Verifiable Credentials Settings Category
 *
 * Settings related to OpenID4VC and Verifiable Credentials.
 * API: GET/PATCH /api/admin/tenants/:tenantId/settings/vc
 * Config Level: tenant
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * Verifiable Credentials Settings Interface
 */
export interface VerifiableCredentialsSettings {
  // VP Request Settings
  'vc.vp_request_expiry': number;

  // c_nonce Settings
  'vc.c_nonce_expiry': number;

  // Credential Offer Settings
  'vc.credential_offer_expiry': number;

  // Proof of Possession Settings
  'vc.pop_validity': number;
  'vc.pop_clock_skew': number;

  // DID Settings
  'vc.did_cache_ttl': number;
}

/**
 * Verifiable Credentials Settings Metadata
 */
export const VC_SETTINGS_META: Record<keyof VerifiableCredentialsSettings, SettingMeta> = {
  'vc.vp_request_expiry': {
    key: 'vc.vp_request_expiry',
    type: 'duration',
    default: 300,
    envKey: 'VC_VP_REQUEST_EXPIRY',
    label: 'VP Request Expiry',
    description: 'Verifiable Presentation request lifetime in seconds',
    min: 60,
    max: 3600,
    unit: 'seconds',
    visibility: 'admin',
  },
  'vc.c_nonce_expiry': {
    key: 'vc.c_nonce_expiry',
    type: 'duration',
    default: 300,
    envKey: 'VC_C_NONCE_EXPIRY',
    label: 'c_nonce Expiry',
    description: 'c_nonce value lifetime in seconds (OpenID4VCI)',
    min: 60,
    max: 3600,
    unit: 'seconds',
    visibility: 'admin',
  },
  'vc.credential_offer_expiry': {
    key: 'vc.credential_offer_expiry',
    type: 'duration',
    default: 600,
    envKey: 'VC_CREDENTIAL_OFFER_EXPIRY',
    label: 'Credential Offer Expiry',
    description: 'Credential offer lifetime in seconds',
    min: 60,
    max: 86400,
    unit: 'seconds',
    visibility: 'admin',
  },
  'vc.pop_validity': {
    key: 'vc.pop_validity',
    type: 'duration',
    default: 120,
    envKey: 'VC_POP_VALIDITY',
    label: 'Proof of Possession Validity',
    description: 'PoP proof validity window in seconds',
    min: 30,
    max: 600,
    unit: 'seconds',
    visibility: 'admin',
  },
  'vc.pop_clock_skew': {
    key: 'vc.pop_clock_skew',
    type: 'duration',
    default: 60,
    envKey: 'VC_POP_CLOCK_SKEW',
    label: 'PoP Clock Skew',
    description: 'Allowed clock skew for PoP validation in seconds',
    min: 0,
    max: 300,
    unit: 'seconds',
    visibility: 'admin',
  },
  'vc.did_cache_ttl': {
    key: 'vc.did_cache_ttl',
    type: 'duration',
    default: 3600,
    envKey: 'VC_DID_CACHE_TTL',
    label: 'DID Cache TTL',
    description: 'DID document cache lifetime in seconds',
    min: 60,
    max: 86400,
    unit: 'seconds',
    visibility: 'admin',
  },
};

/**
 * Verifiable Credentials Category Metadata
 */
export const VC_CATEGORY_META: CategoryMeta = {
  category: 'vc',
  label: 'Verifiable Credentials',
  description: 'OpenID4VC and Verifiable Credentials settings',
  settings: VC_SETTINGS_META,
};

/**
 * Default Verifiable Credentials settings values
 */
export const VC_DEFAULTS: VerifiableCredentialsSettings = {
  'vc.vp_request_expiry': 300,
  'vc.c_nonce_expiry': 300,
  'vc.credential_offer_expiry': 600,
  'vc.pop_validity': 120,
  'vc.pop_clock_skew': 60,
  'vc.did_cache_ttl': 3600,
};
