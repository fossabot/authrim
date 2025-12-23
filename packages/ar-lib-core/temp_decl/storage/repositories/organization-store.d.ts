/**
 * Organization Store Implementation
 *
 * Manages organizations and subject-organization memberships in D1.
 * Part of RBAC Phase 1 implementation.
 */
import type { IStorageAdapter } from '../interfaces';
import type { Organization, SubjectOrgMembership, IOrganizationStore } from '../interfaces';
/**
 * OrganizationStore implementation (D1-based)
 */
export declare class OrganizationStore implements IOrganizationStore {
  private adapter;
  constructor(adapter: IStorageAdapter);
  getOrganization(orgId: string): Promise<Organization | null>;
  getOrganizationByName(tenantId: string, name: string): Promise<Organization | null>;
  createOrganization(
    org: Omit<Organization, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Organization>;
  updateOrganization(orgId: string, updates: Partial<Organization>): Promise<Organization>;
  deleteOrganization(orgId: string): Promise<void>;
  listOrganizations(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      parentOrgId?: string;
    }
  ): Promise<Organization[]>;
  getMembership(membershipId: string): Promise<SubjectOrgMembership | null>;
  getMembershipBySubjectAndOrg(
    subjectId: string,
    orgId: string
  ): Promise<SubjectOrgMembership | null>;
  createMembership(
    membership: Omit<SubjectOrgMembership, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SubjectOrgMembership>;
  updateMembership(
    membershipId: string,
    updates: Partial<SubjectOrgMembership>
  ): Promise<SubjectOrgMembership>;
  deleteMembership(membershipId: string): Promise<void>;
  listMembershipsBySubject(subjectId: string): Promise<SubjectOrgMembership[]>;
  listMembershipsByOrg(
    orgId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<SubjectOrgMembership[]>;
  getPrimaryOrganization(subjectId: string): Promise<Organization | null>;
}
//# sourceMappingURL=organization-store.d.ts.map
