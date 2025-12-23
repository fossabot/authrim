/**
 * Region Sharding Utilities
 *
 * Generation-based region sharding for Durable Objects.
 * Enables dynamic shard count and region distribution changes without breaking existing resources.
 *
 * Key Features:
 * - Generation-based routing (each generation has fixed shard count and region distribution)
 * - ID embedding (generation, region, shard info embedded in resource IDs)
 * - Dynamic configuration via KV with caching
 * - locationHint support for DO placement
 *
 * Supported DOs:
 * - SessionStore
 * - AuthCodeStore (AuthorizationCodeStore)
 * - ChallengeStore
 *
 * @see docs/architecture/region-sharding.md
 */
import type { Env } from '../types/env';
/**
 * Valid region keys for Cloudflare locationHint.
 */
export type RegionKey = 'apac' | 'weur' | 'enam' | 'wnam' | 'oc' | 'afr' | 'me';
/**
 * Resource types supported by region sharding.
 */
export type RegionShardResourceType =
  | 'session'
  | 'authcode'
  | 'challenge'
  | 'refresh'
  | 'revocation'
  | 'vprequest'
  | 'credoffer'
  | 'dpop'
  | 'par'
  | 'device'
  | 'ciba';
/**
 * Type abbreviations for DO instance names (3-character unified).
 *
 * All abbreviations are exactly 3 characters for:
 * - Visual consistency in logs and debugging
 * - Collision avoidance (2 chars too short, 4+ chars redundant)
 * - Uniform ID format across all DOs
 */
export declare const TYPE_ABBREV: Record<RegionShardResourceType, string>;
/**
 * Reverse mapping from abbreviation to resource type.
 */
export declare const ABBREV_TO_TYPE: Record<string, RegionShardResourceType>;
/**
 * ID prefix for resource IDs (3-character unified).
 * Used in the randomPart of region IDs: g1:apac:3:{prefix}_{uuid}
 */
export declare const ID_PREFIX: Record<RegionShardResourceType, string>;
/**
 * Colocation group configuration.
 * DOs in the same group MUST have the same shard count.
 */
export interface ColocationGroup {
  /** Group name */
  name: string;
  /** Total shards for this group */
  totalShards: number;
  /** Member resource types */
  members: RegionShardResourceType[];
  /** Description */
  description?: string;
}
/**
 * Extended region shard configuration with group support.
 */
export interface RegionShardConfigV2 extends RegionShardConfig {
  /** Configuration version (2 for group support) */
  version?: number;
  /** Colocation group configurations */
  groups?: Record<string, ColocationGroup>;
}
/**
 * Region range configuration.
 */
export interface RegionRange {
  /** Start shard index (inclusive) */
  startShard: number;
  /** End shard index (inclusive) */
  endShard: number;
  /** Number of shards in this region */
  shardCount: number;
}
/**
 * Single generation configuration.
 */
export interface RegionGenerationConfig {
  /** Generation number */
  generation: number;
  /** Total shard count for this generation */
  totalShards: number;
  /** Region distribution */
  regions: Record<string, RegionRange>;
  /** When this generation was deprecated (undefined if current) */
  deprecatedAt?: number;
}
/**
 * Full region shard configuration from KV.
 */
export interface RegionShardConfig {
  /** Current generation number */
  currentGeneration: number;
  /** Current total shard count */
  currentTotalShards: number;
  /** Current region distribution */
  currentRegions: Record<string, RegionRange>;
  /** Previous generation configs (for routing existing resources) */
  previousGenerations: RegionGenerationConfig[];
  /** Maximum number of previous generations to keep */
  maxPreviousGenerations: number;
  /** Last update timestamp (ms) */
  updatedAt: number;
  /** Who updated the config */
  updatedBy?: string;
}
/**
 * Parsed region ID.
 */
export interface ParsedRegionId {
  /** Generation number */
  generation: number;
  /** Region key */
  regionKey: string;
  /** Shard index */
  shardIndex: number;
  /** Random part (resource-specific ID) */
  randomPart: string;
}
/**
 * Shard resolution result.
 */
