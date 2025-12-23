/**
 * Role Assignment Store Implementation
 *
 * Manages role assignments with scope support (global, org, resource) in D1.
 * Part of RBAC Phase 1 implementation.
 */
import type { IStorageAdapter } from '../interfaces';
import type { RoleAssignment, IRoleAssignmentStore, ScopeType } from '../interfaces';
/**
 * RoleAssignmentStore implementation (D1-based)
 */
export declare class RoleAssignmentStore implements IRoleAssignmentStore {
  private adapter;
  constructor(adapter: IStorageAdapter);
  getRoleAssignment(assignmentId: string): Promise<RoleAssignment | null>;
  createRoleAssignment(
    assignment: Omit<RoleAssignment, 'id' | 'created_at' | 'updated_at'>
  ): Promise<RoleAssignment>;
  updateRoleAssignment(
    assignmentId: string,
    updates: Partial<RoleAssignment>
  ): Promise<RoleAssignment>;
  deleteRoleAssignment(assignmentId: string): Promise<void>;
  listAssignmentsBySubject(
    subjectId: string,
    options?: {
      scopeType?: ScopeType;
      scopeTarget?: string;
      includeExpired?: boolean;
    }
  ): Promise<RoleAssignment[]>;
  listAssignmentsByRole(
    roleId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<RoleAssignment[]>;
  getEffectiveRoles(
    subjectId: string,
    options?: {
      scopeType?: ScopeType;
      scopeTarget?: string;
    }
  ): Promise<string[]>;
  hasRole(
    subjectId: string,
    roleName: string,
    options?: {
      scopeType?: ScopeType;
      scopeTarget?: string;
    }
  ): Promise<boolean>;
}
//# sourceMappingURL=role-assignment-store.d.ts.map
