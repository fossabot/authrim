/**
 * User Core Repository
 *
 * Repository for non-PII user data stored in D1_CORE.
 * Contains authentication-related data without personal information.
 *
 * Fields stored in Core DB:
 * - id: User ID (UUID)
 * - tenant_id: Tenant ID for multi-tenant support
 * - email_verified: Whether email is verified
 * - phone_number_verified: Whether phone is verified
 * - email_domain_hash: Blind index for domain-based rules (Phase 8)
 * - password_hash: Hashed password
 * - is_active: Soft delete flag
 * - user_type: 'end_user' | 'admin' | 'm2m'
 * - pii_partition: Which PII DB contains user's PII
 * - pii_status: PII write status (none/pending/active/failed/deleted)
 * - created_at, updated_at, last_login_at: Timestamps
 */
import type { DatabaseAdapter, PIIStatus } from '../../db/adapter';
import {
  BaseRepository,
  type BaseEntity,
  type PaginationOptions,
  type PaginationResult,
} from '../base';
/**
 * Core user type enumeration
 *
 * Note: Named CoreUserType to avoid conflict with UserType in types/rbac.ts
 */
export type CoreUserType = 'end_user' | 'admin' | 'm2m';
/**
 * User Core entity (Non-PII)
 */
export interface UserCore extends BaseEntity {
  tenant_id: string;
  email_verified: boolean;
  phone_number_verified: boolean;
  email_domain_hash: string | null;
  password_hash: string | null;
  is_active: boolean;
  user_type: CoreUserType;
  pii_partition: string;
  pii_status: PIIStatus;
  last_login_at: number | null;
}
/**
 * User Core create input
 */
export interface CreateUserCoreInput {
  id?: string;
  tenant_id?: string;
  email_verified?: boolean;
  phone_number_verified?: boolean;
  email_domain_hash?: string | null;
  password_hash?: string | null;
  is_active?: boolean;
  user_type?: CoreUserType;
  pii_partition?: string;
  pii_status?: PIIStatus;
}
/**
 * User Core update input
 */
export interface UpdateUserCoreInput {
  email_verified?: boolean;
  phone_number_verified?: boolean;
  email_domain_hash?: string | null;
  password_hash?: string | null;
  is_active?: boolean;
  user_type?: CoreUserType;
  pii_partition?: string;
  pii_status?: PIIStatus;
  last_login_at?: number | null;
}
/**
 * User Core filter options
 */
export interface UserCoreFilterOptions {
  tenant_id?: string;
  user_type?: CoreUserType;
  pii_status?: PIIStatus;
  is_active?: boolean;
  email_verified?: boolean;
  pii_partition?: string;
}
/**
 * User Core Repository
 */
export declare class UserCoreRepository extends BaseRepository<UserCore> {
  constructor(adapter: DatabaseAdapter);
  /**
   * Create a new user in Core DB
   *
   * @param input - User creation input
   * @returns Created user
   */
  createUser(input: CreateUserCoreInput): Promise<UserCore>;
  /**
   * Update PII status
   *
   * Used for tracking distributed PII write state:
   * - 'pending' → 'active': PII write succeeded
   * - 'pending' → 'failed': PII write failed
   * - 'active' → 'deleted': GDPR deletion completed
   *
   * @param userId - User ID
   * @param status - New PII status
   * @returns True if updated
   */
  updatePIIStatus(userId: string, status: PIIStatus): Promise<boolean>;
  /**
   * Update last login timestamp
   *
   * @param userId - User ID
   * @returns True if updated
   */
  updateLastLogin(userId: string): Promise<boolean>;
  /**
   * Find user by tenant and ID
   *
   * @param tenantId - Tenant ID
   * @param userId - User ID
   * @returns User or null
   */
  findByTenantAndId(tenantId: string, userId: string): Promise<UserCore | null>;
  /** Maximum allowed limit for queries */
  private static readonly MAX_QUERY_LIMIT;
  /**
   * Validate and normalize limit parameter
   * @param limit - Requested limit
   * @returns Validated limit (1-1000)
   */
  private validateLimit;
  /**
   * Find users by PII status
   *
   * Used to find users with failed PII writes for retry.
   *
   * @param status - PII status to filter by
   * @param tenantId - Optional tenant filter
   * @param limit - Maximum number of results (1-1000, default 100)
   * @returns Users with matching PII status
   */
  findByPIIStatus(status: PIIStatus, tenantId?: string, limit?: number): Promise<UserCore[]>;
  /**
   * Find users by PII partition
   *
   * @param partition - PII partition name
   * @param options - Pagination options
   * @returns Paginated users
   */
  findByPartition(
    partition: string,
    options?: PaginationOptions
  ): Promise<PaginationResult<UserCore>>;
  /**
   * Find users by email domain hash
   *
   * Used for domain-based role assignment (Phase 8).
   *
   * @param domainHash - Email domain blind index
   * @param tenantId - Optional tenant filter
   * @returns Users with matching domain
   */
  findByEmailDomainHash(domainHash: string, tenantId?: string): Promise<UserCore[]>;
  /**
   * Search users with filters
   *
   * @param filters - Filter options
   * @param options - Pagination options
   * @returns Paginated users
   */
  searchUsers(
    filters: UserCoreFilterOptions,
    options?: PaginationOptions
  ): Promise<PaginationResult<UserCore>>;
  /**
   * Get partition statistics
   *
   * Returns count of users per PII partition.
   *
   * @param tenantId - Optional tenant filter
   * @returns Map of partition name to user count
   */
  getPartitionStats(tenantId?: string): Promise<Map<string, number>>;
  /**
   * Get PII status statistics
   *
   * Returns count of users per PII status.
   *
   * @param tenantId - Optional tenant filter
   * @returns Map of status to user count
   */
  getPIIStatusStats(tenantId?: string): Promise<Map<PIIStatus, number>>;
  /**
   * Override findById to convert boolean fields
   */
  findById(id: string): Promise<UserCore | null>;
  /**
   * Map database row to entity (convert integers to booleans)
   */
  private mapRowToEntity;
}
//# sourceMappingURL=user-core.d.ts.map
