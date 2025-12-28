/**
 * Unified Event Types
 *
 * Defines the unified event format used across all event categories.
 * This provides a consistent structure for authentication, authorization,
 * session, contract, and system events.
 *
 * @packageDocumentation
 */

// =============================================================================
// Event Metadata
// =============================================================================

/**
 * Actor types for event attribution.
 */
export type ActorType = 'user' | 'service' | 'system' | 'client';

/**
 * Actor information for event attribution.
 * Identifies who or what triggered the event.
 *
 * **PII Policy**: Email and other PII are NOT included.
 * Use the actor ID to reference PII DB if needed.
 */
export interface EventActor {
  /** Actor type */
  type: ActorType;
  /** Actor identifier (user ID, service name, client ID, etc.) */
  id: string;
}

/**
 * Event metadata for context and correlation.
 * Provides additional context about the event source and environment.
 */
export interface EventMetadata {
  /** Actor who triggered the event */
  actor?: EventActor;
  /** Request ID for distributed tracing */
  requestId?: string;
  /** Event source (service name, worker name, etc.) */
  source?: string;
  /** Custom tags for filtering and categorization */
  tags?: string[];
  /** Session ID (for session-related events) */
  sessionId?: string;
  /** Client ID (for OAuth/OIDC events) */
  clientId?: string;
  /** IP address of the request origin */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Geographic location (country code, region) */
  geo?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

// =============================================================================
// Unified Event
// =============================================================================

/**
 * Unified event format for all event categories.
 *
 * This is the standard event envelope used throughout the system.
 * All events follow the 3-segment `{domain}.{subject}.{action}` naming convention
 * with past tense action names (e.g., `auth.login.succeeded`, `session.user.created`).
 *
 * @typeParam T - The event data payload type
 *
 * @example
 * ```typescript
 * const event: UnifiedEvent<{ userId: string }> = {
 *   id: 'evt_123',
 *   type: 'auth.login.succeeded',  // 3-segment format: {domain}.{subject}.{action}
 *   version: '1.0',
 *   timestamp: '2024-01-01T00:00:00.000Z',
 *   tenantId: 'tenant_default',
 *   data: { userId: 'user_456' },
 *   metadata: {
 *     actor: { type: 'user', id: 'user_456' },
 *     requestId: 'req_789',
 *   },
 * };
 * ```
 */
export interface UnifiedEvent<T = Record<string, unknown>> {
  /** Unique event ID (UUID v4) */
  id: string;
  /** Event type in `{domain}.{subject}.{action}` format (past tense) */
  type: string;
  /** Event schema version for evolution */
  version: string;
  /** ISO 8601 timestamp when the event occurred */
  timestamp: string;
  /** Tenant ID for multi-tenancy */
  tenantId: string;
  /** Event-specific data payload */
  data: T;
  /** Event metadata for context and correlation */
  metadata: EventMetadata;
}

// =============================================================================
// Event Severity and Consumption
// =============================================================================

/**
 * Event severity levels for consumption layer routing.
 *
 * Severity determines how events are consumed:
 * - CRITICAL: Mandatory audit log, synchronous processing
 * - HIGH: Audit log + optional hooks
 * - MEDIUM: Hooks only (no mandatory audit)
 * - LOW: Best-effort processing
 */
export type EventSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Event category for grouping related events.
 */
export type EventCategory =
  | 'auth'
  | 'session'
  | 'token'
  | 'consent'
  | 'user'
  | 'client'
  | 'contract'
  | 'policy'
  | 'security'
  | 'system'
  | 'webhook'
  | 'external_idp';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new unified event with generated ID and timestamp.
 *
 * @param type - Event type in `category.action` format
 * @param tenantId - Tenant identifier
 * @param data - Event-specific data payload
 * @param metadata - Optional event metadata
 * @returns Event object (without ID - caller should generate)
 *
 * @example
 * ```typescript
 * const event = createUnifiedEvent(
 *   'auth.login.succeeded',  // 3-segment format
 *   'tenant_default',
 *   { userId: 'user_123' },
 *   { actor: { type: 'user', id: 'user_123' } }
 * );
 * ```
 */
export function createUnifiedEvent<T>(
  type: string,
  tenantId: string,
  data: T,
  metadata?: Partial<EventMetadata>
): Omit<UnifiedEvent<T>, 'id'> {
  return {
    type,
    version: '1.0',
    timestamp: new Date().toISOString(),
    tenantId,
    data,
    metadata: metadata ?? {},
  };
}

/**
 * Extract the category from an event type.
 *
 * @param eventType - Event type in `category.action` format
 * @returns Category string or null if invalid format
 *
 * @example
 * ```typescript
 * getEventCategory('auth.login.succeeded');   // 'auth'
 * getEventCategory('session.user.created');   // 'session'
 * getEventCategory('invalid');                // null
 * ```
 */
export function getEventCategory(eventType: string): string | null {
  const parts = eventType.split('.');
  return parts.length >= 2 ? parts[0] : null;
}

/**
 * Extract the action from an event type.
 *
 * @param eventType - Event type in `category.action` format
 * @returns Action string or null if invalid format
 *
 * @example
 * ```typescript
 * getEventAction('auth.login.succeeded');   // 'login.succeeded'
 * getEventAction('session.user.created');   // 'user.created'
 * getEventAction('invalid');                // null
 * ```
 */
export function getEventAction(eventType: string): string | null {
  const parts = eventType.split('.');
  return parts.length >= 2 ? parts.slice(1).join('.') : null;
}

/**
 * Check if an event type matches a pattern (supports wildcards and prefix matching).
 *
 * Pattern modes:
 * 1. **Prefix match** (shorter pattern): Pattern with fewer segments matches as prefix
 *    - `auth.*` → matches `auth.login.succeeded`, `auth.passkey.failed`, etc.
 *    - `auth.passkey.*` → matches `auth.passkey.succeeded`, `auth.passkey.failed`
 *
 * 2. **Glob match** (same length): Pattern with same segment count uses glob matching
 *    - `auth.*.*` → matches all 3-segment auth events
 *    - `*.*.failed` → matches all 3-segment events ending in .failed
 *
 * 3. **Exact match**: No wildcards, exact string comparison
 *    - `auth.login.succeeded` → matches only `auth.login.succeeded`
 *
 * Special cases:
 * - `*` → matches all events
 * - `*.before_*` / `*.after_*` → matches 2-segment hook events (exception pattern)
 *
 * @param eventType - Event type to check
 * @param pattern - Pattern to match against
 * @returns Whether the event type matches the pattern
 *
 * @example
 * ```typescript
 * // Prefix matching (recommended for subscriptions)
 * matchEventPattern('auth.login.succeeded', 'auth.*');        // true (prefix)
 * matchEventPattern('auth.passkey.failed', 'auth.*');         // true (prefix)
 * matchEventPattern('auth.passkey.succeeded', 'auth.passkey.*'); // true (prefix)
 *
 * // Glob matching (same segment count)
 * matchEventPattern('auth.login.succeeded', 'auth.*.*');      // true (glob)
 * matchEventPattern('session.user.created', '*.*.created');   // true (glob)
 * matchEventPattern('auth.login.succeeded', '*.*.created');   // false
 *
 * // Hook events (2-segment exception)
 * matchEventPattern('auth.before_authenticate', 'auth.*');    // true
 * matchEventPattern('auth.before_authenticate', '*.before_*'); // true
 *
 * // Universal match
 * matchEventPattern('auth.login.succeeded', '*');             // true
 * ```
 */
export function matchEventPattern(eventType: string, pattern: string): boolean {
  // Universal wildcard matches everything
  if (pattern === '*') {
    return true;
  }

  const eventParts = eventType.split('.');
  const patternParts = pattern.split('.');

  // Case 1: Prefix match (pattern is shorter than event)
  // e.g., 'auth.*' matches 'auth.login.succeeded'
  if (patternParts.length < eventParts.length) {
    // Check if all pattern segments match the corresponding event segments
    return patternParts.every((part, index) => part === '*' || part === eventParts[index]);
  }

  // Case 2: Glob match (same length) or exact match
  // e.g., 'auth.*.*' matches 'auth.login.succeeded'
  if (patternParts.length === eventParts.length) {
    return patternParts.every((part, index) => part === '*' || part === eventParts[index]);
  }

  // Case 3: Pattern is longer than event - no match
  // e.g., 'auth.*.*' does NOT match 'auth.before_authenticate'
  return false;
}