export interface ShardResolution {
  /** Generation number */
  generation: number;
  /** Region key */
  regionKey: string;
  /** Shard index */
  shardIndex: number;
}
export { DEFAULT_TENANT_ID } from './tenant-context';
/** Default total shard count */
export declare const DEFAULT_TOTAL_SHARDS = 20;
/** Default region distribution (APAC 20%, US 40%, EU 40%) */
export declare const DEFAULT_REGION_DISTRIBUTION: Record<string, number>;
/** Cache TTL for shard configuration (10 seconds) */
export declare const REGION_SHARD_CONFIG_CACHE_TTL_MS = 10000;
/** Maximum number of previous generations to keep (region sharding specific) */
export declare const REGION_MAX_PREVIOUS_GENERATIONS = 5;
/** KV key prefix for region shard configuration */
export declare const REGION_SHARD_CONFIG_KV_PREFIX = 'region_shard_config';
/** Valid region keys (frozen for runtime checks) */
export declare const VALID_REGION_KEYS: readonly [
  'apac',
  'weur',
  'enam',
  'wnam',
  'oc',
  'afr',
  'me',
];
/**
 * Clear region shard config cache.
 * Useful for testing or after configuration changes.
 */
export declare function clearRegionShardConfigCache(): void;
/**
 * Parse a region ID to extract generation, region, shard information.
 *
 * ID Format: g{gen}:{region}:{shard}:{randomPart}
 *
 * @param id - Resource ID to parse
 * @returns Parsed region ID
 * @throws Error if ID format is invalid
 *
 * @example
 * parseRegionId('g1:apac:3:session_abc123')
 * // => { generation: 1, regionKey: 'apac', shardIndex: 3, randomPart: 'session_abc123' }
 */
export declare function parseRegionId(id: string): ParsedRegionId;
/**
 * Create a region ID with embedded generation, region, and shard info.
 *
 * @param generation - Generation number
 * @param regionKey - Region key
 * @param shardIndex - Shard index
 * @param randomPart - Random part (resource-specific ID)
 * @returns Region ID string
 *
 * @example
 * createRegionId(1, 'apac', 3, 'session_abc123')
 * // => 'g1:apac:3:session_abc123'
 */
export declare function createRegionId(
  generation: number,
  regionKey: string,
  shardIndex: number,
  randomPart: string
): string;
/**
 * Build a DO instance name for region-sharded resources.
 *
 * Instance Name Format: {tenantId}:{region}:{typeAbbrev}:{shard}
 *
 * @param tenantId - Tenant ID
 * @param regionKey - Region key
 * @param resourceType - Resource type
 * @param shardIndex - Shard index
 * @returns DO instance name
 *
 * @example
 * buildRegionInstanceName('default', 'apac', 'session', 3)
 * // => 'default:apac:s:3'
 */
export declare function buildRegionInstanceName(
  tenantId: string,
  regionKey: string,
  resourceType: RegionShardResourceType,
  shardIndex: number
): string;
/**
 * Resolve region key from shard index using region distribution.
 *
 * @param shardIndex - Shard index
 * @param regions - Region distribution
 * @returns Region key
 *
 * @example
 * resolveRegionForShard(3, { apac: { startShard: 0, endShard: 3, shardCount: 4 }, ... })
 * // => 'apac'
 */
export declare function resolveRegionForShard(
  shardIndex: number,
  regions: Record<string, RegionRange>
): string;
/**
 * Resolve shard for new resource creation.
 *
 * @param config - Region shard configuration
 * @param shardKey - Key for shard calculation (e.g., userId:clientId)
 * @returns Shard resolution result
 *
 * @example
 * resolveShardForNewResource(config, 'user123:client456')
 * // => { generation: 1, regionKey: 'apac', shardIndex: 3 }
 */
export declare function resolveShardForNewResource(
  config: RegionShardConfig,
  shardKey: string
): ShardResolution;
/**
 * Resolve shard from existing resource ID.
 *
 * @param id - Resource ID
 * @returns Shard resolution result
 */
