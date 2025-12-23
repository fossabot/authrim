/**
 * Passkey Repository
 *
 * Repository for WebAuthn passkeys stored in D1_CORE database.
 * Handles passkey registration, authentication, and management.
 *
 * Key features:
 * - Credential ID lookup for WebAuthn authentication
 * - Counter validation to detect cloned authenticators
 * - Device naming for user-friendly management
 * - Last-used tracking for security auditing
 *
 * Note: Does not extend BaseRepository because passkeys table
 * doesn't have updated_at field (uses last_used_at for tracking usage).
 *
 * Table: passkeys
 * Schema:
 *   - id: TEXT PRIMARY KEY (UUID)
 *   - user_id: TEXT NOT NULL (FK to users)
 *   - credential_id: TEXT UNIQUE NOT NULL (base64url encoded)
 *   - public_key: TEXT NOT NULL (base64url encoded COSE key)
 *   - counter: INTEGER DEFAULT 0 (signature counter)
 *   - transports: TEXT (JSON array of transport types)
 *   - device_name: TEXT (user-friendly name)
 *   - created_at: INTEGER NOT NULL (timestamp)
 *   - last_used_at: INTEGER (timestamp)
 */
import type { DatabaseAdapter } from '../../db/adapter';
/**
 * WebAuthn transport types
 * @see https://www.w3.org/TR/webauthn-2/#enumdef-authenticatortransport
 */
export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid';
/**
 * Passkey entity representing a WebAuthn credential
 */
export interface Passkey {
  /** Unique passkey ID (UUID) */
  id: string;
  /** User ID this passkey belongs to */
  user_id: string;
  /** Credential ID (base64url encoded) */
  credential_id: string;
  /** Public key (base64url encoded COSE key) */
  public_key: string;
  /** Signature counter for clone detection */
  counter: number;
  /** Supported transport types */
  transports: AuthenticatorTransport[];
  /** User-friendly device name */
  device_name: string | null;
  /** Creation timestamp (Unix ms) */
  created_at: number;
  /** Last authentication timestamp (Unix ms) */
  last_used_at: number | null;
}
/**
 * Input for creating a new passkey
 */
export interface CreatePasskeyInput {
  /** Optional passkey ID (auto-generated if not provided) */
  id?: string;
  /** User ID this passkey belongs to */
  user_id: string;
  /** Credential ID (base64url encoded) */
  credential_id: string;
  /** Public key (base64url encoded COSE key) */
  public_key: string;
  /** Initial signature counter (usually 0) */
  counter?: number;
  /** Supported transport types */
  transports?: AuthenticatorTransport[];
  /** User-friendly device name */
  device_name?: string;
}
/**
 * Input for updating a passkey
 *
 * Note: Counter is intentionally excluded from this interface.
 * Counter updates must go through updateCounterAfterAuth() to ensure
 * proper clone detection validation.
 */
export interface UpdatePasskeyInput {
  /** New device name */
  device_name?: string;
  /** Update last used timestamp to now */
  update_last_used?: boolean;
}
/**
 * Filter options for passkey queries
 */
export interface PasskeyFilterOptions {
  /** Filter by user ID */
  user_id?: string;
}
/**
 * Passkey Repository
 *
 * Provides CRUD operations for WebAuthn passkeys with:
 * - Credential ID lookup (critical for authentication)
 * - Counter validation (clone detection)
 * - Device management (naming, listing)
 */
export declare class PasskeyRepository {
  protected readonly adapter: DatabaseAdapter;
  constructor(adapter: DatabaseAdapter);
  /**
   * Validate counter value for WebAuthn
   * Counter must be a non-negative integer per WebAuthn spec
   * @param counter - Counter value to validate
   * @returns Validated counter (defaults to 0 if invalid)
   */
  private validateCounter;
  /**
   * Create a new passkey
   *
   * @param input - Passkey creation input
   * @returns Created passkey
   * @throws Error if credential_id already exists
   */
  create(input: CreatePasskeyInput): Promise<Passkey>;
  /**
   * Find passkey by ID
   *
   * @param id - Passkey ID
   * @returns Passkey or null if not found
   */
  findById(id: string): Promise<Passkey | null>;
  /**
   * Find passkey by credential ID (for WebAuthn authentication)
   *
   * @param credentialId - Credential ID (base64url encoded)
   * @returns Passkey or null if not found
   */
  findByCredentialId(credentialId: string): Promise<Passkey | null>;
  /**
   * Find all passkeys for a user
   *
   * @param userId - User ID
   * @returns Array of passkeys
   */
  findByUserId(userId: string): Promise<Passkey[]>;
  /**
   * Update a passkey (device name and last_used_at only)
   *
   * Note: Counter updates are NOT allowed through this method.
   * Use updateCounterAfterAuth() for counter updates to ensure
   * proper clone detection validation.
   *
   * @param id - Passkey ID
   * @param input - Update input (device_name, update_last_used)
   * @returns Updated passkey or null if not found
   */
  update(id: string, input: UpdatePasskeyInput): Promise<Passkey | null>;
  /**
   * Update counter and last_used_at after successful authentication
   * This is critical for clone detection
   *
   * @param id - Passkey ID
   * @param newCounter - New counter value (must be greater than current)
   * @returns Updated passkey or null if not found
   * @throws Error if newCounter is not greater than current counter
   */
  updateCounterAfterAuth(id: string, newCounter: number): Promise<Passkey | null>;
  /**
   * Rename a passkey (update device_name)
   *
   * @param id - Passkey ID
   * @param deviceName - New device name
   * @returns Updated passkey or null if not found
   */
  rename(id: string, deviceName: string): Promise<Passkey | null>;
  /**
   * Delete a passkey
   *
   * @param id - Passkey ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;
  /**
   * Delete all passkeys for a user
   *
   * @param userId - User ID
   * @returns Number of deleted passkeys
   */
  deleteByUserId(userId: string): Promise<number>;
  /**
   * Check if credential ID exists
   *
   * @param credentialId - Credential ID (base64url encoded)
   * @returns True if exists
   */
  credentialIdExists(credentialId: string): Promise<boolean>;
  /**
   * Check if user has any passkeys
   *
   * @param userId - User ID
   * @returns True if user has at least one passkey
   */
  userHasPasskeys(userId: string): Promise<boolean>;
  /**
   * Count passkeys for a user
   *
   * @param userId - User ID
   * @returns Number of passkeys
   */
  countByUserId(userId: string): Promise<number>;
  /**
   * Get passkeys that haven't been used in a long time
   * Useful for security auditing and cleanup suggestions
   *
   * @param userId - User ID
   * @param unusedSinceMs - Time in milliseconds (passkeys not used since)
   * @returns Array of unused passkeys
   */
  findUnusedPasskeys(userId: string, unusedSinceMs: number): Promise<Passkey[]>;
  /**
   * Get passkey statistics for a user
   *
   * @param userId - User ID
   * @returns Passkey statistics
   */
  getStatsForUser(userId: string): Promise<{
    total: number;
    recentlyUsed: number;
    neverUsed: number;
    avgCounter: number;
  }>;
  /**
   * Convert database row to Passkey entity
   */
  private rowToEntity;
}
//# sourceMappingURL=passkey.d.ts.map
