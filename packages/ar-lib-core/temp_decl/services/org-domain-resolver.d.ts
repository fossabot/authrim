/**
 * Organization Domain Resolver Service
 *
 * Resolves organizations from email domain hashes and handles
 * organization membership management for JIT Provisioning.
 *
 * Features:
 * - Domain hash to organization resolution
 * - Multiple organization matching with priority
 * - Organization membership creation
 * - Respect for JIT Provisioning configuration
 */
import type { D1Database } from '@cloudflare/workers-types';
import type { OrgDomainMapping } from '../types/policy-rules';
import type { JITProvisioningConfig } from '../types/jit-config';
/**
 * Resolved organization information
 */
export interface ResolvedOrganization {
  org_id: string;
  auto_join_enabled: boolean;
  auto_assign_role_id: string | null;
  membership_type: 'member' | 'admin' | 'owner';
  verified: boolean;
  priority: number;
}
/**
 * Organization join result
 */
export interface OrgJoinResult {
  success: boolean;
  org_id: string;
  membership_id?: string;
  role_assignment_id?: string;
  error?: string;
}
/**
 * Organization membership type (re-exported from types/policy-rules)
 */
type MembershipType = 'member' | 'admin' | 'owner';
/**
 * Resolve organization by domain hash
 *
 * Selection rules (ORDER BY):
 * 1. verified DESC (verified domains first)
 * 2. priority DESC (higher priority first)
 * 3. created_at ASC (older mappings first for tie-breaking)
 *
 * @param db - D1 database instance
 * @param domainHash - HMAC-SHA256 hash of email domain
 * @param tenantId - Tenant ID for isolation
 * @param config - JIT Provisioning configuration
 * @returns First matching organization or null
 */
export declare function resolveOrgByDomainHash(
  db: D1Database,
  domainHash: string,
  tenantId: string,
  config: JITProvisioningConfig
): Promise<ResolvedOrganization | null>;
/**
 * Resolve all matching organizations by domain hash
 *
 * @param db - D1 database instance
 * @param domainHash - HMAC-SHA256 hash of email domain
 * @param tenantId - Tenant ID for isolation
 * @param config - JIT Provisioning configuration (optional)
 * @returns Array of matching organizations (sorted by priority)
 */
export declare function resolveAllOrgsByDomainHash(
  db: D1Database,
  domainHash: string,
  tenantId: string,
  config?: JITProvisioningConfig
): Promise<ResolvedOrganization[]>;
/**
 * Resolve organizations by domain hash with version support
 * Used during key rotation when checking multiple hash versions
 *
 * @param db - D1 database instance
 * @param hashes - Array of hashes with their versions
 * @param tenantId - Tenant ID for isolation
 * @param config - JIT Provisioning configuration
 * @returns Array of matching organizations
 */
export declare function resolveOrgsByDomainHashMultiVersion(
  db: D1Database,
  hashes: Array<{
    hash: string;
    version: number;
  }>,
  tenantId: string,
  config?: JITProvisioningConfig
): Promise<ResolvedOrganization[]>;
/**
 * Join a user to an organization
 *
 * @param db - D1 database instance
 * @param userId - User ID to add
 * @param orgId - Organization ID to join
 * @param tenantId - Tenant ID for isolation
 * @param membershipType - Membership type (default: 'member')
 * @returns Join result
 */
export declare function joinOrganization(
  db: D1Database,
  userId: string,
  orgId: string,
  tenantId: string,
  membershipType?: MembershipType
): Promise<OrgJoinResult>;
/**
 * Join a user to multiple organizations
 *
 * @param db - D1 database instance
 * @param userId - User ID to add
 * @param orgs - Array of organizations to join
 * @param tenantId - Tenant ID for isolation
 * @returns Array of join results
 */
export declare function joinOrganizations(
  db: D1Database,
  userId: string,
  orgs: ResolvedOrganization[],
  tenantId: string
): Promise<OrgJoinResult[]>;
/**
 * Assign role to user after joining organization
 *
 * @param db - D1 database instance
 * @param userId - User ID
 * @param roleId - Role ID to assign
 * @param orgId - Organization ID (for scope)
 * @param tenantId - Tenant ID
 * @returns Assignment result
 */
export declare function assignRoleToUser(
  db: D1Database,
  userId: string,
  roleId: string,
  orgId: string,
  tenantId: string
): Promise<{
  success: boolean;
  assignment_id?: string;
  error?: string;
}>;
/**
 * Get domain mapping by ID
 */
export declare function getDomainMappingById(
  db: D1Database,
  id: string,
  tenantId: string
): Promise<OrgDomainMapping | null>;
/**
 * List domain mappings for a tenant
 */
export declare function listDomainMappings(
  db: D1Database,
  tenantId: string,
  options?: {
    orgId?: string;
    verified?: boolean;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<{
  mappings: OrgDomainMapping[];
  total: number;
}>;
/**
 * Create a new domain mapping
 */
export declare function createDomainMapping(
  db: D1Database,
  tenantId: string,
  domainHash: string,
  domainHashVersion: number,
  orgId: string,
  options?: {
    autoJoinEnabled?: boolean;
    membershipType?: MembershipType;
    autoAssignRoleId?: string;
    verified?: boolean;
    priority?: number;
    isActive?: boolean;
  }
): Promise<OrgDomainMapping>;
/**
 * Update a domain mapping
 */
export declare function updateDomainMapping(
  db: D1Database,
  id: string,
  tenantId: string,
  updates: Partial<{
    autoJoinEnabled: boolean;
    membershipType: MembershipType;
    autoAssignRoleId: string | null;
    verified: boolean;
    priority: number;
    isActive: boolean;
  }>
): Promise<OrgDomainMapping | null>;
/**
 * Delete a domain mapping
 */
export declare function deleteDomainMapping(
  db: D1Database,
  id: string,
  tenantId: string
): Promise<boolean>;
/**
 * Update domain mapping hash version after key rotation
 *
 * @param db - D1 database instance
 * @param id - Mapping ID
 * @param newHash - New domain hash
 * @param newVersion - New hash version
 * @param tenantId - Tenant ID
 */
export declare function updateDomainMappingHash(
  db: D1Database,
  id: string,
  newHash: string,
  newVersion: number,
  tenantId: string
): Promise<void>;
/**
 * Get count of mappings by hash version
 * Used for key rotation status reporting
 */
export declare function getMappingCountByVersion(
  db: D1Database,
  tenantId: string
): Promise<Record<number, number>>;
export {};
//# sourceMappingURL=org-domain-resolver.d.ts.map
