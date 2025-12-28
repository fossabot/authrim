/**
 * Event Handler Types
 *
 * Defines types for internal event handlers.
 * Handlers are executed after an event is published and can perform
 * side effects like cache invalidation, notifications, etc.
 *
 * Based on the permission-change-notifier.ts pattern.
 *
 * @packageDocumentation
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import type { DatabaseAdapter } from '../../db/adapter';
import type { UnifiedEvent } from './unified-event';

// =============================================================================
// Handler Context
// =============================================================================

/**
 * Context provided to event handlers.
 *
 * Contains references to infrastructure (DB, KV) and environment.
 * Uses DatabaseAdapter instead of D1Database directly for abstraction.
 */
export interface EventHandlerContext {
  /** Environment bindings */
  env: unknown;
  /** KV Namespace for caching/state */
  kv?: KVNamespace;
  /** Database adapter for queries (abstracted, not direct D1) */
  db?: DatabaseAdapter;
  /** Tenant ID */
  tenantId: string;
  /** Request ID for correlation */
  requestId?: string;
}

// =============================================================================
// Handler Configuration
// =============================================================================

/**
 * Error handling strategy for handlers.
 */
export type HandlerErrorStrategy = 'ignore' | 'throw' | 'log';

/**
 * Configuration for an event handler.
 *
 * Handlers can subscribe to specific event patterns and are executed
 * in priority order when matching events are published.
 */
export interface EventHandlerConfig {
  /** Unique handler ID */
  id: string;
  /** Display name (for debugging) */
  name: string;
  /**
   * Event pattern to match.
   * Supports wildcards: `auth.*`, `*.created`, `*`
   */
  eventPattern: string;
  /** Handler function */
  handler: EventAsyncHandler;
  /**
   * Priority (higher = executed first).
   * Default: 0
   */
  priority?: number;
  /**
   * Error handling strategy.
   * Default: 'log'
   */
  onError?: HandlerErrorStrategy;
  /**
   * Whether handler is enabled.
   * Default: true
   */
  enabled?: boolean;
  /**
   * Timeout in milliseconds.
   * Default: 10000 (10 seconds)
   */
  timeoutMs?: number;
}

// =============================================================================
// Handler Function Types
// =============================================================================

/**
 * Async event handler function.
 *
 * Handlers receive the event and context, and should perform
 * their side effects (cache invalidation, notifications, etc.).
 *
 * @typeParam T - Event data type
 *
 * @example
 * ```typescript
 * const handler: EventAsyncHandler<{ userId: string }> = async (event, ctx) => {
 *   // Invalidate user cache
 *   await ctx.kv?.delete(`user:${event.data.userId}`);
 *
 *   // Log to audit
 *   console.log(`User ${event.data.userId} logged in`);
 * };
 * ```
 */
export type EventAsyncHandler<T = Record<string, unknown>> = (
  event: UnifiedEvent<T>,
  context: EventHandlerContext
) => Promise<void>;

/**
 * Result of handler execution.
 */
export interface HandlerExecutionResult {
  /** Handler ID */
  handlerId: string;
  /** Handler name */
  handlerName: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message (if failed) */
  error?: string;
  /** Whether the handler was skipped */
  skipped?: boolean;
  /** Skip reason (if skipped) */
  skipReason?: string;
}

// =============================================================================
// Handler Registry
// =============================================================================

/**
 * Event handler registry interface.
 *
 * Manages registration and lookup of event handlers.
 *
 * @example
 * ```typescript
 * const registry = createEventHandlerRegistry();
 *
 * // Register a handler
 * const handlerId = registry.register({
 *   id: 'cache-invalidator',
 *   name: 'Cache Invalidator',
 *   eventPattern: 'auth.*',
 *   handler: async (event, ctx) => {
 *     await ctx.kv?.delete(`session:${event.metadata.sessionId}`);
 *   },
 *   priority: 100,
 * });
 *
 * // Get handlers for an event
 * const handlers = registry.getHandlers('auth.login.succeeded');
 * ```
 */
export interface EventHandlerRegistry {
  /**
   * Register an event handler.
   *
   * @param config - Handler configuration
   * @returns Handler ID
   */
  register(config: EventHandlerConfig): string;

  /**
   * Unregister an event handler.
   *
   * @param id - Handler ID
   */
  unregister(id: string): void;

  /**
   * Get handlers matching an event type.
   *
   * Returns handlers sorted by priority (highest first).
   *
   * @param eventType - Event type to match
   * @returns Matching handler configs
   */
  getHandlers(eventType: string): EventHandlerConfig[];

  /**
   * Get all registered handlers.
   *
   * @returns All handler configs
   */
  getAllHandlers(): EventHandlerConfig[];

  /**
   * Check if a handler is registered.
   *
   * @param id - Handler ID
   * @returns Whether the handler exists
   */
  hasHandler(id: string): boolean;

  /**
   * Enable or disable a handler.
   *
   * @param id - Handler ID
   * @param enabled - Whether to enable
   */
  setEnabled(id: string, enabled: boolean): void;
}

// =============================================================================
// Handler Executor
// =============================================================================

/**
 * Interface for executing event handlers.
 */
export interface HandlerExecutor {
  /**
   * Execute all matching handlers for an event.
   *
   * @param event - Event to process
   * @param context - Handler context
   * @param options - Execution options
   * @returns Execution results for each handler
   */
  execute<T = Record<string, unknown>>(
    event: UnifiedEvent<T>,
    context: EventHandlerContext,
    options?: HandlerExecutorOptions
  ): Promise<HandlerExecutionResult[]>;
}

/**
 * Options for handler execution.
 */
export interface HandlerExecutorOptions {
  /**
   * Stop execution on first error.
   * Default: false (continue with remaining handlers)
   */
  stopOnError?: boolean;

  /**
   * Execute handlers in parallel.
   * Default: false (sequential by priority)
   */
  parallel?: boolean;

  /**
   * Maximum concurrent handlers (when parallel=true).
   * Default: 10
   */
  maxConcurrent?: number;
}

// =============================================================================
// Factory Types
// =============================================================================

/**
 * Configuration for creating a handler registry.
 */
export interface HandlerRegistryConfig {
  /** Initial handlers to register */
  handlers?: EventHandlerConfig[];
}

/**
 * Configuration for creating a handler executor.
 */
export interface HandlerExecutorConfig {
  /** Handler registry */
  registry: EventHandlerRegistry;
  /** Default context values */
  defaultContext?: Partial<EventHandlerContext>;
  /** Default execution options */
  defaultOptions?: HandlerExecutorOptions;
}
