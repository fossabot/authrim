/**
 * CIBA Settings Category
 *
 * Settings related to Client Initiated Backchannel Authentication.
 * API: GET/PATCH /api/admin/tenants/:tenantId/settings/ciba
 * Config Level: tenant
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * CIBA Settings Interface
 */
export interface CIBASettings {
  // Expiry Settings
  'ciba.expires_in': number;
  'ciba.poll_interval': number;
  'ciba.max_poll_count': number;

  // Message Settings
  'ciba.max_binding_message_length': number;
  'ciba.binding_message_required': boolean;

  // Feature Settings
  'ciba.user_code_enabled': boolean;
  'ciba.auth_request_ttl': number;
}

/**
 * CIBA Settings Metadata
 */
export const CIBA_SETTINGS_META: Record<keyof CIBASettings, SettingMeta> = {
  'ciba.expires_in': {
    key: 'ciba.expires_in',
    type: 'duration',
    default: 300,
    envKey: 'CIBA_DEFAULT_EXPIRES_IN',
    label: 'Request Expiry',
    description: 'CIBA request lifetime in seconds (default: 5 minutes)',
    min: 60,
    max: 600,
    unit: 'seconds',
    visibility: 'public',
  },
  'ciba.poll_interval': {
    key: 'ciba.poll_interval',
    type: 'duration',
    default: 5,
    envKey: 'CIBA_DEFAULT_INTERVAL',
    label: 'Poll Interval',
    description: 'Minimum polling interval in seconds',
    min: 2,
    max: 60,
    unit: 'seconds',
    visibility: 'public',
  },
  'ciba.max_poll_count': {
    key: 'ciba.max_poll_count',
    type: 'number',
    default: 120,
    envKey: 'CIBA_MAX_POLL_COUNT',
    label: 'Max Poll Count',
    description: 'Maximum number of polling attempts',
    min: 10,
    max: 500,
    visibility: 'admin',
  },
  'ciba.max_binding_message_length': {
    key: 'ciba.max_binding_message_length',
    type: 'number',
    default: 140,
    envKey: 'CIBA_MAX_BINDING_MESSAGE_LENGTH',
    label: 'Max Binding Message Length',
    description: 'Maximum characters for binding_message',
    min: 50,
    max: 500,
    visibility: 'admin',
  },
  'ciba.binding_message_required': {
    key: 'ciba.binding_message_required',
    type: 'boolean',
    default: false,
    envKey: 'CIBA_BINDING_MESSAGE_REQUIRED',
    label: 'Binding Message Required',
    description: 'Require binding_message parameter (FAPI-CIBA)',
    visibility: 'public',
  },
  'ciba.user_code_enabled': {
    key: 'ciba.user_code_enabled',
    type: 'boolean',
    default: false,
    envKey: 'CIBA_USER_CODE_ENABLED',
    label: 'User Code Support',
    description: 'Enable user_code parameter support',
    visibility: 'public',
  },
  'ciba.auth_request_ttl': {
    key: 'ciba.auth_request_ttl',
    type: 'duration',
    default: 300,
    envKey: 'CIBA_AUTH_REQUEST_TTL',
    label: 'Auth Request TTL',
    description: 'auth_req_id cache lifetime in seconds',
    min: 60,
    max: 600,
    unit: 'seconds',
    visibility: 'admin',
  },
};

/**
 * CIBA Category Metadata
 */
export const CIBA_CATEGORY_META: CategoryMeta = {
  category: 'ciba',
  label: 'CIBA',
  description: 'Client Initiated Backchannel Authentication settings',
  settings: CIBA_SETTINGS_META,
};

/**
 * Default CIBA settings values
 */
export const CIBA_DEFAULTS: CIBASettings = {
  'ciba.expires_in': 300,
  'ciba.poll_interval': 5,
  'ciba.max_poll_count': 120,
  'ciba.max_binding_message_length': 140,
  'ciba.binding_message_required': false,
  'ciba.user_code_enabled': false,
  'ciba.auth_request_ttl': 300,
};
