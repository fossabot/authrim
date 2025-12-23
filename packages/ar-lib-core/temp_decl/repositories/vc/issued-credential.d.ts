/**
 * Issued Credential Repository
 *
 * Repository for tracking credentials issued by Authrim.
 * Note: Raw credential content is NOT stored - only metadata.
 */
import type { DatabaseAdapter } from '../../db/adapter';
import {
  BaseRepository,
  type BaseEntity,
  type PaginationOptions,
  type PaginationResult,
} from '../base';
/**
 * Credential status
 */
export type CredentialStatus = 'active' | 'revoked' | 'suspended' | 'deferred';
/**
 * Issued Credential entity
 */
export interface IssuedCredential extends BaseEntity {
  tenant_id: string;
  user_id: string;
  credential_type: string;
  format: string;
  claims: string;
  status: CredentialStatus;
  status_list_id: string | null;
  status_list_index: number | null;
  holder_binding: string | null;
  expires_at: number | null;
}
/**
 * Input for creating an issued credential record
 */
export interface CreateIssuedCredentialInput {
  id?: string;
  tenant_id: string;
  user_id: string;
  credential_type: string;
  format: string;
  claims?: Record<string, unknown>;
  status?: CredentialStatus;
  status_list_id?: string | null;
  status_list_index?: number | null;
  holder_binding?: object | null;
  expires_at?: number | null;
}
/**
 * Input for updating an issued credential
 */
export interface UpdateIssuedCredentialInput {
  status?: CredentialStatus;
  claims?: Record<string, unknown>;
}
/**
 * Filter options for issued credentials
 */
export interface IssuedCredentialFilterOptions {
  tenant_id?: string;
  user_id?: string;
  credential_type?: string;
  status?: CredentialStatus;
}
/**
 * Issued Credential Repository
 */
export declare class IssuedCredentialRepository extends BaseRepository<IssuedCredential> {
  constructor(adapter: DatabaseAdapter);
  /**
   * Create a new issued credential record
   */
  createCredential(input: CreateIssuedCredentialInput): Promise<IssuedCredential>;
  /**
   * Find credential by ID and user (ownership verification)
   */
  findByIdAndUser(id: string, userId: string): Promise<IssuedCredential | null>;
  /**
   * Find deferred credential by transaction ID and user
   */
  findDeferredByIdAndUser(transactionId: string, userId: string): Promise<IssuedCredential | null>;
  /**
   * Find credentials by user
   */
  findByUser(
    tenantId: string,
    userId: string,
    options?: PaginationOptions
  ): Promise<PaginationResult<IssuedCredential>>;
  /**
   * Update credential status
   */
  updateStatus(id: string, status: CredentialStatus): Promise<boolean>;
  /**
   * Update credential claims (for deferred issuance)
   */
  updateClaims(id: string, claims: Record<string, unknown>): Promise<boolean>;
  /**
   * Revoke a credential
   */
  revoke(id: string): Promise<boolean>;
  /**
   * Search credentials with filters
   */
  searchCredentials(
    filters: IssuedCredentialFilterOptions,
    options?: PaginationOptions
  ): Promise<PaginationResult<IssuedCredential>>;
  /**
   * Get credential statistics for a tenant
   */
  getStats(tenantId: string): Promise<{
    total: number;
    active: number;
    revoked: number;
    suspended: number;
    deferred: number;
  }>;
  /**
   * Find credentials by status list index (for status list updates)
   */
  findByStatusListIndex(index: number): Promise<IssuedCredential | null>;
  /**
   * Get next available status list index
   */
  getNextStatusListIndex(tenantId: string): Promise<number>;
  /**
   * Parse claims JSON
   */
  parseClaims(credential: IssuedCredential): Record<string, unknown>;
  /**
   * Parse holder binding JSON
   */
  parseHolderBinding(credential: IssuedCredential): object | null;
}
//# sourceMappingURL=issued-credential.d.ts.map
