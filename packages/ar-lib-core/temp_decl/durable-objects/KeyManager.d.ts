/**
 * KeyManager Durable Object
 *
 * Manages RSA key pairs for JWT signing with support for key rotation.
 * Implements a key rotation strategy that maintains multiple active keys
 * to ensure zero-downtime key rotation.
 *
 * Key Rotation Strategy:
 * 1. New key is generated with a new kid (key ID)
 * 2. New key is added to the key set alongside existing keys
 * 3. New tokens are signed with the new key
 * 4. Old keys remain active for verification until rotation window expires
 * 5. Expired keys are removed from the key set
 *
 * This ensures that tokens signed with old keys can still be verified
 * during the transition period.
 */
import { DurableObject } from 'cloudflare:workers';
import type { JWK } from 'jose';
import { type ECAlgorithm, type ECCurve } from '../utils/ec-keys';
import type { Env } from '../types/env';
import type { KeyStatus } from '../types/admin';
/**
 * Stored key metadata (RSA)
 */
interface StoredKey {
  kid: string;
  publicJWK: JWK;
  privatePEM: string;
  createdAt: number;
  status: KeyStatus;
  expiresAt?: number;
  revokedAt?: number;
  revokedReason?: string;
}
/**
 * Stored EC key metadata
 * Used for SD-JWT VC signing (Phase 9)
 */
interface StoredECKey {
  kid: string;
  algorithm: ECAlgorithm;
  curve: ECCurve;
  publicJWK: JWK;
  privatePEM: string;
  createdAt: number;
  status: KeyStatus;
  expiresAt?: number;
  revokedAt?: number;
  revokedReason?: string;
}
/**
 * Key rotation configuration
 */
interface KeyRotationConfig {
  rotationIntervalDays: number;
  retentionPeriodDays: number;
}
/**
 * KeyManager Durable Object
 *
 * Manages cryptographic keys for JWT signing with automatic rotation support.
 * Supports both RSA keys (for OIDC tokens) and EC keys (for SD-JWT VC in Phase 9).
 *
 * RPC Support:
 * - Extends DurableObject base class for RPC method exposure
 * - RPC methods have 'Rpc' suffix (e.g., getActiveKeyRpc, rotateKeysRpc)
 * - fetch() handler is maintained for backward compatibility and debugging
 *
 * Key Types:
 * - RSA: RS256 for OIDC ID tokens and access tokens
 * - EC: ES256/ES384/ES512 for SD-JWT VC (HAIP compliance)
 */
