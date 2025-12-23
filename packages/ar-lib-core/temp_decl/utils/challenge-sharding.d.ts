/**
 * ChallengeStore Sharding Helper (Region Sharding Version)
 *
 * Provides utilities for routing ChallengeStore operations to sharded
 * Durable Object instances with region-based locationHint.
 *
 * DO instance name: {tenantId}:{region}:ch:{shard}
 * Challenge ID format: g{gen}:{region}:{shard}:ch_{uuid}
 *
 * Sharding Strategy:
 * - Challenge ID or User ID based sharding with region distribution
 * - Same key always routes to same shard in same region
 * - locationHint ensures DO placement in optimal region
 *
 * Configuration:
 * - KV: region_shard_config:{tenantId} for dynamic region distribution
 * - Fallback to legacy shard count settings if region config not present
 */
import type { Env } from '../types/env';
import type { DurableObjectStub } from '@cloudflare/workers-types';
import type { ChallengeStore } from '../durable-objects/ChallengeStore';
import { type ParsedRegionId, type ShardResolution } from './region-sharding';
/**
 * Type alias for ChallengeStore stub
 */
type ChallengeStoreStub = DurableObjectStub<ChallengeStore>;
/**
 * Default shard count for challenge store sharding.
 * Can be overridden via KV or AUTHRIM_CHALLENGE_SHARDS environment variable.
 */
export declare const DEFAULT_CHALLENGE_SHARD_COUNT = 4;
/**
 * Get challenge shard count with caching.
 *
 * Caches the result for 10 seconds to minimize KV overhead.
 *
 * @param env - Environment object
 * @returns Current challenge shard count
 */
export declare function getChallengeShardCount(env: Env): Promise<number>;
/**
 * Calculate shard index from email address.
 *
 * @deprecated Use getChallengeShardIndexByChallengeId or getChallengeShardIndexByUserId instead.
 * Email-based sharding includes PII in DO instance names.
 *
 * @param email - Email address (will be lowercased)
 * @param shardCount - Number of shards
 * @returns Shard index (0 to shardCount - 1)
 */
export declare function getChallengeShardIndexByEmail(email: string, shardCount: number): number;
/**
 * Calculate shard index from user ID.
 * Alternative to email-based sharding for authenticated flows.
 *
 * @param userId - User identifier
 * @param shardCount - Number of shards
 * @returns Shard index (0 to shardCount - 1)
 */
export declare function getChallengeShardIndexByUserId(userId: string, shardCount: number): number;
/**
 * Build a sharded Durable Object instance name for challenges.
 *
 * @param shardIndex - Shard index
 * @returns DO instance name for the shard
 *
 * @example
 * buildChallengeShardInstanceName(7)
 * // => "tenant:default:challenge:shard-7"
 */
export declare function buildChallengeShardInstanceName(shardIndex: number): string;
/**
 * Get ChallengeStore Durable Object stub for an email address.
 *
 * @deprecated Use getChallengeStoreByChallengeId or getChallengeStoreByUserId instead.
 * Email-based sharding includes PII in DO instance names, which is not recommended.
 * Use UUID-based sharding (challengeId, otpSessionId, userId) for better privacy.
 *
 * Routes to the appropriate shard based on the email hash.
 *
 * @param env - Environment object with DO bindings
 * @param email - Email address for sharding
 * @returns Promise<DurableObjectStub<ChallengeStore>> for the challenge shard
 */
export declare function getChallengeStoreByEmail(
  env: Env,
  email: string
): Promise<DurableObjectStub<ChallengeStore>>;
/**
 * Get ChallengeStore Durable Object stub for a user ID.
 *
 * Routes to the appropriate shard based on the user ID hash.
 * Use this for authenticated flows where email may not be available.
 *
 * @param env - Environment object with DO bindings
 * @param userId - User identifier for sharding
 * @returns Promise<DurableObjectStub<ChallengeStore>> for the challenge shard
 *
 * @example
 * const challengeStore = await getChallengeStoreByUserId(env, userId);
 * await challengeStore.consumeChallengeRpc({ ... });
 */
export declare function getChallengeStoreByUserId(
  env: Env,
  userId: string
): Promise<DurableObjectStub<ChallengeStore>>;
/**
 * Get ChallengeStore using the legacy global instance.
 *
 * DEPRECATED: Use getChallengeStoreByEmail or getChallengeStoreByUserId instead.
 *
 * This function is provided for backward compatibility during migration.
 * The global instance will not be removed, but new code should use sharded access.
 *
 * @param env - Environment object with DO bindings
 * @returns DurableObjectStub<ChallengeStore> for the global (singleton) instance
 */
export declare function getChallengeStoreGlobal(env: Env): DurableObjectStub<ChallengeStore>;
/**
 * Calculate shard index from a challenge ID (UUID).
 * Used when email is not available (e.g., passkey discoverable credentials).
 *
 * @param challengeId - Challenge identifier (UUID)
 * @param shardCount - Number of shards
 * @returns Shard index (0 to shardCount - 1)
 */
