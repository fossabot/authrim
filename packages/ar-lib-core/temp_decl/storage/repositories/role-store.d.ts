/**
 * Role Store Implementation
 *
 * Manages roles with extended attributes (role_type, hierarchy_level, etc.) in D1.
 * Part of RBAC Phase 1 implementation.
 */
import type { IStorageAdapter } from '../interfaces';
import type { Role, IRoleStore } from '../interfaces';
/**
 * RoleStore implementation (D1-based)
 */
export declare class RoleStore implements IRoleStore {
  private adapter;
  constructor(adapter: IStorageAdapter);
  getRole(roleId: string): Promise<Role | null>;
  getRoleByName(tenantId: string, name: string): Promise<Role | null>;
  createRole(role: Omit<Role, 'id' | 'created_at'>): Promise<Role>;
  updateRole(roleId: string, updates: Partial<Role>): Promise<Role>;
  deleteRole(roleId: string): Promise<void>;
  listRoles(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      roleType?: string;
    }
  ): Promise<Role[]>;
  getChildRoles(roleId: string): Promise<Role[]>;
}
//# sourceMappingURL=role-store.d.ts.map
