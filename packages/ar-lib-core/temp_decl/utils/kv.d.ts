/**
 * KV Storage Utilities
 *
 * Provides helper functions for storing and retrieving data from Cloudflare KV namespaces.
 * Used for managing state parameters and nonce values.
 *
 * Note: Authorization codes and revoked tokens have been migrated to Durable Objects:
 * - Authorization codes → AuthorizationCodeStore DO
 * - Revoked tokens → TokenRevocationStore DO
 */
import type { Env } from '../types/env';
import type { RefreshTokenData } from '../types/oidc';
/**
 * Cached user data structure
 * Includes all OIDC standard claims for profile, email, phone, and address scopes
 */
export interface CachedUser {
  id: string;
  email: string;
  email_verified: boolean;
  name: string | null;
  family_name: string | null;
  given_name: string | null;
  middle_name: string | null;
  nickname: string | null;
  preferred_username: string | null;
  picture: string | null;
  locale: string | null;
  phone_number: string | null;
  phone_number_verified: boolean;
  address: string | null;
  birthdate: string | null;
  gender: string | null;
  profile: string | null;
  website: string | null;
  zoneinfo: string | null;
  updated_at: number;
}
/**
 * Get user from cache or D1 (Read-Through Cache pattern)
 *
 * Architecture:
 * - Primary source: D1 database (users table)
 * - Cache: USER_CACHE KV (1 hour TTL)
 * - Invalidation: invalidateUserCache() called on user update
 *
 * @param env - Cloudflare environment bindings
 * @param userId - User ID to retrieve
 * @returns Promise<CachedUser | null>
 */
export declare function getCachedUser(env: Env, userId: string): Promise<CachedUser | null>;
/**
 * Invalidate user cache entry
 * Call this when user data is updated (PATCH /users/{id}, password reset, etc.)
 *
 * @param env - Cloudflare environment bindings
 * @param userId - User ID to invalidate
 */
export declare function invalidateUserCache(env: Env, userId: string): Promise<void>;
/**
 * Minimal user core data structure (non-PII only)
 * Used for existence checks in auth flows that must NOT access PII DB
 *
 * Note: This is intentionally a minimal subset of CachedUserCore (from repositories/cache)
 * to support lightweight existence checks without loading full user data.
 */
export interface UserCoreExistence {
  id: string;
  email_verified: boolean;
  phone_number_verified: boolean;
  updated_at: number;
}
/**
 * Get user core data from Core DB only (NO PII DB access)
 *
 * IMPORTANT: Use this function in auth flows (/authorize, /token) where
 * PII DB access is prohibited by PII/Non-PII separation architecture.
 *
 * This function:
 * - Only queries Core DB (users_core table)
 * - Never accesses PII DB (users_pii table)
 * - Returns only non-PII fields (id, email_verified, phone_number_verified, updated_at)
 *
 * @param env - Cloudflare environment bindings
 * @param userId - User ID to retrieve
 * @returns Promise<UserCoreExistence | null>
 */
export declare function getCachedUserCore(
  env: Env,
  userId: string
): Promise<UserCoreExistence | null>;
/**
 * Cached consent data structure
 */
export interface CachedConsent {
  scope: string;
  granted_at: number;
  expires_at: number | null;
}
/**
 * Get consent status from cache or D1 (Read-Through Cache pattern)
 *
 * Architecture:
 * - Primary source: D1 database (oauth_client_consents table)
 * - Cache: CONSENT_CACHE KV (24 hour TTL)
 * - Invalidation: invalidateConsentCache() called on consent revocation
 *
 * @param env - Cloudflare environment bindings
 * @param userId - User ID
 * @param clientId - Client ID
 * @returns Promise<CachedConsent | null>
 */
export declare function getCachedConsent(
  env: Env,
  userId: string,
  clientId: string
): Promise<CachedConsent | null>;
/**
 * Invalidate consent cache entry
 * Call this when consent is revoked or updated
 *
 * @param env - Cloudflare environment bindings
 * @param userId - User ID
 * @param clientId - Optional client ID. If not provided, all consents for the user are invalidated
 */
export declare function invalidateConsentCache(
  env: Env,
  userId: string,
  clientId?: string
): Promise<void>;
/**
 * Store state parameter in KV
 *
 * @param env - Cloudflare environment bindings
 * @param state - State parameter value
 * @param clientId - Client ID that initiated the request
 * @returns Promise<void>
 */
