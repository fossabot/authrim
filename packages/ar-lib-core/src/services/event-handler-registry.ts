/**
 * Event Handler Registry
 *
 * Manages registration and lookup of internal event handlers.
 * Handlers are executed after events are published and can perform
 * side effects like cache invalidation, notifications, etc.
 *
 * Design decisions:
 * - In-memory storage for handler configurations
 * - Pattern matching using matchEventPattern() from unified-event.ts
 * - Priority-based ordering (higher priority executes first)
 * - Enable/disable support without unregistering
 *
 * @packageDocumentation
 */

import type {
  EventHandlerRegistry as IEventHandlerRegistry,
  EventHandlerConfig,
  HandlerRegistryConfig,
} from '../types/events/handler';
import { matchEventPattern } from '../types/events/unified-event';

// =============================================================================
// Default Values
// =============================================================================

/** Default handler priority */
const DEFAULT_PRIORITY = 0;

/** Default handler timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 10000;

// =============================================================================
// Event Handler Registry Implementation
// =============================================================================

/**
 * Event Handler Registry implementation.
 *
 * Manages registration and lookup of event handlers.
 * Handlers are matched against event types using pattern matching
 * and returned in priority order (highest first).
 *
 * @example
 * ```typescript
 * const registry = createEventHandlerRegistry();
 *
 * // Register a handler
 * registry.register({
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
 * // Returns handlers matching 'auth.*' pattern, sorted by priority
 * ```
 */
export class EventHandlerRegistryImpl implements IEventHandlerRegistry {
  /** Handler storage by ID */
  private handlers: Map<string, EventHandlerConfig> = new Map();

  /**
   * Create a new event handler registry.
   *
   * @param config - Optional initial configuration
   */
  constructor(config?: HandlerRegistryConfig) {
    if (config?.handlers) {
      for (const handler of config.handlers) {
        this.register(handler);
      }
    }
  }

  /**
   * Register an event handler.
   *
   * If a handler with the same ID already exists, it will be replaced.
   *
   * @param config - Handler configuration
   * @returns Handler ID
   * @throws Error if handler ID is empty or eventPattern is empty
   */
  register(config: EventHandlerConfig): string {
    // Validate required fields
    if (!config.id || config.id.trim() === '') {
      throw new Error('Handler ID is required');
    }
    if (!config.eventPattern || config.eventPattern.trim() === '') {
      throw new Error('Event pattern is required');
    }
    if (typeof config.handler !== 'function') {
      throw new Error('Handler function is required');
    }

    // Apply defaults
    const normalizedConfig: EventHandlerConfig = {
      ...config,
      priority: config.priority ?? DEFAULT_PRIORITY,
      enabled: config.enabled ?? true,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      onError: config.onError ?? 'log',
    };

    this.handlers.set(config.id, normalizedConfig);
    return config.id;
  }

  /**
   * Unregister an event handler.
   *
   * @param id - Handler ID
   */
  unregister(id: string): void {
    this.handlers.delete(id);
  }

  /**
   * Get handlers matching an event type.
   *
   * Returns handlers sorted by priority (highest first).
   * Only enabled handlers are returned.
   *
   * @param eventType - Event type to match (e.g., 'auth.login.succeeded')
   * @returns Matching handler configs
   */
  getHandlers(eventType: string): EventHandlerConfig[] {
    const matchingHandlers: EventHandlerConfig[] = [];

    for (const handler of this.handlers.values()) {
      // Skip disabled handlers
      if (!handler.enabled) {
        continue;
      }

      // Check if event type matches handler's pattern
      if (matchEventPattern(eventType, handler.eventPattern)) {
        matchingHandlers.push(handler);
      }
    }

    // Sort by priority (highest first)
    return matchingHandlers.sort((a, b) => {
      const priorityA = a.priority ?? DEFAULT_PRIORITY;
      const priorityB = b.priority ?? DEFAULT_PRIORITY;
      return priorityB - priorityA;
    });
  }

  /**
   * Get all registered handlers.
   *
   * Returns all handlers regardless of enabled status.
   *
   * @returns All handler configs
   */
  getAllHandlers(): EventHandlerConfig[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Check if a handler is registered.
   *
   * @param id - Handler ID
   * @returns Whether the handler exists
   */
  hasHandler(id: string): boolean {
    return this.handlers.has(id);
  }

  /**
   * Enable or disable a handler.
   *
   * @param id - Handler ID
   * @param enabled - Whether to enable
   * @throws Error if handler not found
   */
  setEnabled(id: string, enabled: boolean): void {
    const handler = this.handlers.get(id);
    if (!handler) {
      throw new Error(`Handler not found: ${id}`);
    }
    handler.enabled = enabled;
  }

  /**
   * Get a handler by ID.
   *
   * @param id - Handler ID
   * @returns Handler config or undefined
   */
  getHandler(id: string): EventHandlerConfig | undefined {
    return this.handlers.get(id);
  }

  /**
   * Clear all handlers.
   * Useful for testing.
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get the count of registered handlers.
   *
   * @returns Number of registered handlers
   */
  get size(): number {
    return this.handlers.size;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new event handler registry.
 *
 * @param config - Optional initial configuration
 * @returns Event handler registry instance
 *
 * @example
 * ```typescript
 * // Create empty registry
 * const registry = createEventHandlerRegistry();
 *
 * // Create registry with initial handlers
 * const registry = createEventHandlerRegistry({
 *   handlers: [
 *     {
 *       id: 'my-handler',
 *       name: 'My Handler',
 *       eventPattern: 'auth.*',
 *       handler: async (event, ctx) => { ... },
 *     },
 *   ],
 * });
 * ```
 */
export function createEventHandlerRegistry(
  config?: HandlerRegistryConfig
): EventHandlerRegistryImpl {
  return new EventHandlerRegistryImpl(config);
}
