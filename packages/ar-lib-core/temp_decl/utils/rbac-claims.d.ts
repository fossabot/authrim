/**
 * RBAC Claims Utility
 *
 * Utilities for retrieving RBAC information to include in tokens.
 * Part of RBAC Phase 1 & 2 implementation.
 *
 * Environment Variables:
 * - RBAC_ID_TOKEN_CLAIMS: Comma-separated list of claims to include in ID Token
 *   Default: "roles,user_type,org_id,plan,org_type"
 *   Available: roles,scoped_roles,user_type,org_id,org_name,plan,org_type,orgs,relationships_summary
 *
 * - RBAC_ACCESS_TOKEN_CLAIMS: Comma-separated list of claims to include in Access Token
 *   Default: "roles,org_id,org_type"
 *   Available: roles,scoped_roles,org_id,org_type,permissions,org_context
 *
 * Usage:
 * ```typescript
 * import { getUserRBACClaims, getIDTokenRBACClaims, getAccessTokenRBACClaims } from '@authrim/ar-lib-core';
 *
 * const claims = await getUserRBACClaims(env.DB, subjectId);
 * // Add to token: { ...claims }
 *
 * // Or with environment variable control:
 * const idTokenClaims = await getIDTokenRBACClaims(env.DB, subjectId, env.RBAC_ID_TOKEN_CLAIMS);
 * const accessTokenClaims = await getAccessTokenRBACClaims(env.DB, subjectId, env.RBAC_ACCESS_TOKEN_CLAIMS);
 * ```
 */
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type {
  RBACTokenClaims,
  UserType,
  PlanType,
  OrganizationType,
  TokenOrgInfo,
  TokenScopedRole,
  RelationshipsSummary,
} from '../types/rbac';
import type { Env } from '../types/env';
/**
 * Get RBAC cache TTL with dynamic configuration
 *
 * Priority: KV (rbac_cache_ttl) > Environment variable (RBAC_CACHE_TTL) > Default (600s)
 *
 * @param env - Environment bindings
 * @returns TTL in seconds
 */
export declare function getRBACCacheTTL(env: Env): Promise<number>;
/**
 * Get RBAC cache version with dynamic configuration
 *
 * Priority: KV (rbac_cache_version) > ENV (RBAC_CACHE_VERSION) > Default (1)
 *
 * Use case: When RBAC internal logic changes and cache needs invalidation,
 * increment the version in KV to force cache miss without deployment.
 *
 * @param env - Environment bindings
 * @returns Cache version number
 */
export declare function getRBACCacheVersion(env: Env): Promise<number>;
/**
 * Options for RBAC claims functions with caching support
 */
export interface RBACClaimsOptions {
  cache?: KVNamespace;
  claimsConfig?: string;
  env?: Env;
  tenantId?: string;
}
/**
 * Composite RBAC cache entry containing all RBAC data for a user
 * This allows fetching all RBAC information with a single KV read
 */
export interface CompositeRBACCache {
  version: number;
  roles: string[];
  scoped_roles: TokenScopedRole[];
  permissions: string[];
  organizations: TokenOrgInfo[];
  user_type: UserType;
  plan: PlanType | null;
  org_id: string | null;
  org_name: string | null;
  org_type: OrganizationType | null;
  relationships_summary: RelationshipsSummary;
  cached_at: number;
}
/**
 * Get or create composite RBAC cache for a user
 *
 * This function consolidates all RBAC data into a single KV entry,
 * reducing D1 queries from 7 to 1 on cache miss.
 *
 * Benefits:
 * - Single KV read for all RBAC data (cache hit)
 * - Single parallel D1 query batch on cache miss
 * - Multi-tenant isolation via tenantId in cache key
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @param options - Options including cache KV, env for TTL, and tenantId
 * @returns Composite RBAC cache object
 */
export declare function getCompositeRBACCache(
  db: D1Database,
  subjectId: string,
  options?: RBACClaimsOptions
): Promise<CompositeRBACCache>;
/**
 * Extract ID Token claims from Composite RBAC Cache
 *
 * @param compositeCache - Pre-fetched composite RBAC cache
 * @param claimsConfig - Optional comma-separated list of claims to include
 * @returns Claims for ID Token
 */
export declare function extractIDTokenClaimsFromCache(
  compositeCache: CompositeRBACCache,
  claimsConfig?: string
): Partial<RBACTokenClaims>;
/**
 * Extract Access Token claims from Composite RBAC Cache
 *
 * @param compositeCache - Pre-fetched composite RBAC cache
 * @param claimsConfig - Optional comma-separated list of claims to include
 * @returns Claims for Access Token
 */
export declare function extractAccessTokenClaimsFromCache(
  compositeCache: CompositeRBACCache,
  claimsConfig?: string
): Partial<RBACTokenClaims>;
/**
 * Resolved organization information
 */
