/**
 * AuthorizationCodeStore Durable Object
 *
 * Manages one-time authorization codes with strong consistency guarantees.
 * Provides replay attack prevention and PKCE support.
 *
 * Security Features:
 * - One-time use guarantee (CRITICAL for OAuth 2.0 security)
 * - Short TTL (60 seconds per OAuth 2.0 Security BCP)
 * - Atomic consume operation (Durable Object guarantees)
 * - PKCE validation (code_challenge/code_verifier)
 * - Replay attack detection and token revocation
 *
 * OAuth 2.0 Security Best Current Practice (BCP) Compliance:
 * - RFC 6749: Authorization Code Grant
 * - RFC 7636: Proof Key for Code Exchange (PKCE)
 * - OAuth 2.0 Security BCP: Draft 16
 *
 * Configuration Priority:
 * - KV (AUTHRIM_CONFIG namespace) > Environment variable > Default value
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';
/**
 * Authorization code metadata
 */
export interface AuthorizationCode {
  code: string;
  clientId: string;
  redirectUri: string;
  userId: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  nonce?: string;
  state?: string;
  claims?: string;
  authTime?: number;
  acr?: string;
  cHash?: string;
  dpopJkt?: string;
  sid?: string;
  used: boolean;
  expiresAt: number;
  createdAt: number;
  issuedAccessTokenJti?: string;
  issuedRefreshTokenJti?: string;
}
/**
 * Store code request
 */
export interface StoreCodeRequest {
  code: string;
  clientId: string;
  redirectUri: string;
  userId: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  nonce?: string;
  state?: string;
  claims?: string;
  authTime?: number;
  acr?: string;
  cHash?: string;
  dpopJkt?: string;
  sid?: string;
}
/**
 * Consume code request
 */
export interface ConsumeCodeRequest {
  code: string;
  clientId: string;
  codeVerifier?: string;
  accessTokenJti?: string;
  refreshTokenJti?: string;
}
/**
 * Consume code response
 */
export interface ConsumeCodeResponse {
  userId: string;
  scope: string;
  redirectUri: string;
  nonce?: string;
  state?: string;
  claims?: string;
  authTime?: number;
  acr?: string;
  cHash?: string;
  dpopJkt?: string;
  sid?: string;
  replayAttack?: {
    accessTokenJti?: string;
    refreshTokenJti?: string;
  };
}
/**
 * AuthorizationCodeStore Durable Object
 *
 * Provides distributed authorization code storage with one-time use guarantee.
 *
 * RPC Support:
 * - Extends DurableObject base class for RPC method exposure
 * - RPC methods have 'Rpc' suffix (e.g., storeCodeRpc, consumeCodeRpc)
 * - fetch() handler is maintained for backward compatibility and debugging
 *
 * SECURITY NOTE:
 * This DO handles security-critical operations including:
 * - Replay attack detection
 * - One-time code consumption (consume-once guarantee)
 * - PKCE validation
 * - Nonce binding
 * Worker callers should implement fetch fallback for RPC failures.
 */
export declare class AuthorizationCodeStore extends DurableObject<Env> {
  private codes;
  private cleanupInterval;
  private initialized;
  private configManager;
  private actorCtx;
  private userCodeCounts;
  private CODE_TTL;
  private CLEANUP_INTERVAL_MS;
  private MAX_CODES_PER_USER;
  constructor(ctx: DurableObjectState, env: Env);
  /**
   * Initialize state from Durable Storage and load configuration from KV
   * Called by blockConcurrencyWhile() in constructor
   *
   * Configuration Priority: KV > Environment variable > Default value
   */
  private initializeStateBlocking;
  /**
   * RPC: Store authorization code
   */
  storeCodeRpc(request: StoreCodeRequest): Promise<{
    success: boolean;
    expiresAt: number;
  }>;
  /**
   * RPC: Consume authorization code (one-time use, atomic operation)
   * SECURITY CRITICAL: This method handles replay attack detection and PKCE validation
   */
  consumeCodeRpc(request: ConsumeCodeRequest): Promise<ConsumeCodeResponse>;
  /**
   * RPC: Check if code exists
   */
  hasCodeRpc(code: string): Promise<boolean>;
  /**
   * RPC: Delete code manually
   */
  deleteCodeRpc(code: string): Promise<boolean>;
  /**
   * RPC: Register issued token JTIs for replay attack revocation
   */
  registerIssuedTokensRpc(
    code: string,
    accessTokenJti: string,
    refreshTokenJti?: string
  ): Promise<boolean>;
  /**
   * RPC: Get status/health check
   */
  getStatusRpc(): Promise<{
    status: string;
    codes: {
      total: number;
      active: number;
      expired: number;
    };
    config: {
      ttl: number;
      maxCodesPerUser: number;
    };
    timestamp: number;
  }>;
  /**
   * RPC: Force reload configuration from KV
   */
  reloadConfigRpc(): Promise<{
    status: string;
    message?: string;
    config?: {
      previous: {
        ttl: number;
        maxCodesPerUser: number;
      };
      current: {
        ttl: number;
        maxCodesPerUser: number;
      };
    };
  }>;
  /**
   * Ensure state is initialized
   * Called by public methods for backward compatibility
   *
   * Note: With blockConcurrencyWhile() in constructor, this is now a no-op guard.
   * The actual initialization happens in initializeStateBlocking() during construction.
   */
  private initializeState;
  /**
   * Build storage key for a code
   */
  private buildCodeKey;
  /**
   * Start periodic cleanup of expired codes
   */
  private startCleanup;
  /**
   * Cleanup expired codes from memory and Durable Storage
   * Uses batch delete for efficiency
   */
  private cleanupExpiredCodes;
  /**
   * Check if code is expired
   */
  private isExpired;
  /**
   * Generate code challenge from verifier (for PKCE validation)
   */
  private generateCodeChallenge;
  /**
   * Count codes for a user (DDoS protection) - O(1) operation
   * Uses userCodeCounts Map for constant-time lookup instead of O(n) scan
   */
  private countUserCodes;
  /**
   * Increment user code count when storing a new code
   */
  private incrementUserCodeCount;
  /**
   * Decrement user code count when a code is deleted or expired
   */
  private decrementUserCodeCount;
  /**
   * Store authorization code
   * O(1) operation - stores individual key
   */
  storeCode(request: StoreCodeRequest): Promise<{
    success: boolean;
    expiresAt: number;
  }>;
  /**
   * Consume authorization code (one-time use, atomic operation)
   *
   * Security: MUST read code to check `used` flag for replay attack detection.
   * Durable Objects' single-threaded execution model provides atomic guarantees.
   *
   * Optimization: Lazy-load + fallback get pattern
   * - First check memory cache (this.codes)
   * - If not found, try storage.get() as fallback
   */
  consumeCode(request: ConsumeCodeRequest): Promise<ConsumeCodeResponse>;
  /**
   * Check if code exists (for testing/debugging)
   */
  hasCode(code: string): Promise<boolean>;
  /**
   * Delete code manually (cleanup)
   * O(1) operation - deletes individual key
   */
  deleteCode(code: string): Promise<boolean>;
  /**
   * Register issued token JTIs for replay attack revocation
   * Called after tokens are issued for an authorization code
   * O(1) operation - updates individual key
   */
  registerIssuedTokens(
    code: string,
    accessTokenJti: string,
    refreshTokenJti?: string
  ): Promise<boolean>;
  /**
   * Handle HTTP requests to the AuthorizationCodeStore Durable Object
   */
  fetch(request: Request): Promise<Response>;
}
//# sourceMappingURL=AuthorizationCodeStore.d.ts.map
