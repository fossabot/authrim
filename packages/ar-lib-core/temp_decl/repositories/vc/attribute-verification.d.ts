/**
 * Attribute Verification Repository
 *
 * Repository for storing VC verification records.
 * Implements data minimization - raw VCs are NOT stored,
 * only verification results (boolean/enum) are persisted.
 */
import type { DatabaseAdapter } from '../../db/adapter';
import {
  BaseRepository,
  type BaseEntity,
  type PaginationOptions,
  type PaginationResult,
} from '../base';
/**
 * Verification result status
 */
export type VerificationResultStatus = 'verified' | 'failed' | 'expired';
/**
 * Attribute Verification entity
 */
export interface AttributeVerification extends BaseEntity {
  tenant_id: string;
  user_id: string | null;
  vp_request_id: string | null;
  issuer_did: string;
  credential_type: string;
  format: string;
  verification_result: VerificationResultStatus;
  holder_binding_verified: boolean;
  issuer_trusted: boolean;
  status_valid: boolean;
  mapped_attribute_ids: string | null;
  verified_at: number;
  expires_at: number | null;
}
/**
 * Input for creating an attribute verification
 */
export interface CreateAttributeVerificationInput {
  id?: string;
  tenant_id: string;
  user_id?: string | null;
  vp_request_id?: string | null;
  issuer_did: string;
  credential_type: string;
  format: string;
  verification_result: VerificationResultStatus;
  holder_binding_verified: boolean;
  issuer_trusted: boolean;
  status_valid: boolean;
  mapped_attribute_ids?: string[];
  expires_at?: number | null;
}
/**
 * Filter options for attribute verifications
 */
export interface AttributeVerificationFilterOptions {
  tenant_id?: string;
  user_id?: string;
  vp_request_id?: string;
  verification_result?: VerificationResultStatus;
  issuer_did?: string;
}
/**
 * Attribute Verification Repository
 */
export declare class AttributeVerificationRepository extends BaseRepository<AttributeVerification> {
  constructor(adapter: DatabaseAdapter);
  /**
   * Create a new attribute verification record
   */
  createVerification(input: CreateAttributeVerificationInput): Promise<AttributeVerification>;
  /**
   * Find verifications by user
   */
  findByUser(
    tenantId: string,
    userId: string,
    options?: PaginationOptions
  ): Promise<PaginationResult<AttributeVerification>>;
  /**
   * Find verification by VP request ID
   */
  findByVPRequestId(vpRequestId: string): Promise<AttributeVerification | null>;
  /**
   * Link verification to a user (called after user login association)
   */
  linkToUser(verificationId: string, userId: string): Promise<boolean>;
  /**
   * Update mapped attribute IDs
   */
  updateMappedAttributeIds(verificationId: string, attributeIds: string[]): Promise<boolean>;
  /**
   * Search verifications with filters
   */
  searchVerifications(
    filters: AttributeVerificationFilterOptions,
    options?: PaginationOptions
  ): Promise<PaginationResult<AttributeVerification>>;
  /**
   * Get verification statistics for a tenant
   */
  getStats(tenantId: string): Promise<{
    total: number;
    verified: number;
    failed: number;
    expired: number;
  }>;
  /**
   * Delete all verifications for a user (account deletion)
   */
  deleteAllForUser(tenantId: string, userId: string): Promise<number>;
  /**
   * Parse mapped attribute IDs JSON
   */
  parseMappedAttributeIds(verification: AttributeVerification): string[];
}
//# sourceMappingURL=attribute-verification.d.ts.map