export declare function storeState(env: Env, state: string, clientId: string): Promise<void>;
/**
 * Retrieve and validate state parameter from KV
 *
 * @param env - Cloudflare environment bindings
 * @param state - State parameter to validate
 * @returns Promise<string | null> - Returns client_id if valid, null otherwise
 */
export declare function getState(env: Env, state: string): Promise<string | null>;
/**
 * Delete state parameter from KV after validation
 *
 * @param env - Cloudflare environment bindings
 * @param state - State parameter to delete
 * @returns Promise<void>
 */
export declare function deleteState(env: Env, state: string): Promise<void>;
/**
 * Store nonce parameter in KV
 *
 * @param env - Cloudflare environment bindings
 * @param nonce - Nonce parameter value
 * @param clientId - Client ID that initiated the request
 * @returns Promise<void>
 */
export declare function storeNonce(env: Env, nonce: string, clientId: string): Promise<void>;
/**
 * Retrieve and validate nonce parameter from KV
 *
 * @param env - Cloudflare environment bindings
 * @param nonce - Nonce parameter to validate
 * @returns Promise<string | null> - Returns client_id if valid, null otherwise
 */
export declare function getNonce(env: Env, nonce: string): Promise<string | null>;
/**
 * Delete nonce parameter from KV after validation
 *
 * @param env - Cloudflare environment bindings
 * @param nonce - Nonce parameter to delete
 * @returns Promise<void>
 */
export declare function deleteNonce(env: Env, nonce: string): Promise<void>;
/**
 * Retrieve client metadata using Read-Through Cache pattern
 *
 * Architecture:
 * - Primary source: D1 database (oauth_clients table)
 * - Cache: CLIENTS_CACHE KV (1 hour TTL)
 * - Pattern: Read-Through (cache miss → fetch from D1 → populate cache)
 *
 * @param env - Cloudflare environment bindings
 * @param clientId - Client ID to retrieve
 * @returns Promise<Record<string, unknown> | null>
 */
export declare function getClient(
  env: Env,
  clientId: string
): Promise<Record<string, unknown> | null>;
/**
 * Revoke an access token by adding its JTI to the revocation list
 *
 * Per RFC 6749 Section 4.1.2: When an authorization code is used more than once,
 * the authorization server SHOULD revoke all tokens previously issued based on that code.
 *
 * @param env - Cloudflare environment bindings
 * @param jti - JWT ID of the token to revoke
 * @param expiresIn - Token expiration time in seconds (TTL for revocation list entry)
 * @param reason - Optional revocation reason
 * @returns Promise<void>
 */
export declare function revokeToken(
  env: Env,
  jti: string,
  expiresIn: number,
  reason?: string
): Promise<void>;
/**
 * Check if an access token has been revoked
 *
 * @param env - Cloudflare environment bindings
 * @param jti - JWT ID of the token to check
 * @returns Promise<boolean> - True if token is revoked
 */
export declare function isTokenRevoked(env: Env, jti: string): Promise<boolean>;
/**
 * Store refresh token using RefreshTokenRotator DO
 * Creates a new token family for the refresh token
 *
 * @param env - Cloudflare environment bindings
 * @param jti - Refresh token JTI (unique identifier) - this is the actual token value
 * @param data - Refresh token metadata
 * @returns Promise<void>
 */
export declare function storeRefreshToken(
  env: Env,
  jti: string,
  data: RefreshTokenData
): Promise<void>;
/**
 * Retrieve refresh token metadata using RefreshTokenRotator DO (V2)
 * Note: This validates the token and returns metadata if valid
 *
 * V2 API uses version-based validation. The token's userId and version (rtv claim)
 * are used to look up the token family in the DO.
 *
 * @param env - Cloudflare environment bindings
 * @param userId - User ID from the refresh token's sub claim
 * @param version - Token version from the refresh token's rtv claim
 * @param clientId - Client ID (required to locate the correct DO instance)
 * @param jti - JWT ID for verification against stored last_jti
 * @returns Promise<RefreshTokenData | null>
 */
export declare function getRefreshToken(
  env: Env,
  userId: string,
  version: number,
  clientId: string,
  jti: string
): Promise<RefreshTokenData | null>;
/**
 * Delete refresh token using RefreshTokenRotator DO
 * Revokes the entire token family for security
 *
 * @param env - Cloudflare environment bindings
 * @param jti - Refresh token JTI (the actual token value)
 * @param client_id - Client ID (required to locate the correct DO instance)
 * @returns Promise<void>
 */
export declare function deleteRefreshToken(env: Env, jti: string, client_id: string): Promise<void>;
//# sourceMappingURL=kv.d.ts.map
