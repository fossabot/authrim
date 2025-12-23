/**
 * Tenant Context Utilities
 *
 * Single-tenant mode: always returns 'default'
 * Future MT: resolve from subdomain/header
 *
 * This module provides the foundation for future multi-tenant support
 * while keeping the system single-tenant for now.
 */
import type { Env } from '../types/env';
/**
 * Default tenant ID used in single-tenant mode.
 * All data is associated with this tenant by default.
 */
export declare const DEFAULT_TENANT_ID = 'default';
/**
 * Get the current tenant ID.
 * In single-tenant mode, this always returns 'default'.
 *
 * Future MT: This will extract tenant from request context.
 */
export declare function getTenantId(): string;
/**
 * Build a Durable Object key with tenant prefix.
 *
 * @param resourceType - Type of resource (e.g., 'session', 'auth-code')
 * @param resourceId - Unique identifier for the resource
 * @returns Tenant-prefixed key string
 *
 * @example
 * buildDOKey('session', 'abc123') // => 'tenant:default:session:abc123'
 */
export declare function buildDOKey(resourceType: string, resourceId: string): string;
/**
 * Build a KV key with tenant prefix.
 *
 * @param prefix - Key prefix (e.g., 'client', 'state')
 * @param key - Unique key value
 * @returns Tenant-prefixed key string
 *
 * @example
 * buildKVKey('client', 'my-client-id') // => 'tenant:default:client:my-client-id'
 */
export declare function buildKVKey(prefix: string, key: string): string;
/**
 * Build a Durable Object instance name with tenant prefix.
 * Used when creating DO instance IDs via idFromName().
 *
 * @param resourceType - Type of DO resource (e.g., 'session', 'key-manager')
 * @returns Tenant-prefixed instance name
 *
 * @example
 * buildDOInstanceName('session') // => 'tenant:default:session'
 * env.SESSION_STORE.idFromName(buildDOInstanceName('session'))
 */
export declare function buildDOInstanceName(resourceType: string): string;
/**
 * Build a Durable Object instance name for a specific tenant.
 * For future use when tenant ID is dynamic.
 *
 * @param tenantId - Tenant identifier
 * @param resourceType - Type of DO resource
 * @returns Tenant-prefixed instance name
 */
export declare function buildDOInstanceNameForTenant(
  tenantId: string,
  resourceType: string
): string;
/**
 * Build a KV key for a specific tenant.
 * For future use when tenant ID is dynamic.
 *
 * @param tenantId - Tenant identifier
 * @param prefix - Key prefix
 * @param key - Unique key value
 * @returns Tenant-prefixed key string
 */
export declare function buildKVKeyForTenant(tenantId: string, prefix: string, key: string): string;
/**
 * Default shard count for authorization code sharding.
 * Can be overridden via AUTHRIM_CODE_SHARDS environment variable.
 */
export declare const DEFAULT_CODE_SHARD_COUNT = 4;
/**
 * FNV-1a 32-bit hash function.
 * Fast, synchronous hash with good distribution.
 * Used for sticky routing without blocking the event loop.
 *
 * @param str - String to hash
 * @returns 32-bit unsigned integer hash
 */
export declare function fnv1a32(str: string): number;
/**
 * Calculate shard index for authorization codes.
 * Uses FNV-1a hash of userId:clientId for sticky routing.
 * Same user+client always routes to same shard (colocated with RefreshToken).
 *
 * @param userId - User identifier (sub claim)
 * @param clientId - OAuth client identifier
 * @param shardCount - Number of shards (default: 64)
 * @returns Shard index (0 to shardCount - 1)
 */
export declare function getAuthCodeShardIndex(
  userId: string,
  clientId: string,
  shardCount?: number
): number;
/**
 * Create a sharded authorization code.
 * Format: {shardIndex}_{randomCode}
 *
 * @param shardIndex - Shard index (0 to shardCount - 1)
 * @param randomCode - Random opaque code string
 * @returns Sharded authorization code
 */
export declare function createShardedAuthCode(shardIndex: number, randomCode: string): string;
/**
 * Parse a sharded authorization code.
 * Extracts shard index and opaque code from the combined format.
 *
 * @param code - Sharded authorization code (format: {shardIndex}_{randomCode})
 * @returns Object containing shardIndex and opaqueCode, or null if invalid format
 */
export declare function parseShardedAuthCode(code: string): {
  shardIndex: number;
  opaqueCode: string;
} | null;
/**
 * Build a sharded Durable Object instance name for auth codes.
 *
 * @param shardIndex - Shard index
 * @returns DO instance name for the shard
 */
export declare function buildAuthCodeShardInstanceName(shardIndex: number): string;
/**
 * Remap shard index for scale-down compatibility.
 *
 * When shard count is reduced (e.g., 64→32), codes from out-of-range shards
 * are remapped using modulo operation to ensure all existing codes remain valid.
 *
 * Example: 64→32 scale-down
 *   - Shard 0-31: No change (0-31 % 32 = 0-31)
 *   - Shard 32-63: Remapped (32 % 32 = 0, 33 % 32 = 1, ...)
 *
 * @param parsedShardIndex - Original shard index from authorization code
 * @param currentShardCount - Current configured shard count
 * @returns Actual shard index to use (0 to currentShardCount - 1)
 * @throws Error if currentShardCount is invalid (<= 0)
 */
export declare function remapShardIndex(
  parsedShardIndex: number,
  currentShardCount: number
): number;
/**
 * Get shard count with caching.
 *
 * Caches the result for 10 seconds to minimize KV overhead.
 *
 * @param env - Environment object
 * @returns Current shard count
 */
export declare function getShardCount(env: Env): Promise<number>;
/**
 * Default shard count for session store sharding.
 * Can be overridden via AUTHRIM_SESSION_SHARDS environment variable.
 */
export declare const DEFAULT_SESSION_SHARD_COUNT = 4;
/**
 * Get session shard count with caching.
 *
 * Caches the result for 10 seconds to minimize KV overhead.
 *
 * @param env - Environment object
 * @returns Current session shard count
 */
export declare function getSessionShardCount(env: Env): Promise<number>;
/**
 * Build a sharded Durable Object instance name for sessions.
 *
 * @param shardIndex - Shard index
 * @returns DO instance name for the shard
 */
export declare function buildSessionShardInstanceName(shardIndex: number): string;
//# sourceMappingURL=tenant-context.d.ts.map
