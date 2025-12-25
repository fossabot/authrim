/**
 * Settings API v2
 *
 * Unified settings management with:
 * - URL-based scope (tenantId/clientId)
 * - PATCH for partial updates with optimistic locking
 * - env > KV > default priority
 * - Audit logging
 *
 * Routes:
 * - GET/PATCH /api/admin/tenants/:tenantId/settings/:category
 * - GET/PATCH /api/admin/clients/:clientId/settings
 * - GET /api/admin/platform/settings/:category (read-only)
 * - GET /api/admin/settings/meta/:category
 * - POST /api/admin/settings/migrate (v1 → v2 migration)
 * - GET /api/admin/settings/migrate/status
 * - DELETE /api/admin/settings/migrate/lock
 */

import { Hono } from 'hono';
import type { Env } from '@authrim/ar-lib-core';
import migrateRouter from './migrate';
import {
  createSettingsManager,
  SettingsManager,
  type SettingScope,
  type SettingsPatchRequest,
  type CategoryMeta,
  ConflictError,
  ALL_CATEGORY_META,
} from '@authrim/ar-lib-core';

/**
 * Context variables for auth
 */
interface AdminUser {
  id: string;
  email?: string;
  role?: string;
}

/**
 * Dangerous keys that could be used for prototype pollution attacks
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Sanitize object to prevent prototype pollution
 * Removes dangerous keys like __proto__, constructor, prototype
 */
function sanitizeObject(obj: unknown): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!DANGEROUS_KEYS.includes(key)) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Parse and sanitize PATCH request body
 */
function parsePatchRequest(rawBody: unknown): SettingsPatchRequest {
  if (typeof rawBody !== 'object' || rawBody === null) {
    return { ifMatch: '' };
  }

  const body = rawBody as Record<string, unknown>;
  return {
    ifMatch: typeof body.ifMatch === 'string' ? body.ifMatch : '',
    set: body.set && typeof body.set === 'object' ? sanitizeObject(body.set) : undefined,
    clear: Array.isArray(body.clear)
      ? body.clear.filter((k): k is string => typeof k === 'string')
      : undefined,
    disable: Array.isArray(body.disable)
      ? body.disable.filter((k): k is string => typeof k === 'string')
      : undefined,
  };
}

// Create the settings-v2 app with typed variables
const settingsV2 = new Hono<{
  Bindings: Env;
  Variables: {
    adminUser?: AdminUser;
  };
}>();

/**
 * Get or create SettingsManager for the request
 */
function getSettingsManager(env: Env): SettingsManager {
  const manager = createSettingsManager({
    env: env as unknown as Record<string, string | undefined>,
    kv: env.AUTHRIM_CONFIG ?? null,
    cacheTTL: 5000, // 5 seconds (as per plan)
    auditCallback: async (event) => {
      // Log audit event (can be extended to write to KV/R2)
      console.log('[SETTINGS_AUDIT]', JSON.stringify(event));
    },
  });

  // Register all known categories
  for (const [, categoryMeta] of Object.entries(ALL_CATEGORY_META)) {
    manager.registerCategory(categoryMeta);
  }

  return manager;
}

/**
 * Error response helper
 */
function errorResponse(
  c: {
    json: (data: unknown, status: number) => Response;
  },
  error: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return c.json({ error, message, ...details }, status);
}

// =============================================================================
// Tenant Settings Routes
// =============================================================================

/**
 * GET /api/admin/tenants/:tenantId/settings/:category
 * Get all settings for a tenant and category
 */
settingsV2.get('/tenants/:tenantId/settings/:category', async (c) => {
  const tenantId = c.req.param('tenantId');
  const category = c.req.param('category');

  const manager = getSettingsManager(c.env);
  const scope: SettingScope = { type: 'tenant', id: tenantId };

  try {
    const result = await manager.getAll(category, scope);
    return c.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unknown category')) {
      return errorResponse(c, 'not_found', `Category '${category}' not found`, 404);
    }
    throw error;
  }
});

/**
 * PATCH /api/admin/tenants/:tenantId/settings/:category
 * Partial update settings for a tenant and category
 */
settingsV2.patch('/tenants/:tenantId/settings/:category', async (c) => {
  const tenantId = c.req.param('tenantId');
  const category = c.req.param('category');

  const manager = getSettingsManager(c.env);
  const scope: SettingScope = { type: 'tenant', id: tenantId };

  try {
    // Parse and sanitize request body (prevent prototype pollution)
    const rawBody = await c.req.json();
    const body = parsePatchRequest(rawBody);

    // Validate ifMatch is provided
    if (!body.ifMatch) {
      return errorResponse(c, 'bad_request', 'ifMatch is required for PATCH operations', 400);
    }

    // Get actor from context (set by auth middleware)
    const actor = c.get('adminUser')?.id ?? 'unknown';

    const result = await manager.patch(category, scope, body, actor);

    // Check if there were any rejections
    const hasRejections = Object.keys(result.rejected).length > 0;
    const hasApplied =
      result.applied.length > 0 || result.cleared.length > 0 || result.disabled.length > 0;

    // Return appropriate status
    // 200 OK if anything was applied (even with rejections)
    // 400 Bad Request if everything was rejected
    if (!hasApplied && hasRejections) {
      return c.json(
        {
          error: 'validation_failed',
          message: 'All changes were rejected',
          ...result,
        },
        400
      );
    }

    return c.json(result);
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return errorResponse(c, 'bad_request', 'Invalid JSON body', 400);
    }
    if (error instanceof ConflictError) {
      return c.json(
        {
          error: 'conflict',
          message: error.message,
          currentVersion: error.currentVersion,
        },
        409
      );
    }
    if (error instanceof Error) {
      if (error.message.includes('Unknown category')) {
        return errorResponse(c, 'not_found', `Category '${category}' not found`, 404);
      }
      if (error.message.includes('read-only')) {
        return errorResponse(c, 'forbidden', error.message, 403);
      }
    }
    throw error;
  }
});

