/**
 * TokenRevocationStore Sharding Helper (Generation-Based with Region Sharding)
 *
 * Provides utilities for routing TokenRevocationStore operations to sharded
 * Durable Object instances based on JTI (JWT ID).
 *
 * Generation-Based Sharding Strategy:
 * - Region-aware JTI format: g{gen}:{region}:{shard}:{randomPart}
 * - Legacy JTI format: rv{generation}_{shardIndex}_{randomPart}
 * - Very old format: any other format (uses LEGACY_SHARD_COUNT for routing)
 * - Enables dynamic shard count and region changes without breaking existing tokens
 * - Each generation has fixed shard count, stored in KV
 * - locationHint support for DO placement optimization
 *
 * DO instance name (region-aware): {tenantId}:{region}:rv:{shardIndex}
 * DO instance name (legacy): tenant:default:token-revocation:shard-{shardIndex}
 *
 * Configuration:
 * - KV: AUTHRIM_CONFIG namespace, key: "region_shard_config:default" (for region-aware)
 * - KV: AUTHRIM_CONFIG namespace, key: "revocation_shard_config" (JSON, legacy)
 * - Fallback KV key: "revocation_shards" (simple number, for backward compat)
 * - Environment variable: AUTHRIM_REVOCATION_SHARDS
 * - Default: 16 shards
 *
 * @see region-sharding.ts for region sharding design
 * @see refresh-token-sharding.ts for design reference
 */
import type { Env } from '../types/env';
/**
 * Parsed JTI for access tokens (revocation routing).
 */
export interface ParsedRevocationJti {
  /** Generation number (0 = legacy) */
  generation: number;
  /** Shard index (null for legacy tokens) */
  shardIndex: number | null;
  /** Region key (null for legacy tokens) */
  regionKey: string | null;
  /** Random part of the JTI */
  randomPart: string;
  /** Whether this is a legacy format token */
  isLegacy: boolean;
  /** Whether this is a region-aware format token */
  isRegionAware: boolean;
}
/**
 * Shard configuration for a single generation.
 */
export interface RevocationGenerationConfig {
  generation: number;
  shardCount: number;
  deprecatedAt?: number;
}
/**
 * Full shard configuration from KV.
 */
export interface RevocationShardConfig {
  /** Current generation number */
  currentGeneration: number;
  /** Number of shards in current generation */
  currentShardCount: number;
  /** Previous generation configs (for routing existing tokens) */
  previousGenerations: RevocationGenerationConfig[];
  /** Last update timestamp (ms) */
  updatedAt: number;
  /** Who updated the config */
  updatedBy?: string;
}
/**
 * Default shard count for token revocation store sharding.
 * Can be overridden via KV or AUTHRIM_REVOCATION_SHARDS environment variable.
 */
export declare const DEFAULT_REVOCATION_SHARD_COUNT = 16;
/**
 * Legacy shard count used for tokens without generation info.
 * This should match the original default to ensure backward compatibility.
 */
export declare const LEGACY_SHARD_COUNT = 4;
/**
 * Maximum number of previous generations to keep.
 */
export declare const MAX_REVOCATION_PREVIOUS_GENERATIONS = 5;
/**
 * KV key for full shard configuration (JSON).
 */
export declare const REVOCATION_SHARD_CONFIG_KEY = 'revocation_shard_config';
/**
 * KV key for simple shard count (backward compat).
 */
export declare const REVOCATION_SHARDS_KEY = 'revocation_shards';
/**
 * Parse a JTI to extract generation, region, and shard information.
 *
 * JTI Formats:
 * - Region-aware format: g{gen}:{region}:{shard}:{randomPart}
 * - Legacy format: rv{generation}_{shardIndex}_{randomPart}
 * - Very old format: anything without prefix (uses LEGACY_SHARD_COUNT for routing)
 *
 * @param jti - JWT ID to parse
 * @returns Parsed JTI information
 *
 * @example
 * parseRevocationJti('g1:wnam:7:at_abc123')
 * // => { generation: 1, shardIndex: 7, regionKey: 'wnam', randomPart: 'at_abc123', isLegacy: false, isRegionAware: true }
 *
 * parseRevocationJti('rv1_7_at_abc123')
 * // => { generation: 1, shardIndex: 7, regionKey: null, randomPart: 'at_abc123', isLegacy: false, isRegionAware: false }
 *
 * parseRevocationJti('at_abc123')
 * // => { generation: 0, shardIndex: null, regionKey: null, randomPart: 'at_abc123', isLegacy: true, isRegionAware: false }
 */
export declare function parseRevocationJti(jti: string): ParsedRevocationJti;
/**
 * Create a region-aware JTI for access tokens (revocation-aware).
 *
 * @param generation - Generation number
 * @param regionKey - Region key
 * @param shardIndex - Shard index
 * @param randomPart - Random part (typically at_{uuid})
 * @returns Formatted JTI string
 *
 * @example
 * createRegionAwareRevocationJti(1, 'wnam', 7, 'at_abc123')
 * // => 'g1:wnam:7:at_abc123'
 */
export declare function createRegionAwareRevocationJti(
  generation: number,
  regionKey: string,
  shardIndex: number,
  randomPart: string
): string;
/**
 * Create a legacy-format JTI for access tokens (revocation-aware).
 * @deprecated Use createRegionAwareRevocationJti for new tokens
 *
 * @param generation - Generation number
 * @param shardIndex - Shard index
 * @param randomPart - Random part (typically at_{uuid})
 * @returns Formatted JTI string
 *
 * @example
 * createRevocationJti(1, 7, 'at_abc123')
 * // => 'rv1_7_at_abc123'
 */