export declare class KeyManager extends DurableObject<Env> {
  private keyManagerState;
  private ecKeyManagerState;
  constructor(ctx: DurableObjectState, env: Env);
  /**
   * Initialize state from Durable Storage
   * Called by blockConcurrencyWhile() in constructor
   */
  private initializeStateBlocking;
  /**
   * RPC: Get the active signing key (without private key)
   */
  getActiveKeyRpc(): Promise<Omit<StoredKey, 'privatePEM'> | null>;
  /**
   * RPC: Get the active signing key with private key (for internal use)
   */
  getActiveKeyWithPrivateRpc(): Promise<StoredKey | null>;
  /**
   * RPC: Get all public keys (for JWKS endpoint)
   */
  getAllPublicKeysRpc(): Promise<JWK[]>;
  /**
   * RPC: Rotate keys
   */
  rotateKeysRpc(): Promise<Omit<StoredKey, 'privatePEM'>>;
  /**
   * RPC: Rotate keys (with private key for internal use)
   */
  rotateKeysWithPrivateRpc(): Promise<StoredKey>;
  /**
   * RPC: Emergency key rotation
   */
  emergencyRotateKeysRpc(reason: string): Promise<{
    oldKid: string;
    newKid: string;
  }>;
  /**
   * RPC: Check if rotation is needed
   */
  shouldRotateKeysRpc(): Promise<boolean>;
  /**
   * RPC: Get configuration
   */
  getConfigRpc(): Promise<KeyRotationConfig>;
  /**
   * RPC: Update configuration
   */
  updateConfigRpc(config: Partial<KeyRotationConfig>): Promise<void>;
  /**
   * RPC: Get status of all keys
   */
  getStatusRpc(): Promise<{
    keys: Array<{
      kid: string;
      status: KeyStatus;
      createdAt: number;
      expiresAt?: number;
      revokedAt?: number;
      revokedReason?: string;
    }>;
    activeKeyId: string | null;
    lastRotation: number | null;
  }>;
  /**
   * RPC: Get the active EC signing key for a specific algorithm (without private key)
   */
  getActiveECKeyRpc(algorithm: ECAlgorithm): Promise<Omit<StoredECKey, 'privatePEM'> | null>;
  /**
   * RPC: Get the active EC signing key with private key (for internal VC signing)
   */
  getActiveECKeyWithPrivateRpc(algorithm: ECAlgorithm): Promise<StoredECKey | null>;
  /**
   * RPC: Get all EC public keys (for JWKS endpoint)
   */
  getAllECPublicKeysRpc(): Promise<JWK[]>;
  /**
   * RPC: Rotate EC keys for a specific algorithm
   */
  rotateECKeysRpc(algorithm: ECAlgorithm): Promise<Omit<StoredECKey, 'privatePEM'>>;
  /**
   * RPC: Rotate EC keys with private key (for internal use)
   */
  rotateECKeysWithPrivateRpc(algorithm: ECAlgorithm): Promise<StoredECKey>;
  /**
   * RPC: Emergency EC key rotation
   */
  emergencyRotateECKeysRpc(
    algorithm: ECAlgorithm,
    reason: string
  ): Promise<{
    oldKid: string;
    newKid: string;
  }>;
  /**
   * RPC: Get EC key status for all algorithms
   */
  getECStatusRpc(): Promise<{
    keys: Array<{
      kid: string;
      algorithm: ECAlgorithm;
      curve: ECCurve;
      status: KeyStatus;
      createdAt: number;
      expiresAt?: number;
      revokedAt?: number;
      revokedReason?: string;
    }>;
    activeKeyIds: Record<ECAlgorithm, string | null>;
    lastRotation: number | null;
  }>;
  /**
   * Ensure state is initialized
   * Called by public methods for backward compatibility
   *
   * Note: With blockConcurrencyWhile() in constructor, this is now a no-op guard.
   */
  private initializeState;
  /**
   * Migrate from old isActive field to new status field
   * This is a one-time migration for backward compatibility
   */
  private migrateIsActiveToStatus;
  /**
   * Get state with assertion that it has been initialized
   */
  private getState;
  /**
   * Save state to durable storage
   */
  private saveState;
  /**
   * Save EC key state to durable storage
   */
  private saveECState;
  /**
   * Ensure EC state is initialized
   */
  private initializeECState;
  /**
   * Get EC state with assertion that it has been initialized
   */
  private getECState;
  /**
   * Generate a new key and add it to the key set
   */
  generateNewKey(): Promise<StoredKey>;
  /**
   * Set a key as the active signing key
   */
  setActiveKey(kid: string): Promise<void>;
  /**
   * Get the active signing key
   */
  getActiveKey(): Promise<StoredKey | null>;
  /**
   * Get all public keys (for JWKS endpoint)
   * Excludes revoked keys from JWKS
   */
  getAllPublicKeys(): Promise<JWK[]>;
  /**
   * Get a specific key by kid
   */
  getKey(kid: string): Promise<StoredKey | null>;
  /**
   * Rotate keys (generate new key and set as active)
   */
  rotateKeys(): Promise<StoredKey>;
  /**
   * Emergency key rotation for key compromise scenarios
   * Immediately revokes the current active key and generates a new one
   *
   * @param reason - Reason for emergency rotation (for audit purposes)
   * @returns Object with old and new key IDs
   */
  emergencyRotateKeys(reason: string): Promise<{
    oldKid: string;
    newKid: string;
  }>;
  /**
   * Clean up expired keys based on retention period
   * - Active keys: never removed
   * - Overlap keys: removed after expiry
   * - Revoked keys: kept for retention period for audit purposes
   */
  private cleanupExpiredKeys;
  /**
   * Check if key rotation is needed
   */
  shouldRotateKeys(): Promise<boolean>;
  /**
   * Update key rotation configuration
   */
  updateConfig(config: Partial<KeyRotationConfig>): Promise<void>;
  /**
   * Get current configuration
   */
  getConfig(): Promise<KeyRotationConfig>;
  /**
   * Generate a unique key ID using cryptographically secure random
   */
  private generateKeyId;
  /**
   * Generate a new EC key and add it to the key set
   *
   * @param algorithm - EC algorithm (ES256, ES384, ES512)
   */
  generateNewECKey(algorithm: ECAlgorithm): Promise<StoredECKey>;
  /**
   * Set an EC key as the active signing key for its algorithm
   */
  setActiveECKey(kid: string): Promise<void>;
  /**
   * Get the active EC signing key for a specific algorithm
   */
  getActiveECKey(algorithm: ECAlgorithm): Promise<StoredECKey | null>;
  /**
   * Get all EC public keys (for JWKS endpoint)
   * Excludes revoked keys from JWKS
   */
  getAllECPublicKeys(): Promise<JWK[]>;
  /**
   * Rotate EC keys for a specific algorithm (generate new key and set as active)
   */
  rotateECKeys(algorithm: ECAlgorithm): Promise<StoredECKey>;
  /**
   * Emergency EC key rotation for key compromise scenarios
   * Immediately revokes the current active EC key and generates a new one
   *
   * @param algorithm - EC algorithm (ES256, ES384, ES512)
   * @param reason - Reason for emergency rotation (for audit purposes)
   * @returns Object with old and new key IDs
   */
  emergencyRotateECKeys(
    algorithm: ECAlgorithm,
    reason: string
  ): Promise<{
    oldKid: string;
    newKid: string;
  }>;
  /**
   * Clean up expired EC keys based on retention period
   */
  private cleanupExpiredECKeys;
  /**
   * Generate a unique EC key ID
   */
  private generateECKeyId;
  /**
   * Sanitize EC key data for safe HTTP response (remove private key material)
   */
  private sanitizeECKey;
  /**
   * Authenticate requests using Bearer token
   *
   * @param request - The incoming HTTP request
   * @returns True if authenticated, false otherwise
   */
  private authenticate;
  /**
   * Create an unauthorized response
   */
  private unauthorizedResponse;
  /**
   * Sanitize key data for safe HTTP response (remove private key material)
   */
  private sanitizeKey;
  /**
   * Handle HTTP requests to the KeyManager Durable Object
   */
  fetch(request: Request): Promise<Response>;
}
export {};
//# sourceMappingURL=KeyManager.d.ts.map
