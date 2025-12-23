/**
 * ID-Level Resource Permissions Utility
 *
 * Evaluates ID-level permissions (3-part format: resource:id:action)
 * in addition to type-level permissions (2-part: resource:action).
 *
 * Architecture:
 * - ID-level permissions are stored in resource_permissions table
 * - Type-level permissions come from role assignments
 * - Both can be embedded in access tokens
 *
 * Note: ID-level scope format is a non-standard OAuth 2.0 extension.
 * Standard-compliant clients should read from authrim_resource_permissions claim.
 *
 * @example
 * ```typescript
 * import { evaluateIdLevelPermissions, parseScopeWithIdLevel } from './resource-permissions';
 *
 * const result = parseScopeWithIdLevel('documents:read documents:doc_123:write');
 * // result.typeLevel: ['documents:read']
 * // result.idLevel: [{ resource: 'documents', id: 'doc_123', action: 'write' }]
 *
 * const permissions = await evaluateIdLevelPermissions(db, subjectId, env);
 * // Returns: ['documents:doc_123:read', 'documents:doc_456:write']
 * ```
 */
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type { ResourcePermission, TokenEmbeddingLimits } from '../types/token-claim-rules';
/**
 * Parsed ID-level scope
 */
export interface IdLevelScope {
  /** Resource type (e.g., "documents") */
  resource: string;
  /** Resource ID (e.g., "doc_123") */
  id: string;
  /** Action name (e.g., "read") */
  action: string;
  /** Original scope string (e.g., "documents:doc_123:read") */
  original: string;
}
/**
 * Parsed scope result separating type-level and ID-level scopes
 */
export interface ParsedScopeResult {
  /** Type-level scopes (2-part: resource:action) */
  typeLevel: string[];
  /** ID-level scopes (3-part: resource:id:action) */
  idLevel: IdLevelScope[];
  /** Standard OIDC scopes (openid, profile, etc.) */
  standard: string[];
}
/**
 * Parse scope string separating type-level and ID-level permissions
 *
 * Format:
 * - Type-level (2-part): resource:action (e.g., "documents:read")
 * - ID-level (3-part): resource:id:action (e.g., "documents:doc_123:read")
 *
 * @param scope - Space-separated scope string
 * @returns Parsed scope result with type-level and ID-level separated
 */
export declare function parseScopeWithIdLevel(scope: string): ParsedScopeResult;
/**
 * Format ID-level permission to scope string
 */
export declare function formatIdLevelPermission(
  resource: string,
  id: string,
  action: string
): string;
/**
 * Get ID-level permissions for a user from database
 *
 * Queries resource_permissions table for all active permissions
 * granted to the user (directly or through roles/orgs).
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @param tenantId - Tenant ID (default: 'default')
 * @returns Array of ResourcePermission objects
 */
export declare function getUserIdLevelPermissions(
  db: D1Database,
  subjectId: string,
  tenantId?: string
): Promise<ResourcePermission[]>;
/**
 * Evaluate ID-level permissions for a user
 *
 * Returns all ID-level permissions the user has as scope strings.
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @param tenantId - Tenant ID (default: 'default')
 * @param options - Evaluation options
 * @returns Array of ID-level permission strings (e.g., "documents:doc_123:read")
 */
export declare function evaluateIdLevelPermissions(
  db: D1Database,
  subjectId: string,
  tenantId?: string,
  options?: {
    cache?: KVNamespace;
    cacheTTL?: number;
  }
): Promise<string[]>;
/**
 * Check if user has a specific ID-level permission
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @param resource - Resource type
 * @param resourceId - Resource ID
 * @param action - Action name
 * @param tenantId - Tenant ID (default: 'default')
 * @returns true if user has the permission
 */
export declare function hasIdLevelPermission(
  db: D1Database,
  subjectId: string,
  resource: string,
  resourceId: string,
  action: string,
  tenantId?: string
): Promise<boolean>;
/**
 * Check if custom claims feature is enabled
 *
 * @param env - Environment bindings
 * @returns true if custom claims are enabled
 */
export declare function isCustomClaimsEnabled(env: {
  SETTINGS?: KVNamespace;
  ENABLE_CUSTOM_CLAIMS?: string;
}): Promise<boolean>;
/**
 * Check if ID-level permissions feature is enabled
 *
 * @param env - Environment bindings
 * @returns true if ID-level permissions are enabled
 */
export declare function isIdLevelPermissionsEnabled(env: {
  SETTINGS?: KVNamespace;
  ENABLE_ID_LEVEL_PERMISSIONS?: string;
}): Promise<boolean>;
/**
 * Get token embedding limits from KV or environment
 *
 * @param env - Environment bindings
 * @returns Token embedding limits
 */
export declare function getEmbeddingLimits(env: {
  SETTINGS?: KVNamespace;
  MAX_EMBEDDED_PERMISSIONS?: string;
  MAX_RESOURCE_PERMISSIONS?: string;
  MAX_CUSTOM_CLAIMS?: string;
}): Promise<TokenEmbeddingLimits>;
/**
 * Invalidate ID-level permission cache for a user
 *
 * Call this when user's permissions change.
 *
 * @param cache - KV namespace for caching
 * @param subjectId - User ID
 * @param tenantId - Tenant ID (default: 'default')
 */
export declare function invalidateIdPermissionCache(
  cache: KVNamespace,
  subjectId: string,
  tenantId?: string
): Promise<void>;
//# sourceMappingURL=resource-permissions.d.ts.map
