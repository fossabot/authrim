/**
 * RefreshTokenRotator Durable Object (V2)
 *
 * Manages atomic refresh token rotation with version-based theft detection.
 * Each Token Family tracks a single refresh token chain per user.
 *
 * V2 Architecture:
 * - Version-based theft detection (not token string comparison)
 * - Minimal state: version, last_jti, last_used_at, expires_at, user_id, client_id, allowed_scope
 * - JWT contains rtv (Refresh Token Version) claim for validation
 * - Granular storage with prefix-based keys
 *
 * Security Features:
 * - Atomic rotation (DO guarantees single-threaded execution)
 * - Version mismatch → theft detection → family revocation
 * - Scope amplification prevention (allowed_scope check)
 * - Tenant boundary enforcement (user_id validation)
 *
 * OAuth 2.0 Security Best Current Practice (BCP) Compliance:
 * - Token Rotation: Refresh tokens are rotated on every use
 * - Theft Detection: Old version reuse triggers family revocation
 * - Audit Trail: Critical events logged synchronously
 *
 * Reference:
 * - OAuth 2.0 Security BCP: Draft 16, Section 4.13.2
 * - RFC 6749: Section 10.4 (Refresh Token Protection)
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';
/**
 * Token Family V2 - Minimal state for high-performance rotation
 */
export interface TokenFamilyV2 {
  version: number;
  last_jti: string;
  last_used_at: number;
  expires_at: number;
  user_id: string;
  client_id: string;
  allowed_scope: string;
}
/**
 * Create family request (V2)
 */
export interface CreateFamilyRequestV2 {
  jti: string;
  userId: string;
  clientId: string;
  scope: string;
  ttl: number;
}
/**
 * Create family request (V3) - Sharding support
 * Extends V2 with generation and shard information for distributed routing.
 */
export interface CreateFamilyRequestV3 extends CreateFamilyRequestV2 {
  generation: number;
  shardIndex: number;
}
/**
 * Rotate token request (V2)
 */
export interface RotateTokenRequestV2 {
  incomingVersion: number;
  incomingJti: string;
  userId: string;
  clientId: string;
  requestedScope?: string;
}
/**
 * Rotate token response (V2)
 */
export interface RotateTokenResponseV2 {
  newVersion: number;
  newJti: string;
  expiresIn: number;
  allowedScope: string;
}
/**
 * RefreshTokenRotator Durable Object (V2)
 *
 * Sharded by client_id for horizontal scaling.
 * Each DO instance manages all token families for a single client.
 *
 * RPC Support:
 * - Extends DurableObject base class for RPC method exposure
 * - RPC methods have 'Rpc' suffix (e.g., createFamilyRpc, rotateRpc)
 * - fetch() handler is maintained for backward compatibility and debugging
 */
export declare class RefreshTokenRotator extends DurableObject<Env> {
  private families;
  private initialized;
  private initializePromise;
  private generation;
  private shardIndex;
  private pendingAuditLogs;
  private flushScheduled;
  private readonly AUDIT_FLUSH_DELAY;
  private readonly DEFAULT_TTL;
  constructor(ctx: DurableObjectState, env: Env);
  /**
   * Initialize state from Durable Storage
   * Called by blockConcurrencyWhile() in constructor
   */
  private initializeStateBlocking;
  /**
   * RPC: Create new token family
   */
  createFamilyRpc(request: CreateFamilyRequestV2 | CreateFamilyRequestV3): Promise<{
    version: number;
    newJti: string;
    expiresIn: number;
    allowedScope: string;
  }>;
  /**
   * RPC: Rotate refresh token
   * SECURITY CRITICAL: Handles token theft detection
   */
  rotateRpc(request: RotateTokenRequestV2): Promise<RotateTokenResponseV2>;
  /**
   * RPC: Revoke token family
   */
  revokeFamilyRpc(userId: string, reason?: string): Promise<void>;
  /**
   * RPC: Get family info
   */
  getFamilyRpc(userId: string): Promise<TokenFamilyV2 | null>;
  /**
   * RPC: Revoke by JTI (RFC 7009)
   */
  revokeByJtiRpc(jti: string, reason?: string): Promise<boolean>;
  /**
   * RPC: Batch revoke multiple tokens
   */
  batchRevokeRpc(
    jtis: string[],
    reason?: string
  ): Promise<{
    revoked: number;
    notFound: number;
  }>;
  /**
   * RPC: Validate token without rotation
   */
  validateRpc(
    userId: string,
    version: number,
    clientId: string
  ): Promise<{
    valid: boolean;
    family?: TokenFamilyV2;
  }>;
  /**
   * RPC: Get status/health check
   */
  getStatusRpc(): Promise<{
    status: string;
    version: string;
    families: {
      total: number;
      active: number;
    };
    timestamp: number;
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
   * Build family key from userId
   */
  private buildFamilyKey;
  /**
   * Save family to storage
   */
  private saveFamily;
  /**
   * Delete family from storage
   */
  private deleteFamily;
  /**
   * Generate unique JWT ID
   *
   * If generation and shardIndex are set, generates full JTI format:
   * v{generation}_{shardIndex}_{randomPart}
   *
   * Otherwise, generates legacy format: rt_{uuid}
   */
  private generateJti;
  /**
   * Create new token family (V2/V3)
   *
   * Called when issuing the first refresh token for a user-client pair.
   * Returns response consistent with rotate for easier client implementation.
   *
   * V3 extension: If generation and shardIndex are provided, stores them
   * for use in generateJti() to create properly formatted JTIs.
   */
  createFamily(request: CreateFamilyRequestV2 | CreateFamilyRequestV3): Promise<{
    version: number;
    newJti: string;
    expiresIn: number;
    allowedScope: string;
  }>;
  /**
   * Rotate refresh token (V2)
   *
   * Validates incoming token version and issues new token with incremented version.
   * Detects theft if incoming version < current version.
   */
  rotate(request: RotateTokenRequestV2): Promise<RotateTokenResponseV2>;
  /**
   * Revoke token family
   */
  revokeFamily(userId: string, reason?: string): Promise<void>;
  /**
   * Get family info (for validation/debugging)
   */
  getFamily(userId: string): Promise<TokenFamilyV2 | null>;
  /**
   * Revoke a single token by JTI
   * Used for RFC 7009 Token Revocation
   */
  revokeByJti(jti: string, reason?: string): Promise<boolean>;
  /**
   * Batch revoke multiple token families
   * Used for user-wide token revocation
   *
   * @param jtis - List of JTIs to revoke
   * @param reason - Revocation reason
   * @returns Number of families revoked
   */
  batchRevoke(
    jtis: string[],
    reason?: string
  ): Promise<{
    revoked: number;
    notFound: number;
  }>;
  /**
   * Validate token without rotation (for introspection)
   */
  validate(
    userId: string,
    version: number,
    clientId: string
  ): Promise<{
    valid: boolean;
    family?: TokenFamilyV2;
  }>;
  /**
   * Log non-critical events (batched, async)
   */
  private logToD1;
  /**
   * Log critical events synchronously (theft_detected, family_revoked)
   */
  private logCritical;
  /**
   * Schedule batch flush of audit logs
   */
  private scheduleAuditFlush;
  /**
   * Flush pending audit logs to D1
   */
  private flushAuditLogs;
  /**
   * Handle HTTP requests
   */
  fetch(request: Request): Promise<Response>;
}
//# sourceMappingURL=RefreshTokenRotator.d.ts.map
