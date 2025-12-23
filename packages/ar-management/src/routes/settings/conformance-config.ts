/**
 * Conformance Mode Configuration Admin API
 *
 * GET    /api/admin/settings/conformance  - Get conformance settings
 * PUT    /api/admin/settings/conformance  - Update conformance settings
 * DELETE /api/admin/settings/conformance  - Clear conformance override
 *
 * Conformance mode enables built-in HTML forms for OIDC certification testing.
 *
 * Settings stored in SETTINGS KV under "system_settings" key:
 * {
 *   "conformance": {
 *     "enabled": boolean,
 *     "useBuiltinForms": boolean
 *   }
 * }
 */

import type { Context } from 'hono';
import type { Env } from '@authrim/ar-lib-core';
import {
  getConformanceConfig,
  getConformanceConfigSource,
  DEFAULT_CONFORMANCE_CONFIG,
  CONFORMANCE_CONFIG_METADATA,
  type ConformanceConfig,
} from '@authrim/ar-lib-core';

interface SystemSettings {
  conformance?: Partial<ConformanceConfig>;
  [key: string]: unknown;
}

/**
 * GET /api/admin/settings/conformance
 * Get current conformance mode configuration
 */
export async function getConformanceConfigHandler(c: Context<{ Bindings: Env }>) {
  const config = await getConformanceConfig(c.env);
  const source = await getConformanceConfigSource(c.env);

  return c.json({
    config,
    source,
    defaults: DEFAULT_CONFORMANCE_CONFIG,
    metadata: CONFORMANCE_CONFIG_METADATA,
    warning: config.enabled
      ? 'Conformance mode is active. Built-in forms are used instead of external UI.'
      : null,
  });
}

/**
 * PUT /api/admin/settings/conformance
 * Update conformance mode configuration
 */
export async function updateConformanceConfigHandler(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json<Partial<ConformanceConfig>>();

  // Validate boolean fields
  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'enabled must be a boolean',
      },
      400
    );
  }

  if (body.useBuiltinForms !== undefined && typeof body.useBuiltinForms !== 'boolean') {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'useBuiltinForms must be a boolean',
      },
      400
    );
  }

  // Get existing settings
  let systemSettings: SystemSettings = {};
  try {
    const existingJson = await c.env.SETTINGS?.get('system_settings');
    if (existingJson) {
      systemSettings = JSON.parse(existingJson);
    }
  } catch {
    // Start fresh
  }

  // Merge conformance settings
  systemSettings.conformance = {
    ...systemSettings.conformance,
    ...body,
  };

  // Save to KV
  await c.env.SETTINGS?.put('system_settings', JSON.stringify(systemSettings));

  return c.json({
    success: true,
    config: systemSettings.conformance,
    warning: body.enabled
      ? 'Conformance mode enabled. Built-in forms will be used instead of external UI.'
      : null,
  });
}

/**
 * DELETE /api/admin/settings/conformance
 * Clear conformance configuration override (fall back to env/default)
 */
export async function deleteConformanceConfigHandler(c: Context<{ Bindings: Env }>) {
  // Get existing settings
  let systemSettings: SystemSettings = {};
  try {
    const existingJson = await c.env.SETTINGS?.get('system_settings');
    if (existingJson) {
      systemSettings = JSON.parse(existingJson);
    }
  } catch {
    // Ignore
  }

  // Remove conformance settings
  delete systemSettings.conformance;

  // Save back to KV
  await c.env.SETTINGS?.put('system_settings', JSON.stringify(systemSettings));

  return c.json({
    success: true,
    message:
      'Conformance configuration cleared. Will fall back to environment variable or default.',
  });
}
