/**
 * Plugin Settings Category
 *
 * Settings related to plugin execution and management.
 * API: GET/PATCH /api/admin/tenants/:tenantId/settings/plugin
 * Config Level: tenant
 */

import type { CategoryMeta, SettingMeta } from '../../utils/settings-manager';

/**
 * Plugin Settings Interface
 */
export interface PluginSettings {
  // Plugin Execution
  'plugin.enabled': boolean;
  'plugin.execution_timeout_ms': number;
  'plugin.memory_limit_mb': number;

  // Plugin Management
  'plugin.auto_update_check': boolean;
}

/**
 * Plugin Settings Metadata
 */
export const PLUGIN_SETTINGS_META: Record<keyof PluginSettings, SettingMeta> = {
  'plugin.enabled': {
    key: 'plugin.enabled',
    type: 'boolean',
    default: false,
    envKey: 'PLUGIN_ENABLED',
    label: 'Plugins Enabled',
    description: 'Enable plugin execution for this tenant',
    visibility: 'admin',
  },
  'plugin.execution_timeout_ms': {
    key: 'plugin.execution_timeout_ms',
    type: 'duration',
    default: 5000,
    envKey: 'PLUGIN_EXECUTION_TIMEOUT_MS',
    label: 'Execution Timeout',
    description: 'Maximum plugin execution time in milliseconds',
    min: 100,
    max: 30000,
    unit: 'ms',
    visibility: 'admin',
    dependsOn: [{ key: 'plugin.enabled', value: true }],
  },
  'plugin.memory_limit_mb': {
    key: 'plugin.memory_limit_mb',
    type: 'number',
    default: 128,
    envKey: 'PLUGIN_MEMORY_LIMIT_MB',
    label: 'Memory Limit',
    description: 'Maximum memory allocation for plugins in megabytes',
    min: 16,
    max: 512,
    visibility: 'admin',
    dependsOn: [{ key: 'plugin.enabled', value: true }],
  },
  'plugin.auto_update_check': {
    key: 'plugin.auto_update_check',
    type: 'boolean',
    default: true,
    envKey: 'PLUGIN_AUTO_UPDATE_CHECK',
    label: 'Auto Update Check',
    description: 'Automatically check for plugin updates',
    visibility: 'admin',
    dependsOn: [{ key: 'plugin.enabled', value: true }],
  },
};

/**
 * Plugin Category Metadata
 */
export const PLUGIN_CATEGORY_META: CategoryMeta = {
  category: 'plugin',
  label: 'Plugins',
  description: 'Plugin execution and management settings',
  settings: PLUGIN_SETTINGS_META,
};

/**
 * Default Plugin settings values
 */
export const PLUGIN_DEFAULTS: PluginSettings = {
  'plugin.enabled': false,
  'plugin.execution_timeout_ms': 5000,
  'plugin.memory_limit_mb': 128,
  'plugin.auto_update_check': true,
};
