/**
 * UI Configuration Admin API
 *
 * GET    /api/admin/settings/ui-config  - Get UI settings
 * PUT    /api/admin/settings/ui-config  - Update UI settings
 * DELETE /api/admin/settings/ui-config  - Clear UI override
 *
 * GET    /api/admin/settings/ui-routing  - Get UI routing settings
 * PUT    /api/admin/settings/ui-routing  - Update UI routing settings
 * DELETE /api/admin/settings/ui-routing  - Clear UI routing override
 *
 * UI configuration for login, consent, and other authentication screens.
 * Includes RBAC/policy-based routing configuration.
 *
 * Settings stored in SETTINGS KV under "system_settings" key:
 * {
 *   "ui": {
 *     "baseUrl": "https://login.example.com",
 *     "paths": {
 *       "login": "/login",
 *       "consent": "/consent",
 *       ...
 *     }
 *   },
 *   "routing": {
 *     "rolePathOverrides": { ... },
 *     "policyRedirects": [ ... ]
 *   }
 * }
 */

import type { Context } from 'hono';
import type { Env } from '@authrim/ar-lib-core';
import {
  getUIConfig,
  getUIConfigSource,
  getUIRoutingConfig,
  DEFAULT_UI_PATHS,
  UI_PATH_METADATA,
  type UIConfig,
  type UIPathConfig,
  type UIRoutingConfig,
  type PolicyRedirectRule,
} from '@authrim/ar-lib-core';

type SettingSource = 'kv' | 'env' | 'none';

interface SystemSettings {
  ui?: Partial<UIConfig>;
  routing?: UIRoutingConfig;
  [key: string]: unknown;
}

/**
 * GET /api/admin/settings/ui-config
 * Get current UI configuration
 */
export async function getUIConfigHandler(c: Context<{ Bindings: Env }>) {
  const config = await getUIConfig(c.env);
  const source = await getUIConfigSource(c.env);

  return c.json({
    config: config || { baseUrl: null, paths: DEFAULT_UI_PATHS },
    source,
    defaults: DEFAULT_UI_PATHS,
    metadata: UI_PATH_METADATA,
  });
}

/**
 * PUT /api/admin/settings/ui-config
 * Update UI configuration
 */
export async function updateUIConfigHandler(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json<{
    baseUrl?: string;
    paths?: Partial<UIPathConfig>;
  }>();

  // Validate baseUrl if provided
  if (body.baseUrl !== undefined && body.baseUrl !== null) {
    try {
      new URL(body.baseUrl);
    } catch {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Invalid baseUrl: must be a valid URL',
        },
        400
      );
    }
  }

  // Validate paths if provided
  if (body.paths) {
    for (const [key, value] of Object.entries(body.paths)) {
      if (typeof value !== 'string' || !value.startsWith('/')) {
        return c.json(
          {
            error: 'invalid_request',
            error_description: `Invalid path for ${key}: must be a string starting with /`,
          },
          400
        );
      }
    }
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

  // Merge UI settings
  systemSettings.ui = {
    ...systemSettings.ui,
    ...body,
    paths: { ...systemSettings.ui?.paths, ...body.paths },
  };

  // Save to KV
  await c.env.SETTINGS?.put('system_settings', JSON.stringify(systemSettings));

  return c.json({
    success: true,
    config: systemSettings.ui,
  });
}

/**
 * DELETE /api/admin/settings/ui-config
 * Clear UI configuration override (fall back to env)
 */
export async function deleteUIConfigHandler(c: Context<{ Bindings: Env }>) {
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

  // Remove UI settings
  delete systemSettings.ui;

  // Save back to KV
  await c.env.SETTINGS?.put('system_settings', JSON.stringify(systemSettings));

  return c.json({
    success: true,
    message: 'UI configuration cleared. Will fall back to environment variable.',
  });
}

/**
 * GET /api/admin/settings/ui-routing
 * Get current UI routing configuration
 */
export async function getUIRoutingHandler(c: Context<{ Bindings: Env }>) {
  const routing = await getUIRoutingConfig(c.env);

  return c.json({
    routing: routing || { rolePathOverrides: {}, policyRedirects: [] },
  });
}

/**
 * PUT /api/admin/settings/ui-routing
 * Update UI routing configuration
 */
export async function updateUIRoutingHandler(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json<{
    rolePathOverrides?: Record<string, Partial<UIPathConfig>>;
    policyRedirects?: PolicyRedirectRule[];
  }>();

  // Validate rolePathOverrides if provided
  if (body.rolePathOverrides) {
    for (const [role, paths] of Object.entries(body.rolePathOverrides)) {
      if (typeof role !== 'string' || role.length === 0) {
        return c.json(
          {
            error: 'invalid_request',
            error_description: 'Role name must be a non-empty string',
          },
          400
        );
      }
      for (const [key, value] of Object.entries(paths)) {
        if (typeof value !== 'string' || !value.startsWith('/')) {
          return c.json(
            {
              error: 'invalid_request',
              error_description: `Invalid path for role ${role}.${key}: must be a string starting with /`,
            },
            400
          );
        }
      }
    }
  }

  // Validate policyRedirects if provided
  if (body.policyRedirects) {
    for (const [index, rule] of body.policyRedirects.entries()) {
      if (!Array.isArray(rule.conditions)) {
        return c.json(
          {
            error: 'invalid_request',
            error_description: `Policy redirect rule ${index}: conditions must be an array`,
          },
          400
        );
      }
      if (typeof rule.redirectPath !== 'string' || !rule.redirectPath.startsWith('/')) {
        return c.json(
          {
            error: 'invalid_request',
            error_description: `Policy redirect rule ${index}: redirectPath must be a string starting with /`,
          },
          400
        );
      }
    }
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

  // Merge routing settings
  systemSettings.routing = {
    ...systemSettings.routing,
    ...body,
  };

  // Save to KV
  await c.env.SETTINGS?.put('system_settings', JSON.stringify(systemSettings));

  return c.json({
    success: true,
    routing: systemSettings.routing,
  });
}

/**
 * DELETE /api/admin/settings/ui-routing
 * Clear UI routing configuration
 */
export async function deleteUIRoutingHandler(c: Context<{ Bindings: Env }>) {
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

  // Remove routing settings
  delete systemSettings.routing;

  // Save back to KV
  await c.env.SETTINGS?.put('system_settings', JSON.stringify(systemSettings));

  return c.json({
    success: true,
    message: 'UI routing configuration cleared.',
  });
}
