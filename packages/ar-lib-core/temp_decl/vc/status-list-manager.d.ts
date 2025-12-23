/**
 * Status List Manager
 *
 * Manages Bitstring Status List 2021 lifecycle including:
 * - Creating new status lists
 * - Allocating indices for new credentials
 * - Updating credential status (revoke/suspend/activate)
 * - List rotation when capacity is reached
 *
 * @see https://w3c-ccg.github.io/vc-status-list-2021/
 */
import { StatusValue } from './status-list';
/**
 * Status list states
 */
export type StatusListState = 'active' | 'sealed' | 'archived';
/**
 * Status list purpose
 */
export type StatusListPurpose = 'revocation' | 'suspension';
/**
 * Status list record from database
 */
export interface StatusListRecord {
  id: string;
  tenant_id: string;
  purpose: StatusListPurpose;
  encoded_list: string;
  current_index: number;
  capacity: number;
  used_count: number;
  state: StatusListState;
  created_at: string;
  updated_at: string;
  sealed_at: string | null;
}
/**
 * Result of index allocation
 */
export interface IndexAllocation {
  listId: string;
  index: number;
}
/**
 * Database adapter interface for status list storage
 */
export interface StatusListRepository {
  /**
   * Find active status list for tenant/purpose
   */
  findActiveList(tenantId: string, purpose: StatusListPurpose): Promise<StatusListRecord | null>;
  /**
   * Find status list by ID
   */
  findById(listId: string): Promise<StatusListRecord | null>;
  /**
   * Create new status list
   */
  create(record: Omit<StatusListRecord, 'created_at' | 'updated_at'>): Promise<void>;
  /**
   * Update status list
   */
  update(
    listId: string,
    updates: Partial<Pick<StatusListRecord, 'encoded_list' | 'used_count' | 'state' | 'sealed_at'>>
  ): Promise<void>;
  /**
   * Increment used_count and return new count (atomic)
   */
  incrementUsedCount(listId: string): Promise<number>;
  /**
   * List all status lists for tenant
   */
  listByTenant(
    tenantId: string,
    options?: {
      purpose?: StatusListPurpose;
      state?: StatusListState;
    }
  ): Promise<StatusListRecord[]>;
}
/**
 * Custom error for race condition detection
 */
export declare class StatusListAllocationError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable?: boolean);
}
/**
 * Status List Manager
 *
 * Handles the lifecycle of status lists including:
 * - Automatic list creation when none exists
 * - Index allocation with automatic rotation when full
 * - Status updates (revoke/suspend/activate)
 */
export declare class StatusListManager {
  private readonly repository;
  constructor(repository: StatusListRepository);
  /**
   * Create a new status list
   *
   * @param tenantId - Tenant identifier
   * @param purpose - 'revocation' or 'suspension'
   * @param capacity - Maximum number of entries (default: 131072)
   * @returns Created status list record
   */
  createStatusList(
    tenantId: string,
    purpose: StatusListPurpose,
    capacity?: number
  ): Promise<StatusListRecord>;
  /**
   * Allocate an index for a new credential
   *
   * Automatically creates a new list if none exists,
   * or rotates to a new list if the current one is full.
   *
   * Uses retry logic to handle race conditions when multiple
   * processes attempt to allocate indices concurrently.
   *
   * @param tenantId - Tenant identifier
   * @param purpose - 'revocation' or 'suspension' (default: 'revocation')
   * @returns The list ID and allocated index
   * @throws StatusListAllocationError if allocation fails after retries
   */
  allocateIndex(tenantId: string, purpose?: StatusListPurpose): Promise<IndexAllocation>;
  /**
   * Internal method to attempt index allocation
   * Separated for retry logic
   */
  private tryAllocateIndex;
  /**
   * Update the status of a credential
   *
   * @param listId - Status list ID
   * @param index - Index in the status list
   * @param status - New status value
   */
  updateStatus(listId: string, index: number, status: StatusValue): Promise<void>;
  /**
   * Revoke a credential (set status to INVALID)
   */
  revoke(listId: string, index: number): Promise<void>;
  /**
   * Suspend a credential (set status to INVALID)
   */
  suspend(listId: string, index: number): Promise<void>;
  /**
   * Activate a credential (set status to VALID)
   */
  activate(listId: string, index: number): Promise<void>;
  /**
   * Get the encoded bitstring for a status list
   *
   * @param listId - Status list ID
   * @returns Base64url encoded gzip compressed bitstring
   */
  getEncodedList(listId: string): Promise<string>;
  /**
   * Get status list record
   */
  getStatusList(listId: string): Promise<StatusListRecord | null>;
  /**
   * List all status lists for a tenant
   */
  listStatusLists(
    tenantId: string,
    options?: {
      purpose?: StatusListPurpose;
      state?: StatusListState;
    }
  ): Promise<StatusListRecord[]>;
  /**
   * Get the status at a specific index
   *
   * @param listId - Status list ID
   * @param index - Index in the status list
   * @returns The status value (0 = valid, 1 = invalid)
   */
  getStatus(listId: string, index: number): Promise<StatusValue>;
  /**
   * Calculate ETag for cache validation
   *
   * @param listId - Status list ID
   * @returns ETag string
   */
  calculateETag(listId: string): Promise<string>;
}
export { StatusValue };
//# sourceMappingURL=status-list-manager.d.ts.map
