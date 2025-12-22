/**
 * WebSocket Subscription Routes
 *
 * Phase 8.3: Real-time Check API Model
 *
 * Provides WebSocket endpoint for real-time permission change notifications.
 *
 * Endpoint:
 * - GET /api/check/subscribe - WebSocket upgrade for permission change subscriptions
 *
 * Authentication:
 * - API Key: Authorization: Bearer chk_xxx (in query param for WebSocket)
 * - Access Token: Authorization: Bearer <JWT> (in query param for WebSocket)
 *
 * Note: WebSocket connections cannot send custom headers during upgrade,
 * so we accept the token as a query parameter.
 */

import { Hono } from 'hono';
import type { KVNamespace, DurableObjectNamespace } from '@cloudflare/workers-types';
import type { Env as SharedEnv } from '@authrim/ar-lib-core';
import {
  authenticateCheckApiRequest,
  isOperationAllowed,
  type CheckAuthContext,
} from '../middleware/check-auth';

// =============================================================================
// Types
// =============================================================================

interface Env extends SharedEnv {
  /** Internal API secret for service-to-service auth */
  POLICY_API_SECRET: string;
  /** KV namespace for Check API caching */
  CHECK_CACHE_KV?: KVNamespace;
  /** PermissionChangeHub Durable Object binding */
  PERMISSION_CHANGE_HUB?: DurableObjectNamespace;
  /** Default tenant ID */
  DEFAULT_TENANT_ID?: string;
  /** Feature flag: Enable Check API */
  ENABLE_CHECK_API?: string;
  /** Feature flag: Enable WebSocket Push */
  CHECK_API_WEBSOCKET_ENABLED?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if Check API feature is enabled
 */
function isCheckApiEnabled(env: Env): boolean {
  return env.ENABLE_CHECK_API === 'true';
}

/**
 * Check if WebSocket Push feature is enabled
 */
function isWebSocketEnabled(env: Env): boolean {
  return env.CHECK_API_WEBSOCKET_ENABLED === 'true';
}

// =============================================================================
// Routes
// =============================================================================

const subscribeRoutes = new Hono<{ Bindings: Env }>();

/**
 * WebSocket subscription endpoint
 * GET /api/check/subscribe
 *
 * Query parameters:
 * - token: Bearer token (API Key or Access Token)
 * - tenant_id: Optional tenant ID override
 *
 * Example:
 * wss://example.com/api/check/subscribe?token=chk_xxxx&tenant_id=default
 */
subscribeRoutes.get('/subscribe', async (c) => {
  // Check if Check API is enabled
  if (!isCheckApiEnabled(c.env)) {
    return c.json(
      {
        error: 'feature_disabled',
        error_description: 'Check API is not enabled',
      },
      503
    );
  }

  // Check if WebSocket Push is enabled
  if (!isWebSocketEnabled(c.env)) {
    return c.json(
      {
        error: 'feature_disabled',
        error_description:
          'WebSocket Push is not enabled. Set CHECK_API_WEBSOCKET_ENABLED=true to enable.',
      },
      503
    );
  }

  // Check if PermissionChangeHub DO is available
  if (!c.env.PERMISSION_CHANGE_HUB) {
    return c.json(
      {
        error: 'not_configured',
        error_description: 'PermissionChangeHub Durable Object not configured',
      },
      503
    );
  }

  // Check for WebSocket upgrade request
  const upgradeHeader = c.req.header('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return c.json(
      {
        error: 'invalid_request',
        error_description:
          'WebSocket upgrade required. This endpoint only accepts WebSocket connections.',
      },
      426
    );
  }

  // Get token from query parameter (WebSocket can't send custom headers during upgrade)
  const token = c.req.query('token');
  if (!token) {
    return c.json(
      {
        error: 'unauthorized',
        error_description: 'Token is required as query parameter',
      },
      401
    );
  }

  // Authenticate using the token
  const authContext: CheckAuthContext = {
    db: c.env.DB,
    cache: c.env.CHECK_CACHE_KV,
    policyApiSecret: c.env.POLICY_API_SECRET,
    defaultTenantId: c.env.DEFAULT_TENANT_ID,
  };

  const auth = await authenticateCheckApiRequest(`Bearer ${token}`, authContext);

  if (!auth.authenticated) {
    return c.json(
      {
        error: auth.error || 'unauthorized',
        error_description: auth.errorDescription || 'Authentication failed',
      },
      (auth.statusCode || 401) as 400 | 401 | 403 | 500
    );
  }

  // Check if subscribe operation is allowed
  if (!isOperationAllowed(auth, 'subscribe')) {
    return c.json(
      {
        error: 'forbidden',
        error_description: 'API key does not have permission for subscribe operation',
      },
      403
    );
  }

  // Get tenant ID from auth context or query param
  const tenantId =
    c.req.query('tenant_id') || auth.tenantId || c.env.DEFAULT_TENANT_ID || 'default';

  try {
    // Get the PermissionChangeHub DO for this tenant
    const hubId = c.env.PERMISSION_CHANGE_HUB.idFromName(tenantId);
    const hub = c.env.PERMISSION_CHANGE_HUB.get(hubId);

    // Ensure the hub is set up with the tenant ID
    await hub.fetch('https://internal/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId }),
    });

    // Forward the WebSocket upgrade request to the DO
    // The DO will handle the WebSocket connection
    const url = new URL(c.req.url);
    url.pathname = '/websocket';

    return hub.fetch(
      new Request(url.toString(), {
        headers: c.req.raw.headers,
      })
    );
  } catch (error) {
    console.error('[Subscribe] WebSocket upgrade error:', error);
    return c.json(
      {
        error: 'server_error',
        error_description: 'Failed to establish WebSocket connection',
      },
      500
    );
  }
});

