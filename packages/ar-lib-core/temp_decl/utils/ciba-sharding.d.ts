/**
 * CIBA (Client-Initiated Backchannel Authentication) Sharding Helper
 *
 * Provides utilities for generating region-sharded CIBA auth request IDs and routing
 * CIBA operations to the correct Durable Object shard with locationHint.
 *
 * Auth Request ID format: g{gen}:{region}:{shard}:cba_{auth_req_id}
 * DO instance name: {tenantId}:{region}:cba:{shard}
 *
 * Sharding Strategy:
 * - Uses FNV-1a hash of `client_id` as shard key
 * - Colocates CIBA requests from the same client for better caching
 * - Region-aware placement using locationHint
 *
 * Security Considerations:
 * - Auth request single-use enforcement is per-DO instance (atomic)
 * - Polling is rate-limited per shard
 * - ID format embeds shard info for self-routing (no external lookup)
 * - Generation-based versioning for configuration changes
 *
 * @see docs/architecture/durable-objects-sharding.md
 * @see OpenID Connect CIBA Core 1.0
 */
import type { Env } from '../types/env';
import type { DurableObjectStub } from '@cloudflare/workers-types';
import { type ParsedRegionId, type ShardResolution } from './region-sharding';
/**
 * Type alias for CIBARequestStore stub
 * Uses generic stub type since CIBARequestStore uses fetch() pattern
 */
type CIBARequestStoreStub = DurableObjectStub;
/**
 * Default CIBA request TTL (300 seconds = 5 minutes)
 */
export declare const CIBA_DEFAULT_TTL_SECONDS = 300;
/**
 * Default CIBA polling interval (5 seconds as per CIBA spec)
 */
export declare const CIBA_DEFAULT_INTERVAL_SECONDS = 5;
/**
 * Generate a new region-sharded CIBA auth request ID.
 *
 * Uses FNV-1a hash of client_id to determine shard.
 * This colocates CIBA requests from the same client for better performance.
 *
 * @param env - Environment with KV binding
 * @param tenantId - Tenant ID
 * @param clientId - Client identifier (for sharding)
 * @param authReqId - The authentication request ID
 * @returns Object containing cibaId, shardIndex, regionKey, generation
 *
 * @example
 * const { cibaId, shardIndex } = await generateCIBARequestId(
 *   env, 'tenant1', 'client123', 'G0JN-MDG2-WxhC-RMsE'
 * );
 * // cibaId: "g1:apac:3:cba_G0JN-MDG2-WxhC-RMsE"
 */
export declare function generateCIBARequestId(
  env: Env,
  tenantId: string,
  clientId: string,
  authReqId: string
): Promise<{
  cibaId: string;
  shardIndex: number;
  regionKey: string;
  generation: number;
}>;
/**
 * Parse a region-sharded CIBA request ID to extract shard info.
 *
 * @param cibaId - Region-sharded CIBA request ID
 * @returns Parsed region ID with authReqId, or null if invalid format
 *
 * @example
 * const result = parseCIBARequestId("g1:apac:3:cba_G0JN-MDG2-WxhC-RMsE");
 * // { generation: 1, regionKey: 'apac', shardIndex: 3, authReqId: 'G0JN-MDG2-WxhC-RMsE' }
 */
export declare function parseCIBARequestId(cibaId: string):
  | (ParsedRegionId & {
      authReqId: string;
    })
  | null;
/**
 * Get CIBARequestStore Durable Object stub for an existing CIBA request ID.
 *
 * Parses the CIBA ID to extract region and shard info, then routes
 * to the correct DO instance with locationHint.
 *
 * @param env - Environment with DO bindings
 * @param cibaId - Region-sharded CIBA request ID
 * @param tenantId - Tenant ID
 * @returns Object containing DO stub and resolution info
 * @throws Error if cibaId format is invalid
 *
 * @example
 * const { stub, resolution } = getCIBARequestStoreById(env, "g1:apac:3:cba_abc...");
 * const response = await stub.fetch(new Request('https://internal/poll'));
 */
export declare function getCIBARequestStoreById(
  env: Env,
  cibaId: string,
  tenantId?: string
): {
  stub: CIBARequestStoreStub;
  resolution: ShardResolution;
  instanceName: string;
  authReqId: string;
};
/**
 * Get CIBARequestStore Durable Object stub for creating a new CIBA request.
 *
 * @param env - Environment with DO bindings
 * @param tenantId - Tenant ID
 * @param clientId - Client identifier
 * @param authReqId - The authentication request ID
 * @returns Object containing DO stub, cibaId, and resolution info
 *
 * @example
 * const { stub, cibaId } = await getCIBARequestStoreForNewRequest(
 *   env, 'tenant1', 'client123', 'G0JN-MDG2-WxhC-RMsE'
 * );
 */
export declare function getCIBARequestStoreForNewRequest(
  env: Env,
  tenantId: string,
  clientId: string,
  authReqId: string
): Promise<{
  stub: CIBARequestStoreStub;
  cibaId: string;
  resolution: ShardResolution;
  instanceName: string;
}>;
export {};
//# sourceMappingURL=ciba-sharding.d.ts.map