export declare function resolveShardFromId(id: string): ShardResolution;
/**
 * Find generation config by generation number.
 *
 * @param config - Full region shard configuration
 * @param generation - Generation number to find
 * @returns Generation config or null if not found
 */
export declare function findGenerationConfig(
  config: RegionShardConfig,
  generation: number
): RegionGenerationConfig | null;
/**
 * Create a new region generation with updated shard count and region distribution.
 *
 * @param currentConfig - Current configuration
 * @param newTotalShards - New total shard count
 * @param newRegions - New region distribution
 * @param updatedBy - Who is making the change
 * @returns Updated configuration
 */
export declare function createNewRegionGeneration(
  currentConfig: RegionShardConfig,
  newTotalShards: number,
  newRegions: Record<string, RegionRange>,
  updatedBy?: string
): RegionShardConfig;
/**
 * Calculate region ranges from percentage distribution.
 *
 * @param totalShards - Total number of shards
 * @param distribution - Region percentage distribution (must sum to 100)
 * @returns Region ranges
 *
 * @example
 * calculateRegionRanges(20, { apac: 20, enam: 40, weur: 40 })
 * // => {
 * //   apac: { startShard: 0, endShard: 3, shardCount: 4 },
 * //   enam: { startShard: 4, endShard: 11, shardCount: 8 },
 * //   weur: { startShard: 12, endShard: 19, shardCount: 8 }
 * // }
 */
export declare function calculateRegionRanges(
  totalShards: number,
  distribution: Record<string, number>
): Record<string, RegionRange>;
/**
 * Region shard validation result.
 */
export interface RegionShardValidationResult {
  valid: boolean;
  error?: string;
}
/**
 * Validate region shard request body.
 *
 * Rules:
 * 1. regionDistribution must sum to 100
 * 2. totalShards >= active region count
 * 3. shardCount = 0 regions are allowed
 * 4. totalShards and regionDistribution must be consistent
 *
 * @param body - Request body
 * @returns Validation result
 */
export declare function validateRegionShardRequest(body: {
  totalShards: number;
  regionDistribution: Record<string, number>;
}): RegionShardValidationResult;
/**
 * Build KV key for region shard configuration.
 *
 * @param tenantId - Tenant ID
 * @returns KV key string
 */
export declare function buildRegionShardConfigKvKey(tenantId: string): string;
/**
 * Get region shard configuration from KV with caching.
 *
 * @param env - Environment with KV binding
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Region shard configuration
 */
export declare function getRegionShardConfig(
  env: Env,
  tenantId?: string
): Promise<RegionShardConfig>;
/**
 * Save region shard configuration to KV.
 *
 * @param env - Environment with KV binding
 * @param tenantId - Tenant ID
 * @param config - Configuration to save
 */
export declare function saveRegionShardConfig(
  env: Env,
  tenantId: string,
  config: RegionShardConfig
): Promise<void>;
/**
 * Delete region shard configuration from KV.
 *
 * @param env - Environment with KV binding
 * @param tenantId - Tenant ID
 */
export declare function deleteRegionShardConfig(env: Env, tenantId: string): Promise<void>;
/**
 * Get a region-aware Durable Object stub with locationHint.
 *
 * @param namespace - DO namespace
 * @param instanceName - DO instance name
 * @param regionKey - Region key for locationHint
 * @returns DO stub
 *
 * @example
 * const stub = getRegionAwareDOStub(env.SESSION_STORE, 'default:apac:s:3', 'apac');
 */
export declare function getRegionAwareDOStub<
  T extends Rpc.DurableObjectBranded | undefined = undefined,
>(
  namespace: DurableObjectNamespace<T>,
  instanceName: string,
  regionKey: string
): DurableObjectStub<T>;
/**
 * Create a new region-aware resource ID and get the DO stub.
 *
 * @param env - Environment with DO and KV bindings
 * @param namespace - DO namespace
 * @param tenantId - Tenant ID
 * @param resourceType - Resource type
 * @param shardKey - Key for shard calculation
 * @param randomPart - Random part for the ID
 * @returns Object with id, stub, and resolution info
 */
export declare function createRegionAwareResource<
  T extends Rpc.DurableObjectBranded | undefined = undefined,
