/**
 * Flow State Store Sharding Helper
 *
 * Provides utilities for sharding FlowStateStore Durable Objects.
 * Uses simple hash-based sharding to distribute flow sessions across multiple DO instances.
 *
 * DO instance name format: flow-{shardIndex}
 *
 * @see /private/docs/track-c-flow-engine-design.md
 */

import type { Env } from '../types/env';
import type { DurableObjectNamespace, DurableObjectStub } from '@cloudflare/workers-types';

/** Default number of flow state shards */
export const DEFAULT_FLOW_STATE_SHARDS = 32;

/** KV key for flow state shards configuration */
export const FLOW_STATE_SHARDS_KV_KEY = 'flow_state_shards';

/**
 * FNV-1a hash function for shard distribution
 *
 * @param str - String to hash
 * @returns 32-bit hash value
 */
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return hash >>> 0; // Ensure unsigned
}

/**
 * Get the number of flow state shards from configuration
 *
 * Priority: KV -> ENV -> Default
 *
 * @param env - Environment with KV binding
 * @returns Number of shards
 */
export async function getFlowStateShardCount(env: Env): Promise<number> {
  // 1. Check KV
  if (env.AUTHRIM_CONFIG) {
    try {
      const kvValue = await env.AUTHRIM_CONFIG.get(FLOW_STATE_SHARDS_KV_KEY);
      if (kvValue) {
        const parsed = parseInt(kvValue, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 256) {
          return parsed;
        }
      }
    } catch {
      // KV access failed, continue to env check
    }
  }

  // 2. Check environment variable
  if (env.AUTHRIM_FLOW_STATE_SHARDS) {
    const parsed = parseInt(env.AUTHRIM_FLOW_STATE_SHARDS, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 256) {
      return parsed;
    }
  }

  // 3. Return default
  return DEFAULT_FLOW_STATE_SHARDS;
}

/**
 * Calculate shard index for a session ID
 *
 * @param sessionId - Flow session ID
 * @param shardCount - Total number of shards
 * @returns Shard index (0 to shardCount-1)
 */
export function getFlowStateShardIndex(sessionId: string, shardCount: number): number {
  const hash = fnv1aHash(sessionId);
  return hash % shardCount;
}

/**
 * Build FlowStateStore DO instance name
 *
 * @param shardIndex - Shard index
 * @returns DO instance name
 */
export function buildFlowStateInstanceName(shardIndex: number): string {
  return `flow-${shardIndex}`;
}

/**
 * Get FlowStateStore Durable Object stub for a session ID
 *
 * @param env - Environment with FLOW_STATE_STORE binding
 * @param sessionId - Flow session ID
 * @returns Object containing DO stub, shard index, and instance name
 */
export async function getFlowStateStoreStub(
  env: Env,
  sessionId: string
): Promise<{
  stub: DurableObjectStub;
  shardIndex: number;
  instanceName: string;
}> {
  if (!env.FLOW_STATE_STORE) {
    throw new Error('FLOW_STATE_STORE binding not configured');
  }

  const shardCount = await getFlowStateShardCount(env);
  const shardIndex = getFlowStateShardIndex(sessionId, shardCount);
  const instanceName = buildFlowStateInstanceName(shardIndex);

  const doId = (env.FLOW_STATE_STORE as DurableObjectNamespace).idFromName(instanceName);
  const stub = (env.FLOW_STATE_STORE as DurableObjectNamespace).get(doId);

  return { stub, shardIndex, instanceName };
}

/**
 * Generate a new flow session ID
 *
 * Format: flow_{uuid}
 *
 * @returns New session ID
 */
export function generateFlowSessionId(): string {
  return `flow_${crypto.randomUUID()}`;
}