export declare function getChallengeShardIndexByChallengeId(
  challengeId: string,
  shardCount: number
): number;
/**
 * Get ChallengeStore Durable Object stub by challenge ID.
 *
 * Routes to the appropriate shard based on the challenge ID hash.
 * Use this for passkey authentication where email may not be provided.
 *
 * @param env - Environment object with DO bindings
 * @param challengeId - Challenge identifier (UUID) for sharding
 * @returns Promise<DurableObjectStub<ChallengeStore>> for the challenge shard
 *
 * @example
 * const challengeStore = await getChallengeStoreByChallengeId(env, challengeId);
 * await challengeStore.consumeChallengeRpc({ ... });
 */
export declare function getChallengeStoreByChallengeId(
  env: Env,
  challengeId: string
): Promise<DurableObjectStub<ChallengeStore>>;
/**
 * Reset the cached shard count.
 * Useful for testing or when immediate configuration reload is needed.
 */
export declare function resetChallengeShardCountCache(): void;
/**
 * Calculate shard index from a DID.
 *
 * @param did - Decentralized Identifier
 * @param shardCount - Number of shards
 * @returns Shard index (0 to shardCount - 1)
 */
export declare function getChallengeShardIndexByDID(did: string, shardCount: number): number;
/**
 * Get ChallengeStore Durable Object stub by DID.
 *
 * Routes to the appropriate shard based on the DID hash.
 * Use this for DID-based authentication flows.
 *
 * @param env - Environment object with DO bindings
 * @param did - Decentralized Identifier for sharding
 * @returns DurableObjectStub<ChallengeStore> for the challenge shard
 *
 * @example
 * const challengeStore = getChallengeStoreByDID(env, 'did:web:example.com');
 * await challengeStore.storeChallengeRpc({ ... });
 */
export declare function getChallengeStoreByDID(
  env: Env,
  did: string
): DurableObjectStub<ChallengeStore>;
/**
 * Generate a new region-sharded challenge ID.
 *
 * Uses FNV-1a hash of the shardKey to determine which shard the challenge belongs to,
 * then resolves the region from the shard index using the region shard config.
 *
 * @param env - Environment with KV binding for region shard config
 * @param shardKey - Key for shard calculation (e.g., userId, email, or challengeId)
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Object containing challengeId, shardIndex, regionKey, and generation
 *
 * @example
 * const { challengeId, uuid, resolution } = await generateRegionShardedChallengeId(env, userId);
 * // challengeId: "g1:apac:3:ch_abc123-def456-..."
 */
export declare function generateRegionShardedChallengeId(
  env: Env,
  shardKey: string,
  tenantId?: string
): Promise<{
  challengeId: string;
  uuid: string;
  shardIndex: number;
  regionKey: string;
  generation: number;
}>;
/**
 * Parse a region-sharded challenge ID to extract shard info.
 *
 * @param challengeId - Region-sharded challenge ID (format: g{gen}:{region}:{shard}:ch_{uuid})
 * @returns Parsed region ID with uuid, or null if invalid format
 *
 * @example
 * const result = parseRegionShardedChallengeId("g1:apac:3:ch_abc123");
 * // { generation: 1, regionKey: 'apac', shardIndex: 3, uuid: 'abc123' }
 */
export declare function parseRegionShardedChallengeId(challengeId: string):
  | (ParsedRegionId & {
      uuid: string;
    })
  | null;
/**
 * Check if a challenge ID is in the region-sharded format.
 *
 * @param challengeId - Challenge ID to check
 * @returns true if the challenge ID follows the region-sharded format
 */
export declare function isRegionShardedChallengeId(challengeId: string): boolean;
/**
 * Get ChallengeStore Durable Object stub for a region-sharded challenge ID.
 *
 * Parses the challenge ID to extract the region and shard info, then routes to
 * the correct DO instance with locationHint for optimal placement.
 *
 * @param env - Environment object with DO bindings
 * @param challengeId - Region-sharded challenge ID
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Object containing DO stub and resolution info
 * @throws Error if challengeId format is invalid
 *
 * @example
 * const { stub, resolution } = getRegionAwareChallengeStore(env, "g1:apac:3:ch_abc123");
 * const response = await stub.consumeChallengeRpc({ ... });
 */
export declare function getRegionAwareChallengeStore(
  env: Env,
  challengeId: string,
  tenantId?: string
): {
  stub: ChallengeStoreStub;
  resolution: ShardResolution;
  instanceName: string;
};
/**
 * Get ChallengeStore Durable Object stub and generate a new challenge ID.
 *
 * This is the entry point for creating new challenges. It:
 * 1. Gets the region shard config from KV
 * 2. Generates a new region-sharded challenge ID
 * 3. Returns the DO stub with locationHint for the target region
 *
 * @param env - Environment object with DO bindings
 * @param shardKey - Key for shard calculation (e.g., userId, email)
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Object containing DO stub, new challengeId, and resolution info
 *
 * @example
 * const { stub, challengeId, resolution } = await getRegionAwareChallengeStoreForNew(env, userId);
 * await stub.storeChallengeRpc({ id: challengeId, ... });
 */
export declare function getRegionAwareChallengeStoreForNew(
  env: Env,
  shardKey: string,
  tenantId?: string
): Promise<{
  stub: ChallengeStoreStub;
  challengeId: string;
  uuid: string;
  resolution: ShardResolution;
  instanceName: string;
}>;
export {};
//# sourceMappingURL=challenge-sharding.d.ts.map
