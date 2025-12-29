/**
 * Unified Event Helper Functions Unit Tests
 *
 * Tests for createUnifiedEvent, getEventCategory, getEventAction, and matchEventPattern.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createUnifiedEvent,
  getEventCategory,
  getEventAction,
  matchEventPattern,
  type UnifiedEvent,
  type EventMetadata,
} from '../unified-event';

// =============================================================================
// createUnifiedEvent Tests
// =============================================================================

describe('createUnifiedEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create an event with required fields', () => {
    const event = createUnifiedEvent('auth.login.succeeded', 'tenant_123', { userId: 'user_456' });

    expect(event.type).toBe('auth.login.succeeded');
    expect(event.tenantId).toBe('tenant_123');
    expect(event.data).toEqual({ userId: 'user_456' });
    expect(event.version).toBe('1.0');
    expect(event.timestamp).toBe('2024-01-15T10:30:00.000Z');
    expect(event.metadata).toEqual({});
  });

  it('should create an event with metadata', () => {
    const metadata: Partial<EventMetadata> = {
      actor: { type: 'user', id: 'user_456' },
      requestId: 'req_789',
      source: 'ar-auth',
    };

    const event = createUnifiedEvent(
      'auth.login.succeeded',
      'tenant_123',
      { userId: 'user_456' },
      metadata
    );

    expect(event.metadata.actor).toEqual({ type: 'user', id: 'user_456' });
    expect(event.metadata.requestId).toBe('req_789');
    expect(event.metadata.source).toBe('ar-auth');
  });

  it('should not include id field (caller should generate)', () => {
    const event = createUnifiedEvent('auth.login.succeeded', 'tenant_123', {});

    // The returned object should not have 'id' property
    expect('id' in event).toBe(false);
  });

  it('should use default version 1.0', () => {
    const event = createUnifiedEvent('session.user.created', 'tenant_1', {});

    expect(event.version).toBe('1.0');
  });

  it('should handle empty data payload', () => {
    const event = createUnifiedEvent('system.health.checked', 'tenant_1', {});

    expect(event.data).toEqual({});
  });

  it('should handle complex data payloads', () => {
    const complexData = {
      userId: 'user_123',
      scopes: ['openid', 'profile', 'email'],
      metadata: { key: 'value' },
      nestedArray: [{ id: 1 }, { id: 2 }],
    };

    const event = createUnifiedEvent('token.access.issued', 'tenant_1', complexData);

    expect(event.data).toEqual(complexData);
  });

  it('should handle metadata with geo information', () => {
    const metadata: Partial<EventMetadata> = {
      geo: {
        country: 'JP',
        region: 'Tokyo',
        city: 'Shibuya',
      },
    };

    const event = createUnifiedEvent('auth.login.succeeded', 'tenant_1', {}, metadata);

    expect(event.metadata.geo).toEqual({
      country: 'JP',
      region: 'Tokyo',
      city: 'Shibuya',
    });
  });

  it('should handle metadata with tags', () => {
    const metadata: Partial<EventMetadata> = {
      tags: ['security', 'audit', 'critical'],
    };

    const event = createUnifiedEvent('security.rate_limit.exceeded', 'tenant_1', {}, metadata);

    expect(event.metadata.tags).toEqual(['security', 'audit', 'critical']);
  });
});

// =============================================================================
// getEventCategory Tests
// =============================================================================

describe('getEventCategory', () => {
  describe('valid event types', () => {
    it('should extract category from 3-segment event type', () => {
      expect(getEventCategory('auth.login.succeeded')).toBe('auth');
      expect(getEventCategory('session.user.created')).toBe('session');
      expect(getEventCategory('token.access.issued')).toBe('token');
      expect(getEventCategory('consent.granted')).toBe('consent');
    });

    it('should extract category from 2-segment event type', () => {
      expect(getEventCategory('auth.before_authenticate')).toBe('auth');
      expect(getEventCategory('consent.granted')).toBe('consent');
      expect(getEventCategory('user.created')).toBe('user');
    });

    it('should handle security events', () => {
      expect(getEventCategory('security.rate_limit.exceeded')).toBe('security');
      expect(getEventCategory('security.suspicious.login_attempt')).toBe('security');
    });
  });

  describe('invalid event types', () => {
    it('should return null for single-segment event type', () => {
      expect(getEventCategory('invalid')).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(getEventCategory('')).toBe(null);
    });

    it('should return null for string with only dots', () => {
      // Edge case: '.' splits into ['', ''] which has length >= 2
      expect(getEventCategory('.')).toBe('');
    });
  });
});

// =============================================================================
// getEventAction Tests
// =============================================================================

describe('getEventAction', () => {
  describe('valid event types', () => {
    it('should extract action from 3-segment event type', () => {
      expect(getEventAction('auth.login.succeeded')).toBe('login.succeeded');
      expect(getEventAction('session.user.created')).toBe('user.created');
      expect(getEventAction('token.access.issued')).toBe('access.issued');
    });

    it('should extract action from 2-segment event type', () => {
      expect(getEventAction('auth.before_authenticate')).toBe('before_authenticate');
      expect(getEventAction('consent.granted')).toBe('granted');
      expect(getEventAction('user.created')).toBe('created');
    });

    it('should handle events with more than 3 segments', () => {
      expect(getEventAction('security.suspicious.login.attempt')).toBe('suspicious.login.attempt');
    });
  });

  describe('invalid event types', () => {
    it('should return null for single-segment event type', () => {
      expect(getEventAction('invalid')).toBe(null);
    });

    it('should return null for empty string', () => {
      expect(getEventAction('')).toBe(null);
    });
  });
});

// =============================================================================
// matchEventPattern Tests
// =============================================================================

describe('matchEventPattern', () => {
  describe('universal wildcard', () => {
    it('should match all events with *', () => {
      expect(matchEventPattern('auth.login.succeeded', '*')).toBe(true);
      expect(matchEventPattern('session.user.created', '*')).toBe(true);
      expect(matchEventPattern('token.access.issued', '*')).toBe(true);
      expect(matchEventPattern('any.event.type', '*')).toBe(true);
    });
  });

  describe('exact match', () => {
    it('should match exact event type', () => {
      expect(matchEventPattern('auth.login.succeeded', 'auth.login.succeeded')).toBe(true);
      expect(matchEventPattern('session.user.created', 'session.user.created')).toBe(true);
    });

    it('should not match different event types', () => {
      expect(matchEventPattern('auth.login.succeeded', 'auth.login.failed')).toBe(false);
      expect(matchEventPattern('auth.login.succeeded', 'session.user.created')).toBe(false);
    });
  });

  describe('prefix matching (shorter pattern)', () => {
    it('should match with category prefix', () => {
      expect(matchEventPattern('auth.login.succeeded', 'auth.*')).toBe(true);
      expect(matchEventPattern('auth.passkey.failed', 'auth.*')).toBe(true);
      expect(matchEventPattern('auth.email_code.succeeded', 'auth.*')).toBe(true);
    });

    it('should match with two-segment prefix', () => {
      expect(matchEventPattern('auth.passkey.succeeded', 'auth.passkey.*')).toBe(true);
      expect(matchEventPattern('auth.passkey.failed', 'auth.passkey.*')).toBe(true);
    });

    it('should not match different categories with prefix', () => {
      expect(matchEventPattern('session.user.created', 'auth.*')).toBe(false);
      expect(matchEventPattern('token.access.issued', 'auth.*')).toBe(false);
    });

    it('should match 2-segment events with prefix pattern', () => {
      expect(matchEventPattern('auth.before_authenticate', 'auth.*')).toBe(true);
      expect(matchEventPattern('consent.granted', 'consent.*')).toBe(true);
    });
  });

  describe('glob matching (same length)', () => {
    it('should match with middle wildcard', () => {
      expect(matchEventPattern('auth.login.succeeded', 'auth.*.succeeded')).toBe(true);
      expect(matchEventPattern('auth.passkey.succeeded', 'auth.*.succeeded')).toBe(true);
      expect(matchEventPattern('auth.email_code.succeeded', 'auth.*.succeeded')).toBe(true);
    });

    it('should match with last wildcard', () => {
      expect(matchEventPattern('auth.login.succeeded', 'auth.login.*')).toBe(true);
      expect(matchEventPattern('auth.login.failed', 'auth.login.*')).toBe(true);
    });

    it('should match with first wildcard', () => {
      expect(matchEventPattern('auth.login.succeeded', '*.login.succeeded')).toBe(true);
      expect(matchEventPattern('custom.login.succeeded', '*.login.succeeded')).toBe(true);
    });

    it('should match with multiple wildcards', () => {
      expect(matchEventPattern('auth.login.succeeded', '*.*.*')).toBe(true);
      expect(matchEventPattern('session.user.created', '*.*.*')).toBe(true);
    });

    it('should match suffix pattern', () => {
      expect(matchEventPattern('auth.login.failed', '*.*.failed')).toBe(true);
      expect(matchEventPattern('auth.passkey.failed', '*.*.failed')).toBe(true);
      expect(matchEventPattern('session.user.failed', '*.*.failed')).toBe(true);
    });

    it('should not match with wrong suffix', () => {
      expect(matchEventPattern('auth.login.succeeded', '*.*.failed')).toBe(false);
    });
  });

  describe('pattern longer than event (no match)', () => {
    it('should not match when pattern has more segments', () => {
      expect(matchEventPattern('auth.before_authenticate', 'auth.*.*')).toBe(false);
      expect(matchEventPattern('consent.granted', 'consent.*.*')).toBe(false);
    });
  });

  describe('hook event patterns', () => {
    it('should match before hook events', () => {
      expect(matchEventPattern('auth.before_authenticate', 'auth.*')).toBe(true);
      expect(matchEventPattern('token.before_issue', 'token.*')).toBe(true);
    });

    it('should match after hook events', () => {
      expect(matchEventPattern('auth.after_authenticate', 'auth.*')).toBe(true);
      expect(matchEventPattern('token.after_issue', 'token.*')).toBe(true);
    });

    it('should match before/after with glob pattern', () => {
      expect(matchEventPattern('auth.before_authenticate', '*.before_authenticate')).toBe(true);
      expect(matchEventPattern('token.before_issue', '*.before_issue')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty pattern', () => {
      expect(matchEventPattern('auth.login.succeeded', '')).toBe(false);
    });

    it('should handle empty event type', () => {
      expect(matchEventPattern('', 'auth.*')).toBe(false);
    });

    it('should handle both empty', () => {
      expect(matchEventPattern('', '')).toBe(true);
    });

    it('should handle underscore in event names', () => {
      expect(matchEventPattern('security.rate_limit.exceeded', 'security.*')).toBe(true);
      expect(matchEventPattern('auth.email_code.succeeded', 'auth.email_code.*')).toBe(true);
    });

    it('should be case-sensitive', () => {
      expect(matchEventPattern('AUTH.login.succeeded', 'auth.login.succeeded')).toBe(false);
      expect(matchEventPattern('auth.LOGIN.succeeded', 'auth.login.succeeded')).toBe(false);
    });
  });

  describe('real-world subscription patterns', () => {
    it('should support subscribing to all auth events', () => {
      const pattern = 'auth.*';
      expect(matchEventPattern('auth.login.succeeded', pattern)).toBe(true);
      expect(matchEventPattern('auth.login.failed', pattern)).toBe(true);
      expect(matchEventPattern('auth.passkey.succeeded', pattern)).toBe(true);
      expect(matchEventPattern('auth.external_idp.succeeded', pattern)).toBe(true);
    });

    it('should support subscribing to all failed events', () => {
      const pattern = '*.*.failed';
      expect(matchEventPattern('auth.login.failed', pattern)).toBe(true);
      expect(matchEventPattern('auth.passkey.failed', pattern)).toBe(true);
      expect(matchEventPattern('session.user.failed', pattern)).toBe(true);
      expect(matchEventPattern('auth.login.succeeded', pattern)).toBe(false);
    });

    it('should support subscribing to specific method events', () => {
      const pattern = 'auth.passkey.*';
      expect(matchEventPattern('auth.passkey.succeeded', pattern)).toBe(true);
      expect(matchEventPattern('auth.passkey.failed', pattern)).toBe(true);
      expect(matchEventPattern('auth.email_code.succeeded', pattern)).toBe(false);
    });

    it('should support subscribing to all security events', () => {
      const pattern = 'security.*';
      expect(matchEventPattern('security.rate_limit.exceeded', pattern)).toBe(true);
      expect(matchEventPattern('security.suspicious.login_attempt', pattern)).toBe(true);
      expect(matchEventPattern('security.account.locked', pattern)).toBe(true);
    });
  });
});

// =============================================================================
// Type Safety Tests
// =============================================================================

describe('Type Safety', () => {
  it('should create properly typed events', () => {
    interface CustomEventData {
      userId: string;
      action: string;
    }

    const event = createUnifiedEvent<CustomEventData>('custom.event.occurred', 'tenant_1', {
      userId: 'user_123',
      action: 'test',
    });

    // Type checks at compile time
    expect(event.data.userId).toBe('user_123');
    expect(event.data.action).toBe('test');
  });

  it('should properly type UnifiedEvent with generic parameter', () => {
    const event: Omit<UnifiedEvent<{ count: number }>, 'id'> = createUnifiedEvent(
      'metrics.count.updated',
      'tenant_1',
      { count: 42 }
    );

    expect(event.data.count).toBe(42);
  });
});
