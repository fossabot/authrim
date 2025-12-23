/**
 * Tombstone Repository
 *
 * Repository for tracking PII deletions for GDPR Art.17 compliance.
 * Stores deletion facts (not PII) to:
 * - Prevent re-registration of deleted accounts during retention period
 * - Provide audit trail for compliance
 * - Support "right to be forgotten" implementation
 *
 * Design decisions:
 * - NO PII stored (only email_blind_index for duplicate prevention)
 * - Auto-expires after retention_until
 * - Tracks who/when/why deleted
 */
import type { DatabaseAdapter } from '../../db/adapter';
import { BaseRepository, type BaseEntity } from '../base';
/**
 * Tombstone entity
 */
export interface Tombstone extends BaseEntity {
  tenant_id: string;
  email_blind_index: string | null;
  deleted_at: number;
  deleted_by: string | null;
  deletion_reason: string | null;
  retention_until: number;
  deletion_metadata: string | null;
}
/**
 * Deletion reason types
 */
export type DeletionReason =
  | 'user_request'
  | 'admin_action'
  | 'inactivity'
  | 'account_abuse'
  | 'data_breach_response'
  | 'other';
/**
 * Tombstone create input
 */
export interface CreateTombstoneInput {
  id: string;
  tenant_id?: string;
  email_blind_index?: string | null;
  deleted_by?: string | null;
  deletion_reason?: DeletionReason | string | null;
  retention_days?: number;
  metadata?: Record<string, unknown>;
}
/**
 * Tombstone Repository
 */
export declare class TombstoneRepository extends BaseRepository<Tombstone> {
  /** Default retention period in days */
  static readonly DEFAULT_RETENTION_DAYS = 90;
  /** Maximum allowed limit for queries */
  private static readonly MAX_QUERY_LIMIT;
  /**
   * Validate and normalize limit parameter
   * @param limit - Requested limit
   * @returns Validated limit (1-1000)
   */
  private validateLimit;
  constructor(adapter: DatabaseAdapter);
  /**
   * Create tombstone record
   *
   * @param input - Tombstone data
   * @param adapter - Optional partition-specific adapter
   * @returns Created tombstone
   */
  createTombstone(input: CreateTombstoneInput, adapter?: DatabaseAdapter): Promise<Tombstone>;
  /**
   * Find tombstone by original user ID
   *
   * @param userId - Original user ID
   * @param adapter - Optional partition-specific adapter
   * @returns Tombstone or null
   */
  findByUserId(userId: string, adapter?: DatabaseAdapter): Promise<Tombstone | null>;
  /**
   * Check if email is in tombstone (prevents re-registration)
   *
   * @param emailBlindIndex - Email blind index
   * @param tenantId - Tenant ID
   * @param adapter - Optional partition-specific adapter
   * @returns True if email is tombstoned and retention not expired
   */
  isEmailTombstoned(
    emailBlindIndex: string,
    tenantId: string,
    adapter?: DatabaseAdapter
  ): Promise<boolean>;
  /**
   * Get tombstone for email (if exists and not expired)
   *
   * @param emailBlindIndex - Email blind index
   * @param tenantId - Tenant ID
   * @param adapter - Optional partition-specific adapter
   * @returns Tombstone or null
   */
  findByEmailBlindIndex(
    emailBlindIndex: string,
    tenantId: string,
    adapter?: DatabaseAdapter
  ): Promise<Tombstone | null>;
  /**
   * Find expired tombstones for cleanup
   *
   * @param limit - Maximum number to return (1-1000, default 1000)
   * @param adapter - Optional partition-specific adapter
   * @returns Expired tombstones
   */
  findExpired(limit?: number, adapter?: DatabaseAdapter): Promise<Tombstone[]>;
  /**
   * Delete expired tombstones
   *
   * @param adapter - Optional partition-specific adapter
   * @returns Number of deleted tombstones
   */
  cleanupExpired(adapter?: DatabaseAdapter): Promise<number>;
  /**
   * Get tombstone statistics
   *
   * @param tenantId - Optional tenant filter
   * @param adapter - Optional partition-specific adapter
   * @returns Statistics
   */
  getStats(
    tenantId?: string,
    adapter?: DatabaseAdapter
  ): Promise<{
    total: number;
    expired: number;
    active: number;
    byReason: Map<string, number>;
  }>;
  /**
   * List recent tombstones
   *
   * @param tenantId - Optional tenant filter
   * @param limit - Maximum number to return (1-1000, default 100)
   * @param adapter - Optional partition-specific adapter
   * @returns Recent tombstones
   */
  listRecent(tenantId?: string, limit?: number, adapter?: DatabaseAdapter): Promise<Tombstone[]>;
}
//# sourceMappingURL=tombstone.d.ts.map
