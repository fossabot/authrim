/**
 * Event Hook Registry Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EventHookRegistryImpl,
  createEventHookRegistry,
  executeBeforeHooks,
  HookTimeoutError,
} from '../event-hook-registry';
import type { BeforeHookConfig, AfterHookConfig } from '../../types/events/hooks';
import type { EventHandlerContext } from '../../types/events/handler';
import type { UnifiedEvent } from '../../types/events/unified-event';

describe('EventHookRegistry', () => {
  let registry: EventHookRegistryImpl;

  // Sample event for testing
  const createTestEvent = (): UnifiedEvent => ({
    id: 'evt_123',
    type: 'auth.login.succeeded',
    version: '1.0',
    timestamp: new Date().toISOString(),
    tenantId: 'tenant_default',
    data: { userId: 'user_456' },
    metadata: {},
  });

  // Sample context for testing
  const createTestContext = (): EventHandlerContext => ({
    env: {},
    tenantId: 'tenant_default',
  });

  // Sample Before Hook for testing
  const createTestBeforeHook = (overrides: Partial<BeforeHookConfig> = {}): BeforeHookConfig => ({
    id: 'test-before-hook',
    name: 'Test Before Hook',
    eventPattern: 'auth.*',
    handler: vi.fn().mockResolvedValue({ continue: true }),
    priority: 0,
    enabled: true,
    ...overrides,
  });

  // Sample After Hook for testing
  const createTestAfterHook = (overrides: Partial<AfterHookConfig> = {}): AfterHookConfig => ({
    id: 'test-after-hook',
    name: 'Test After Hook',
    eventPattern: 'auth.*',
    handler: vi.fn().mockResolvedValue(undefined),
    priority: 0,
    enabled: true,
    ...overrides,
  });

  beforeEach(() => {
    registry = createEventHookRegistry();
  });

  // ===========================================================================
  // Before Hook Registration Tests
  // ===========================================================================

  describe('registerBefore', () => {
    it('should register a Before Hook and return its ID', () => {
      const hook = createTestBeforeHook();
      const id = registry.registerBefore(hook);

      expect(id).toBe('test-before-hook');
      expect(registry.hasHook('test-before-hook')).toBe(true);
    });

    it('should apply default values', () => {
      registry.registerBefore({
        id: 'minimal',
        name: 'Minimal',
        eventPattern: 'auth.*',
        handler: vi.fn(),
      });

      const hook = registry.getHook('minimal') as BeforeHookConfig;
      expect(hook.priority).toBe(0);
      expect(hook.enabled).toBe(true);
      expect(hook.timeoutMs).toBe(5000);
    });

    it('should throw error for empty ID', () => {
      expect(() => registry.registerBefore(createTestBeforeHook({ id: '' }))).toThrow(
        'Before Hook ID is required'
      );
    });

    it('should throw error for empty eventPattern', () => {
      expect(() => registry.registerBefore(createTestBeforeHook({ eventPattern: '' }))).toThrow(
        'Before Hook event pattern is required'
      );
    });
  });

  // ===========================================================================
  // After Hook Registration Tests
  // ===========================================================================

  describe('registerAfter', () => {
    it('should register an After Hook and return its ID', () => {
      const hook = createTestAfterHook();
      const id = registry.registerAfter(hook);

      expect(id).toBe('test-after-hook');
      expect(registry.hasHook('test-after-hook')).toBe(true);
    });

    it('should apply default values', () => {
      registry.registerAfter({
        id: 'minimal',
        name: 'Minimal',
        eventPattern: '*',
        handler: vi.fn(),
      });

      const hook = registry.getHook('minimal') as AfterHookConfig;
      expect(hook.priority).toBe(0);
      expect(hook.enabled).toBe(true);
      expect(hook.timeoutMs).toBe(30000);
      expect(hook.async).toBe(false);
      expect(hook.continueOnError).toBe(true);
    });

    it('should throw error for empty ID', () => {
      expect(() => registry.registerAfter(createTestAfterHook({ id: '' }))).toThrow(
        'After Hook ID is required'
      );
    });
  });

  // ===========================================================================
  // getBeforeHooks Tests
  // ===========================================================================

  describe('getBeforeHooks', () => {
    it('should return hooks matching event type', () => {
      registry.registerBefore(createTestBeforeHook({ id: 'auth-hook', eventPattern: 'auth.*' }));
      registry.registerBefore(createTestBeforeHook({ id: 'token-hook', eventPattern: 'token.*' }));

      const hooks = registry.getBeforeHooks('auth.login.succeeded');

      expect(hooks).toHaveLength(1);
      expect(hooks[0].id).toBe('auth-hook');
    });

    it('should sort hooks by priority (highest first)', () => {
      registry.registerBefore(createTestBeforeHook({ id: 'low', eventPattern: '*', priority: 10 }));
      registry.registerBefore(
        createTestBeforeHook({ id: 'high', eventPattern: '*', priority: 100 })
      );
      registry.registerBefore(
        createTestBeforeHook({ id: 'medium', eventPattern: '*', priority: 50 })
      );

      const hooks = registry.getBeforeHooks('auth.login.succeeded');

      expect(hooks[0].id).toBe('high');
      expect(hooks[1].id).toBe('medium');
      expect(hooks[2].id).toBe('low');
    });

    it('should exclude disabled hooks', () => {
      registry.registerBefore(
        createTestBeforeHook({ id: 'enabled', eventPattern: '*', enabled: true })
      );
      registry.registerBefore(
        createTestBeforeHook({ id: 'disabled', eventPattern: '*', enabled: false })
      );

      const hooks = registry.getBeforeHooks('auth.login.succeeded');

      expect(hooks).toHaveLength(1);
      expect(hooks[0].id).toBe('enabled');
    });
  });

  // ===========================================================================
  // getAfterHooks Tests
  // ===========================================================================

  describe('getAfterHooks', () => {
    it('should return hooks matching event type', () => {
      registry.registerAfter(createTestAfterHook({ id: 'auth-hook', eventPattern: 'auth.*' }));
      registry.registerAfter(createTestAfterHook({ id: 'token-hook', eventPattern: 'token.*' }));

      const hooks = registry.getAfterHooks('auth.login.succeeded');

      expect(hooks).toHaveLength(1);
      expect(hooks[0].id).toBe('auth-hook');
    });

    it('should sort hooks by priority (highest first)', () => {
      registry.registerAfter(createTestAfterHook({ id: 'low', eventPattern: '*', priority: 10 }));
      registry.registerAfter(createTestAfterHook({ id: 'high', eventPattern: '*', priority: 100 }));

      const hooks = registry.getAfterHooks('auth.login.succeeded');

      expect(hooks[0].id).toBe('high');
      expect(hooks[1].id).toBe('low');
    });
  });

  // ===========================================================================
  // unregister Tests
  // ===========================================================================

  describe('unregister', () => {
    it('should remove a Before Hook', () => {
      registry.registerBefore(createTestBeforeHook());
      expect(registry.hasHook('test-before-hook')).toBe(true);

      registry.unregister('test-before-hook');
      expect(registry.hasHook('test-before-hook')).toBe(false);
    });

    it('should remove an After Hook', () => {
      registry.registerAfter(createTestAfterHook());
      expect(registry.hasHook('test-after-hook')).toBe(true);

      registry.unregister('test-after-hook');
      expect(registry.hasHook('test-after-hook')).toBe(false);
    });

    it('should be idempotent for non-existent hooks', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  // ===========================================================================
  // setEnabled Tests
  // ===========================================================================

  describe('setEnabled', () => {
    it('should enable a disabled Before Hook', () => {
      registry.registerBefore(createTestBeforeHook({ enabled: false }));

      registry.setEnabled('test-before-hook', true);

      const hook = registry.getHook('test-before-hook') as BeforeHookConfig;
      expect(hook.enabled).toBe(true);
    });

    it('should disable an enabled After Hook', () => {
      registry.registerAfter(createTestAfterHook({ enabled: true }));

      registry.setEnabled('test-after-hook', false);

      const hook = registry.getHook('test-after-hook') as AfterHookConfig;
      expect(hook.enabled).toBe(false);
    });

    it('should throw error for non-existent hook', () => {
      expect(() => registry.setEnabled('non-existent', true)).toThrow(
        'Hook not found: non-existent'
      );
    });
  });

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe('createEventHookRegistry', () => {
    it('should create registry with initial hooks', () => {
      const registry = createEventHookRegistry({
        beforeHooks: [createTestBeforeHook({ id: 'b1' })],
        afterHooks: [createTestAfterHook({ id: 'a1' })],
      });

      expect(registry.size).toBe(2);
      expect(registry.hasHook('b1')).toBe(true);
      expect(registry.hasHook('a1')).toBe(true);
    });

    it('should create empty registry when no config provided', () => {
      const registry = createEventHookRegistry();
      expect(registry.size).toBe(0);
    });
  });
});

// =============================================================================
// executeBeforeHooks Tests
// =============================================================================

describe('executeBeforeHooks', () => {
  const createTestEvent = (): UnifiedEvent => ({
    id: 'evt_123',
    type: 'auth.login.succeeded',
    version: '1.0',
    timestamp: new Date().toISOString(),
    tenantId: 'tenant_default',
    data: { userId: 'user_456' },
    metadata: {},
  });

  const createTestContext = (): EventHandlerContext => ({
    env: {},
    tenantId: 'tenant_default',
  });

  it('should execute all hooks and return combined result', async () => {
    const hooks: BeforeHookConfig[] = [
      {
        id: 'hook1',
        name: 'Hook 1',
        eventPattern: '*',
        handler: vi.fn().mockResolvedValue({ continue: true, annotations: { a: 1 } }),
      },
      {
        id: 'hook2',
        name: 'Hook 2',
        eventPattern: '*',
        handler: vi.fn().mockResolvedValue({ continue: true, annotations: { b: 2 } }),
      },
    ];

    const result = await executeBeforeHooks(hooks, createTestEvent(), createTestContext());

    expect(result.continue).toBe(true);
    expect(result.annotations).toEqual({ a: 1, b: 2 });
    expect(result.hookResults).toHaveLength(2);
  });

  it('should stop execution when hook denies', async () => {
    const hooks: BeforeHookConfig[] = [
      {
        id: 'hook1',
        name: 'Hook 1',
        eventPattern: '*',
        handler: vi.fn().mockResolvedValue({ continue: true }),
      },
      {
        id: 'hook2',
        name: 'Hook 2 (denies)',
        eventPattern: '*',
        handler: vi.fn().mockResolvedValue({
          continue: false,
          denyReason: 'Blocked',
          denyCode: 'BLOCKED',
        }),
      },
      {
        id: 'hook3',
        name: 'Hook 3 (should not run)',
        eventPattern: '*',
        handler: vi.fn().mockResolvedValue({ continue: true }),
      },
    ];

    const result = await executeBeforeHooks(hooks, createTestEvent(), createTestContext());

    expect(result.continue).toBe(false);
    expect(result.denyReason).toBe('Blocked');
    expect(result.denyCode).toBe('BLOCKED');
    expect(result.hookResults).toHaveLength(2);
    expect(hooks[2].handler).not.toHaveBeenCalled();
  });

  it('should treat timeout as DENY (security-first)', async () => {
    const hooks: BeforeHookConfig[] = [
      {
        id: 'slow-hook',
        name: 'Slow Hook',
        eventPattern: '*',
        timeoutMs: 50, // Very short timeout
        handler: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve({ continue: true }), 200); // Takes longer than timeout
            })
        ),
      },
    ];

    const result = await executeBeforeHooks(hooks, createTestEvent(), createTestContext());

    expect(result.continue).toBe(false);
    expect(result.denyReason).toBe('Hook timeout');
    expect(result.denyCode).toBe('HOOK_TIMEOUT');
  });

  it('should merge annotations from multiple hooks', async () => {
    const hooks: BeforeHookConfig[] = [
      {
        id: 'hook1',
        name: 'Hook 1',
        eventPattern: '*',
        handler: vi.fn().mockResolvedValue({ continue: true, annotations: { x: 1, y: 2 } }),
      },
      {
        id: 'hook2',
        name: 'Hook 2',
        eventPattern: '*',
        handler: vi.fn().mockResolvedValue({ continue: true, annotations: { y: 3, z: 4 } }),
      },
    ];

    const result = await executeBeforeHooks(hooks, createTestEvent(), createTestContext());

    // Later hooks override earlier ones for same keys
    expect(result.annotations).toEqual({ x: 1, y: 3, z: 4 });
  });

  it('should handle hook errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const hooks: BeforeHookConfig[] = [
      {
        id: 'error-hook',
        name: 'Error Hook',
        eventPattern: '*',
        handler: vi.fn().mockRejectedValue(new Error('Hook failed')),
      },
      {
        id: 'ok-hook',
        name: 'OK Hook',
        eventPattern: '*',
        handler: vi.fn().mockResolvedValue({ continue: true }),
      },
    ];

    const result = await executeBeforeHooks(hooks, createTestEvent(), createTestContext());

    // Non-timeout errors should not block (just log)
    expect(result.continue).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should return empty result for no hooks', async () => {
    const result = await executeBeforeHooks([], createTestEvent(), createTestContext());

    expect(result.continue).toBe(true);
    expect(result.annotations).toEqual({});
    expect(result.hookResults).toHaveLength(0);
  });
});

// =============================================================================
// HookTimeoutError Tests
// =============================================================================

describe('HookTimeoutError', () => {
  it('should have correct name and message', () => {
    const error = new HookTimeoutError('my-hook', 5000);

    expect(error.name).toBe('HookTimeoutError');
    expect(error.message).toBe("Hook 'my-hook' timed out after 5000ms");
  });
});
