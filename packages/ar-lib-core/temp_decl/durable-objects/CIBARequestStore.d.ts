/**
 * CIBARequestStore Durable Object (V2)
 * OpenID Connect CIBA Flow Core 1.0
 * https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html
 *
 * Manages CIBA authentication requests with strong consistency guarantees:
 * - One-time token issuance (prevents replay)
 * - Immediate status updates (pending → approved/denied)
 * - Polling rate limiting (slow_down detection)
 * - Support for poll, ping, and push delivery modes
 *
 * V2 Architecture:
 * - Explicit initialization with Durable Storage bulk load
 * - Granular storage with prefix-based keys
 * - Audit logging with batch flush and synchronous critical events
 * - D1 retry for improved reliability
 *
 * Storage Strategy:
 * - Durable Storage as primary (for atomic operations)
 * - In-memory cache for hot data (active CIBA requests)
 * - D1 for persistence, recovery, and audit trail
 * - Dual mapping: auth_req_id → metadata, user_code → auth_req_id
 */
import type { DurableObjectState } from '@cloudflare/workers-types';
import type { Env } from '../types/env';
import type { CIBARequestMetadata } from '../types/oidc';
/**
 * CIBA Request V2 - Enhanced state for V2 architecture
 * Extends CIBARequestMetadata with any V2-specific additions
 */
export interface CIBARequestV2 extends CIBARequestMetadata {}
export declare class CIBARequestStore {
  private state;
  private env;
  private cibaRequests;
  private userCodeToAuthReqId;
  private initialized;
  private initializePromise;
  private pendingAuditLogs;
  private flushScheduled;
  private readonly AUDIT_FLUSH_DELAY;
  constructor(state: DurableObjectState, env: Env);
  /**
   * Initialize state from Durable Storage
   * Called by blockConcurrencyWhile() in constructor
   */
  private initializeStateBlocking;
  /**
   * Ensure state is initialized
   * Called by public methods for backward compatibility
   *
   * Note: With blockConcurrencyWhile() in constructor, this is now a no-op guard.
   */
  private initializeState;
  /**
   * Build storage key for CIBA request
   */
  private buildRequestKey;
  /**
   * Build storage key for user code mapping
   */
  private buildUserKey;
  /**
   * Save CIBA request to Durable Storage
   */
  private saveRequest;
  /**
   * Save user code mapping to Durable Storage
   */
  private saveUserMapping;
  /**
   * Delete CIBA request from Durable Storage
   */
  private deleteRequestFromStorage;
  /**
   * Handle HTTP requests to the Durable Object
   */
  fetch(request: Request): Promise<Response>;
  /**
   * Store a new CIBA request
   */
  private storeCIBARequest;
  /**
   * Get CIBA request metadata by auth_req_id
   */
  private getByAuthReqId;
  /**
   * Get CIBA request metadata by user_code
   */
  private getByUserCode;
  /**
   * Get CIBA request by login_hint (for finding pending requests for a user)
   */
  private getByLoginHint;
  /**
   * Approve CIBA request (user approved the authorization request)
   */
  private approveCIBARequest;
  /**
   * Deny CIBA request (user denied the authorization request)
   */
  private denyCIBARequest;
  /**
   * Update last poll time (for rate limiting)
   */
  private updatePollTime;
  /**
   * Mark tokens as issued (one-time use enforcement)
   */
  private markTokenIssued;
  /**
   * Delete CIBA request (consumed or expired)
   */
  private deleteCIBARequest;
  /**
   * Log non-critical events (batched, async) - V2
   */
  private logToD1;
  /**
   * Log critical events synchronously - V2
   */
  private logCritical;
  /**
   * Schedule batch flush of audit logs - V2
   */
  private scheduleAuditFlush;
  /**
   * Flush pending audit logs to D1 - V2
   */
  private flushAuditLogs;
  /**
   * Alarm handler for cleaning up expired CIBA requests
   *
   * Implements idempotency to prevent duplicate execution:
   * - Stores last cleanup timestamp in meta storage
   * - Skips execution if within CLEANUP_INTERVAL - IDEMPOTENCY_BUFFER
   * - This prevents issues from alarm re-delivery or clock skew
   */
  alarm(): Promise<void>;
}
//# sourceMappingURL=CIBARequestStore.d.ts.map
