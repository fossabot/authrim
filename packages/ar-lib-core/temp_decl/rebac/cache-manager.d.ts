/**
 * ReBAC Cache Manager Implementation
 *
 * Manages KV caching for check() operations.
 * Cache key format: rebac:check:{tenant_id}:{user_id}:{relation}:{object_type}:{object_id}
 *
 * Cache strategy:
 * - TTL: 60 seconds (configurable)
 * - Invalidation: On relationship changes
 * - Pattern invalidation: For bulk invalidation scenarios
 */
import type { IReBACCacheManager } from './interfaces';
import type { CheckResponse } from './types';
/**
 * ReBACCacheManager - KV-based cache for check() results
 */
export declare class ReBACCacheManager implements IReBACCacheManager {
  private kv;
  private defaultTtl;
  /** In-memory fallback for environments without KV */
  private memoryCache;
  constructor(kv?: KVNamespace, defaultTtl?: number);
  get(
    tenantId: string,
    userId: string,
    relation: string,
    objectType: string,
    objectId: string
  ): Promise<CheckResponse | null>;
  set(
    tenantId: string,
    userId: string,
    relation: string,
    objectType: string,
    objectId: string,
    result: CheckResponse,
    ttl?: number
  ): Promise<void>;
  invalidate(
    tenantId: string,
    userId: string,
    relation: string,
    objectType: string,
    objectId: string
  ): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  invalidateObject(tenantId: string, objectType: string, objectId: string): Promise<void>;
  invalidateUser(tenantId: string, userId: string): Promise<void>;
  /**
   * Add key to secondary indexes for efficient invalidation
   * Called internally when caching a result
   */
  private addToIndexes;
  /**
   * Enhanced set with index tracking
   */
  setWithIndexes(
    tenantId: string,
    userId: string,
    relation: string,
    objectType: string,
    objectId: string,
    result: CheckResponse,
    ttl?: number
  ): Promise<void>;
  /**
   * Clear all cache (useful for testing or emergency reset)
   */
  clearAll(): Promise<void>;
  /**
   * Get cache statistics (for monitoring)
   */
  getStats(): {
    memorySize: number;
    kvEnabled: boolean;
  };
}
/**
 * Request-scoped cache for deduplication within a single request
 *
 * This prevents duplicate database queries when the same check
 * is performed multiple times in a single request (e.g., from
 * multiple policy conditions).
 */
export declare class RequestScopedCache {
  private cache;
  constructor();
  /**
   * Get cached result for a check
   */
  get(
    tenantId: string,
    userId: string,
    relation: string,
    objectType: string,
    objectId: string
  ): CheckResponse | undefined;
  /**
   * Set cached result for a check
   */
  set(
    tenantId: string,
    userId: string,
    relation: string,
    objectType: string,
    objectId: string,
    result: CheckResponse
  ): void;
  /**
   * Check if a result is cached
   */
  has(
    tenantId: string,
    userId: string,
    relation: string,
    objectType: string,
    objectId: string
  ): boolean;
  /**
   * Get all cached keys (for debugging)
   */
  keys(): string[];
  /**
   * Clear the cache
   */
  clear(): void;
}
//# sourceMappingURL=cache-manager.d.ts.map
