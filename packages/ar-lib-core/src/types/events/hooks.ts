/**
 * Event Hook Types
 *
 * Defines Before and After hooks for event processing.
 * Aligned with XState invoke pattern for Flow UI integration.
 *
 * Design principles:
 * - Before Hook: validate/deny/annotate ONLY (NO side effects)
 * - After Hook: Side effects allowed (audit, webhook, cleanup)
 *
 * @packageDocumentation
 */

import type { EventHandlerContext } from './handler';
import type { EventPublishResult } from './dispatcher';
import type { UnifiedEvent } from './unified-event';

// =============================================================================
// Before Hook Types
// =============================================================================

/**
 * Result of a Before Hook execution.
 *
 * Before Hooks can:
 * - Validate: Check preconditions
 * - Deny: Reject the event with a reason
 * - Annotate: Add metadata to the event
 *
 * Before Hooks MUST NOT:
 * - Make database writes
 * - Send external requests
 * - Modify external state
 */
export interface BeforeHookResult {
  /**
   * Whether to continue processing the event.
   * If false, the event is rejected.
   */
  continue: boolean;

  /**
   * Annotations to add to the event metadata.
   * These are merged with existing metadata.
   */
  annotations?: Record<string, unknown>;

  /**
   * Reason for denying the event (when continue=false).
   * Used for error messages and audit logs.
   */
  denyReason?: string;

  /**
   * Error code for denial (optional).
   * Used for programmatic error handling.
   */
  denyCode?: string;
}

/**
 * Before Hook handler function.
 *
 * @warning NO SIDE EFFECTS ALLOWED
 *
 * Before Hooks are executed synchronously before event processing.
 * They can validate, deny, or annotate events, but MUST NOT
 * perform any side effects.
 *
 * @typeParam T - Event data type
 *
 * @example
 * ```typescript
 * // Validation hook
 * const validateRateLimit: BeforeHookHandler = async (event, ctx) => {
 *   const isLimited = await checkRateLimit(event.metadata.ipAddress);
 *   if (isLimited) {
 *     return { continue: false, denyReason: 'Rate limit exceeded' };
 *   }
 *   return { continue: true };
 * };
 *
 * // Annotation hook
 * const annotateGeo: BeforeHookHandler = async (event, ctx) => {
 *   return {
 *     continue: true,
 *     annotations: { geoVerified: true },
 *   };
 * };
 * ```
 */
export type BeforeHookHandler<T = Record<string, unknown>> = (
  event: UnifiedEvent<T>,
  context: EventHandlerContext
) => Promise<BeforeHookResult>;

/**
 * Configuration for a Before Hook.
 *
 * @warning NO SIDE EFFECTS: The handler MUST NOT perform any writes
 * or external calls. Only validation, denial, and annotation are allowed.
 */
export interface BeforeHookConfig {
  /** Unique hook ID */
  id: string;
  /** Display name */
  name: string;
  /**
   * Event pattern to match.
   * Supports wildcards: `auth.*`, `*.created`, `*`
   */
  eventPattern: string;
  /** Hook handler function */
  handler: BeforeHookHandler;
  /**
   * Priority (higher = executed first).
   * Default: 0
   */
  priority?: number;
  /**
   * Whether hook is enabled.
   * Default: true
   */
  enabled?: boolean;
  /**
   * Timeout in milliseconds.
   * Default: 5000 (5 seconds)
   *
   * @note Keep short since Before Hooks block event processing
   */
  timeoutMs?: number;
}

// =============================================================================
// After Hook Types
// =============================================================================

/**
 * After Hook handler function.
 *
 * Side effects ARE allowed in After Hooks:
 * - Audit log writes
 * - Webhook delivery
 * - Cache invalidation
 * - Cleanup operations
 * - External notifications
 *
 * @typeParam T - Event data type
 *
 * @example
 * ```typescript
 * // Audit log hook
 * const auditLogger: AfterHookHandler = async (event, result, ctx) => {
 *   await ctx.db?.execute(
 *     'INSERT INTO audit_log (event_id, event_type, data) VALUES (?, ?, ?)',
 *     [event.id, event.type, JSON.stringify(event.data)]
 *   );
 * };
 *
 * // Notification hook
 * const notifyAdmin: AfterHookHandler = async (event, result, ctx) => {
 *   if (event.type === 'security.login.suspicious') {
 *     await sendAdminAlert(event);
 *   }
 * };
 * ```
 */
export type AfterHookHandler<T = Record<string, unknown>> = (
  event: UnifiedEvent<T>,
  result: EventPublishResult,
  context: EventHandlerContext
) => Promise<void>;

/**
 * Configuration for an After Hook.
 *
 * After Hooks can perform side effects and are executed
 * after the event has been processed.
 */
