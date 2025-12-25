/**
 * Device Flow Settings Category
 *
 * Settings related to OAuth 2.0 Device Authorization Grant (RFC 8628).
 * API: GET/PATCH /api/admin/tenants/:tenantId/settings/device-flow
 * Config Level: tenant
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * Device Flow Settings Interface
 */
export interface DeviceFlowSettings {
  // Expiry Settings
  'device_flow.expires_in': number;
  'device_flow.poll_interval': number;
  'device_flow.max_poll_count': number;

  // User Code Settings
  'device_flow.user_code_charset': 'BASE20' | 'NUMERIC';
  'device_flow.user_code_length': number;
}

/**
 * Device Flow Settings Metadata
 */
export const DEVICE_FLOW_SETTINGS_META: Record<keyof DeviceFlowSettings, SettingMeta> = {
  'device_flow.expires_in': {
    key: 'device_flow.expires_in',
    type: 'duration',
    default: 600,
    envKey: 'DEVICE_FLOW_DEFAULT_EXPIRES_IN',
    label: 'Device Code Expiry',
    description: 'Device code lifetime in seconds (default: 10 minutes)',
    min: 300,
    max: 1800,
    unit: 'seconds',
    visibility: 'public',
  },
  'device_flow.poll_interval': {
    key: 'device_flow.poll_interval',
    type: 'duration',
    default: 5,
    envKey: 'DEVICE_FLOW_DEFAULT_INTERVAL',
    label: 'Poll Interval',
    description: 'Minimum polling interval in seconds (RFC 8628 default: 5)',
    min: 1,
    max: 60,
    unit: 'seconds',
    visibility: 'public',
  },
  'device_flow.max_poll_count': {
    key: 'device_flow.max_poll_count',
    type: 'number',
    default: 120,
    envKey: 'DEVICE_FLOW_MAX_POLL_COUNT',
    label: 'Max Poll Count',
    description: 'Maximum number of polling attempts (DoS protection)',
    min: 10,
    max: 500,
    visibility: 'admin',
  },
  'device_flow.user_code_charset': {
    key: 'device_flow.user_code_charset',
    type: 'enum',
    default: 'BASE20',
    envKey: 'DEVICE_FLOW_USER_CODE_CHARSET',
    label: 'User Code Charset',
    description: 'Character set for user codes (BASE20: BCDFGHJKLMNPQRSTVWXZ, NUMERIC: 0-9)',
    enum: ['BASE20', 'NUMERIC'],
    visibility: 'public',
  },
  'device_flow.user_code_length': {
    key: 'device_flow.user_code_length',
    type: 'number',
    default: 8,
    envKey: 'DEVICE_FLOW_USER_CODE_LENGTH',
    label: 'User Code Length',
    description: 'Number of characters in user code',
    min: 4,
    max: 16,
    visibility: 'public',
  },
};

/**
 * Device Flow Category Metadata
 */
export const DEVICE_FLOW_CATEGORY_META: CategoryMeta = {
  category: 'device-flow',
  label: 'Device Flow',
  description: 'OAuth 2.0 Device Authorization Grant settings',
  settings: DEVICE_FLOW_SETTINGS_META,
};

/**
 * Default Device Flow settings values
 */
export const DEVICE_FLOW_DEFAULTS: DeviceFlowSettings = {
  'device_flow.expires_in': 600,
  'device_flow.poll_interval': 5,
  'device_flow.max_poll_count': 120,
  'device_flow.user_code_charset': 'BASE20',
  'device_flow.user_code_length': 8,
};
