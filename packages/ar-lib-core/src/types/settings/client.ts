/**
 * Client Settings Category
 *
 * Per-client OAuth settings.
 * API: GET/PATCH /api/admin/clients/:clientId/settings
 * Config Level: client
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * Client Settings Interface
 */
export interface ClientSettings {
  // Token Settings
  'client.access_token_ttl': number;
  'client.refresh_token_ttl': number;
  'client.id_token_ttl': number;

  // Security Settings
  'client.pkce_required': boolean;
  'client.par_required': boolean;
  'client.dpop_required': boolean;

  // Consent Settings
  'client.consent_required': boolean;
  'client.first_party': boolean;

  // Token Behavior
  'client.refresh_token_rotation': boolean;
  'client.reuse_refresh_token': boolean;

  // Grant Types
  'client.allow_authorization_code': boolean;
  'client.allow_client_credentials': boolean;
  'client.allow_refresh_token': boolean;
  'client.allow_device_code': boolean;
  'client.allow_ciba': boolean;

  // Response Types
  'client.allow_code_response': boolean;
  'client.allow_token_response': boolean;
  'client.allow_id_token_response': boolean;

  // Redirect Settings
  'client.strict_redirect_matching': boolean;
  'client.allow_localhost_redirect': boolean;

  // UserInfo Settings
  'client.userinfo_signed_response_alg': string;
}

/**
 * Client Settings Metadata
 */
