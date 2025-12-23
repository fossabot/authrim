/**
 * ReBAC Service Implementation
 *
 * Main service for Relationship-Based Access Control.
 * Implements Zanzibar-lite check() API with:
 * - Recursive CTE for transitive relationship resolution
 * - KV caching with configurable TTL
 * - Request-scoped deduplication
 * - Relation DSL evaluation (union, tuple-to-userset)
 *
 * Phase 3 constraints:
 * - Allow only (no Deny effect)
 * - MVP DSL (union, tuple-to-userset only)
 * - No RelationGraphDO (uses recursive CTE instead)
 */
import type {
  IReBACService,
  IReBACCacheManager,
  IClosureManager,
  IRelationParser,
} from './interfaces';
import type {
  CheckRequest,
  CheckResponse,
  BatchCheckRequest,
  BatchCheckResponse,
  ListObjectsRequest,
  ListObjectsResponse,
  ListUsersRequest,
  ListUsersResponse,
  ReBACConfig,
} from './types';
import type { IStorageAdapter } from '../storage/interfaces';
/**
 * ReBACService - Main ReBAC service implementation
 */
export declare class ReBACService implements IReBACService {
  private adapter;
  private cacheManager;
  private relationParser;
  private closureManager;
  private config;
  constructor(
    adapter: IStorageAdapter,
    config?: ReBACConfig,
    cacheManager?: IReBACCacheManager,
    closureManager?: IClosureManager | null,
    relationParser?: IRelationParser
  );
  /**
   * Check if a user has a specific relation to an object
   */
  check(request: CheckRequest): Promise<CheckResponse>;
  /**
   * Batch check multiple authorization requests
   */
  batchCheck(request: BatchCheckRequest): Promise<BatchCheckResponse>;
  /**
   * List all objects a user has a specific relation to
   */
  listObjects(request: ListObjectsRequest): Promise<ListObjectsResponse>;
  /**
   * List all users who have a specific relation to an object
   */
  listUsers(request: ListUsersRequest): Promise<ListUsersResponse>;
  /**
   * Invalidate cache for a specific object
   */
  invalidateCache(
    tenantId: string,
    objectType: string,
    objectId: string,
    relation?: string
  ): Promise<void>;
  /**
   * Invalidate all cache entries for a user
   */
  invalidateUserCache(tenantId: string, userId: string): Promise<void>;
  /**
   * Compute check result using recursive CTE and relation definitions
   */
  private computeCheck;
  /**
   * Check for a direct relationship tuple
   */
  private checkDirectRelationship;
  /**
   * Check for transitive relationships using recursive CTE
   */
  private checkTransitiveRelationship;
  /**
   * Get relation definition from database
   */
  private getRelationDefinition;
  /**
   * List objects via recursive CTE (fallback when closure manager is not available)
   */
  private listObjectsViaCTE;
  /**
   * List users via recursive CTE (fallback when closure manager is not available)
   */
  private listUsersViaCTE;
}
/**
 * Create a ReBACService instance
 */
export declare function createReBACService(
  adapter: IStorageAdapter,
  config?: ReBACConfig
): ReBACService;
//# sourceMappingURL=rebac-service.d.ts.map
