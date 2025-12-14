/**
 * TokenRevocationStore Sharding Helper
 *
 * Provides utilities for routing TokenRevocationStore operations to sharded
 * Durable Object instances based on JTI (JWT ID).
 *
 * DO instance name: tenant:default:token-revocation:shard-{shardIndex}
 *
 * Sharding Strategy:
 * - JTI-based sharding: fnv1a32(jti) % shardCount
 * - Same JTI always routes to same shard (consistent lookup)
 * - Distributes revocation checks across multiple DO instances
 *
 * Configuration:
 * - KV: AUTHRIM_CONFIG namespace, key: "revocation_shards"
 * - Environment variable: AUTHRIM_REVOCATION_SHARDS
 * - Default: 4 shards
 */

import type { Env } from '../types/env';
import { fnv1a32, DEFAULT_TENANT_ID } from './tenant-context';

/**
 * Default shard count for token revocation store sharding.
 * Can be overridden via KV or AUTHRIM_REVOCATION_SHARDS environment variable.
 */
export const DEFAULT_REVOCATION_SHARD_COUNT = 4;

/**
 * Cache TTL for shard count (10 seconds).
 * Matches other sharding utilities for consistency.
 */
const CACHE_TTL_MS = 10_000;

/**
 * Cached revocation shard count to avoid repeated KV lookups.
 */
let cachedRevocationShardCount: number | null = null;
let cachedRevocationShardAt = 0;

/**
 * Get current revocation shard count from KV or environment variable.
 *
 * Priority:
 * 1. KV (AUTHRIM_CONFIG namespace, key: "revocation_shards")
 * 2. Environment variable (AUTHRIM_REVOCATION_SHARDS)
 * 3. Default (DEFAULT_REVOCATION_SHARD_COUNT = 4)
 *
 * @param env - Environment object with KV and variables
 * @returns Current revocation shard count
 */
async function getCurrentRevocationShardCount(env: Env): Promise<number> {
  // KV takes priority (allows dynamic changes without deployment)
  if (env.AUTHRIM_CONFIG) {
    const kvValue = await env.AUTHRIM_CONFIG.get('revocation_shards');
    if (kvValue) {
      const parsed = parseInt(kvValue, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  // Fallback to environment variable
  if (env.AUTHRIM_REVOCATION_SHARDS) {
    const parsed = parseInt(env.AUTHRIM_REVOCATION_SHARDS, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Default value
  return DEFAULT_REVOCATION_SHARD_COUNT;
}

/**
 * Get revocation shard count with caching.
 *
 * Caches the result for 10 seconds to minimize KV overhead.
 *
 * @param env - Environment object
 * @returns Current revocation shard count
 */
export async function getRevocationShardCount(env: Env): Promise<number> {
  const now = Date.now();

  // Return cached value if within TTL
  if (cachedRevocationShardCount !== null && now - cachedRevocationShardAt < CACHE_TTL_MS) {
    return cachedRevocationShardCount;
  }

  // Fetch fresh value
  const count = await getCurrentRevocationShardCount(env);

  // Update cache
  cachedRevocationShardCount = count;
  cachedRevocationShardAt = now;

  return count;
}

/**
 * Calculate shard index from JTI (JWT ID).
 *
 * @param jti - JWT ID
 * @param shardCount - Number of shards
 * @returns Shard index (0 to shardCount - 1)
 */
export function getRevocationShardIndex(jti: string, shardCount: number): number {
  return fnv1a32(jti) % shardCount;
}

/**
 * Build a sharded Durable Object instance name for token revocation.
 *
 * @param shardIndex - Shard index
 * @returns DO instance name for the shard
 *
 * @example
 * buildRevocationShardInstanceName(2)
 * // => "tenant:default:token-revocation:shard-2"
 */
export function buildRevocationShardInstanceName(shardIndex: number): string {
  return `tenant:${DEFAULT_TENANT_ID}:token-revocation:shard-${shardIndex}`;
}

/**
 * Get TokenRevocationStore Durable Object stub for a JTI.
 *
 * Routes to the appropriate shard based on the JTI hash.
 *
 * @param env - Environment object with DO bindings
 * @param jti - JWT ID for sharding
 * @returns Promise containing DO stub and shard info
 */
export async function getRevocationStoreByJti(
  env: Env,
  jti: string
): Promise<{ stub: DurableObjectStub; shardIndex: number; instanceName: string }> {
  const shardCount = await getRevocationShardCount(env);
  const shardIndex = getRevocationShardIndex(jti, shardCount);
  const instanceName = buildRevocationShardInstanceName(shardIndex);

  const id = env.TOKEN_REVOCATION_STORE.idFromName(instanceName);
  const stub = env.TOKEN_REVOCATION_STORE.get(id);

  return { stub, shardIndex, instanceName };
}

/**
 * Reset the cached shard count.
 * Useful for testing or when immediate configuration reload is needed.
 */
export function resetRevocationShardCountCache(): void {
  cachedRevocationShardCount = null;
  cachedRevocationShardAt = 0;
}

/**
 * Get all shard instance names for iteration/health checks.
 *
 * @param shardCount - Number of shards
 * @returns Array of shard instance names
 */
export function getAllRevocationShardNames(shardCount: number): string[] {
  return Array.from({ length: shardCount }, (_, i) => buildRevocationShardInstanceName(i));
}
