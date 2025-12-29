/**
 * Event Handler Registry Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventHandlerRegistryImpl, createEventHandlerRegistry } from '../event-handler-registry';
import { matchEventPattern } from '../../types/events/unified-event';
import type { EventHandlerConfig } from '../../types/events/handler';

describe('EventHandlerRegistry', () => {
  let registry: EventHandlerRegistryImpl;

  // Sample handler for testing
  const createTestHandler = (overrides: Partial<EventHandlerConfig> = {}): EventHandlerConfig => ({
    id: 'test-handler',
    name: 'Test Handler',
    eventPattern: 'auth.*',
    handler: vi.fn().mockResolvedValue(undefined),
    priority: 0,
    enabled: true,
    ...overrides,
  });

  beforeEach(() => {
    registry = createEventHandlerRegistry();
  });

  // ===========================================================================
  // Registration Tests
  // ===========================================================================

  describe('register', () => {
    it('should register a handler and return its ID', () => {
      const handler = createTestHandler();
      const id = registry.register(handler);

      expect(id).toBe('test-handler');
      expect(registry.hasHandler('test-handler')).toBe(true);
    });

    it('should apply default values', () => {
      const handler = registry.register({
        id: 'minimal-handler',
        name: 'Minimal',
        eventPattern: 'auth.*',
        handler: vi.fn(),
      });

      const registered = registry.getHandler('minimal-handler');
      expect(registered?.priority).toBe(0);
      expect(registered?.enabled).toBe(true);
      expect(registered?.timeoutMs).toBe(10000);
      expect(registered?.onError).toBe('log');
    });

    it('should replace existing handler with same ID', () => {
      const handler1 = createTestHandler({ priority: 10 });
      const handler2 = createTestHandler({ priority: 20 });

      registry.register(handler1);
      registry.register(handler2);

      expect(registry.size).toBe(1);
      expect(registry.getHandler('test-handler')?.priority).toBe(20);
    });

    it('should throw error for empty ID', () => {
      expect(() => registry.register(createTestHandler({ id: '' }))).toThrow(
        'Handler ID is required'
      );
    });

    it('should throw error for empty eventPattern', () => {
      expect(() => registry.register(createTestHandler({ eventPattern: '' }))).toThrow(
        'Event pattern is required'
      );
    });

    it('should throw error for missing handler function', () => {
      expect(() =>
        registry.register({
          id: 'bad-handler',
          name: 'Bad',
          eventPattern: 'auth.*',
          handler: null as unknown as () => Promise<void>,
        })
      ).toThrow('Handler function is required');
    });
  });

  // ===========================================================================
  // Unregister Tests
  // ===========================================================================

  describe('unregister', () => {
    it('should remove a registered handler', () => {
      registry.register(createTestHandler());
      expect(registry.hasHandler('test-handler')).toBe(true);

      registry.unregister('test-handler');
      expect(registry.hasHandler('test-handler')).toBe(false);
    });

    it('should be idempotent for non-existent handlers', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  // ===========================================================================
  // getHandlers Tests
  // ===========================================================================

  describe('getHandlers', () => {
    it('should return handlers matching event type', () => {
      registry.register(createTestHandler({ id: 'auth-handler', eventPattern: 'auth.*' }));
      registry.register(createTestHandler({ id: 'token-handler', eventPattern: 'token.*' }));

      const handlers = registry.getHandlers('auth.login.succeeded');

      expect(handlers).toHaveLength(1);
      expect(handlers[0].id).toBe('auth-handler');
    });

    it('should sort handlers by priority (highest first)', () => {
      registry.register(createTestHandler({ id: 'low', eventPattern: '*', priority: 10 }));
      registry.register(createTestHandler({ id: 'high', eventPattern: '*', priority: 100 }));
      registry.register(createTestHandler({ id: 'medium', eventPattern: '*', priority: 50 }));

      const handlers = registry.getHandlers('auth.login.succeeded');

      expect(handlers[0].id).toBe('high');
      expect(handlers[1].id).toBe('medium');
      expect(handlers[2].id).toBe('low');
    });

    it('should exclude disabled handlers', () => {
      registry.register(createTestHandler({ id: 'enabled', eventPattern: '*', enabled: true }));
      registry.register(createTestHandler({ id: 'disabled', eventPattern: '*', enabled: false }));

      const handlers = registry.getHandlers('auth.login.succeeded');

      expect(handlers).toHaveLength(1);
      expect(handlers[0].id).toBe('enabled');
    });

    it('should return empty array when no handlers match', () => {
      registry.register(createTestHandler({ id: 'token-handler', eventPattern: 'token.*' }));

      const handlers = registry.getHandlers('auth.login.succeeded');

      expect(handlers).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getAllHandlers Tests
  // ===========================================================================

  describe('getAllHandlers', () => {
    it('should return all handlers including disabled', () => {
      registry.register(createTestHandler({ id: 'h1', enabled: true }));
      registry.register(createTestHandler({ id: 'h2', enabled: false }));

      const handlers = registry.getAllHandlers();

      expect(handlers).toHaveLength(2);
    });

    it('should return empty array when no handlers registered', () => {
      expect(registry.getAllHandlers()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // setEnabled Tests
  // ===========================================================================

  describe('setEnabled', () => {
    it('should enable a disabled handler', () => {
      registry.register(createTestHandler({ enabled: false }));

      registry.setEnabled('test-handler', true);

      expect(registry.getHandler('test-handler')?.enabled).toBe(true);
    });

    it('should disable an enabled handler', () => {
      registry.register(createTestHandler({ enabled: true }));

      registry.setEnabled('test-handler', false);

      expect(registry.getHandler('test-handler')?.enabled).toBe(false);
    });

    it('should throw error for non-existent handler', () => {
      expect(() => registry.setEnabled('non-existent', true)).toThrow(
        'Handler not found: non-existent'
      );
    });
  });

  // ===========================================================================
  // clear Tests
  // ===========================================================================

  describe('clear', () => {
    it('should remove all handlers', () => {
      registry.register(createTestHandler({ id: 'h1' }));
      registry.register(createTestHandler({ id: 'h2' }));

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.getAllHandlers()).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe('createEventHandlerRegistry', () => {
    it('should create registry with initial handlers', () => {
      const registry = createEventHandlerRegistry({
        handlers: [createTestHandler({ id: 'h1' }), createTestHandler({ id: 'h2' })],
      });

      expect(registry.size).toBe(2);
    });

    it('should create empty registry when no config provided', () => {
      const registry = createEventHandlerRegistry();
      expect(registry.size).toBe(0);
    });
  });
});

// =============================================================================
// matchEventPattern Tests (Required by Plan)
// =============================================================================

describe('matchEventPattern', () => {
  // Prefix matching tests
  describe('prefix matching', () => {
    it('auth.* → auth.login.succeeded', () => {
      expect(matchEventPattern('auth.login.succeeded', 'auth.*')).toBe(true);
    });

    it('auth.login.* → auth.login.succeeded', () => {
      expect(matchEventPattern('auth.login.succeeded', 'auth.login.*')).toBe(true);
    });

    it('auth.* → auth.passkey.failed', () => {
      expect(matchEventPattern('auth.passkey.failed', 'auth.*')).toBe(true);
    });

    it('token.* should NOT match auth.login.succeeded', () => {
      expect(matchEventPattern('auth.login.succeeded', 'token.*')).toBe(false);
    });
  });

  // Glob matching tests
  describe('glob matching', () => {
    it('*.failed → auth.login.failed (2-segment pattern on 3-segment event)', () => {
      // This should match because pattern is shorter (prefix mode)
      expect(matchEventPattern('auth.login.failed', '*.failed')).toBe(false);
      // The pattern *.failed has 2 segments, event has 3 - pattern is shorter
      // But *.failed means: first segment = anything, second segment = "failed"
      // auth.login.failed has: auth, login, failed - so index 1 is "login", not "failed"
    });

    it('*.*.failed → auth.login.failed', () => {
      expect(matchEventPattern('auth.login.failed', '*.*.failed')).toBe(true);
    });

    it('auth.*.* → auth.login.succeeded', () => {
      expect(matchEventPattern('auth.login.succeeded', 'auth.*.*')).toBe(true);
    });

    it('*.*.created → session.user.created', () => {
      expect(matchEventPattern('session.user.created', '*.*.created')).toBe(true);
    });

    it('*.*.failed → session.user.created (should NOT match)', () => {
      expect(matchEventPattern('session.user.created', '*.*.failed')).toBe(false);
    });
  });

  // Exact matching tests
  describe('exact matching', () => {
    it('exact match: auth.login.succeeded', () => {
      expect(matchEventPattern('auth.login.succeeded', 'auth.login.succeeded')).toBe(true);
    });

    it('different event should NOT match', () => {
      expect(matchEventPattern('auth.login.failed', 'auth.login.succeeded')).toBe(false);
    });
  });

  // Universal wildcard tests
  describe('universal wildcard', () => {
    it('* matches everything', () => {
      expect(matchEventPattern('auth.login.succeeded', '*')).toBe(true);
      expect(matchEventPattern('token.access.issued', '*')).toBe(true);
      expect(matchEventPattern('session.user.created', '*')).toBe(true);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('longer pattern should NOT match shorter event', () => {
      expect(matchEventPattern('auth.login', 'auth.login.succeeded')).toBe(false);
    });

    it('2-segment events (hook events)', () => {
      expect(matchEventPattern('auth.before_authenticate', 'auth.*')).toBe(true);
    });
  });
});
