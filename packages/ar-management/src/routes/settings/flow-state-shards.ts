import type { Context } from 'hono';
import type { Env } from '@authrim/ar-lib-core';
import {
  createErrorResponse,
  AR_ERROR_CODES,
  DEFAULT_FLOW_STATE_SHARDS,
  FLOW_STATE_SHARDS_KV_KEY,
} from '@authrim/ar-lib-core';

/**
 * GET /api/admin/settings/flow-state-shards
 * Get current flow state shard count settings
 */
export async function getFlowStateShards(c: Context<{ Bindings: Env }>) {
  const kvValue = await c.env.AUTHRIM_CONFIG?.get(FLOW_STATE_SHARDS_KV_KEY);
  const envValue = c.env.AUTHRIM_FLOW_STATE_SHARDS;
  const defaultValue = DEFAULT_FLOW_STATE_SHARDS.toString();

  const current = kvValue || envValue || defaultValue;

  return c.json({
    current: parseInt(current, 10),
    source: kvValue ? 'kv' : envValue ? 'env' : 'default',
    kv_value: kvValue ? parseInt(kvValue, 10) : null,
    env_value: envValue ? parseInt(envValue, 10) : null,
    default_value: DEFAULT_FLOW_STATE_SHARDS,
  });
}

/**
 * PUT /api/admin/settings/flow-state-shards
 * Dynamically change shard count (saved to KV)
 *
 * Note: Changing shard count affects routing of new sessions.
 * Existing sessions will continue to work as long as they
 * have not expired (session ID contains routing info).
 */
export async function updateFlowStateShards(c: Context<{ Bindings: Env }>) {
  const kv = c.env.AUTHRIM_CONFIG;
  if (!kv) {
    return createErrorResponse(c, AR_ERROR_CODES.CONFIG_KV_NOT_CONFIGURED);
  }

  const { shards } = await c.req.json();

  // Validation (1-256 range)
  if (typeof shards !== 'number' || !Number.isInteger(shards) || shards < 1 || shards > 256) {
    return createErrorResponse(c, AR_ERROR_CODES.VALIDATION_INVALID_VALUE);
  }

  // Save to KV
  await kv.put(FLOW_STATE_SHARDS_KV_KEY, shards.toString());

  return c.json({
    success: true,
    shards,
    note: 'Flow state shard count updated. New sessions will use this value.',
  });
}
