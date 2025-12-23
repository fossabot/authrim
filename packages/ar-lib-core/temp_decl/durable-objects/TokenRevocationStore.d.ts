/**
 * TokenRevocationStore Durable Object
 *
 * Manages revoked access token JTIs with atomic operations.
 * Replaces KV-based REVOKED_TOKENS namespace with strong consistency.
 *
 * Token Revocation Requirements:
 * - Store revoked access token JTIs
 * - Check if token is revoked (introspection, userinfo)
 * - TTL enforcement (tokens auto-expire, no need to keep them forever)
 * - Automatic cleanup of expired tokens
 *
 * Benefits over KV-based revocation:
 * - ✅ Strong consistency (no eventual consistency issues)
 * - ✅ Atomic operations (no race conditions)
 * - ✅ Automatic cleanup of expired entries
 * - ✅ Better performance (in-memory + persistent storage)
 */
import type { Env } from '../types/env';
/**
 * Revoked token record
 */
export interface RevokedTokenRecord {
  jti: string;
  revokedAt: number;
  expiresAt: number;
  reason?: string;
}
/**
 * Revoke token request
 */
export interface RevokeTokenRequest {
  jti: string;
  ttl: number;
  reason?: string;
}
/**
 * TokenRevocationStore Durable Object
 *
 * Provides atomic token revocation operations.
 */
export declare class TokenRevocationStore {
  private state;
  private env;
  private revokedTokens;
  private cleanupInterval;
  private initialized;
  private readonly CLEANUP_INTERVAL;
  private readonly MAX_ENTRIES;
  constructor(state: DurableObjectState, env: Env);
  /**
   * Initialize state from Durable Storage
   */
  private initializeState;
  /**
   * Save current state to Durable Storage
   */
  private saveState;
  /**
   * Start periodic cleanup of expired revoked tokens
   */
  private startCleanup;
  /**
   * Cleanup expired revoked tokens
   */
  private cleanupExpiredTokens;
  /**
   * Check if token is revoked
   */
  isRevoked(jti: string): Promise<RevokedTokenRecord | null>;
  /**
   * Revoke a token
   */
  revokeToken(request: RevokeTokenRequest): Promise<void>;
  /**
   * Bulk revoke tokens (used for authorization code reuse attack)
   */
  bulkRevokeTokens(jtis: string[], ttl: number, reason: string): Promise<void>;
  /**
   * Delete a revoked token record (for cleanup or testing)
   */
  deleteToken(jti: string): Promise<boolean>;
  /**
   * Handle HTTP requests to the TokenRevocationStore Durable Object
   */
  fetch(request: Request): Promise<Response>;
}
//# sourceMappingURL=TokenRevocationStore.d.ts.map
