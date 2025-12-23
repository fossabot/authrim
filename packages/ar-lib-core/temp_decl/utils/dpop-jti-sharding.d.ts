/**
 * DPoP JTI Sharding Helper (Region Sharding Version)
 *
 * Provides utilities for generating region-sharded DPoP JTI IDs and routing
 * JTI operations to the correct Durable Object shard with locationHint.
 *
 * JTI ID format: g{gen}:{region}:{shard}:dpp_{jti}
 * DO instance name: {tenantId}:{region}:dpp:{shard}
 *
 * Sharding Strategy:
 * - Uses FNV-1a hash of `client_id` as shard key
 * - Colocates JTI checks for the same client for better caching
 * - Region-aware placement using locationHint
 *
 * TTL Strategy:
 * - TTL = min(access_token_exp - now, serverMaxAccessTokenTTL) + 5min skew
 * - Hard Cap: 1 hour maximum (DO storage stability)
 *
 * Security Considerations:
 * - JTI single-use enforcement is per-DO instance (atomic)
 * - ID format embeds shard info for self-routing (no external lookup)
 * - Generation-based versioning for configuration changes
 *
 * @see docs/architecture/durable-objects-sharding.md
 */
import type { Env } from '../types/env';
import type { DurableObjectStub } from '@cloudflare/workers-types';
import { type ParsedRegionId, type ShardResolution } from './region-sharding';
/**
 * Type alias for DPoPJTIStore stub
 * Uses generic stub type since DPoPJTIStore uses fetch() pattern
 */
type DPoPJTIStoreStub = DurableObjectStub;
/**
 * DPoP JTI TTL constants
 */
export declare const DPOP_JTI_SKEW_SECONDS: number;
export declare const DPOP_JTI_HARD_CAP_SECONDS: number;
export declare const DPOP_JTI_DEFAULT_TTL_SECONDS: number;
/**
 * Calculate DPoP JTI TTL based on access token expiration.
 *
 * Formula: min(access_token_exp - now, serverMaxTTL) + skew
 * Hard Cap: 1 hour maximum
 *
 * @param accessTokenExpSeconds - Access token expiration in seconds from now
 * @param serverMaxTTLSeconds - Server's maximum access token TTL (optional)
 * @returns TTL in seconds for the JTI entry
 *
 * @example
 * const ttl = calculateDPoPJTITTL(3600); // 1 hour token
 * // => 3900 (1 hour + 5 min skew, capped at 1 hour = 3600)
 */
export declare function calculateDPoPJTITTL(
  accessTokenExpSeconds: number,
  serverMaxTTLSeconds?: number
): number;
/**
 * Generate a new region-sharded DPoP JTI ID.
 *
 * Uses FNV-1a hash of client_id to determine shard.
 * This colocates JTI checks for the same client for better performance.
 *
 * @param env - Environment with KV binding
 * @param tenantId - Tenant ID
 * @param clientId - Client identifier (for sharding)
 * @param jti - JTI value from DPoP proof
 * @returns Object containing jtiId, shardIndex, regionKey, generation
 *
 * @example
 * const { jtiId, shardIndex, regionKey } = await generateDPoPJTIId(
 *   env, 'tenant1', 'client123', 'abc-def-ghi'
 * );
 * // jtiId: "g1:apac:3:dpp_abc-def-ghi"
 */
export declare function generateDPoPJTIId(
  env: Env,
  tenantId: string,
  clientId: string,
  jti: string
): Promise<{
  jtiId: string;
  shardIndex: number;
  regionKey: string;
  generation: number;
}>;
/**
 * Parse a region-sharded DPoP JTI ID to extract shard info.
 *
 * @param jtiId - Region-sharded DPoP JTI ID
 * @returns Parsed region ID with jti, or null if invalid format
 *
 * @example
 * const result = parseDPoPJTIId("g1:apac:3:dpp_abc-def-ghi");
 * // { generation: 1, regionKey: 'apac', shardIndex: 3, jti: 'abc-def-ghi' }
 */
export declare function parseDPoPJTIId(jtiId: string):
  | (ParsedRegionId & {
      jti: string;
    })
  | null;
/**
 * Get DPoPJTIStore Durable Object stub for an existing JTI ID.
 *
 * Parses the JTI ID to extract region and shard info, then routes
 * to the correct DO instance with locationHint.
 *
 * @param env - Environment with DO bindings
 * @param jtiId - Region-sharded DPoP JTI ID
 * @param tenantId - Tenant ID
 * @returns Object containing DO stub and resolution info
 * @throws Error if jtiId format is invalid
 *
 * @example
 * const { stub, resolution } = getDPoPJTIStoreById(env, "g1:apac:3:dpp_abc...");
 * const response = await stub.fetch(new Request('https://internal/check'));
 */
export declare function getDPoPJTIStoreById(
  env: Env,
  jtiId: string,
  tenantId?: string
): {
  stub: DPoPJTIStoreStub;
  resolution: ShardResolution;
  instanceName: string;
  jti: string;
};
/**
 * Get DPoPJTIStore Durable Object stub for checking/storing a new JTI.
 *
 * @param env - Environment with DO bindings
 * @param tenantId - Tenant ID
 * @param clientId - Client identifier
 * @param jti - JTI value from DPoP proof
 * @returns Object containing DO stub, jtiId, and resolution info
 *
 * @example
 * const { stub, jtiId } = await getDPoPJTIStoreForNewJTI(
 *   env, 'tenant1', 'client123', 'abc-def-ghi'
 * );
 */
export declare function getDPoPJTIStoreForNewJTI(
  env: Env,
  tenantId: string,
  clientId: string,
  jti: string
): Promise<{
  stub: DPoPJTIStoreStub;
  jtiId: string;
  resolution: ShardResolution;
  instanceName: string;
}>;
/**
 * Check and store a DPoP JTI atomically.
 *
 * This is a high-level helper that handles the full JTI check flow:
 * 1. Get the appropriate shard based on client_id
 * 2. Check if JTI already exists (replay attack prevention)
 * 3. Store JTI with calculated TTL if new
 *
 * @param env - Environment with DO bindings
 * @param tenantId - Tenant ID
 * @param clientId - Client identifier
 * @param jti - JTI value from DPoP proof
 * @param accessTokenExpSeconds - Access token expiration in seconds
 * @returns Object with isReplay flag and jtiId
 *
 * @example
 * const result = await checkAndStoreDPoPJTI(env, 'tenant1', 'client123', 'jti-value', 3600);
 * if (result.isReplay) {
 *   throw new Error('DPoP proof replay detected');
 * }
 */
export declare function checkAndStoreDPoPJTI(
  env: Env,
  tenantId: string,
  clientId: string,
  jti: string,
  accessTokenExpSeconds: number
): Promise<{
  isReplay: boolean;
  jtiId: string;
}>;
export {};
//# sourceMappingURL=dpop-jti-sharding.d.ts.map
