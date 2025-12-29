/**
 * Webhook Configuration Admin API
 *
 * POST   /api/admin/webhooks        - Register a new webhook
 * GET    /api/admin/webhooks        - List all webhooks
 * GET    /api/admin/webhooks/:id    - Get a specific webhook
 * PUT    /api/admin/webhooks/:id    - Update a webhook
 * DELETE /api/admin/webhooks/:id    - Delete a webhook
 *
 * Security:
 * - RBAC: tenant_admin or higher required
 * - Rate limit: lenient profile
 * - Audit logging for all mutations
 *
 * @packageDocumentation
 */

import type { Context } from 'hono';
import type { Env } from '@authrim/ar-lib-core';
import {
  D1Adapter,
  createWebhookRegistry,
  validateEventPattern,
  createAuditLogFromContext,
  getTenantIdFromContext,
  encryptValue,
  type WebhookConfigWithScope,
} from '@authrim/ar-lib-core';

/**
 * Webhook retry policy configuration (matching types/events/webhook.ts)
 *
 * Note: Defined locally to avoid conflict with types/contracts/events.ts
 * which uses different property names (backoffMs vs initialDelayMs).
 */
interface WebhookRetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

/**
 * Input for creating a webhook (from ar-lib-core types)
 */
interface WebhookCreateInput {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: WebhookRetryPolicy;
  timeoutMs?: number;
  clientId?: string;
}

/**
 * Input for updating a webhook (from ar-lib-core types)
 */
interface WebhookUpdateInput {
  name?: string;
  url?: string;
  events?: string[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: Partial<WebhookRetryPolicy>;
  timeoutMs?: number;
  active?: boolean;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Request body for creating a webhook
 */
interface CreateWebhookRequest {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffMultiplier?: number;
    maxDelayMs?: number;
  };
  timeoutMs?: number;
  clientId?: string;
}

/**
 * Request body for updating a webhook
 */
interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  events?: string[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    initialDelayMs?: number;
    backoffMultiplier?: number;
    maxDelayMs?: number;
  };
  timeoutMs?: number;
  active?: boolean;
}

/**
 * Query parameters for listing webhooks
 */
interface ListWebhooksQuery {
  scope?: 'tenant' | 'client';
  clientId?: string;
  activeOnly?: string;
  limit?: string;
  offset?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create WebhookRegistry from context
 */
function createRegistry(c: Context<{ Bindings: Env }>) {
  const adapter = new D1Adapter({ db: c.env.DB });
  return createWebhookRegistry({
    adapter,
    encryptSecret: async (plaintext) => {
      const piiKey = c.env.PII_ENCRYPTION_KEY;
      if (piiKey) {
        const result = await encryptValue(plaintext, piiKey, 'AES-256-GCM', 1);
        return result.encrypted;
      }
      // Development fallback: base64 encoding (WARNING logged)
      console.warn('[Webhook] PII_ENCRYPTION_KEY not set, using base64 fallback');
      return Buffer.from(plaintext).toString('base64');
    },
    allowLocalhostHttp: c.env.ENVIRONMENT === 'development',
    maxEventPatterns: 50,
  });
}

/**
 * Validate create webhook request
 */
function validateCreateRequest(body: CreateWebhookRequest): { valid: boolean; error?: string } {
  if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
    return { valid: false, error: 'name is required and must be a non-empty string' };
  }

  if (!body.url || typeof body.url !== 'string') {
    return { valid: false, error: 'url is required and must be a string' };
  }

  if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
    return { valid: false, error: 'events is required and must be a non-empty array' };
  }

  // Validate each event pattern
  for (const pattern of body.events) {
    const result = validateEventPattern(pattern);
    if (!result.valid) {
      return { valid: false, error: `Invalid event pattern '${pattern}': ${result.error}` };
    }
  }

  // Validate optional fields
  if (body.timeoutMs !== undefined) {
    if (typeof body.timeoutMs !== 'number' || body.timeoutMs < 1000 || body.timeoutMs > 60000) {
      return { valid: false, error: 'timeoutMs must be a number between 1000 and 60000' };
    }
  }

  if (body.retryPolicy) {
    if (
      body.retryPolicy.maxRetries !== undefined &&
      (typeof body.retryPolicy.maxRetries !== 'number' ||
        body.retryPolicy.maxRetries < 0 ||
        body.retryPolicy.maxRetries > 10)
    ) {
      return { valid: false, error: 'retryPolicy.maxRetries must be between 0 and 10' };
    }
  }

  return { valid: true };
}

