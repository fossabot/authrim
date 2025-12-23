/**
 * User Verified Attribute Repository
 *
 * Repository for storing normalized, verified attributes from VCs.
 * Implements data minimization - raw VC claims are discarded,
 * only normalized boolean/enum values are stored.
 */
import type { DatabaseAdapter } from '../../db/adapter';
import {
  BaseRepository,
  type BaseEntity,
  type PaginationOptions,
  type PaginationResult,
} from '../base';
/**
 * Source type for attributes
 */
export type AttributeSourceType = 'vc' | 'saml' | 'manual';
/**
 * User Verified Attribute entity
 */
export interface UserVerifiedAttribute extends BaseEntity {
  tenant_id: string;
  user_id: string;
  attribute_name: string;
  attribute_value: string;
  source_type: AttributeSourceType;
  issuer_did: string | null;
  verification_id: string | null;
  verified_at: number;
  expires_at: number | null;
}
/**
 * Input for creating/upserting a verified attribute
 */
export interface CreateUserVerifiedAttributeInput {
  id?: string;
  tenant_id: string;
  user_id: string;
  attribute_name: string;
  attribute_value: string;
  source_type: AttributeSourceType;
  issuer_did?: string | null;
  verification_id?: string | null;
  expires_at?: number | null;
}
/**
 * Filter options for user verified attributes
 */
export interface UserVerifiedAttributeFilterOptions {
  tenant_id?: string;
  user_id?: string;
  attribute_name?: string;
  source_type?: AttributeSourceType;
}
/**
 * User Verified Attribute Repository
 */
export declare class UserVerifiedAttributeRepository extends BaseRepository<UserVerifiedAttribute> {
  constructor(adapter: DatabaseAdapter);
  /**
   * Upsert a verified attribute
   *
   * If attribute exists (same tenant, user, name), update it.
   * Otherwise, insert a new record.
   */
  upsertAttribute(input: CreateUserVerifiedAttributeInput): Promise<UserVerifiedAttribute>;
  /**
   * Get all valid (non-expired) attributes for a user
   */
  getValidAttributesForUser(tenantId: string, userId: string): Promise<Record<string, string>>;
  /**
   * Check if a user has a specific verified attribute
   */
  hasAttribute(
    tenantId: string,
    userId: string,
    attributeName: string,
    expectedValue?: string
  ): Promise<boolean>;
  /**
   * Get a specific attribute for a user
   */
  getAttribute(
    tenantId: string,
    userId: string,
    attributeName: string
  ): Promise<UserVerifiedAttribute | null>;
  /**
   * Delete a specific attribute (GDPR: right to be forgotten)
   */
  deleteAttribute(tenantId: string, userId: string, attributeName: string): Promise<boolean>;
  /**
   * Delete all attributes for a user (account deletion)
   */
  deleteAllForUser(tenantId: string, userId: string): Promise<number>;
  /**
   * Find attributes by verification ID
   */
  findByVerificationId(verificationId: string): Promise<UserVerifiedAttribute[]>;
  /**
   * Search attributes with filters
   */
  searchAttributes(
    filters: UserVerifiedAttributeFilterOptions,
    options?: PaginationOptions
  ): Promise<PaginationResult<UserVerifiedAttribute>>;
  /**
   * Delete expired attributes (cleanup job)
   */
  deleteExpired(): Promise<number>;
}
//# sourceMappingURL=user-verified-attribute.d.ts.map
