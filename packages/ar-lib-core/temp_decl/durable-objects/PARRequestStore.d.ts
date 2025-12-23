/**
 * PARRequestStore Durable Object
 *
 * Manages Pushed Authorization Request (PAR) request_uri with single-use guarantee.
 * Solves issue #11: PAR request_uri race condition (RFC 9126 compliance).
 *
 * RFC 9126 Requirements:
 * - request_uri MUST be single-use only
 * - request_uri MUST expire (typically 10 minutes)
 * - request_uri MUST be bound to the client_id
 *
 * Security Features:
 * - Atomic consume operation (check + delete in single operation)
 * - Prevents parallel replay attacks
 * - TTL enforcement
 * - Client ID validation
 *
 * Benefits over KV-based PAR:
 * - ✅ RFC 9126 complete compliance (single-use guarantee)
 * - ✅ No race conditions on concurrent requests
 * - ✅ Immediate consistency (no eventual consistency issues)
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';
/**
 * PAR request data
 */
export interface PARRequestData {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state?: string;
  nonce?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  response_type?: string;
  response_mode?: string;
  prompt?: string;
  display?: string;
  max_age?: number;
  ui_locales?: string;
  id_token_hint?: string;
  login_hint?: string;
  acr_values?: string;
  claims?: string;
  dpop_jkt?: string;
  createdAt?: number;
  expiresAt?: number;
  consumed?: boolean;
}
/**
 * Store PAR request payload
 */
export interface StorePARRequest {
  requestUri: string;
  data: PARRequestData;
  ttl: number;
}
/**
 * Consume PAR request payload
 */
export interface ConsumePARRequest {
  requestUri: string;
  client_id: string;
}
/**
 * PARRequestStore Durable Object
 *
 * Provides atomic single-use PAR request_uri management.
 *
 * RPC Support:
 * - Extends DurableObject base class for RPC method exposure
 * - RPC methods have 'Rpc' suffix (e.g., storeRequestRpc, consumeRequestRpc)
 * - fetch() handler is maintained for backward compatibility and debugging
 */
export declare class PARRequestStore extends DurableObject<Env> {
  private requests;
  private cleanupInterval;
  private initialized;
  private readonly CLEANUP_INTERVAL;
  private readonly MAX_ENTRIES;
  constructor(ctx: DurableObjectState, env: Env);
  /**
   * RPC: Store a new PAR request
   */
  storeRequestRpc(request: StorePARRequest): Promise<void>;
  /**
   * RPC: Consume a PAR request (atomic check + delete)
   * SECURITY CRITICAL: Single-use guarantee (RFC 9126)
   */
  consumeRequestRpc(request: ConsumePARRequest): Promise<PARRequestData>;
  /**
   * RPC: Delete a PAR request
   */
  deleteRequestRpc(requestUri: string): Promise<boolean>;
  /**
   * RPC: Get PAR request info (without consuming)
   */
  getRequestRpc(requestUri: string): Promise<PARRequestData | null>;
  /**
   * RPC: Get health check status
   */
  getHealthRpc(): Promise<{
    status: string;
    requests: {
      total: number;
      active: number;
      consumed: number;
    };
    timestamp: number;
  }>;
  /**
   * Initialize state from Durable Storage
   */
  private initializeState;
  /**
   * Save current state to Durable Storage
   */
  private saveState;
  /**
   * Start periodic cleanup of expired requests
   */
  private startCleanup;
  /**
   * Cleanup expired or consumed requests
   */
  private cleanupExpiredRequests;
  /**
   * Store a new PAR request
   */
  storeRequest(request: StorePARRequest): Promise<void>;
  /**
   * Consume a PAR request (atomic check + delete)
   *
   * CRITICAL: This operation is atomic within the DO
   * - Checks if request_uri exists
   * - Validates client_id match
   * - Checks expiration
   * - Marks as consumed
   * - Returns request data
   *
   * RFC 9126 Compliance: Single-use guarantee
   * Parallel requests will fail because first request marks as consumed.
   */
  consumeRequest(request: ConsumePARRequest): Promise<PARRequestData>;
  /**
   * Delete a PAR request (for cleanup or cancellation)
   */
  deleteRequest(requestUri: string): Promise<boolean>;
  /**
   * Get PAR request info (without consuming)
   * Used for validation before consumption
   */
  getRequest(requestUri: string): Promise<PARRequestData | null>;
  /**
   * Handle HTTP requests to the PARRequestStore Durable Object
   */
  fetch(request: Request): Promise<Response>;
}
//# sourceMappingURL=PARRequestStore.d.ts.map