/**
 * Get subscription hub stats
 * GET /api/check/subscribe/stats
 */
subscribeRoutes.get('/subscribe/stats', async (c) => {
  // Check if Check API is enabled
  if (!isCheckApiEnabled(c.env)) {
    return c.json(
      {
        error: 'feature_disabled',
        error_description: 'Check API is not enabled',
      },
      503
    );
  }

  // Authentication
  const auth = await authenticateCheckApiRequest(c.req.header('Authorization'), {
    db: c.env.DB,
    cache: c.env.CHECK_CACHE_KV,
    policyApiSecret: c.env.POLICY_API_SECRET,
    defaultTenantId: c.env.DEFAULT_TENANT_ID,
  });

  if (!auth.authenticated) {
    return c.json(
      {
        error: auth.error || 'unauthorized',
        error_description: auth.errorDescription || 'Authentication failed',
      },
      (auth.statusCode || 401) as 400 | 401 | 403 | 500
    );
  }

  // Check if PermissionChangeHub DO is available
  if (!c.env.PERMISSION_CHANGE_HUB) {
    return c.json(
      {
        error: 'not_configured',
        error_description: 'PermissionChangeHub Durable Object not configured',
      },
      503
    );
  }

  const tenantId =
    c.req.query('tenant_id') || auth.tenantId || c.env.DEFAULT_TENANT_ID || 'default';

  try {
    const hubId = c.env.PERMISSION_CHANGE_HUB.idFromName(tenantId);
    const hub = c.env.PERMISSION_CHANGE_HUB.get(hubId);

    const response = await hub.fetch('https://internal/stats', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Hub returned ${response.status}`);
    }

    const stats = (await response.json()) as Record<string, unknown>;
    return c.json({
      tenant_id: tenantId,
      websocket_enabled: isWebSocketEnabled(c.env),
      ...stats,
    });
  } catch (error) {
    console.error('[Subscribe] Stats error:', error);
    return c.json(
      {
        error: 'server_error',
        error_description: 'Failed to get subscription stats',
      },
      500
    );
  }
});

export { subscribeRoutes };
