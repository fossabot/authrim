/**
 * SessionStore Durable Object
 *
 * Manages active user sessions with in-memory hot data and D1 database fallback.
 * Provides instant session invalidation and ITP-compatible session management.
 *
 * Storage Architecture (v2):
 * - Individual key storage: `session:${sessionId}` for each session
 * - O(1) reads/writes per session operation
 * - Sharding support: Multiple DO instances distribute load
 *
 * Hot/Cold Pattern:
 * 1. Active sessions stored in-memory for sub-millisecond access (hot)
 * 2. Cold sessions loaded from D1 database on demand
 * 3. Sessions promoted to hot storage on access
 * 4. Expired sessions cleaned up periodically
 *
 * Security Features:
 * - Instant session revocation (security requirement)
 * - Automatic expiration handling
 * - Multi-device session management
 * - Audit trail via D1 storage
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';
/**
 * Session data interface
 */
export interface Session {
  id: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
  data?: SessionData;
}
/**
 * Additional session metadata
 */
export interface SessionData {
  amr?: string[];
  acr?: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
}
/**
 * Session creation request
 */
export interface CreateSessionRequest {
  sessionId: string;
  userId: string;
  ttl: number;
  data?: SessionData;
}
/**
 * Session response (without sensitive data)
 */
export interface SessionResponse {
  id: string;
  userId: string;
  expiresAt: number;
  createdAt: number;
  data?: SessionData;
}
/**
 * SessionStore Durable Object
 *
 * Provides distributed session storage with strong consistency guarantees.
 * Uses individual key storage for O(1) operations.
 *
 * RPC Support:
 * - Extends DurableObject base class for RPC method exposure
 * - RPC methods have 'Rpc' suffix (e.g., getSessionRpc)
 * - fetch() handler is maintained for backward compatibility and debugging
 */
export declare class SessionStore extends DurableObject<Env> {
  private sessionCache;
  private cleanupInterval;
  private actorCtx;
  constructor(ctx: DurableObjectState, env: Env);
  /**
   * RPC: Get session by ID
   */
  getSessionRpc(sessionId: string): Promise<Session | null>;
  /**
   * RPC: Create new session
   */
  createSessionRpc(
    sessionId: string,
    userId: string,
    ttl: number,
    data?: SessionData
  ): Promise<Session>;
  /**
   * RPC: Invalidate session immediately
   */
  invalidateSessionRpc(sessionId: string): Promise<boolean>;
  /**
   * RPC: Batch invalidate multiple sessions
   */
  invalidateSessionsBatchRpc(sessionIds: string[]): Promise<{
    deleted: number;
    failed: string[];
  }>;
  /**
   * RPC: List all active sessions for a user
   */
  listUserSessionsRpc(userId: string): Promise<SessionResponse[]>;
  /**
   * RPC: Extend session expiration
   */
  extendSessionRpc(sessionId: string, additionalSeconds: number): Promise<Session | null>;
  /**
   * RPC: Get status/health check
   */
  getStatusRpc(): Promise<{
    status: string;
    sessions: number;
    cached: number;
    timestamp: number;
  }>;
  /**
   * Build storage key for a session
   */
  private buildSessionKey;
  /**
   * Build storage key for a tombstone
   */
  private buildTombstoneKey;
  /**
   * Create a tombstone for a deleted session
   * Tombstones prevent D1 fallback from returning stale sessions after deletion
   * This is critical for OIDC RP-Initiated Logout security
   */
  private createTombstone;
  /**
   * Create tombstones for multiple deleted sessions (batch)
   */
  private createTombstonesBatch;
  /**
   * Check if a tombstone exists for a session
   * Returns true if the session has been deleted and should not be loaded from D1
   */
  private hasTombstone;
  /**
   * Cleanup expired tombstones
   */
  private cleanupTombstones;
  /**
   * Start periodic cleanup of expired sessions
   */
  private startCleanup;
  /**
   * Cleanup expired sessions from memory and Durable Storage
   * Also cleans up expired tombstones
   */
  private cleanupExpiredSessions;
  /**
   * Check if session is expired
   */
  private isExpired;
  /**
   * Load session from D1 database (cold storage)
   * Checks for tombstones first to prevent returning deleted sessions
   * This is critical for OIDC RP-Initiated Logout security
   */
  private loadFromD1;
  /**
   * Save session to D1 database (persistent storage)
   * Uses retry logic with exponential backoff for reliability
   */
  private saveToD1;
  /**
   * Delete session from D1 database
   * Uses retry logic with exponential backoff for reliability
   */
  private deleteFromD1;
  /**
   * Get session by ID (cache → storage → D1 fallback)
   */
  getSession(sessionId: string): Promise<Session | null>;
  /**
   * Create new session
   * Session ID must be provided by the caller (generated via session-helper)
   */
  createSession(
    sessionId: string,
    userId: string,
    ttl: number,
    data?: SessionData
  ): Promise<Session>;
  /**
   * Invalidate session immediately
   *
   * Optimized: No read-before-delete pattern.
   * storage.delete() is idempotent and works safely on non-existent keys.
   *
   * Security: Creates tombstone if D1 deletion fails to prevent stale sessions
   * from being loaded via D1 fallback (OIDC RP-Initiated Logout protection)
   */
  invalidateSession(sessionId: string): Promise<boolean>;
  /**
   * Batch invalidate multiple sessions
   * Optimized for admin operations (e.g., delete all user sessions)
   *
   * Optimized: No read-before-delete pattern. Uses batch delete for efficiency.
   * Uses chunking to prevent timeout on large batches.
   *
   * Security: Creates tombstones if D1 deletion fails to prevent stale sessions
   * from being loaded via D1 fallback (OIDC RP-Initiated Logout protection)
   */
  invalidateSessionsBatch(sessionIds: string[]): Promise<{
    deleted: number;
    failed: string[];
  }>;
  /**
   * Batch delete sessions from D1
   * Uses a single SQL statement with IN clause for efficiency
   */
  private batchDeleteFromD1;
  /**
   * List all active sessions for a user
   * Note: In sharded mode, this only returns sessions in this shard
   */
  listUserSessions(userId: string): Promise<SessionResponse[]>;
  /**
   * Extend session expiration (Active TTL)
   */
  extendSession(sessionId: string, additionalSeconds: number): Promise<Session | null>;
  /**
   * Sanitize session data for HTTP response (remove sensitive data)
   * Note: data field is included for OIDC conformance (authTime consistency)
   */
  private sanitizeSession;
  /**
   * Handle HTTP requests to the SessionStore Durable Object
   */
  fetch(request: Request): Promise<Response>;
}
//# sourceMappingURL=SessionStore.d.ts.map
