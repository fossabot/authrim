/**
 * Cache Repository
 *
 * KV-based caching layer for cross-request data caching.
 * Provides type-safe access to cached user and client data.
 *
 * Architecture:
 * - Uses Cloudflare KV for persistence
 * - TTL-based expiration
 * - Optional in-memory caching for ultra-hot paths
 *
 * KV Keys:
 * - user:{userId} - Cached user data
 * - client:{clientId} - Cached client data
 * - pii:{userId} - Cached PII data (shorter TTL)
 *
 * Usage:
 * ```typescript
 * const cache = new CacheRepository(env.USER_CACHE, env.CLIENTS_CACHE);
 *
 * // Get or fetch user
 * const user = await cache.getOrFetchUser(userId, async () => {
 *   return await userRepo.findById(userId);
 * });
 *
 * // Invalidate on update
 * await cache.invalidateUser(userId);
 * ```
 */
/**
 * Cache configuration options
 */
export interface CacheConfig {
  /** Default TTL in seconds */
  defaultTtlSeconds: number;
  /** TTL for PII data (typically shorter) */
  piiTtlSeconds: number;
  /** Whether to use in-memory caching */
  useInMemoryCache: boolean;
  /** In-memory cache TTL in milliseconds */
  inMemoryCacheTtlMs: number;
}
/**
 * Cached user core data
 */
export interface CachedUserCore {
  id: string;
  tenant_id: string;
  email_verified: boolean;
  phone_number_verified: boolean;
  is_active: boolean;
  user_type: string;
  pii_partition: string;
  pii_status: string;
  created_at: number;
  updated_at: number;
  last_login_at: number | null;
}
/**
 * Cached client data
 */
export interface CachedClient {
  id: string;
  client_id: string;
  client_name: string;
  client_type: string;
  redirect_uris: string[];
  grant_types: string[];
  is_active: boolean;
  require_pkce: boolean;
  token_endpoint_auth_method: string;
  created_at: number;
  updated_at: number;
}
/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
  errors: number;
}
/** Default cache configuration */
export declare const DEFAULT_CACHE_CONFIG: CacheConfig;
/** Cache key prefixes */
export declare const CACHE_KEY_PREFIX: {
  readonly USER_CORE: 'user:';
  readonly USER_PII: 'pii:';
  readonly CLIENT: 'client:';
  readonly SESSION: 'session:';
};
/**
 * Cache Repository
 *
 * Provides type-safe caching for user and client data.
 */
export declare class CacheRepository {
  private userCacheKV;
  private clientCacheKV;
  private config;
  private inMemoryCache;
  private stats;
  /**
   * Create a new CacheRepository
   *
   * @param userCacheKV - KV namespace for user cache (optional)
   * @param clientCacheKV - KV namespace for client cache (optional)
   * @param config - Cache configuration
   */
  constructor(
    userCacheKV?: KVNamespace,
    clientCacheKV?: KVNamespace,
    config?: Partial<CacheConfig>
  );
  /**
   * Get cached user core data or fetch from source
   *
   * @param userId - User ID
   * @param fetchFn - Function to fetch user if not cached
   * @returns User data or null
   */
  getOrFetchUserCore<T extends CachedUserCore>(
    userId: string,
    fetchFn: () => Promise<T | null>
  ): Promise<T | null>;
  /**
   * Set user core data in cache
   *
   * @param userId - User ID
   * @param data - User data to cache
   */
  setUserCore<T extends CachedUserCore>(userId: string, data: T): Promise<void>;
  /**
   * Invalidate user cache
   *
   * @param userId - User ID
   */
  invalidateUser(userId: string): Promise<void>;
  /**
   * Get cached client data or fetch from source
   *
   * @param clientId - Client ID
   * @param fetchFn - Function to fetch client if not cached
   * @returns Client data or null
   */
  getOrFetchClient<T extends CachedClient>(
    clientId: string,
    fetchFn: () => Promise<T | null>
  ): Promise<T | null>;
  /**
   * Set client data in cache
   *
   * @param clientId - Client ID
   * @param data - Client data to cache
   */
  setClient<T extends CachedClient>(clientId: string, data: T): Promise<void>;
  /**
   * Invalidate client cache
   *
   * @param clientId - Client ID
   */
  invalidateClient(clientId: string): Promise<void>;
  /**
   * Get cache statistics
   */
  getStats(): CacheStats;
  /**
   * Reset statistics
   */
  resetStats(): void;
  /**
   * Clear all in-memory cache
   */
  clearInMemoryCache(): void;
  /**
   * Get in-memory cache size
   */
  getInMemoryCacheSize(): number;
  /**
   * Calculate hit rate
   */
  getHitRate(): number;
}
/**
 * Create a CacheRepository with standard configuration
 *
 * @param userCacheKV - KV namespace for user cache
 * @param clientCacheKV - KV namespace for client cache
 * @param config - Optional configuration overrides
 * @returns CacheRepository instance
 */
export declare function createCacheRepository(
  userCacheKV?: KVNamespace,
  clientCacheKV?: KVNamespace,
  config?: Partial<CacheConfig>
): CacheRepository;
//# sourceMappingURL=index.d.ts.map
