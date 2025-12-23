/**
 * Closure Manager Implementation
 *
 * Manages the relationship_closure table for efficient listObjects/listUsers queries.
 * The closure table stores pre-computed transitive relationships.
 *
 * When to use:
 * - listObjects(user, relation, objectType): "Which documents can user X view?"
 * - listUsers(object, relation): "Who can edit document Y?"
 *
 * When NOT to use:
 * - check(): Uses recursive CTE + KV cache instead (more flexible)
 *
 * Update strategy:
 * - On relationship create: Add closure entries for new paths
 * - On relationship delete: Remove affected closure entries and recompute
 * - Batch recompute: For bulk updates or initial population
 */
import type { IClosureManager } from './interfaces';
import type { ClosureEntry } from './types';
import type { IStorageAdapter } from '../storage/interfaces';
/**
 * ClosureManager - Manages pre-computed transitive relationships
 */
export declare class ClosureManager implements IClosureManager {
  private adapter;
  private maxDepth;
  private batchSize;
  constructor(adapter: IStorageAdapter, maxDepth?: number, batchSize?: number);
  /**
   * Get all objects a user has access to
   */
  getObjectsForUser(
    tenantId: string,
    userId: string,
    relation: string,
    objectType: string,
    options?: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    objectIds: string[];
    nextCursor?: string;
  }>;
  /**
   * Get all users who have access to an object
   */
  getUsersForObject(
    tenantId: string,
    objectType: string,
    objectId: string,
    relation: string,
    options?: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    userIds: string[];
    nextCursor?: string;
  }>;
  /**
   * Recompute closure entries for a specific object
   */
  recomputeForObject(tenantId: string, objectType: string, objectId: string): Promise<void>;
  /**
   * Recompute closure entries for a specific user
   */
  recomputeForUser(tenantId: string, userId: string): Promise<void>;
  /**
   * Batch recompute closure entries
   */
  batchRecompute(
    tenantId: string,
    entries: Array<{
      type: 'user' | 'object';
      entityType: string;
      entityId: string;
    }>
  ): Promise<void>;
  /**
   * Delete closure entries for an object
   */
  deleteForObject(tenantId: string, objectType: string, objectId: string): Promise<void>;
  /**
   * Delete closure entries for a user
   */
  deleteForUser(tenantId: string, userId: string): Promise<void>;
  /**
   * Compute and store closure entries for an object
   */
  private computeAndStoreClosureForObject;
  /**
   * Compute and store closure entries for a user
   */
  private computeAndStoreClosureForUser;
  /**
   * Add a single closure entry (called when a relationship is created)
   */
  addClosureEntry(entry: Omit<ClosureEntry, 'id' | 'created_at' | 'updated_at'>): Promise<void>;
  /**
   * Get closure entries (for debugging/inspection)
   */
  getClosureEntries(
    tenantId: string,
    options?: {
      ancestorType?: string;
      ancestorId?: string;
      descendantType?: string;
      descendantId?: string;
      relation?: string;
      limit?: number;
    }
  ): Promise<ClosureEntry[]>;
}
/**
 * Create a ClosureManager instance
 */
export declare function createClosureManager(
  adapter: IStorageAdapter,
  maxDepth?: number,
  batchSize?: number
): ClosureManager;
//# sourceMappingURL=closure-manager.d.ts.map
