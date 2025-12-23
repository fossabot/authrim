/**
 * Policy Embedding Utility
 *
 * Evaluates requested scopes against policy rules and returns
 * only the permitted actions to embed in Access Token.
 *
 * @example
 * ```typescript
 * import { evaluatePermissionsForScope } from './policy-embedding';
 *
 * const permissions = await evaluatePermissionsForScope(
 *   db,
 *   subjectId,
 *   'openid profile documents:read documents:write users:manage',
 *   { cache: env.REBAC_CACHE }
 * );
 * // Returns: ['documents:read', 'documents:write'] if user has those permissions
 * ```
 */
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
/**
 * Parsed scope action
 */
export interface ScopeAction {
  /** Resource type (e.g., "documents", "users") */
  resource: string;
  /** Action name (e.g., "read", "write", "manage") */
  action: string;
  /** Original scope string (e.g., "documents:read") */
  original: string;
}
/**
 * Options for permission evaluation
 */
export interface PolicyEmbeddingOptions {
  /** KV namespace for caching (optional) */
  cache?: KVNamespace;
  /** Cache TTL in seconds (default: 300 = 5 minutes) */
  cacheTTL?: number;
}
/**
 * Parse scope string into resource:action pairs
 *
 * Standard OIDC scopes (openid, profile, email, etc.) are filtered out.
 * Only scopes in {resource}:{action} format are returned.
 *
 * @param scope - Space-separated scope string
 * @returns Array of parsed scope actions
 *
 * @example
 * parseScopeToActions('openid profile documents:read users:manage')
 * // Returns: [
 * //   { resource: 'documents', action: 'read', original: 'documents:read' },
 * //   { resource: 'users', action: 'manage', original: 'users:manage' }
 * // ]
 */
export declare function parseScopeToActions(scope: string): ScopeAction[];
/**
 * Evaluate requested scopes against user's permissions
 *
 * This is the main function for policy embedding. It:
 * 1. Parses the scope string to extract resource:action pairs
 * 2. Gets the user's permissions from their roles
 * 3. Returns only the scopes that match the user's permissions
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @param scope - Requested scope string (space-separated)
 * @param options - Evaluation options
 * @returns Array of permitted scope strings
 *
 * @example
 * // User has roles that grant: ['documents:read', 'documents:write']
 * const permissions = await evaluatePermissionsForScope(
 *   db,
 *   'user_123',
 *   'openid profile documents:read documents:write users:manage'
 * );
 * // Returns: ['documents:read', 'documents:write']
 * // 'users:manage' is excluded because user doesn't have that permission
 */
export declare function evaluatePermissionsForScope(
  db: D1Database,
  subjectId: string,
  scope: string,
  options?: PolicyEmbeddingOptions
): Promise<string[]>;
/**
 * Invalidate permission cache for a user
 *
 * Call this when user's roles change to ensure fresh permissions.
 *
 * @param cache - KV namespace for caching
 * @param subjectId - User ID
 */
export declare function invalidatePermissionCache(
  cache: KVNamespace,
  subjectId: string
): Promise<void>;
/**
 * Check if policy embedding feature is enabled
 *
 * Reads from KV first (dynamic override), then environment variable.
 *
 * @param env - Environment bindings
 * @returns true if policy embedding is enabled
 */
export declare function isPolicyEmbeddingEnabled(env: {
  SETTINGS?: KVNamespace;
  ENABLE_POLICY_EMBEDDING?: string;
}): Promise<boolean>;
//# sourceMappingURL=policy-embedding.d.ts.map
