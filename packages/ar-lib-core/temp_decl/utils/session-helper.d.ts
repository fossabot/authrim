/**
 * Session Store Sharding Helper (Region Sharding Version)
 *
 * Provides utilities for generating region-sharded session IDs and routing
 * session operations to the correct Durable Object shard with locationHint.
 *
 * Session ID format: g{gen}:{region}:{shard}:session_{uuid}
 * DO instance name: {tenantId}:{region}:s:{shard}
 *
 * IMPORTANT:
 * - generateRegionShardedSessionId() uses region shard config to determine shard and region
 * - parseRegionShardedSessionId() extracts generation, region, and shard from the ID
 * - locationHint is used to place DO instances closer to users in specific regions
 */
import type { Env } from '../types/env';
import type { DurableObjectStub } from '@cloudflare/workers-types';
import type { SessionStore } from '../durable-objects/SessionStore';
import { type ParsedRegionId, type ShardResolution } from './region-sharding';
/**
 * Type alias for SessionStore stub returned from region-aware functions
 */
type SessionStoreStub = DurableObjectStub<SessionStore>;
/**
 * Generate a new region-sharded session ID.
 *
 * Uses FNV-1a hash of the random ID to determine which shard the session belongs to,
 * then resolves the region from the shard index using the region shard config.
 *
 * Security: Uses 128 bits of cryptographically secure random data (base64url encoded)
 * instead of UUID v4 (which has only 122 bits). This meets OWASP recommendations
 * for session identifier entropy.
 *
 * @param env - Environment with KV binding for region shard config
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Object containing sessionId, shardIndex, regionKey, generation, and randomPart
 *
 * @example
 * const { sessionId, shardIndex, regionKey, generation } = await generateRegionShardedSessionId(env);
 * // sessionId: "g1:apac:3:session_X7g9_kPq2Lm4Rn8sT1wZ-A"
 * // shardIndex: 3
 * // regionKey: "apac"
 * // generation: 1
 */
export declare function generateRegionShardedSessionId(
  env: Env,
  tenantId?: string
): Promise<{
  sessionId: string;
  shardIndex: number;
  regionKey: string;
  generation: number;
  randomPart: string;
}>;
/**
 * Parse a region-sharded session ID to extract shard info.
 *
 * @param sessionId - Region-sharded session ID (format: g{gen}:{region}:{shard}:session_{uuid})
 * @returns Parsed region ID or null if invalid format
 *
 * @example
 * const result = parseRegionShardedSessionId("g1:apac:3:session_abc123");
 * // { generation: 1, regionKey: 'apac', shardIndex: 3, randomPart: 'session_abc123' }
 *
 * const invalid = parseRegionShardedSessionId("invalid-session-id");
 * // null
 */
export declare function parseRegionShardedSessionId(sessionId: string): ParsedRegionId | null;
/**
 * Get SessionStore Durable Object stub for an existing session ID.
 *
 * Parses the session ID to extract the region and shard info, then routes to
 * the correct DO instance with locationHint for optimal placement.
 *
 * @param env - Environment object with DO bindings
 * @param sessionId - Region-sharded session ID
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Object containing DO stub and resolution info
 * @throws Error if sessionId format is invalid
 *
 * @example
 * const { stub, resolution } = getSessionStoreBySessionId(env, "g1:apac:3:session_abc123");
 * const response = await stub.fetch(new Request(...));
 */
export declare function getSessionStoreBySessionId(
  env: Env,
  sessionId: string,
  tenantId?: string
): {
  stub: SessionStoreStub;
  resolution: ShardResolution;
  instanceName: string;
};
/**
 * Get SessionStore Durable Object stub and generate a new session ID.
 *
 * This is the entry point for creating new sessions. It:
 * 1. Gets the region shard config from KV
 * 2. Generates a new region-sharded session ID
 * 3. Returns the DO stub with locationHint for the target region
 *
 * @param env - Environment object with DO bindings
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Object containing DO stub, new sessionId, and resolution info
 *
 * @example
 * const { stub, sessionId, resolution } = await getSessionStoreForNewSession(env);
 * const response = await stub.fetch(new Request(..., {
 *   body: JSON.stringify({ sessionId, ... })
 * }));
 */
export declare function getSessionStoreForNewSession(
  env: Env,
  tenantId?: string
): Promise<{
  stub: SessionStoreStub;
  sessionId: string;
  resolution: ShardResolution;
  instanceName: string;
}>;
/**
 * Check if a session ID is in the region-sharded format.
 *
 * @param sessionId - Session ID to check
 * @returns true if the session ID follows the region-sharded format
 */
export declare function isRegionShardedSessionId(sessionId: string): boolean;
/**
 * Extract the random part from a region-sharded session ID.
 *
 * @param sessionId - Region-sharded session ID
 * @returns Random part string (base64url) or null if invalid format
 */
export declare function extractSessionRandomPart(sessionId: string): string | null;
/**
 * @deprecated Use extractSessionRandomPart instead
 * Extract UUID from a region-sharded session ID.
 */
export declare function extractSessionUuid(sessionId: string): string | null;
/**
 * @deprecated Use isRegionShardedSessionId instead
 */
export declare const isShardedSessionId: typeof isRegionShardedSessionId;
/**
 * @deprecated Use parseRegionShardedSessionId instead
 */
export declare const parseShardedSessionId: typeof parseRegionShardedSessionId;
export {};
//# sourceMappingURL=session-helper.d.ts.map
