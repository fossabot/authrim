/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Phase 1 Implementation:
 * - requireRole(): Check if user has required role(s)
 *
 * Phase 2 (future):
 * - requirePermission(): Check if user has required permission(s)
 *
 * Usage:
 * ```typescript
 * import { requireRole, requireAnyRole, requireAllRoles } from '@authrim/ar-lib-core';
 *
 * // Require a single role
 * app.get('/admin', requireRole('system_admin'), handler);
 *
 * // Require any of multiple roles
 * app.get('/admin', requireAnyRole(['system_admin', 'org_admin']), handler);
 *
 * // Require all roles
 * app.get('/super', requireAllRoles(['system_admin', 'audit_role']), handler);
 * ```
 */
import type { Context, Next } from 'hono';
import type { Env } from '../types/env';
/**
 * Require a single role
 *
 * Middleware that checks if the authenticated user has a specific role.
 * Must be used after adminAuthMiddleware().
 *
 * @param roleName - Required role name
 * @returns Hono middleware
 *
 * @example
 * ```typescript
 * app.get('/admin/users', requireRole('system_admin'), handler);
 * ```
 */
export declare function requireRole(roleName: string): (
  c: Context<{
    Bindings: Env;
  }>,
  next: Next
) => Promise<
  | void
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
        },
        401,
        'json'
      >)
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
          required_roles?: string[] | undefined;
        },
        403,
        'json'
      >)
>;
/**
 * Require any of multiple roles
 *
 * Middleware that checks if the authenticated user has at least one of the specified roles.
 * Must be used after adminAuthMiddleware().
 *
 * @param roleNames - Array of role names (user needs at least one)
 * @returns Hono middleware
 *
 * @example
 * ```typescript
 * app.get('/admin/dashboard', requireAnyRole(['system_admin', 'org_admin']), handler);
 * ```
 */
export declare function requireAnyRole(roleNames: string[]): (
  c: Context<{
    Bindings: Env;
  }>,
  next: Next
) => Promise<
  | void
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
          required_roles?: string[] | undefined;
        },
        403,
        'json'
      >)
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
        },
        401,
        'json'
      >)
>;
/**
 * Require all specified roles
 *
 * Middleware that checks if the authenticated user has all of the specified roles.
 * Must be used after adminAuthMiddleware().
 *
 * @param roleNames - Array of role names (user needs all of them)
 * @returns Hono middleware
 *
 * @example
 * ```typescript
 * app.get('/admin/audit', requireAllRoles(['system_admin', 'audit_access']), handler);
 * ```
 */
export declare function requireAllRoles(roleNames: string[]): (
  c: Context<{
    Bindings: Env;
  }>,
  next: Next
) => Promise<
  | void
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
        },
        401,
        'json'
      >)
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
          required_roles: string[];
          missing_roles: string[];
        },
        403,
        'json'
      >)
>;
/**
 * Require admin role
 *
 * Convenience middleware that checks for any admin role.
 * Equivalent to: requireAnyRole(['system_admin', 'distributor_admin', 'org_admin', 'admin'])
 *
 * @returns Hono middleware
 *
 * @example
 * ```typescript
 * app.get('/admin/settings', requireAdmin(), handler);
 * ```
 */
export declare function requireAdmin(): (
  c: Context<{
    Bindings: Env;
  }>,
  next: Next
) => Promise<
  | void
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
          required_roles?: string[] | undefined;
        },
        403,
        'json'
      >)
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
        },
        401,
        'json'
      >)
>;
/**
 * Require system admin role
 *
 * Convenience middleware that checks for system_admin role.
 * This is the highest privilege level.
 *
 * @returns Hono middleware
 *
 * @example
 * ```typescript
 * app.post('/admin/system/config', requireSystemAdmin(), handler);
 * ```
 */
export declare function requireSystemAdmin(): (
  c: Context<{
    Bindings: Env;
  }>,
  next: Next
) => Promise<
  | void
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
        },
        401,
        'json'
      >)
  | (Response &
      import('hono').TypedResponse<
        {
          error: string;
          error_description: string;
          required_roles?: string[] | undefined;
        },
        403,
        'json'
      >)
>;
/**
 * Predefined role names for Phase 1 RBAC
 *
 * These match the DEFAULT_ROLES in types/rbac.ts
 */
export declare const RBAC_ROLES: {
  readonly SYSTEM_ADMIN: 'system_admin';
  readonly DISTRIBUTOR_ADMIN: 'distributor_admin';
  readonly ORG_ADMIN: 'org_admin';
  readonly END_USER: 'end_user';
};
//# sourceMappingURL=rbac.d.ts.map
