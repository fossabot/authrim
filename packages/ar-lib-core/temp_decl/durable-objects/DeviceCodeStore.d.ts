/**
 * DeviceCodeStore Durable Object (V2)
 * RFC 8628: OAuth 2.0 Device Authorization Grant
 *
 * Manages device authorization codes with strong consistency guarantees:
 * - One-time use verification
 * - Immediate status updates (pending → approved/denied)
 * - Polling rate limiting (slow_down detection)
 *
 * V2 Architecture:
 * - Explicit initialization with Durable Storage bulk load
 * - Granular storage with prefix-based keys
 * - Audit logging with batch flush and synchronous critical events
 * - D1 retry for improved reliability
 *
 * Storage Strategy:
 * - Durable Storage as primary (for atomic operations)
 * - In-memory cache for hot data (active device codes)
 * - D1 for persistence, recovery, and audit trail
 * - Dual mapping: device_code → metadata, user_code → device_code
 */
import type { DurableObjectState } from '@cloudflare/workers-types';
import type { Env } from '../types/env';
import type { DeviceCodeMetadata } from '../types/oidc';
/**
 * Device Code V2 - Enhanced state for V2 architecture
 */
export interface DeviceCodeV2 extends DeviceCodeMetadata {
  token_issued?: boolean;
  token_issued_at?: number;
}
export declare class DeviceCodeStore {
  private state;
  private env;
  private deviceCodes;
  private userCodeToDeviceCode;
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
   * Build storage key for device code
   */
  private buildDeviceKey;
  /**
   * Build storage key for user code mapping
   */
  private buildUserKey;
  /**
   * Save device code to Durable Storage
   */
  private saveDeviceCode;
  /**
   * Save user code mapping to Durable Storage
   */
  private saveUserMapping;
  /**
   * Delete device code from Durable Storage
   */
  private deleteDeviceCodeFromStorage;
  /**
   * Handle HTTP requests to the Durable Object
   */
  fetch(request: Request): Promise<Response>;
  /**
   * Store a new device code
   */
  private storeDeviceCode;
  /**
   * Get device code metadata by device_code
   */
  private getByDeviceCode;
  /**
   * Get device code metadata by user_code
   */
  private getByUserCode;
  /**
   * Approve device code (user approved the authorization request)
   */
  private approveDeviceCode;
  /**
   * Deny device code (user denied the authorization request)
   */
  private denyDeviceCode;
  /**
   * Update last poll time (for rate limiting)
   */
  private updatePollTime;
  /**
   * Mark token as issued (one-time use enforcement) - V2
   */
  private markTokenIssued;
  /**
   * Delete device code (consumed or expired)
   */
  private deleteDeviceCode;
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
   * Alarm handler for cleaning up expired device codes
   *
   * Idempotent: Checks lastCleanup timestamp to prevent duplicate execution
   * Alarms may fire multiple times in rare cases (DO restart, etc.)
   */
  alarm(): Promise<void>;
}
//# sourceMappingURL=DeviceCodeStore.d.ts.map
