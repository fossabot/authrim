/**
 * DID Document Cache Repository
 *
 * Repository for caching resolved DID documents.
 * Reduces external DID resolution calls and improves performance.
 */
import type { DatabaseAdapter } from '../../db/adapter';
/**
 * DID Document Cache entity
 */
export interface DIDDocumentCache {
  did: string;
  document: string;
  resolved_at: number;
  expires_at: number;
}
/**
 * DID Document Cache Repository
 *
 * Note: Does not extend BaseRepository because:
 * - Primary key is 'did' not 'id'
 * - No created_at/updated_at semantics
 * - Simple cache-only operations
 */
export declare class DIDDocumentCacheRepository {
  protected readonly adapter: DatabaseAdapter;
  protected readonly tableName = 'did_document_cache';
  constructor(adapter: DatabaseAdapter);
  /**
   * Get a cached DID document if it exists and is not expired
   */
  getValidCache(did: string): Promise<{
    document: Record<string, unknown>;
    metadata: {
      retrieved: number;
      cached: boolean;
    };
  } | null>;
  /**
   * Cache a resolved DID document
   *
   * @param did The DID being cached
   * @param document The resolved DID document
   * @param ttlSeconds Time to live in seconds (default: 1 hour)
   */
  cacheDocument(did: string, document: Record<string, unknown>, ttlSeconds?: number): Promise<void>;
  /**
   * Invalidate a cached DID document
   */
  invalidate(did: string): Promise<boolean>;
  /**
   * Clear all expired cache entries
   */
  clearExpired(): Promise<number>;
  /**
   * Clear all cache entries
   */
  clearAll(): Promise<number>;
  /**
   * Get cache statistics
   */
  getStats(): Promise<{
    total: number;
    expired: number;
    valid: number;
  }>;
  /**
   * Check if a DID document is cached and valid
   */
  isCached(did: string): Promise<boolean>;
}
//# sourceMappingURL=did-document-cache.d.ts.map