export interface AfterHookConfig {
  /** Unique hook ID */
  id: string;
  /** Display name */
  name: string;
  /**
   * Event pattern to match.
   * Supports wildcards: `auth.*`, `*.created`, `*`
   */
  eventPattern: string;
  /** Hook handler function */
  handler: AfterHookHandler;
  /**
   * Execute asynchronously (fire-and-forget).
   * If true, the hook runs in the background without blocking.
   * Default: false
   */
  async?: boolean;
  /**
   * Priority (higher = executed first).
   * Default: 0
   */
  priority?: number;
  /**
   * Whether hook is enabled.
   * Default: true
   */
  enabled?: boolean;
  /**
   * Timeout in milliseconds.
   * Default: 30000 (30 seconds)
   */
  timeoutMs?: number;
  /**
   * Continue processing other hooks on error.
   * Default: true
   */
  continueOnError?: boolean;
}

// =============================================================================
// Hook Registry
// =============================================================================

/**
 * Event hook registry interface.
 *
 * Manages Before and After hook registration and lookup.
 *
 * @example
 * ```typescript
 * const registry = createEventHookRegistry();
 *
 * // Register a Before Hook
 * registry.registerBefore({
 *   id: 'rate-limit-validator',
 *   name: 'Rate Limit Validator',
 *   eventPattern: 'auth.*',
 *   handler: async (event) => {
 *     // Validation only, no side effects
 *     return { continue: true };
 *   },
 * });
 *
 * // Register an After Hook
 * registry.registerAfter({
 *   id: 'audit-logger',
 *   name: 'Audit Logger',
 *   eventPattern: '*',
 *   handler: async (event, result, ctx) => {
 *     // Side effects allowed
 *     await writeAuditLog(event);
 *   },
 * });
 * ```
 */
export interface EventHookRegistry {
  /**
   * Register a Before Hook.
   *
   * @param config - Hook configuration
   * @returns Hook ID
   */
  registerBefore(config: BeforeHookConfig): string;

  /**
   * Register an After Hook.
   *
   * @param config - Hook configuration
   * @returns Hook ID
   */
  registerAfter(config: AfterHookConfig): string;

  /**
   * Unregister a hook (Before or After).
   *
   * @param id - Hook ID
   */
  unregister(id: string): void;

  /**
   * Get Before Hooks matching an event type.
   *
   * Returns hooks sorted by priority (highest first).
   *
   * @param eventType - Event type to match
   * @returns Matching Before Hook configs
   */
  getBeforeHooks(eventType: string): BeforeHookConfig[];

  /**
   * Get After Hooks matching an event type.
   *
   * Returns hooks sorted by priority (highest first).
   *
   * @param eventType - Event type to match
   * @returns Matching After Hook configs
   */
  getAfterHooks(eventType: string): AfterHookConfig[];

  /**
   * Get all registered Before Hooks.
   *
   * @returns All Before Hook configs
   */
  getAllBeforeHooks(): BeforeHookConfig[];

  /**
   * Get all registered After Hooks.
   *
   * @returns All After Hook configs
   */
  getAllAfterHooks(): AfterHookConfig[];

  /**
   * Enable or disable a hook.
   *
   * @param id - Hook ID
   * @param enabled - Whether to enable
   */
  setEnabled(id: string, enabled: boolean): void;
}

// =============================================================================
// Hook Execution Types
// =============================================================================

/**
 * Result of Before Hook execution.
 */
export interface BeforeHookExecutionResult {
  /** Hook ID */
  hookId: string;
  /** Hook name */
  hookName: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Duration in milliseconds */
  durationMs: number;
  /** The hook result */
  result?: BeforeHookResult;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Result of After Hook execution.
 */
export interface AfterHookExecutionResult {
  /** Hook ID */
  hookId: string;
  /** Hook name */
  hookName: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether the hook was run asynchronously */
  async: boolean;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Combined result of all Before Hook executions.
 */
export interface BeforeHooksResult {
  /** Whether all hooks passed (continue=true) */
  continue: boolean;
  /** Merged annotations from all hooks */
  annotations: Record<string, unknown>;
  /** Denial reason (if continue=false) */
  denyReason?: string;
  /** Denial code (if continue=false) */
  denyCode?: string;
  /** Individual hook results */
  hookResults: BeforeHookExecutionResult[];
}

// =============================================================================
// Flow UI Integration Types
// =============================================================================

/**
 * Flow UI node connection metadata.
 *
 * Maps Flow UI edges to event patterns for before/after hook integration.
 */
export interface FlowEventEdgeMeta {
  /** Event to trigger before the action (validation) */
  beforeEvent?: string;
  /** Event to trigger after the action (side effects) */
  afterEvent?: string;
  /** Event to trigger on success */
  successEvent?: string;
  /** Event to trigger on failure */
  failureEvent?: string;
}

/**
 * Intent to Event mapping for Flow UI integration.
 *
 * Maps user intents (actions) to corresponding events.
 */
export interface IntentEventMapping {
  /** Intent name (e.g., 'login', 'createSession') */
  intent: string;
  /** Before event pattern */
  beforeEvent?: string;
  /** After event pattern (success) */
  afterSuccessEvent?: string;
  /** After event pattern (failure) */
  afterFailureEvent?: string;
}
