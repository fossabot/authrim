/**
 * DPoPJTIStore Durable Object
 *
 * Manages DPoP JTI (JWT ID) replay protection with atomic operations.
 * Solves issue #12: DPoP JTI Replay Protection race condition.
 *
 * DPoP (Demonstrating Proof-of-Possession) Requirements:
 * - Each DPoP proof JWT MUST have a unique jti (JWT ID)
 * - jti MUST NOT be reused (replay protection)
 * - jti should be tracked for a reasonable time window
 *
 * Security Features:
 * - Atomic check-and-store operation
 * - Prevents parallel replay attacks
 * - TTL enforcement (e.g., 1 hour)
 * - Automatic cleanup of expired JTIs
 *
 * Benefits over KV-based JTI tracking:
 * - ✅ No race conditions on concurrent requests with same JTI
 * - ✅ Perfect replay protection (100% accuracy)
 * - ✅ Immediate consistency (no eventual consistency issues)
 * - ✅ DPoP specification compliance
 */
import type { Env } from '../types/env';
/**
 * DPoP JTI record
 */
export interface DPoPJTIRecord {
  jti: string;
  client_id?: string;
  iat: number;
  createdAt: number;
  expiresAt: number;
}
/**
 * Check and store JTI request
 */
export interface CheckAndStoreJTIRequest {
  jti: string;
  client_id?: string;
  iat: number;
  ttl: number;
}
/**
 * DPoPJTIStore Durable Object
 *
 * Provides atomic JTI replay protection for DPoP.
 */
export declare class DPoPJTIStore {
  private state;
  private env;
  private jtis;
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
   * Start periodic cleanup of expired JTIs
   */
  private startCleanup;
  /**
   * Cleanup expired JTIs
   */
  private cleanupExpiredJTIs;
  /**
   * Check if JTI exists (replay detection)
   */
  checkJTI(jti: string): Promise<DPoPJTIRecord | null>;
  /**
   * Atomically check and store JTI
   *
   * CRITICAL: This operation is atomic within the DO
   * - Checks if JTI already exists
   * - If exists: throws error (replay detected)
   * - If not exists: stores JTI
   *
   * This is the solution to issue #12: DPoP JTI race condition.
   * Parallel requests with the same JTI will be serialized,
   * ensuring only the first one succeeds.
   */
  checkAndStoreJTI(request: CheckAndStoreJTIRequest): Promise<void>;
  /**
   * Delete a JTI (for cleanup or testing)
   */
  deleteJTI(jti: string): Promise<boolean>;
  /**
   * Handle HTTP requests to the DPoPJTIStore Durable Object
   */
  fetch(request: Request): Promise<Response>;
}
//# sourceMappingURL=DPoPJTIStore.d.ts.map
