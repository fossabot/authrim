/**
 * Status List Repository (D1 Implementation)
 *
 * Repository for managing Bitstring Status List records.
 * Implements the StatusListRepository interface for D1 database.
 */
import type { DatabaseAdapter } from '../../db/adapter';
import type {
  StatusListRepository as IStatusListRepository,
  StatusListRecord,
  StatusListPurpose,
  StatusListState,
} from '../../vc/status-list-manager';
/**
 * D1 Status List Repository Implementation
 *
 * Named D1StatusListRepository to avoid conflict with the interface from status-list-manager.
 */
export declare class D1StatusListRepository implements IStatusListRepository {
  private readonly adapter;
  constructor(adapter: DatabaseAdapter);
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
  /**
   * Archive old sealed lists
   */
  archiveSealedLists(tenantId: string, olderThanDays?: number): Promise<number>;
  /**
   * Get statistics for tenant
   */
  getStats(tenantId: string): Promise<{
    total: number;
    active: number;
    sealed: number;
    archived: number;
    totalCapacity: number;
    totalUsed: number;
  }>;
}
//# sourceMappingURL=status-list.d.ts.map
