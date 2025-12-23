/**
 * Refresh Token Sharding Utilities
 *
 * Generation-based sharding with region support for RefreshTokenRotator Durable Objects.
 * Enables dynamic shard count and region changes without breaking existing tokens.
 *
 * Key Features:
 * - Region-aware routing with locationHint support
 * - Generation-based routing (each generation has fixed shard count)
 * - Legacy token compatibility (generation=0)
 * - SHA-256 hash-based shard assignment
 * - KV-based configuration with caching
 *
 * @see region-sharding.ts for region sharding design
 * @see docs/architecture/refresh-token-sharding.md
 */
import type { Env } from '../types/env';
/**
 * Parsed JTI (JWT ID) for refresh tokens.
 */
export interface ParsedRefreshTokenJti {
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
export interface GenerationConfig {
  generation: number;
  shardCount: number;
  deprecatedAt?: number;
}
/**
 * Full shard configuration from KV.
 */
export interface RefreshTokenShardConfig {
  /** Current generation number */
  currentGeneration: number;
  /** Number of shards in current generation */
  currentShardCount: number;
  /** Previous generation configs (for routing existing tokens) */
  previousGenerations: GenerationConfig[];
  /** Last update timestamp (ms) */
  updatedAt: number;
  /** Who updated the config */
  updatedBy?: string;
}
/** Default shard count for production */
export declare const DEFAULT_REFRESH_TOKEN_SHARD_COUNT = 16;
/** Default shard count for load testing */
export declare const LOAD_TEST_SHARD_COUNT = 32;
/** Cache TTL for shard configuration (10 seconds) */
export declare const SHARD_CONFIG_CACHE_TTL_MS = 10000;
/** Maximum number of previous generations to keep */
export declare const MAX_PREVIOUS_GENERATIONS = 5;
/** KV key prefix for shard configuration */
export declare const SHARD_CONFIG_KV_PREFIX = 'refresh-token-shards';
/** Global config key (used when no client-specific config exists) */
export declare const GLOBAL_CONFIG_KEY = '__global__';
/**
 * Parse a refresh token JTI to extract generation, region, and shard information.
 *
 * JTI Formats:
 * - Region-aware format: g{gen}:{region}:{shard}:{randomPart}
 * - Legacy format: v{generation}_{shardIndex}_{randomPart}
 * - Very old format: rt_{uuid} (treated as generation=0)
 *
 * @param jti - JWT ID to parse
 * @returns Parsed JTI information
 *
 * @example
 * parseRefreshTokenJti('g1:wnam:7:rt_abc123')
 * // => { generation: 1, shardIndex: 7, regionKey: 'wnam', randomPart: 'rt_abc123', isLegacy: false, isRegionAware: true }
 *
 * parseRefreshTokenJti('v1_7_rt_abc123')
 * // => { generation: 1, shardIndex: 7, regionKey: null, randomPart: 'rt_abc123', isLegacy: false, isRegionAware: false }
 *
 * parseRefreshTokenJti('rt_abc123')
 * // => { generation: 0, shardIndex: null, regionKey: null, randomPart: 'rt_abc123', isLegacy: true, isRegionAware: false }
 */
export declare function parseRefreshTokenJti(jti: string): ParsedRefreshTokenJti;
/**
 * Create a region-aware JTI for refresh tokens.
 *
 * @param generation - Generation number
 * @param regionKey - Region key
 * @param shardIndex - Shard index
 * @param randomPart - Random part (typically rt_{uuid})
 * @returns Formatted JTI string
 *
 * @example
 * createRegionAwareRefreshTokenJti(1, 'wnam', 7, 'rt_abc123')
 * // => 'g1:wnam:7:rt_abc123'
 */
export declare function createRegionAwareRefreshTokenJti(
  generation: number,
  regionKey: string,
  shardIndex: number,
  randomPart: string
): string;
/**
 * Create a legacy-format JTI for refresh tokens.
 * @deprecated Use createRegionAwareRefreshTokenJti for new tokens
 *
 * @param generation - Generation number
 * @param shardIndex - Shard index
 * @param randomPart - Random part (typically rt_{uuid})
 * @returns Formatted JTI string
 *
 * @example
 * createRefreshTokenJti(1, 7, 'rt_abc123')
 * // => 'v1_7_rt_abc123'
 */
export declare function createRefreshTokenJti(
  generation: number,
  shardIndex: number,
  randomPart: string
): string;
/**
 * Generate a random part for refresh token JTI.
 *
 * @returns Random JTI part in format rt_{uuid}
 */
export declare function generateRefreshTokenRandomPart(): string;
/**
 * Calculate shard index for a user/client combination.
 * Uses SHA-256 hash for even distribution.
 *
 * @param userId - User identifier
 * @param clientId - Client identifier
 * @param shardCount - Number of shards
 * @returns Shard index (0 to shardCount - 1)
 *
 * @example
 * await getRefreshTokenShardIndex('user-123', 'client-abc', 8)
 * // => 3 (deterministic based on hash)
 */
export declare function getRefreshTokenShardIndex(
  userId: string,
  clientId: string,
  shardCount: number
): Promise<number>;
/**
 * Synchronous shard index calculation using simple string hash.
 * Use this when async is not feasible (e.g., in load testing scripts).
 *
 * @param userId - User identifier
 * @param clientId - Client identifier
 * @param shardCount - Number of shards
 * @returns Shard index (0 to shardCount - 1)
 */
export declare function getRefreshTokenShardIndexSync(
  userId: string,
  clientId: string,
  shardCount: number
): number;
/**
 * Remap shard index for fallback scenarios.
 *
 * In generation-based sharding, remap is typically NOT needed because:
 * - Each generation has fixed shard count
 * - JTI contains exact shard info for routing
 *
 * This function is used only for:
 * - Invalid shard index (shardIndex >= shardCount)
 * - Emergency fallback scenarios
 *
 * @param shardIndex - Original shard index
 * @param shardCount - Current shard count
 * @returns Valid shard index (0 to shardCount - 1)
 */
export declare function remapRefreshTokenShardIndex(shardIndex: number, shardCount: number): number;
/**
 * Build a region-aware Durable Object instance name for RefreshTokenRotator.
 *
 * @param tenantId - Tenant ID
 * @param regionKey - Region key
 * @param shardIndex - Shard index
 * @returns DO instance name
 *
 * @example
 * buildRegionAwareRefreshTokenInstanceName('default', 'wnam', 7)
 * // => 'default:wnam:rt:7'
 */
export declare function buildRegionAwareRefreshTokenInstanceName(
  tenantId: string,
  regionKey: string,
  shardIndex: number
): string;
/**
 * Build a Durable Object instance name for RefreshTokenRotator.
 * @deprecated Use buildRegionAwareRefreshTokenInstanceName for new tokens
 *
 * Instance Name Patterns:
 * - Legacy (gen=0): tenant:{tenantId}:refresh-rotator:{clientId}
 * - New format: tenant:{tenantId}:refresh-rotator:{clientId}:v{gen}:shard-{index}
 *
 * @param clientId - Client identifier
 * @param generation - Generation number (0 for legacy)
 * @param shardIndex - Shard index (null for legacy)
 * @param tenantId - Tenant identifier (default: 'default')
 * @returns DO instance name
 *
 * @example
 * buildRefreshTokenRotatorInstanceName('client-abc', 1, 7)
 * // => 'tenant:default:refresh-rotator:client-abc:v1:shard-7'
 *
 * buildRefreshTokenRotatorInstanceName('client-abc', 0, null)
 * // => 'tenant:default:refresh-rotator:client-abc'
 */
export declare function buildRefreshTokenRotatorInstanceName(
  clientId: string,
  generation: number,
  shardIndex: number | null,
  tenantId?: string
): string;
/**
 * Get RefreshTokenRotator DO ID from environment.
 *
 * @param env - Environment with DO bindings
 * @param clientId - Client identifier
 * @param generation - Generation number
 * @param shardIndex - Shard index
 * @returns Durable Object ID
 */
export declare function getRefreshTokenRotatorId(
  env: Env,
  clientId: string,
  generation: number,
  shardIndex: number | null
): DurableObjectId;
/**
 * Build KV key for shard configuration.
 *
 * @param clientId - Client ID (null for global)
 * @returns KV key string
 */
export declare function buildShardConfigKvKey(clientId: string | null): string;
/**
 * Get shard configuration from KV with caching.
 *
 * Priority:
 * 1. In-memory cache (if not expired)
 * 2. KV (client-specific)
 * 3. KV (global)
 * 4. Default configuration
 *
 * @param env - Environment with KV binding
 * @param clientId - Client identifier
 * @returns Shard configuration
 */
export declare function getRefreshTokenShardConfig(
  env: Env,
  clientId: string
): Promise<RefreshTokenShardConfig>;
/**
 * Save shard configuration to KV.
 *
 * @param env - Environment with KV binding
 * @param clientId - Client identifier (null for global)
 * @param config - Configuration to save
 */
export declare function saveRefreshTokenShardConfig(
  env: Env,
  clientId: string | null,
  config: RefreshTokenShardConfig
): Promise<void>;
/**
 * Clear shard configuration cache.
 * Useful for testing or after configuration changes.
 */
export declare function clearShardConfigCache(): void;
/**
 * Create a new generation with updated shard count.
 *
 * @param currentConfig - Current configuration
 * @param newShardCount - New shard count
 * @param updatedBy - Who is making the change
 * @returns Updated configuration
 */
export declare function createNewGeneration(
  currentConfig: RefreshTokenShardConfig,
  newShardCount: number,
  updatedBy?: string
): RefreshTokenShardConfig;
/**
 * Find shard count for a specific generation.
 *
 * @param config - Shard configuration
 * @param generation - Generation number to look up
 * @returns Shard count for the generation, or null if not found
 */
export declare function findGenerationShardCount(
  config: RefreshTokenShardConfig,
  generation: number
): number | null;
/**
 * Result of routing a refresh token.
 */
export interface RefreshTokenRouteResult {
  stub: DurableObjectStub;
  shardIndex: number | null;
  instanceName: string;
  regionKey: string | null;
  isRegionAware: boolean;
  isLegacy: boolean;
}
/**
 * Route a refresh token to the appropriate DO instance with region support.
 *
 * @param env - Environment with DO bindings
 * @param jti - Token JTI
 * @param clientId - Client identifier
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Route result with DO stub and routing info
 */
export declare function routeRefreshTokenWithRegion(
  env: Env,
  jti: string,
  clientId: string,
  tenantId?: string
): RefreshTokenRouteResult;
/**
 * Route a refresh token to the appropriate DO instance.
 * @deprecated Use routeRefreshTokenWithRegion for better region support
 *
 * @param env - Environment with DO bindings
 * @param jti - Token JTI
 * @param clientId - Client identifier
 * @returns Durable Object stub for the RefreshTokenRotator
 */
export declare function routeRefreshToken(
  env: Env,
  jti: string,
  clientId: string
): DurableObjectStub;
/**
 * Get routing information for a refresh token (for logging/debugging).
 *
 * @param jti - Token JTI
 * @param clientId - Client identifier
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Routing information
 */
export declare function getRefreshTokenRoutingInfo(
  jti: string,
  clientId: string,
  tenantId?: string
): {
  generation: number;
  shardIndex: number | null;
  regionKey: string | null;
  instanceName: string;
  isLegacy: boolean;
  isRegionAware: boolean;
};
/**
 * Result of generating a region-aware refresh token JTI.
 */
export interface RegionAwareRefreshTokenJtiResult {
  jti: string;
  generation: number;
  shardIndex: number;
  regionKey: string;
  instanceName: string;
}
/**
 * Generate a new region-aware JTI for refresh tokens.
 *
 * Uses region_shard_config for shard distribution across regions.
 *
 * @param env - Environment object with KV bindings
 * @param userId - User identifier (for shard calculation)
 * @param clientId - Client identifier (for shard calculation)
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Promise containing the new JTI and routing info
 */
export declare function generateRegionAwareRefreshTokenJti(
  env: Env,
  userId: string,
  clientId: string,
  tenantId?: string
): Promise<RegionAwareRefreshTokenJtiResult>;
//# sourceMappingURL=refresh-token-sharding.d.ts.map
