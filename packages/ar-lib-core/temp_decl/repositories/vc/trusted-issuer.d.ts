/**
 * Trusted Issuer Repository
 *
 * Repository for managing trusted VC issuers.
 * Stores issuer DIDs and their trust configurations.
 */
import type { DatabaseAdapter } from '../../db/adapter';
import {
  BaseRepository,
  type BaseEntity,
  type PaginationOptions,
  type PaginationResult,
} from '../base';
/**
 * Trust level for issuers
 */
export type TrustLevel = 'standard' | 'high';
/**
 * Issuer status
 */
export type IssuerStatus = 'active' | 'suspended' | 'revoked';
/**
 * Trusted Issuer entity
 */
export interface TrustedIssuer extends BaseEntity {
  tenant_id: string;
  issuer_did: string;
  display_name: string | null;
  credential_types: string | null;
  trust_level: TrustLevel;
  jwks_uri: string | null;
  status: IssuerStatus;
}
/**
 * Input for creating a trusted issuer
 */
export interface CreateTrustedIssuerInput {
  id?: string;
  tenant_id: string;
  issuer_did: string;
  display_name?: string | null;
  credential_types?: string[];
  trust_level?: TrustLevel;
  jwks_uri?: string | null;
  status?: IssuerStatus;
}
/**
 * Input for updating a trusted issuer
 */
export interface UpdateTrustedIssuerInput {
  display_name?: string | null;
  credential_types?: string[];
  trust_level?: TrustLevel;
  jwks_uri?: string | null;
  status?: IssuerStatus;
}
/**
 * Filter options for trusted issuers
 */
export interface TrustedIssuerFilterOptions {
  tenant_id?: string;
  issuer_did?: string;
  trust_level?: TrustLevel;
  status?: IssuerStatus;
}
/**
 * Trusted Issuer Repository
 */
export declare class TrustedIssuerRepository extends BaseRepository<TrustedIssuer> {
  constructor(adapter: DatabaseAdapter);
  /**
   * Create a new trusted issuer
   */
  createTrustedIssuer(input: CreateTrustedIssuerInput): Promise<TrustedIssuer>;
  /**
   * Find a trusted issuer by tenant and DID
   */
  findByTenantAndDid(tenantId: string, issuerDid: string): Promise<TrustedIssuer | null>;
  /**
   * Find an active trusted issuer by tenant and DID
   */
  findActiveTrustedIssuer(tenantId: string, issuerDid: string): Promise<TrustedIssuer | null>;
  /**
   * Find all trusted issuers for a tenant
   */
  findByTenant(
    tenantId: string,
    options?: PaginationOptions
  ): Promise<PaginationResult<TrustedIssuer>>;
  /**
   * Search trusted issuers with filters
   */
  searchIssuers(
    filters: TrustedIssuerFilterOptions,
    options?: PaginationOptions
  ): Promise<PaginationResult<TrustedIssuer>>;
  /**
   * Update issuer status
   */
  updateStatus(id: string, status: IssuerStatus): Promise<boolean>;
  /**
   * Check if an issuer is trusted (active status) for a tenant
   */
  isTrusted(tenantId: string, issuerDid: string): Promise<boolean>;
  /**
   * Parse credential types JSON
   */
  parseCredentialTypes(issuer: TrustedIssuer): string[];
}
//# sourceMappingURL=trusted-issuer.d.ts.map