export const CLIENT_SETTINGS_META: Record<keyof ClientSettings, SettingMeta> = {
  'client.access_token_ttl': {
    key: 'client.access_token_ttl',
    type: 'duration',
    default: 3600,
    envKey: 'CLIENT_ACCESS_TOKEN_TTL',
    label: 'Access Token TTL',
    description: 'Client-specific access token lifetime in seconds',
    min: 60,
    max: 86400,
    unit: 'seconds',
    visibility: 'public',
  },
  'client.refresh_token_ttl': {
    key: 'client.refresh_token_ttl',
    type: 'duration',
    default: 7776000,
    envKey: 'CLIENT_REFRESH_TOKEN_TTL',
    label: 'Refresh Token TTL',
    description: 'Client-specific refresh token lifetime in seconds (default: 90 days)',
    min: 3600,
    max: 31536000,
    unit: 'seconds',
    visibility: 'public',
  },
  'client.id_token_ttl': {
    key: 'client.id_token_ttl',
    type: 'duration',
    default: 3600,
    envKey: 'CLIENT_ID_TOKEN_TTL',
    label: 'ID Token TTL',
    description: 'Client-specific ID token lifetime in seconds',
    min: 60,
    max: 86400,
    unit: 'seconds',
    visibility: 'public',
  },
  'client.pkce_required': {
    key: 'client.pkce_required',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_PKCE_REQUIRED',
    label: 'PKCE Required',
    description: 'Require PKCE for this client',
    visibility: 'public',
  },
  'client.par_required': {
    key: 'client.par_required',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_PAR_REQUIRED',
    label: 'PAR Required',
    description: 'Require Pushed Authorization Requests for this client',
    visibility: 'public',
  },
  'client.dpop_required': {
    key: 'client.dpop_required',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_DPOP_REQUIRED',
    label: 'DPoP Required',
    description: 'Require DPoP for this client',
    visibility: 'public',
  },
  'client.consent_required': {
    key: 'client.consent_required',
    type: 'boolean',
    default: true,
    envKey: 'CLIENT_CONSENT_REQUIRED',
    label: 'Consent Required',
    description: 'Require user consent for this client',
    visibility: 'public',
  },
  'client.first_party': {
    key: 'client.first_party',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_FIRST_PARTY',
    label: 'First Party App',
    description: 'Mark this client as a first-party application',
    visibility: 'admin',
  },
  'client.refresh_token_rotation': {
    key: 'client.refresh_token_rotation',
    type: 'boolean',
    default: true,
    envKey: 'CLIENT_REFRESH_TOKEN_ROTATION',
    label: 'Refresh Token Rotation',
    description: 'Issue new refresh token on use (security best practice)',
    visibility: 'public',
  },
  'client.reuse_refresh_token': {
    key: 'client.reuse_refresh_token',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_REUSE_REFRESH_TOKEN',
    label: 'Reuse Refresh Token',
    description: 'Allow refresh token reuse within grace period',
    visibility: 'admin',
  },
  'client.allow_authorization_code': {
    key: 'client.allow_authorization_code',
    type: 'boolean',
    default: true,
    envKey: 'CLIENT_ALLOW_AUTH_CODE',
    label: 'Allow Authorization Code',
    description: 'Enable authorization code grant',
    visibility: 'public',
  },
  'client.allow_client_credentials': {
    key: 'client.allow_client_credentials',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_ALLOW_CLIENT_CREDENTIALS',
    label: 'Allow Client Credentials',
    description: 'Enable client credentials grant',
    visibility: 'public',
  },
  'client.allow_refresh_token': {
    key: 'client.allow_refresh_token',
    type: 'boolean',
    default: true,
    envKey: 'CLIENT_ALLOW_REFRESH_TOKEN',
    label: 'Allow Refresh Token',
    description: 'Enable refresh token grant',
    visibility: 'public',
  },
  'client.allow_device_code': {
    key: 'client.allow_device_code',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_ALLOW_DEVICE_CODE',
    label: 'Allow Device Code',
    description: 'Enable device authorization grant',
    visibility: 'public',
  },
  'client.allow_ciba': {
    key: 'client.allow_ciba',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_ALLOW_CIBA',
    label: 'Allow CIBA',
    description: 'Enable CIBA (backchannel authentication)',
    visibility: 'public',
  },
  'client.allow_code_response': {
    key: 'client.allow_code_response',
    type: 'boolean',
    default: true,
    envKey: 'CLIENT_ALLOW_CODE_RESPONSE',
    label: 'Allow Code Response',
    description: 'Enable code response type',
    visibility: 'admin',
  },
  'client.allow_token_response': {
    key: 'client.allow_token_response',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_ALLOW_TOKEN_RESPONSE',
    label: 'Allow Token Response',
    description: 'Enable token response type (implicit flow)',
    visibility: 'admin',
  },
  'client.allow_id_token_response': {
    key: 'client.allow_id_token_response',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_ALLOW_ID_TOKEN_RESPONSE',
    label: 'Allow ID Token Response',
    description: 'Enable id_token response type (implicit flow)',
    visibility: 'admin',
  },
  'client.strict_redirect_matching': {
    key: 'client.strict_redirect_matching',
    type: 'boolean',
    default: true,
    envKey: 'CLIENT_STRICT_REDIRECT_MATCHING',
    label: 'Strict Redirect Matching',
    description: 'Require exact redirect URI matching',
    visibility: 'admin',
  },
  'client.allow_localhost_redirect': {
    key: 'client.allow_localhost_redirect',
    type: 'boolean',
    default: false,
    envKey: 'CLIENT_ALLOW_LOCALHOST_REDIRECT',
    label: 'Allow Localhost Redirect',
    description: 'Allow localhost redirect URIs (development)',
    visibility: 'admin',
  },
  'client.userinfo_signed_response_alg': {
    key: 'client.userinfo_signed_response_alg',
    type: 'string',
    default: 'none',
    envKey: 'CLIENT_USERINFO_SIGNED_RESPONSE_ALG',
    label: 'UserInfo Signed Response Alg',
    description: 'Algorithm for signed UserInfo responses (none, RS256, ES256)',
    visibility: 'admin',
  },
};

/**
 * Client Category Metadata
 */
export const CLIENT_CATEGORY_META: CategoryMeta = {
  category: 'client',
  label: 'Client Settings',
  description: 'Per-client OAuth configuration',
  settings: CLIENT_SETTINGS_META,
};

/**
 * Default Client settings values
 */
export const CLIENT_DEFAULTS: ClientSettings = {
  'client.access_token_ttl': 3600,
  'client.refresh_token_ttl': 7776000,
  'client.id_token_ttl': 3600,
  'client.pkce_required': false,
  'client.par_required': false,
  'client.dpop_required': false,
  'client.consent_required': true,
  'client.first_party': false,
  'client.refresh_token_rotation': true,
  'client.reuse_refresh_token': false,
  'client.allow_authorization_code': true,
  'client.allow_client_credentials': false,
  'client.allow_refresh_token': true,
  'client.allow_device_code': false,
  'client.allow_ciba': false,
  'client.allow_code_response': true,
  'client.allow_token_response': false,
  'client.allow_id_token_response': false,
  'client.strict_redirect_matching': true,
  'client.allow_localhost_redirect': false,
  'client.userinfo_signed_response_alg': 'none',
};