interface ResolvedOrgInfo {
  org_id: string;
  plan: PlanType;
  org_type: OrganizationType;
}
/**
 * Get user's effective roles from role_assignments
 *
 * Returns distinct role names that are:
 * 1. Assigned to the user
 * 2. Not expired
 * 3. Any scope (global, org, resource)
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @returns Array of role names
 */
export declare function resolveEffectiveRoles(db: D1Database, subjectId: string): Promise<string[]>;
/**
 * Get user's primary organization information
 *
 * Returns the primary organization for the user based on
 * subject_org_membership.is_primary = 1.
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @returns Organization info or null if no primary org
 */
export declare function resolveOrganizationInfo(
  db: D1Database,
  subjectId: string
): Promise<ResolvedOrgInfo | null>;
/**
 * Get user's user_type from users_core table (non-PII)
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @returns User type or 'end_user' as default
 */
export declare function resolveUserType(db: D1Database, subjectId: string): Promise<UserType>;
/**
 * Get all RBAC claims for a user
 *
 * This is the main function to call when generating tokens.
 * Returns all RBAC-related claims with authrim_ prefix.
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @returns RBACTokenClaims object
 *
 * @example
 * ```typescript
 * const rbacClaims = await getUserRBACClaims(env.DB, userId);
 * // Result:
 * // {
 * //   authrim_roles: ['end_user', 'org_admin'],
 * //   authrim_user_type: 'enterprise_admin',
 * //   authrim_org_id: 'org_123',
 * //   authrim_plan: 'professional',
 * //   authrim_org_type: 'enterprise'
 * // }
 * ```
 */
export declare function getUserRBACClaims(
  db: D1Database,
  subjectId: string
): Promise<RBACTokenClaims>;
/**
 * Get RBAC claims for ID Token (with optional caching)
 *
 * ID Token includes all RBAC claims:
 * - authrim_roles
 * - authrim_user_type
 * - authrim_org_id
 * - authrim_plan
 *
 * When claimsConfig is provided, it controls which claims are included.
 * Available claims: roles,scoped_roles,user_type,org_id,org_name,plan,org_type,orgs,relationships_summary
 *
 * Caching: When cache (REBAC_CACHE KV) is provided, claims are cached for 5 minutes.
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @param claimsConfigOrOptions - Claims config string OR options object with cache
 * @returns Claims for ID Token
 */
export declare function getIDTokenRBACClaims(
  db: D1Database,
  subjectId: string,
  claimsConfigOrOptions?: string | RBACClaimsOptions
): Promise<Partial<RBACTokenClaims>>;
/**
 * Get RBAC claims for Access Token (with optional caching)
 *
 * Access Token includes:
 * - authrim_roles
 * - authrim_org_id
 * - authrim_org_type
 *
 * Note: user_type and plan are omitted from access token
 * as they are primarily for client-side display purposes.
 *
 * Caching: When cache (REBAC_CACHE KV) is provided, claims are cached for 5 minutes.
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @param claimsConfigOrOptions - Claims config string OR options object with cache
 * @returns Claims for Access Token
 */
export declare function getAccessTokenRBACClaims(
  db: D1Database,
  subjectId: string,
  claimsConfigOrOptions?: string | RBACClaimsOptions
): Promise<Partial<RBACTokenClaims>>;
/**
 * Get user's scoped roles with full scope information
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @returns Array of scoped roles
 */
export declare function resolveScopedRoles(
  db: D1Database,
  subjectId: string
): Promise<TokenScopedRole[]>;
/**
 * Get all organizations the user belongs to
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @returns Array of organization info
 */
export declare function resolveAllOrganizations(
  db: D1Database,
  subjectId: string
): Promise<TokenOrgInfo[]>;
/**
 * Get relationships summary (parent/child IDs)
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @returns Relationships summary
 */
export declare function resolveRelationshipsSummary(
  db: D1Database,
  subjectId: string
): Promise<RelationshipsSummary>;
/**
 * Get resolved permissions from user's roles
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @returns Array of permission strings
 */
export declare function resolvePermissions(db: D1Database, subjectId: string): Promise<string[]>;
/**
 * Get primary organization name
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @returns Organization name or null
 */
export declare function resolveOrganizationName(
  db: D1Database,
  subjectId: string
): Promise<string | null>;
/**
 * Get RBAC claims for ID Token with environment variable control
 *
 * @param db - D1 database
 * @param subjectId - User ID
 * @param claimsConfig - Optional comma-separated list of claims to include (env var)
 * @returns Claims for ID Token
 */
export declare function getIDTokenRBACClaimsConfigurable(
  db: D1Database,
  subjectId: string,
  claimsConfig?: string
): Promise<Partial<RBACTokenClaims>>;
export {};
//# sourceMappingURL=rbac-claims.d.ts.map