/**
 * Format webhook for API response (exclude encrypted secret)
 */
function formatWebhookResponse(webhook: WebhookConfigWithScope) {
  return {
    id: webhook.id,
    tenantId: webhook.tenantId,
    clientId: webhook.clientId,
    scope: webhook.scope,
    name: webhook.name,
    url: webhook.url,
    events: webhook.events,
    hasSecret: !!webhook.secretEncrypted,
    headers: webhook.headers,
    retryPolicy: webhook.retryPolicy,
    timeoutMs: webhook.timeoutMs,
    active: webhook.active,
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
    lastSuccessAt: webhook.lastSuccessAt,
    lastFailureAt: webhook.lastFailureAt,
  };
}

// =============================================================================
// Handlers
// =============================================================================

/**
 * POST /api/admin/webhooks
 * Register a new webhook
 */
export async function createWebhook(c: Context<{ Bindings: Env }>) {
  const tenantId = getTenantIdFromContext(c);

  let body: CreateWebhookRequest;
  try {
    body = await c.req.json<CreateWebhookRequest>();
  } catch {
    return c.json({ error: 'invalid_request', error_description: 'Invalid JSON body' }, 400);
  }

  // Validate request
  const validation = validateCreateRequest(body);
  if (!validation.valid) {
    return c.json({ error: 'invalid_request', error_description: validation.error }, 400);
  }

  try {
    const registry = createRegistry(c);

    // Create input with proper retry policy mapping
    const input: WebhookCreateInput = {
      name: body.name,
      url: body.url,
      events: body.events,
      secret: body.secret,
      headers: body.headers,
      timeoutMs: body.timeoutMs,
      clientId: body.clientId,
    };

    // Map retryPolicy to the expected format
    if (body.retryPolicy) {
      input.retryPolicy = {
        maxRetries: body.retryPolicy.maxRetries ?? 3,
        initialDelayMs: body.retryPolicy.initialDelayMs ?? 1000,
        backoffMultiplier: body.retryPolicy.backoffMultiplier ?? 2,
        maxDelayMs: body.retryPolicy.maxDelayMs ?? 60000,
      };
    }

    const webhookId = await registry.register(tenantId, input);

    // Audit log
    await createAuditLogFromContext(c, 'webhook.created', 'webhook', webhookId, {
      name: body.name,
      url: body.url,
      events: body.events,
      scope: body.clientId ? 'client' : 'tenant',
    });

    // Fetch created webhook for response
    const webhook = await registry.get(tenantId, webhookId);

    return c.json(
      {
        success: true,
        webhook: webhook ? formatWebhookResponse(webhook) : { id: webhookId },
      },
      201
    );
  } catch (error) {
    console.error('[Webhook API] Create error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create webhook';
    return c.json({ error: 'server_error', error_description: message }, 500);
  }
}

/**
 * GET /api/admin/webhooks
 * List all webhooks for tenant
 */
export async function listWebhooks(c: Context<{ Bindings: Env }>) {
  const tenantId = getTenantIdFromContext(c);
  const query = c.req.query() as ListWebhooksQuery;

  try {
    const registry = createRegistry(c);

    const webhooks = await registry.list(tenantId, {
      scope: query.scope,
      clientId: query.clientId,
      activeOnly: query.activeOnly === 'true',
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });

    return c.json({
      webhooks: webhooks.map(formatWebhookResponse),
      total: webhooks.length,
    });
  } catch (error) {
    console.error('[Webhook API] List error:', error);
    return c.json({ error: 'server_error', error_description: 'Failed to list webhooks' }, 500);
  }
}

/**
 * GET /api/admin/webhooks/:id
 * Get a specific webhook
 */
export async function getWebhook(c: Context<{ Bindings: Env }>) {
  const tenantId = getTenantIdFromContext(c);
  const webhookId = c.req.param('id');

  try {
    const registry = createRegistry(c);
    const webhook = await registry.get(tenantId, webhookId);

    if (!webhook) {
      return c.json({ error: 'not_found', error_description: 'Webhook not found' }, 404);
    }

    return c.json({ webhook: formatWebhookResponse(webhook) });
  } catch (error) {
    console.error('[Webhook API] Get error:', error);
    return c.json({ error: 'server_error', error_description: 'Failed to get webhook' }, 500);
  }
}

/**
 * PUT /api/admin/webhooks/:id
 * Update a webhook
 */
export async function updateWebhook(c: Context<{ Bindings: Env }>) {
  const tenantId = getTenantIdFromContext(c);
  const webhookId = c.req.param('id');

  let body: UpdateWebhookRequest;
  try {
    body = await c.req.json<UpdateWebhookRequest>();
  } catch {
    return c.json({ error: 'invalid_request', error_description: 'Invalid JSON body' }, 400);
  }

  // Validate event patterns if provided
  if (body.events) {
    for (const pattern of body.events) {
      const result = validateEventPattern(pattern);
      if (!result.valid) {
        return c.json(
          {
            error: 'invalid_request',
            error_description: `Invalid event pattern '${pattern}': ${result.error}`,
          },
          400
        );
      }
    }
  }

  try {
    const registry = createRegistry(c);

    // Check if exists
    const existing = await registry.get(tenantId, webhookId);
    if (!existing) {
      return c.json({ error: 'not_found', error_description: 'Webhook not found' }, 404);
    }

    // Map to WebhookUpdateInput
    const input: WebhookUpdateInput = {
      name: body.name,
      url: body.url,
      events: body.events,
      secret: body.secret,
      headers: body.headers,
      timeoutMs: body.timeoutMs,
      active: body.active,
    };

    if (body.retryPolicy) {
      input.retryPolicy = {
        maxRetries: body.retryPolicy.maxRetries,
        initialDelayMs: body.retryPolicy.initialDelayMs,
        backoffMultiplier: body.retryPolicy.backoffMultiplier,
        maxDelayMs: body.retryPolicy.maxDelayMs,
      };
    }

    await registry.update(tenantId, webhookId, input);

    // Audit log
    await createAuditLogFromContext(c, 'webhook.updated', 'webhook', webhookId, {
      updated_fields: Object.keys(body),
    });

    // Fetch updated webhook
    const webhook = await registry.get(tenantId, webhookId);

    return c.json({
      success: true,
      webhook: webhook ? formatWebhookResponse(webhook) : null,
    });
  } catch (error) {
    console.error('[Webhook API] Update error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update webhook';
    return c.json({ error: 'server_error', error_description: message }, 500);
  }
}

/**
 * DELETE /api/admin/webhooks/:id
 * Delete a webhook
 */
export async function deleteWebhook(c: Context<{ Bindings: Env }>) {
  const tenantId = getTenantIdFromContext(c);
  const webhookId = c.req.param('id');

  try {
    const registry = createRegistry(c);

    // Check if exists
    const existing = await registry.get(tenantId, webhookId);
    if (!existing) {
      return c.json({ error: 'not_found', error_description: 'Webhook not found' }, 404);
    }

    await registry.remove(tenantId, webhookId);

    // Audit log (warning level for deletion)
    await createAuditLogFromContext(
      c,
      'webhook.deleted',
      'webhook',
      webhookId,
      {
        name: existing.name,
        url: existing.url,
      },
      'warning'
    );

    return c.json({ success: true, deleted: webhookId });
  } catch (error) {
    console.error('[Webhook API] Delete error:', error);
    return c.json({ error: 'server_error', error_description: 'Failed to delete webhook' }, 500);
  }
}
