/**
 * PII Audit Log Repository
 *
 * Repository for PII access audit logs stored in D1_PII.
 *
 * Purpose:
 * - Compliance auditing: Track all PII access
 * - GDPR/CCPA evidence: "Who accessed what, when"
 * - Security monitoring: Detect unauthorized access patterns
 *
 * Note: This D1 table serves as a "recent buffer".
 * Audit logs should be periodically exported to R2/Logpush/SIEM
 * for long-term retention (1-7 years).
 *
 * Fields:
 * - id: Record ID (UUID)
 * - tenant_id: Tenant ID
 * - user_id: Actor who accessed PII
 * - action: Action performed
 * - target_user_id: Whose PII was accessed
 * - details: Action details (JSON)
 * - ip_address: Request IP
 * - user_agent: Request user agent
 * - created_at: Timestamp
 * - exported_at: Export timestamp (NULL = not exported)
 */
import type { DatabaseAdapter } from '../../db/adapter';
import {
  BaseRepository,
  type BaseEntity,
  type PaginationOptions,
  type PaginationResult,
} from '../base';
/**
 * PII Audit Action types
 */
export type PIIAuditAction =
  | 'pii_accessed'
  | 'pii_created'
  | 'pii_updated'
  | 'pii_deleted'
  | 'pii_exported'
  | 'pii_viewed'
  | 'pii_searched';
/**
 * PII Audit Log entity
 */
export interface PIIAuditLog extends BaseEntity {
  tenant_id: string;
  user_id: string | null;
  action: PIIAuditAction;
  target_user_id: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  exported_at: number | null;
}
/**
 * PII Audit Log create input
 */
export interface CreatePIIAuditLogInput {
  id?: string;
  tenant_id?: string;
  user_id?: string | null;
  action: PIIAuditAction;
  target_user_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}
/**
 * PII Audit Log filter options
 */
export interface PIIAuditLogFilterOptions {
  tenant_id?: string;
  user_id?: string;
  target_user_id?: string;
  action?: PIIAuditAction;
  from_date?: number;
  to_date?: number;
  exported?: boolean;
}
/**
 * PII Audit Log Repository
 */
export declare class PIIAuditLogRepository extends BaseRepository<PIIAuditLog> {
  /**
   * Validate and normalize limit parameter
   * @param limit - Requested limit
   * @returns Validated limit (1-10000)
   */
  private validateLimit;
  constructor(adapter: DatabaseAdapter);
  /**
   * Create an audit log entry
   *
   * @param input - Audit log data
   * @param adapter - Optional partition-specific adapter
   * @returns Created audit log
   */
  createAuditLog(input: CreatePIIAuditLogInput, adapter?: DatabaseAdapter): Promise<PIIAuditLog>;
  /**
   * Log PII access
   *
   * Convenience method for common PII access logging.
   *
   * @param userId - Actor user ID
   * @param targetUserId - Target user ID
   * @param action - Action performed
   * @param details - Additional details
   * @param context - Request context (IP, user agent)
   * @param adapter - Optional partition-specific adapter
   * @returns Created audit log
   */
  logAccess(
    userId: string | null,
    targetUserId: string,
    action: PIIAuditAction,
    details?: Record<string, unknown>,
    context?: {
      ip_address?: string;
      user_agent?: string;
      tenant_id?: string;
    },
    adapter?: DatabaseAdapter
  ): Promise<PIIAuditLog>;
  /**
   * Find audit logs by actor user
   *
   * @param userId - Actor user ID
   * @param options - Pagination options
   * @param adapter - Optional partition-specific adapter
   * @returns Paginated audit logs
   */
  findByUser(
    userId: string,
    options?: PaginationOptions,
    adapter?: DatabaseAdapter
  ): Promise<PaginationResult<PIIAuditLog>>;
  /**
   * Find audit logs by target user
   *
   * @param targetUserId - Target user ID
   * @param options - Pagination options
   * @param adapter - Optional partition-specific adapter
   * @returns Paginated audit logs
   */
  findByTargetUser(
    targetUserId: string,
    options?: PaginationOptions,
    adapter?: DatabaseAdapter
  ): Promise<PaginationResult<PIIAuditLog>>;
  /**
   * Find audit logs by action type
   *
   * @param action - Action type
   * @param options - Pagination options
   * @param adapter - Optional partition-specific adapter
   * @returns Paginated audit logs
   */
  findByAction(
    action: PIIAuditAction,
    options?: PaginationOptions,
    adapter?: DatabaseAdapter
  ): Promise<PaginationResult<PIIAuditLog>>;
  /**
   * Find unexported audit logs
   *
   * Used by export job to find records to export.
   *
   * @param limit - Maximum records to return (1-10000, default 1000)
   * @param adapter - Optional partition-specific adapter
   * @returns Unexported audit logs
   */
  findUnexported(limit?: number, adapter?: DatabaseAdapter): Promise<PIIAuditLog[]>;
  /**
   * Mark audit logs as exported
   *
   * Processes in batches to prevent SQL query from becoming too long.
   * Uses sequential processing to avoid D1 connection limits.
   *
   * @param ids - Audit log IDs to mark
   * @param adapter - Optional partition-specific adapter
   * @returns Number of marked records
   */
  markExported(ids: string[], adapter?: DatabaseAdapter): Promise<number>;
  /**
   * Delete old exported audit logs
   *
   * Used for cleanup after successful export to long-term storage.
   *
   * @param beforeDate - Delete records exported before this timestamp
   * @param adapter - Optional partition-specific adapter
   * @returns Number of deleted records
   */
  deleteExported(beforeDate: number, adapter?: DatabaseAdapter): Promise<number>;
  /**
   * Get action statistics
   *
   * @param tenantId - Optional tenant filter
   * @param adapter - Optional partition-specific adapter
   * @returns Map of action → count
   */
  getActionStats(
    tenantId?: string,
    adapter?: DatabaseAdapter
  ): Promise<Map<PIIAuditAction, number>>;
  /**
   * Get export statistics
   *
   * @param adapter - Optional partition-specific adapter
   * @returns Export statistics
   */
  getExportStats(adapter?: DatabaseAdapter): Promise<{
    totalRecords: number;
    exportedRecords: number;
    pendingRecords: number;
  }>;
  /**
   * Get parsed details
   *
   * @param auditLog - Audit log with details
   * @returns Parsed details or null
   */
  getDetails(auditLog: PIIAuditLog): Record<string, unknown> | null;
}
//# sourceMappingURL=audit-log.d.ts.map