export declare function createRevocationJti(
  generation: number,
  shardIndex: number,
  randomPart: string
): string;
/**
 * Generate a random part for access token JTI.
 *
 * @returns Random JTI part in format at_{uuid}
 */
export declare function generateAccessTokenRandomPart(): string;
/**
 * Get current revocation shard configuration from KV.
 *
 * Priority:
 * 1. KV: revocation_shard_config (full JSON config)
 * 2. KV: revocation_shards (simple number, converted to config)
 * 3. Environment variable: AUTHRIM_REVOCATION_SHARDS
 * 4. Default configuration
 *
 * @param env - Environment object with KV and variables
 * @returns Revocation shard configuration
 */
export declare function getRevocationShardConfig(env: Env): Promise<RevocationShardConfig>;
/**
 * Get current revocation shard count (backward-compatible function).
 *
 * @param env - Environment object
 * @returns Current revocation shard count
 */
export declare function getRevocationShardCount(env: Env): Promise<number>;
/**
 * Find shard count for a specific revocation generation.
 *
 * @param config - Shard configuration
 * @param generation - Generation number to look up
 * @returns Shard count for the generation
 */
export declare function findRevocationGenerationShardCount(
  config: RevocationShardConfig,
  generation: number
): number;
/**
 * Calculate shard index from JTI (JWT ID) using hash.
 * Used only for legacy tokens without embedded shard info.
 *
 * @param jti - JWT ID
 * @param shardCount - Number of shards
 * @returns Shard index (0 to shardCount - 1)
 */
export declare function getRevocationShardIndex(jti: string, shardCount: number): number;
/**
 * Calculate shard index for a new token.
 * Uses random assignment for even distribution.
 *
 * @param shardCount - Number of shards
 * @returns Shard index (0 to shardCount - 1)
 */
export declare function getRandomShardIndex(shardCount: number): number;
/**
 * Build a region-aware Durable Object instance name for token revocation.
 *
 * @param tenantId - Tenant ID
 * @param regionKey - Region key
 * @param shardIndex - Shard index
 * @returns DO instance name for the shard
 *
 * @example
 * buildRegionAwareRevocationInstanceName('default', 'wnam', 7)
 * // => "default:wnam:rv:7"
 */
export declare function buildRegionAwareRevocationInstanceName(
  tenantId: string,
  regionKey: string,
  shardIndex: number
): string;
/**
 * Build a legacy sharded Durable Object instance name for token revocation.
 * @deprecated Use buildRegionAwareRevocationInstanceName for new tokens
 *
 * @param shardIndex - Shard index
 * @returns DO instance name for the shard
 *
 * @example
 * buildRevocationShardInstanceName(2)
 * // => "tenant:default:token-revocation:shard-2"
 */
export declare function buildRevocationShardInstanceName(shardIndex: number): string;
/**
 * Result of getting a revocation store.
 */
export interface RevocationStoreResult {
  stub: DurableObjectStub;
  shardIndex: number;
  instanceName: string;
  regionKey: string | null;
  isRegionAware: boolean;
}
/**
 * Get TokenRevocationStore Durable Object stub for a JTI.
 *
 * Routes based on:
 * - Region-aware format (g{gen}:{region}:{shard}:{random}): Uses embedded region/shard info with locationHint
 * - Legacy format (rv{gen}_{shard}_{random}): Uses embedded shard info without locationHint
 * - Very old format: Uses hash-based routing with LEGACY_SHARD_COUNT
 *
 * @param env - Environment object with DO bindings
 * @param jti - JWT ID for sharding
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Promise containing DO stub and shard info
 */
export declare function getRevocationStoreByJti(
  env: Env,
  jti: string,
  tenantId?: string
): Promise<RevocationStoreResult>;
/**
 * Result of generating a region-aware JTI.
 */
export interface RegionAwareJtiResult {
  jti: string;
  generation: number;
  shardIndex: number;
  regionKey: string;
  instanceName: string;
}
/**
 * Generate a new region-aware JTI with embedded generation, region, and shard information.
 *
 * Uses region_shard_config for shard distribution across regions.
 *
 * @param env - Environment object with KV bindings
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Promise containing the new JTI and routing info
 */
export declare function generateRegionAwareJti(
  env: Env,
  tenantId?: string
): Promise<RegionAwareJtiResult>;
/**
 * Generate a new JTI with embedded shard information.
 * @deprecated Use generateRegionAwareJti for new tokens
 *
 * @param env - Environment object with KV bindings
 * @returns Promise containing the new JTI and shard info
 */
export declare function generateShardedJti(env: Env): Promise<{
  jti: string;
  generation: number;
  shardIndex: number;
}>;
/**
 * Save revocation shard configuration to KV.
 *
 * @param env - Environment with KV binding
 * @param config - Configuration to save
 */
export declare function saveRevocationShardConfig(
  env: Env,
  config: RevocationShardConfig
): Promise<void>;
/**
 * Create a new generation with updated shard count.
 *
 * @param currentConfig - Current configuration
 * @param newShardCount - New shard count
 * @param updatedBy - Who is making the change
 * @returns Updated configuration
 */
export declare function createNewRevocationGeneration(
  currentConfig: RevocationShardConfig,
  newShardCount: number,
  updatedBy?: string
): RevocationShardConfig;
/**
 * Reset the cached shard count/config.
 * Useful for testing or when immediate configuration reload is needed.
 */
export declare function resetRevocationShardCountCache(): void;
/**
 * Get all shard instance names for iteration/health checks.
 *
 * @param shardCount - Number of shards
 * @returns Array of shard instance names
 */
export declare function getAllRevocationShardNames(shardCount: number): string[];
//# sourceMappingURL=token-revocation-sharding.d.ts.map
