/**
 * ChallengeStore Durable Object
 *
 * Manages one-time challenges for Passkey and Email Code authentication
 * with atomic consume operations to prevent replay attacks.
 *
 * Storage Architecture (v2):
 * - Individual key storage: `challenge:${id}` for each challenge
 * - O(1) reads/writes per challenge operation
 * - Sharding support: Multiple DO instances distribute load
 *
 * Security Features:
 * - Atomic consume (check + delete in single operation)
 * - TTL enforcement
 * - Challenge type validation
 * - Prevents parallel replay attacks
 *
 * Challenge Types:
 * - passkey_registration: WebAuthn registration challenge
 * - passkey_authentication: WebAuthn authentication challenge
 * - email_code: Email-based OTP verification code
 * - session_token: ITP-bypass session token (single-use)
 * - reauth: Re-authentication confirmation challenge (prompt=login, max_age)
 * - login: Login flow challenge (session-less authentication)
 * - consent: OAuth consent flow challenge
 *
 * RPC Support:
 * - Extends DurableObject base class for RPC method exposure
 * - RPC methods have 'Rpc' suffix (e.g., storeChallengeRpc, consumeChallengeRpc)
 * - fetch() handler is maintained for backward compatibility
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';
/**
 * Challenge types
 */
export type ChallengeType =
  | 'passkey_registration'
  | 'passkey_authentication'
  | 'email_code'
  | 'session_token'
  | 'reauth'
  | 'login'
  | 'consent'
  | 'did_authentication'
  | 'did_registration';
/**
 * Challenge metadata
 */
export interface Challenge {
  id: string;
  type: ChallengeType;
  userId: string;
  challenge: string;
  email?: string;
  redirectUri?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}
/**
 * Store challenge request
 */
export interface StoreChallengeRequest {
  id: string;
  type: ChallengeType;
  userId: string;
  challenge: string;
  ttl: number;
  email?: string;
  redirectUri?: string;
  metadata?: Record<string, unknown>;
}
/**
 * Consume challenge request
 */
export interface ConsumeChallengeRequest {
  id: string;
  type: ChallengeType;
  challenge?: string;
}
/**
 * Consume challenge response
 */
export interface ConsumeChallengeResponse {
  challenge: string;
  userId: string;
  email?: string;
  redirectUri?: string;
  metadata?: Record<string, unknown>;
}
/**
 * ChallengeStore Durable Object
 *
 * Provides atomic one-time challenge management for authentication flows.
 * Uses individual key storage for O(1) operations.
 *
 * RPC Support:
 * - Extends DurableObject base class for RPC method exposure
 * - RPC methods have 'Rpc' suffix (e.g., storeChallengeRpc, consumeChallengeRpc)
 * - fetch() handler is maintained for backward compatibility
 */
export declare class ChallengeStore extends DurableObject<Env> {
  private challengeCache;
  private cleanupInterval;
  private readonly CLEANUP_INTERVAL;
  constructor(ctx: DurableObjectState, env: Env);
  /**
   * Build storage key for a challenge
   */
  private buildChallengeKey;
  /**
   * RPC: Store a new challenge
   */
  storeChallengeRpc(request: StoreChallengeRequest): Promise<{
    success: boolean;
  }>;
  /**
   * RPC: Consume a challenge (atomic check + delete)
   * SECURITY CRITICAL: Prevents replay attacks through atomic operation
   */
  consumeChallengeRpc(request: ConsumeChallengeRequest): Promise<ConsumeChallengeResponse>;
  /**
   * RPC: Delete a challenge
   */
  deleteChallengeRpc(id: string): Promise<{
    deleted: boolean;
  }>;
  /**
   * RPC: Get challenge info (without consuming)
   */
  getChallengeRpc(id: string): Promise<Challenge | null>;
  /**
   * RPC: Get status/health check
   */
  getStatusRpc(): Promise<{
    status: string;
    challenges: {
      total: number;
      active: number;
      consumed: number;
    };
    timestamp: number;
  }>;
  /**
   * Check if challenge is expired
   */
  private isExpired;
  /**
   * Start periodic cleanup of expired challenges
   */
  private startCleanup;
  /**
   * Cleanup expired challenges from memory cache and Durable Storage
   */
  private cleanupExpiredChallenges;
  /**
   * Store a new challenge
   */
  storeChallenge(request: StoreChallengeRequest): Promise<void>;
  /**
   * Consume a challenge (atomic check + delete)
   *
   * CRITICAL: This operation is atomic within the DO
   * - Checks if challenge exists
   * - Marks as consumed
   * - Returns challenge value and data
   *
   * Parallel requests will fail because first request marks as consumed.
   *
   * If challenge parameter is provided, it must match the stored value.
   */
  consumeChallenge(request: ConsumeChallengeRequest): Promise<ConsumeChallengeResponse>;
  /**
   * Delete a challenge (for cleanup or cancellation)
   *
   * Optimized: No read-before-delete pattern.
   * storage.delete() is idempotent and works safely on non-existent keys.
   */
  deleteChallenge(id: string): Promise<boolean>;
  /**
   * Get challenge info (without consuming)
   * Used for validation before consumption
   */
  getChallenge(id: string): Promise<Challenge | null>;
  /**
   * Handle HTTP requests to the ChallengeStore Durable Object
   */
  fetch(request: Request): Promise<Response>;
}
//# sourceMappingURL=ChallengeStore.d.ts.map
