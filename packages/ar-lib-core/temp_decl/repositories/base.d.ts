/**
 * Base Repository
 *
 * Abstract base class for all repositories.
 * Provides common functionality:
 * - CRUD operations
 * - Pagination
 * - Filtering
 * - ID generation
 *
 * Design decisions:
 * - Uses DatabaseAdapter for database operations (enables testing/mocking)
 * - Generic type parameter for entity type
 * - Soft delete support via is_active flag
 * - Audit fields (created_at, updated_at) handling
 */
import type { DatabaseAdapter, ExecuteResult, PIIStatus, PIIClass } from '../db/adapter';
/**
 * Base entity interface
 * All entities should extend this interface
 */
export interface BaseEntity {
  id: string;
  created_at: number;
  updated_at: number;
}
/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page (default: 20, max: 100) */
  limit?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}
/**
 * Pagination result
 */
export interface PaginationResult<T> {
  /** Items in current page */
  items: T[];
  /** Total item count */
  total: number;
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total pages */
  totalPages: number;
  /** Has next page */
  hasNext: boolean;
  /** Has previous page */
  hasPrev: boolean;
}
/**
 * Filter operator types
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in';
/**
 * Filter condition
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}
/**
 * Repository configuration
 */
export interface RepositoryConfig {
  /** Table name in the database */
  tableName: string;
  /** Primary key field (default: 'id') */
  primaryKey?: string;
  /** Enable soft delete (default: true) */
  softDelete?: boolean;
  /** Soft delete field (default: 'is_active') */
  softDeleteField?: string;
  /** Allowed fields for sorting and filtering (prevents SQL injection) */
  allowedFields?: string[];
}
/**
 * Generate a unique ID
 * Uses crypto.randomUUID() for UUIDv4 generation
 */
export declare function generateId(): string;
/**
 * Get current timestamp in milliseconds
 */
export declare function getCurrentTimestamp(): number;
/**
 * Base Repository class
 *
 * @typeParam T - Entity type extending BaseEntity
 */
export declare abstract class BaseRepository<T extends BaseEntity> {
  protected readonly adapter: DatabaseAdapter;
  protected readonly tableName: string;
  protected readonly primaryKey: string;
  protected readonly softDelete: boolean;
  protected readonly softDeleteField: string;
  protected readonly allowedFields: Set<string>;
  constructor(adapter: DatabaseAdapter, config: RepositoryConfig);
  /**
   * Validate a field name against allowed fields
   * Throws an error if the field is not allowed (prevents SQL injection)
   *
   * @param field - Field name to validate
   * @param context - Context for error message (e.g., 'sortBy', 'filter')
   * @returns The validated field name
   */
  protected validateFieldName(field: string, context: string): string;
  /**
   * Validate sort order (must be 'asc' or 'desc')
   *
   * @param order - Sort order to validate
   * @returns Validated sort order (defaults to 'desc' if invalid)
   */
  protected validateSortOrder(order: string | undefined): 'asc' | 'desc';
  /**
   * Find entity by ID
   *
   * @param id - Entity ID
   * @returns Entity or null if not found
   */
  findById(id: string): Promise<T | null>;
  /**
   * Find all entities matching conditions
   *
   * @param conditions - Filter conditions
   * @param options - Pagination options
   * @returns Paginated result
   */
  findAll(
    conditions?: FilterCondition[],
    options?: PaginationOptions
  ): Promise<PaginationResult<T>>;
  /**
   * Find one entity matching conditions
   *
   * @param conditions - Filter conditions
   * @returns Entity or null if not found
   */
  findOne(conditions: FilterCondition[]): Promise<T | null>;
  /**
   * Validate field name for create/update operations (prevents SQL injection)
   * Unlike validateFieldName which throws, this returns boolean for filtering.
   *
   * @param field - Field name to validate
   * @returns True if field is allowed
   */
  protected isAllowedField(field: string): boolean;
  /**
   * Create a new entity
   *
   * @param data - Entity data (without id, created_at, updated_at)
   * @returns Created entity
   */
  create(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'> & {
      id?: string;
    }
  ): Promise<T>;
  /**
   * Update an entity
   *
   * @param id - Entity ID
   * @param data - Fields to update
   * @returns Updated entity or null if not found
   */
  update(id: string, data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T | null>;
  /**
   * Delete an entity
   *
   * If soft delete is enabled, sets is_active to 0.
   * Otherwise, performs hard delete.
   *
   * @param id - Entity ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;
  /**
   * Hard delete an entity (bypasses soft delete)
   *
   * @param id - Entity ID
   * @returns True if deleted, false if not found
   */
  hardDelete(id: string): Promise<boolean>;
  /**
   * Check if entity exists
   *
   * @param id - Entity ID
   * @returns True if exists
   */
  exists(id: string): Promise<boolean>;
  /**
   * Count entities matching conditions
   *
   * @param conditions - Filter conditions
   * @returns Count
   */
  count(conditions?: FilterCondition[]): Promise<number>;
  /**
   * Build WHERE clause from conditions
   */
  protected buildWhereClause(conditions?: FilterCondition[]): {
    whereClause: string;
    params: unknown[];
  };
  /**
   * Build a single condition clause
   * Field names are validated against allowedFields to prevent SQL injection
   */
  protected buildCondition(condition: FilterCondition): {
    clause: string;
    value: unknown;
  };
  /**
   * Get the database adapter
   * Useful for custom queries
   */
  getAdapter(): DatabaseAdapter;
}
/**
 * Re-export types for convenience
 */
export type { DatabaseAdapter, ExecuteResult, PIIStatus, PIIClass };
//# sourceMappingURL=base.d.ts.map
