import type { Context } from 'hono';
import type { Env } from '@authrim/ar-lib-core';
import {
  createErrorResponse,
  AR_ERROR_CODES,
  DEFAULT_CHALLENGE_SHARD_COUNT,
} from '@authrim/ar-lib-core';

/**
 * KV key for challenge shard count configuration.
 * Matches the key used in ar-lib-core/utils/challenge-sharding.ts
 */
const CHALLENGE_SHARDS_KV_KEY = 'challenge_shards';

/**
 * GET /api/admin/settings/challenge-shards
 * Get current challenge shard count settings
 *
 * Returns:
 * - current: Active shard count (based on priority: KV > env > default)
 * - source: Where the current value comes from ('kv' | 'env' | 'default')
 * - kv_value: Value stored in KV (null if not set)
 * - env_value: Value from environment variable (null if not set)
 * - default_value: Default shard count
 */
export async function getChallengeShards(c: Context<{ Bindings: Env }>) {
  const kvValue = await c.env.AUTHRIM_CONFIG?.get(CHALLENGE_SHARDS_KV_KEY);
  const envValue = c.env.AUTHRIM_CHALLENGE_SHARDS;
  const defaultValue = DEFAULT_CHALLENGE_SHARD_COUNT.toString();

  const current = kvValue || envValue || defaultValue;

  return c.json({
    current: parseInt(current, 10),
    source: kvValue ? 'kv' : envValue ? 'env' : 'default',
    kv_value: kvValue ? parseInt(kvValue, 10) : null,
    env_value: envValue ? parseInt(envValue, 10) : null,
    default_value: DEFAULT_CHALLENGE_SHARD_COUNT,
  });
}

/**
 * PUT /api/admin/settings/challenge-shards
 * Dynamically change challenge shard count (saved to KV)
 *
 * Note: Changing shard count affects routing of new challenges.
 * Existing challenges will continue to work as they use embedded routing info.
 *
 * Request body:
 * - shards: number (1-256)
 *
 * Returns:
 * - success: boolean
 * - shards: Updated shard count
 * - note: Information about the change
 */
export async function updateChallengeShards(c: Context<{ Bindings: Env }>) {
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
  await kv.put(CHALLENGE_SHARDS_KV_KEY, shards.toString());

  return c.json({
    success: true,
    shards,
    note: 'Challenge shard count updated. Changes affect new challenges only.',
  });
}