// =============================================================================
// Client Settings Routes
// =============================================================================

/**
 * GET /api/admin/clients/:clientId/settings
 * Get all settings for a client
 */
settingsV2.get('/clients/:clientId/settings', async (c) => {
  const clientId = c.req.param('clientId');

  const manager = getSettingsManager(c.env);
  const scope: SettingScope = { type: 'client', id: clientId };

  try {
    // Client settings are stored under a single category
    const result = await manager.getAll('client', scope);
    return c.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unknown category')) {
      return errorResponse(c, 'not_found', 'Client settings category not found', 404);
    }
    throw error;
  }
});

/**
 * PATCH /api/admin/clients/:clientId/settings
 * Partial update settings for a client
 */
settingsV2.patch('/clients/:clientId/settings', async (c) => {
  const clientId = c.req.param('clientId');

  const manager = getSettingsManager(c.env);
  const scope: SettingScope = { type: 'client', id: clientId };

  try {
    // Parse and sanitize request body (prevent prototype pollution)
    const rawBody = await c.req.json();
    const body = parsePatchRequest(rawBody);

    if (!body.ifMatch) {
      return errorResponse(c, 'bad_request', 'ifMatch is required for PATCH operations', 400);
    }

    const actor = c.get('adminUser')?.id ?? 'unknown';
    const result = await manager.patch('client', scope, body, actor);

    const hasRejections = Object.keys(result.rejected).length > 0;
    const hasApplied =
      result.applied.length > 0 || result.cleared.length > 0 || result.disabled.length > 0;

    if (!hasApplied && hasRejections) {
      return c.json(
        {
          error: 'validation_failed',
          message: 'All changes were rejected',
          ...result,
        },
        400
      );
    }

    return c.json(result);
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return errorResponse(c, 'bad_request', 'Invalid JSON body', 400);
    }
    if (error instanceof ConflictError) {
      return c.json(
        {
          error: 'conflict',
          message: error.message,
          currentVersion: error.currentVersion,
        },
        409
      );
    }
    throw error;
  }
});

// =============================================================================
// Platform Settings Routes (Read-Only)
// =============================================================================

/**
 * GET /api/admin/platform/settings/:category
 * Get platform settings (read-only)
 */
settingsV2.get('/platform/settings/:category', async (c) => {
  const category = c.req.param('category');

  const manager = getSettingsManager(c.env);
  const scope: SettingScope = { type: 'platform' };

  try {
    const result = await manager.getAll(category, scope);
    return c.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unknown category')) {
      return errorResponse(c, 'not_found', `Category '${category}' not found`, 404);
    }
    throw error;
  }
});

/**
 * PUT/PATCH/DELETE /api/admin/platform/settings/:category
 * Platform settings are read-only - return 405
 */
settingsV2.put('/platform/settings/:category', (c) => {
  return errorResponse(c, 'method_not_allowed', 'Platform settings are read-only', 405);
});

settingsV2.patch('/platform/settings/:category', (c) => {
  return errorResponse(c, 'method_not_allowed', 'Platform settings are read-only', 405);
});

settingsV2.delete('/platform/settings/:category', (c) => {
  return errorResponse(c, 'method_not_allowed', 'Platform settings are read-only', 405);
});

// =============================================================================
// Meta API Routes
// =============================================================================

/**
 * GET /api/admin/settings/meta/:category
 * Get settings metadata for a category
 */
settingsV2.get('/settings/meta/:category', async (c) => {
  const category = c.req.param('category');

  const manager = getSettingsManager(c.env);
  const meta = manager.getMeta(category);

  if (!meta) {
    return errorResponse(c, 'not_found', `Category '${category}' not found`, 404);
  }

  // Filter settings by visibility if needed
  // For now, return all settings (visibility filtering can be added based on user role)
  return c.json({
    category: meta.category,
    label: meta.label,
    description: meta.description,
    settings: meta.settings,
  });
});

/**
 * GET /api/admin/settings/meta
 * Get list of all available categories
 */
settingsV2.get('/settings/meta', (c) => {
  const categories = Object.entries(ALL_CATEGORY_META).map(([key, meta]) => ({
    category: key,
    label: meta.label,
    description: meta.description,
    settingsCount: Object.keys(meta.settings).length,
  }));

  return c.json({ categories });
});

// =============================================================================
// Migration API Routes
// =============================================================================

// Mount migration routes under /settings
settingsV2.route('/settings', migrateRouter);

export default settingsV2;
