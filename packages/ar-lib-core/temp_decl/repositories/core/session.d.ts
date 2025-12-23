/**
 * Session Repository
 *
 * Repository for user sessions stored in D1_CORE database.
 * Handles session lifecycle: creation, validation, expiration, and cleanup.
 *
 * Key features:
 * - Session creation with configurable TTL
 * - Expiration checking and cleanup
 * - External provider mapping for OIDC backchannel logout
 * - Bulk operations for user logout (terminate all sessions)
 *
 * Note: Does not extend BaseRepository because sessions table
 * doesn't have updated_at field (by design - sessions are immutable after creation).
 *
 * Table: sessions
 * Schema:
 *   - id: TEXT PRIMARY KEY (UUID)
 *   - user_id: TEXT NOT NULL (FK to users)
 *   - expires_at: INTEGER NOT NULL (timestamp)
 *   - created_at: INTEGER NOT NULL (timestamp)
 *   - external_provider_id: TEXT (for backchannel logout)
 *   - external_provider_sub: TEXT (external IdP subject)
 */
import type { DatabaseAdapter } from '../../db/adapter';
/**
 * Session entity representing a user session
 */
export interface Session {
  /** Unique session ID (UUID) */
  id: string;
  /** User ID this session belongs to */
  user_id: string;
  /** Session expiration timestamp (Unix ms) */
  expires_at: number;
  /** Session creation timestamp (Unix ms) */
  created_at: number;
  /** External IdP provider ID (for backchannel logout) */
  external_provider_id: string | null;
  /** External IdP subject identifier (for backchannel logout) */
  external_provider_sub: string | null;
}
/**
 * Input for creating a new session
 */
export interface CreateSessionInput {
  /** Optional session ID (auto-generated if not provided) */
  id?: string;
  /** User ID this session belongs to */
  user_id: string;
  /** Session TTL in milliseconds (default: 24 hours) */
  ttl_ms?: number;
  /** External IdP provider ID (for backchannel logout) */
  external_provider_id?: string;
  /** External IdP subject identifier (for backchannel logout) */
  external_provider_sub?: string;
}
/**
 * Input for updating a session
 */
export interface UpdateSessionInput {
  /** New expiration timestamp (Unix ms) */
  expires_at?: number;
  /** External IdP provider ID */
  external_provider_id?: string;
  /** External IdP subject identifier */
  external_provider_sub?: string;
}
/**
 * Filter options for session queries
 */
export interface SessionFilterOptions {
  /** Filter by user ID */
  user_id?: string;
  /** Filter by external provider ID */
  external_provider_id?: string;
  /** Filter by external provider subject */
  external_provider_sub?: string;
  /** Include only valid (non-expired) sessions */
  valid_only?: boolean;
  /** Include only expired sessions */
  expired_only?: boolean;
}
/**
 * Session Repository
 *
 * Provides CRUD operations for user sessions with:
 * - Automatic expiration handling
 * - External IdP mapping for OIDC backchannel logout
 * - Bulk session termination
 */
export declare class SessionRepository {
  protected readonly adapter: DatabaseAdapter;
  constructor(adapter: DatabaseAdapter);
  /**
   * Validate and normalize TTL value
   * @param ttl - TTL in milliseconds (must be positive)
   * @param defaultValue - Default value if TTL is invalid
   * @returns Validated TTL clamped to [MIN_SESSION_TTL_MS, MAX_SESSION_TTL_MS]
   */
  private validateTtl;
  /**
   * Create a new session
   *
   * @param input - Session creation input
   * @returns Created session
   */
  create(input: CreateSessionInput): Promise<Session>;
  /**
   * Find session by ID
   *
   * @param id - Session ID
   * @returns Session or null if not found
   */
  findById(id: string): Promise<Session | null>;
  /**
   * Find valid (non-expired) session by ID
   *
   * @param id - Session ID
   * @returns Valid session or null if not found or expired
   */
  findValidById(id: string): Promise<Session | null>;
  /**
   * Find all sessions for a user
   *
   * @param userId - User ID
   * @param validOnly - If true, return only non-expired sessions
   * @returns Array of sessions
   */
  findByUserId(userId: string, validOnly?: boolean): Promise<Session[]>;
  /**
   * Find sessions by external provider (for backchannel logout)
   *
   * @param providerId - External IdP provider ID
   * @param providerSub - External IdP subject identifier
   * @returns Array of matching sessions
   */
  findByExternalProvider(providerId: string, providerSub: string): Promise<Session[]>;
  /**
   * Find valid sessions by external provider (for backchannel logout)
   *
   * @param providerId - External IdP provider ID
   * @param providerSub - External IdP subject identifier
   * @returns Array of valid (non-expired) sessions
   */
  findValidByExternalProvider(providerId: string, providerSub: string): Promise<Session[]>;
  /**
   * Validate expires_at to ensure it's within acceptable bounds
   * @param expiresAt - Proposed expiration timestamp
   * @returns Validated expires_at or null if invalid
   */
  private validateExpiresAt;
  /**
   * Update a session
   *
   * @param id - Session ID
   * @param input - Update input
   * @returns Updated session or null if not found or invalid input
   */
  update(id: string, input: UpdateSessionInput): Promise<Session | null>;
  /**
   * Extend session expiration (refresh session)
   *
   * @param id - Session ID
   * @param additionalTtlMs - Additional TTL in milliseconds (must be positive, max 30 days)
   * @returns Updated session or null if not found or invalid TTL
   */
  extendExpiration(id: string, additionalTtlMs: number): Promise<Session | null>;
  /**
   * Delete a session (logout)
   *
   * @param id - Session ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;
  /**
   * Delete all sessions for a user (full logout)
   *
   * @param userId - User ID
   * @returns Number of deleted sessions
   */
  deleteByUserId(userId: string): Promise<number>;
  /**
   * Delete sessions by external provider (backchannel logout)
   *
   * @param providerId - External IdP provider ID
   * @param providerSub - External IdP subject identifier
   * @returns Number of deleted sessions
   */
  deleteByExternalProvider(providerId: string, providerSub: string): Promise<number>;
  /**
   * Check if session is valid (exists and not expired)
   *
   * @param id - Session ID
   * @returns True if valid, false otherwise
   */
  isValid(id: string): Promise<boolean>;
  /**
   * Count sessions for a user
   *
   * @param userId - User ID
   * @param validOnly - If true, count only non-expired sessions
   * @returns Number of sessions
   */
  countByUserId(userId: string, validOnly?: boolean): Promise<number>;
  /**
   * Cleanup expired sessions
   *
   * @returns Number of deleted expired sessions
   */
  cleanupExpired(): Promise<number>;
  /**
   * Cleanup expired sessions older than a certain age
   *
   * @param maxAgeMs - Maximum age in milliseconds (sessions expired longer than this will be deleted)
   * @returns Number of deleted sessions
   */
  cleanupExpiredOlderThan(maxAgeMs: number): Promise<number>;
  /**
   * Get session statistics for a user
   *
   * @param userId - User ID
   * @returns Session statistics
   */
  getStatsForUser(userId: string): Promise<{
    total: number;
    active: number;
    expired: number;
  }>;
  /**
   * Convert database row to Session entity
   */
  private rowToEntity;
}
//# sourceMappingURL=session.d.ts.map