>(
  env: Env,
  namespace: DurableObjectNamespace<T>,
  tenantId: string,
  resourceType: RegionShardResourceType,
  shardKey: string,
  randomPart: string
): Promise<{
  id: string;
  stub: DurableObjectStub<T>;
  resolution: ShardResolution;
  instanceName: string;
}>;
/**
 * Get the DO stub for an existing region-aware resource.
 *
 * @param namespace - DO namespace
 * @param tenantId - Tenant ID
 * @param resourceType - Resource type
 * @param resourceId - Resource ID (with embedded region info)
 * @returns Object with stub and resolution info
 */
export declare function getRegionAwareResourceStub<
  T extends Rpc.DurableObjectBranded | undefined = undefined,
>(
  namespace: DurableObjectNamespace<T>,
  tenantId: string,
  resourceType: RegionShardResourceType,
  resourceId: string
): {
  stub: DurableObjectStub<T>;
  resolution: ShardResolution;
  instanceName: string;
};
/**
 * Get default region shard configuration.
 *
 * @returns Default configuration
 */
export declare function getDefaultRegionShardConfig(): RegionShardConfig;
/**
 * Validate region distribution percentages.
 *
 * @param distribution - Region percentage distribution
 * @returns Validation result
 */
export declare function validateRegionDistribution(
  distribution: Record<string, number>
): RegionShardValidationResult;
/**
 * Calculate region distribution from percentage values.
 * Alias for calculateRegionRanges for clearer naming.
 *
 * @param totalShards - Total number of shards
 * @param distribution - Region percentage distribution
 * @returns Region ranges
 */
export declare function calculateRegionDistribution(
  totalShards: number,
  distribution: Record<string, number>
): Record<string, RegionRange>;
/**
 * Default colocation group definitions.
 * These define which DOs must share the same shard count.
 */
export declare const DEFAULT_COLOCATION_GROUPS: Record<string, Omit<ColocationGroup, 'name'>>;
/**
 * Get shard count for a specific resource type.
 * Uses group configuration if available, otherwise falls back to global totalShards.
 *
 * @param config - Region shard configuration
 * @param resourceType - Resource type
 * @returns Shard count for this resource type
 */
export declare function getShardCountForType(
  config: RegionShardConfig | RegionShardConfigV2,
  resourceType: RegionShardResourceType
): number;
/**
 * Find which colocation group a resource type belongs to.
 *
 * @param resourceType - Resource type to find
 * @param config - Optional config with custom groups
 * @returns Group name or null if not in any group
 */
export declare function findColocationGroup(
  resourceType: RegionShardResourceType,
  config?: RegionShardConfigV2
): string | null;
/**
 * Colocation validation result.
 */
export interface ColocationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
/**
 * Validate colocation group shard counts.
 *
 * CRITICAL: This validates that DOs in the same colocation group have
 * identical shard counts. Mismatch causes intermittent authentication failures.
 *
 * @param config - Region shard configuration
 * @returns Validation result
 */
export declare function validateColocationGroups(
  config: RegionShardConfig | RegionShardConfigV2
): ColocationValidationResult;
/**
 * Validate colocation groups with fail-closed behavior for production.
 *
 * @param config - Region shard configuration
 * @param failClosed - If true, throws on validation errors (default: true in production)
 * @throws Error if failClosed is true and validation fails
 */
export declare function validateColocationGroupsStrict(
  config: RegionShardConfig | RegionShardConfigV2,
  failClosed?: boolean
): void;
/**
 * Resolve shard for new resource creation with type-specific shard count.
 *
 * This is an enhanced version of resolveShardForNewResource that respects
 * colocation group shard counts.
 *
 * @param config - Region shard configuration
 * @param resourceType - Resource type
 * @param shardKey - Key for shard calculation (e.g., userId:clientId)
 * @returns Shard resolution result
 */
export declare function resolveShardForNewResourceTyped(
  config: RegionShardConfig | RegionShardConfigV2,
  resourceType: RegionShardResourceType,
  shardKey: string
): ShardResolution;
//# sourceMappingURL=region-sharding.d.ts.map
