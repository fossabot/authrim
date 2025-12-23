/**
 * Role Repository
 *
 * Repository for RBAC (Role-Based Access Control) stored in D1_CORE database.
 * Handles role definitions and user-role assignments.
 *
 * Key features:
 * - Role CRUD with permissions management
 * - User-role assignment/revocation
 * - Permission checking utilities
 * - Bulk role operations
 *
 * Note: Does not extend BaseRepository because roles table
 * doesn't have updated_at field (roles are versioned via new records).
 *
 * Tables: roles, user_roles
 * Schema (roles):
 *   - id: TEXT PRIMARY KEY (UUID)
 *   - name: TEXT UNIQUE NOT NULL
 *   - description: TEXT
 *   - permissions_json: TEXT NOT NULL (JSON array of permissions)
 *   - created_at: INTEGER NOT NULL (timestamp)
 *
 * Schema (user_roles):
 *   - user_id: TEXT NOT NULL (FK to users)
 *   - role_id: TEXT NOT NULL (FK to roles)
 *   - created_at: INTEGER NOT NULL (timestamp)
 *   - PRIMARY KEY (user_id, role_id)
 */
import type { DatabaseAdapter } from '../../db/adapter';
/**
 * Role entity representing an RBAC role
 */
export interface Role {
  /** Unique role ID (UUID) */
  id: string;
  /** Role name (unique) */
  name: string;
  /** Role description */
  description: string | null;
  /** Permissions granted by this role */
  permissions: string[];
  /** Creation timestamp (Unix ms) */
  created_at: number;
}
/**
 * User-role assignment entity
 */
export interface UserRole {
  /** User ID */
  user_id: string;
  /** Role ID */
  role_id: string;
  /** Assignment timestamp (Unix ms) */
  created_at: number;
}
/**
 * Input for creating a new role
 */
export interface CreateRoleInput {
  /** Optional role ID (auto-generated if not provided) */
  id?: string;
  /** Role name (must be unique) */
  name: string;
  /** Role description */
  description?: string;
  /** Permissions granted by this role */
  permissions: string[];
}
/**
 * Input for updating a role
 */
export interface UpdateRoleInput {
  /** New role name */
  name?: string;
  /** New description */
  description?: string;
  /** New permissions (replaces existing) */
  permissions?: string[];
}
/**
 * Role Repository
 *
 * Provides CRUD operations for RBAC roles and user assignments with:
 * - Role creation and management
 * - User-role assignment/revocation
 * - Permission checking
 */
export declare class RoleRepository {
  protected readonly adapter: DatabaseAdapter;
  constructor(adapter: DatabaseAdapter);
  /**
   * Create a new role
   *
   * @param input - Role creation input
   * @returns Created role
   * @throws Error if role name already exists
   */
  create(input: CreateRoleInput): Promise<Role>;
  /**
   * Find role by ID
   *
   * @param id - Role ID
   * @returns Role or null if not found
   */
  findById(id: string): Promise<Role | null>;
  /**
   * Find role by name
   *
   * @param name - Role name
   * @returns Role or null if not found
   */
  findByName(name: string): Promise<Role | null>;
  /**
   * Find all roles
   *
   * @returns Array of all roles
   */
  findAll(): Promise<Role[]>;
  /**
   * Update a role
   *
   * @param id - Role ID
   * @param input - Update input
   * @returns Updated role or null if not found
   */
  update(id: string, input: UpdateRoleInput): Promise<Role | null>;
  /**
   * Delete a role
   * Note: This will cascade delete user_roles entries
   *
   * @param id - Role ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;
  /**
   * Check if role name exists
   *
   * @param name - Role name
   * @returns True if exists
   */
  nameExists(name: string): Promise<boolean>;
  /**
   * Assign a role to a user
   *
   * @param userId - User ID
   * @param roleId - Role ID
   * @returns User-role assignment or null if role doesn't exist
   */
  assignRoleToUser(userId: string, roleId: string): Promise<UserRole | null>;
  /**
   * Revoke a role from a user
   *
   * @param userId - User ID
   * @param roleId - Role ID
   * @returns True if revoked, false if assignment didn't exist
   */
  revokeRoleFromUser(userId: string, roleId: string): Promise<boolean>;
  /**
   * Get all roles for a user
   *
   * @param userId - User ID
   * @returns Array of roles assigned to the user
   */
  findRolesForUser(userId: string): Promise<Role[]>;
  /**
   * Get all users with a specific role
   *
   * @param roleId - Role ID
   * @returns Array of user IDs with this role
   */
  findUsersWithRole(roleId: string): Promise<string[]>;
  /**
   * Check if user has a specific role
   *
   * @param userId - User ID
   * @param roleId - Role ID
   * @returns True if user has the role
   */
  userHasRole(userId: string, roleId: string): Promise<boolean>;
  /**
   * Check if user has a specific role by name
   *
   * @param userId - User ID
   * @param roleName - Role name
   * @returns True if user has the role
   */
  userHasRoleByName(userId: string, roleName: string): Promise<boolean>;
  /**
   * Get all permissions for a user (aggregated from all roles)
   *
   * @param userId - User ID
   * @returns Array of unique permissions
   */
  getPermissionsForUser(userId: string): Promise<string[]>;
  /**
   * Check if user has a specific permission
   *
   * @param userId - User ID
   * @param permission - Permission to check
   * @returns True if user has the permission (via any role)
   */
  userHasPermission(userId: string, permission: string): Promise<boolean>;
  /**
   * Check if user has all specified permissions
   *
   * @param userId - User ID
   * @param requiredPermissions - Permissions to check
   * @returns True if user has all permissions
   */
  userHasAllPermissions(userId: string, requiredPermissions: string[]): Promise<boolean>;
  /**
   * Check if user has any of the specified permissions
   *
   * @param userId - User ID
   * @param anyPermissions - Permissions to check
   * @returns True if user has at least one permission
   */
  userHasAnyPermission(userId: string, anyPermissions: string[]): Promise<boolean>;
  /**
   * Remove all role assignments for a user
   *
   * @param userId - User ID
   * @returns Number of role assignments removed
   */
  removeAllRolesFromUser(userId: string): Promise<number>;
  /**
   * Replace all roles for a user
   *
   * @param userId - User ID
   * @param roleIds - New role IDs
   * @returns Number of roles assigned
   */
  setRolesForUser(userId: string, roleIds: string[]): Promise<number>;
  /**
   * Count users with a specific role
   *
   * @param roleId - Role ID
   * @returns Number of users with this role
   */
  countUsersWithRole(roleId: string): Promise<number>;
  /**
   * Get role assignment details
   *
   * @param userId - User ID
   * @param roleId - Role ID
   * @returns User-role assignment or null if not found
   */
  getUserRoleAssignment(userId: string, roleId: string): Promise<UserRole | null>;
  /**
   * Convert database row to Role entity
   */
  private rowToEntity;
}
//# sourceMappingURL=role.d.ts.map
