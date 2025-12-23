/**
 * User PII Repository
 *
 * Repository for PII (Personal Identifiable Information) stored in D1_PII.
 * Contains personal information separated from Core DB for:
 * - GDPR/CCPA compliance
 * - Regional data residency
 * - Fine-grained access control
 *
 * Fields stored in PII DB:
 * - id: User ID (same as users_core.id, logical FK)
 * - tenant_id: Tenant ID
 * - pii_class: Sensitivity classification
 * - email, phone_number: Contact info (IDENTITY_CORE)
 * - name, picture: Profile info (PROFILE)
 * - gender, birthdate: Demographic info (DEMOGRAPHIC)
 * - address_*: Location info (LOCATION)
 * - declared_residence: User-declared residence for partition routing
 *
 * Note: This repository accepts a DatabaseAdapter which should be
 * the correct PII partition adapter from PIIPartitionRouter.
 */
import type { DatabaseAdapter, PIIClass } from '../../db/adapter';
import {
  BaseRepository,
  type BaseEntity,
  type PaginationOptions,
  type PaginationResult,
} from '../base';
/**
 * User PII entity
 */
export interface UserPII extends BaseEntity {
  tenant_id: string;
  pii_class: PIIClass;
  email: string;
  email_blind_index: string | null;
  phone_number: string | null;
  name: string | null;
  given_name: string | null;
  family_name: string | null;
  nickname: string | null;
  preferred_username: string | null;
  picture: string | null;
  website: string | null;
  gender: string | null;
  birthdate: string | null;
  locale: string | null;
  zoneinfo: string | null;
  address_formatted: string | null;
  address_street_address: string | null;
  address_locality: string | null;
  address_region: string | null;
  address_postal_code: string | null;
  address_country: string | null;
  declared_residence: string | null;
}
/**
 * User PII create input
 */
export interface CreateUserPIIInput {
  id: string;
  tenant_id?: string;
  pii_class?: PIIClass;
  email: string;
  email_blind_index?: string | null;
  phone_number?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  nickname?: string | null;
  preferred_username?: string | null;
  picture?: string | null;
  website?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  locale?: string | null;
  zoneinfo?: string | null;
  address_formatted?: string | null;
  address_street_address?: string | null;
  address_locality?: string | null;
  address_region?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  declared_residence?: string | null;
}
/**
 * User PII update input
 */
export interface UpdateUserPIIInput {
  pii_class?: PIIClass;
  email?: string;
  email_blind_index?: string | null;
  phone_number?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  nickname?: string | null;
  preferred_username?: string | null;
  picture?: string | null;
  website?: string | null;
  gender?: string | null;
  birthdate?: string | null;
  locale?: string | null;
  zoneinfo?: string | null;
  address_formatted?: string | null;
  address_street_address?: string | null;
  address_locality?: string | null;
  address_region?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  declared_residence?: string | null;
}
/**
 * OIDC Standard Claims subset
 * Returned from /userinfo endpoint
 */
export interface OIDCUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  nickname?: string;
  preferred_username?: string;
  picture?: string;
  website?: string;
  gender?: string;
  birthdate?: string;
  locale?: string;
  zoneinfo?: string;
  address?: {
    formatted?: string;
    street_address?: string;
    locality?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
}
/**
 * User PII Repository
 *
 * Note: Unlike other repositories, methods may accept an optional adapter
 * to support partition-specific queries. If not provided, uses the default adapter.
 */
export declare class UserPIIRepository extends BaseRepository<UserPII> {
  constructor(adapter: DatabaseAdapter);
  /**
   * Validate field name for update operations (prevents SQL injection)
   *
   * @param field - Field name to validate
   * @returns True if field is allowed for update
   */
  private isValidUpdateField;
  /**
   * Create user PII record
   *
   * @param input - PII data
   * @param adapter - Optional partition-specific adapter
   * @returns Created PII record
   */
  createPII(input: CreateUserPIIInput, adapter?: DatabaseAdapter): Promise<UserPII>;
  /**
   * Find PII by user ID
   *
   * @param userId - User ID
   * @param adapter - Optional partition-specific adapter
   * @returns PII record or null
   */
  findByUserId(userId: string, adapter?: DatabaseAdapter): Promise<UserPII | null>;
  /**
   * Find PII by email blind index
   *
   * @param blindIndex - Email blind index
   * @param tenantId - Tenant ID
   * @param adapter - Optional partition-specific adapter
   * @returns PII record or null
   */
  findByEmailBlindIndex(
    blindIndex: string,
    tenantId: string,
    adapter?: DatabaseAdapter
  ): Promise<UserPII | null>;
  /**
   * Update PII record
   *
   * @param userId - User ID
   * @param data - Fields to update
   * @param adapter - Optional partition-specific adapter
   * @returns Updated PII or null if not found
   * @throws Error if invalid field names are provided
   */
  updatePII(
    userId: string,
    data: UpdateUserPIIInput,
    adapter?: DatabaseAdapter
  ): Promise<UserPII | null>;
  /**
   * Delete PII record (hard delete for GDPR)
   *
   * @param userId - User ID
   * @param adapter - Optional partition-specific adapter
   * @returns True if deleted
   */
  deletePII(userId: string, adapter?: DatabaseAdapter): Promise<boolean>;
  /**
   * Convert PII to OIDC UserInfo format
   *
   * @param pii - PII record
   * @param emailVerified - From users_core
   * @param phoneNumberVerified - From users_core
   * @returns OIDC UserInfo object
   */
  toOIDCUserInfo(pii: UserPII, emailVerified: boolean, phoneNumberVerified: boolean): OIDCUserInfo;
  /**
   * Search users by tenant
   *
   * @param tenantId - Tenant ID
   * @param options - Pagination options
   * @param adapter - Optional partition-specific adapter
   * @returns Paginated PII records
   */
  findByTenant(
    tenantId: string,
    options?: PaginationOptions,
    adapter?: DatabaseAdapter
  ): Promise<PaginationResult<UserPII>>;
  /**
   * Find PII by tenant and email
   *
   * Used for email uniqueness checks during user creation.
   *
   * @param tenantId - Tenant ID
   * @param email - Email address
   * @param adapter - Optional partition-specific adapter
   * @returns PII record or null
   */
  findByTenantAndEmail(
    tenantId: string,
    email: string,
    adapter?: DatabaseAdapter
  ): Promise<UserPII | null>;
  /**
   * Check if email exists in tenant
   *
   * More efficient than findByTenantAndEmail when only checking existence.
   *
   * @param tenantId - Tenant ID
   * @param email - Email address
   * @param adapter - Optional partition-specific adapter
   * @returns True if email exists
   */
  emailExists(tenantId: string, email: string, adapter?: DatabaseAdapter): Promise<boolean>;
}
//# sourceMappingURL=user-pii.d.ts.map
