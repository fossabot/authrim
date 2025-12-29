/**
 * Webhook Payload Transformation Tests
 *
 * Tests for toWebhookPayload and fromWebhookPayload conversion functions.
 */

import { describe, it, expect } from 'vitest';
import { toWebhookPayload, fromWebhookPayload, type WebhookPayload } from '../webhook-payload';
import type { UnifiedEvent } from '../unified-event';

// =============================================================================
// Test Fixtures
// =============================================================================

const createTestEvent = (overrides?: Partial<UnifiedEvent>): UnifiedEvent => ({
  id: 'evt_test_123',
  type: 'auth.login.succeeded',
  version: '1.0',
  timestamp: '2024-01-15T10:30:00.000Z',
  tenantId: 'tenant_default',
  data: { userId: 'user_456' },
  metadata: {},
  ...overrides,
});

const createTestPayload = (overrides?: Partial<WebhookPayload>): WebhookPayload => ({
  eventId: 'evt_test_123',
  eventName: 'auth.login.succeeded',
  timestamp: new Date('2024-01-15T10:30:00.000Z').getTime(),
  tenantId: 'tenant_default',
  context: {},
  data: { userId: 'user_456' },
  ...overrides,
});

// =============================================================================
// toWebhookPayload Tests
// =============================================================================

describe('toWebhookPayload', () => {
  describe('basic transformation', () => {
    it('should transform UnifiedEvent to WebhookPayload', () => {
      const event = createTestEvent();
      const payload = toWebhookPayload(event);

      expect(payload.eventId).toBe('evt_test_123');
      expect(payload.eventName).toBe('auth.login.succeeded');
      expect(payload.tenantId).toBe('tenant_default');
      expect(payload.data).toEqual({ userId: 'user_456' });
    });

    it('should convert ISO timestamp to Unix milliseconds', () => {
      const isoTimestamp = '2024-01-15T10:30:00.000Z';
      const event = createTestEvent({
        timestamp: isoTimestamp,
      });
      const payload = toWebhookPayload(event);

      // Verify conversion is correct
      expect(payload.timestamp).toBe(new Date(isoTimestamp).getTime());
    });

    it('should handle different timestamp formats', () => {
      const event = createTestEvent({
        timestamp: '2024-12-25T23:59:59.999Z',
      });
      const payload = toWebhookPayload(event);

      expect(payload.timestamp).toBe(new Date('2024-12-25T23:59:59.999Z').getTime());
    });
  });

  describe('actor promotion', () => {
    it('should promote actor from metadata to top level', () => {
      const event = createTestEvent({
        metadata: {
          actor: { type: 'user', id: 'user_123' },
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.actor).toEqual({ type: 'user', id: 'user_123' });
    });

    it('should handle service actor type', () => {
      const event = createTestEvent({
        metadata: {
          actor: { type: 'service', id: 'ar-auth' },
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.actor).toEqual({ type: 'service', id: 'ar-auth' });
    });

    it('should handle system actor type', () => {
      const event = createTestEvent({
        metadata: {
          actor: { type: 'system', id: 'scheduler' },
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.actor).toEqual({ type: 'system', id: 'scheduler' });
    });

    it('should handle client actor type', () => {
      const event = createTestEvent({
        metadata: {
          actor: { type: 'client', id: 'my-app-client' },
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.actor).toEqual({ type: 'client', id: 'my-app-client' });
    });

    it('should leave actor undefined if not present in metadata', () => {
      const event = createTestEvent({
        metadata: {},
      });
      const payload = toWebhookPayload(event);

      expect(payload.actor).toBeUndefined();
    });
  });

  describe('context flattening', () => {
    it('should flatten metadata to context', () => {
      const event = createTestEvent({
        metadata: {
          requestId: 'req_xyz789',
          sessionId: 'ses_def456',
          clientId: 'my-app',
          ipAddress: '203.0.113.1',
          userAgent: 'Mozilla/5.0...',
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.context.requestId).toBe('req_xyz789');
      expect(payload.context.sessionId).toBe('ses_def456');
      expect(payload.context.clientId).toBe('my-app');
      expect(payload.context.ipAddress).toBe('203.0.113.1');
      expect(payload.context.userAgent).toBe('Mozilla/5.0...');
    });

    it('should transform geo to geoLocation', () => {
      const event = createTestEvent({
        metadata: {
          geo: {
            country: 'JP',
            region: 'Tokyo',
            city: 'Shibuya',
          },
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.context.geoLocation).toEqual({
        country: 'JP',
        region: 'Tokyo',
        city: 'Shibuya',
      });
    });

    it('should handle empty metadata', () => {
      const event = createTestEvent({
        metadata: {},
      });
      const payload = toWebhookPayload(event);

      expect(payload.context).toEqual({
        requestId: undefined,
        sessionId: undefined,
        clientId: undefined,
        ipAddress: undefined,
        userAgent: undefined,
        geoLocation: undefined,
      });
    });
  });

  describe('target extraction - object format', () => {
    it('should extract target from data.target object', () => {
      const event = createTestEvent({
        data: {
          target: { type: 'session', id: 'ses_456' },
          reason: 'admin_revoke',
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.target).toEqual({ type: 'session', id: 'ses_456' });
    });

    it('should use custom targetField option', () => {
      const event = createTestEvent({
        data: {
          resource: { type: 'user', id: 'usr_123' },
        },
      });
      const payload = toWebhookPayload(event, { targetField: 'resource' });

      expect(payload.target).toEqual({ type: 'user', id: 'usr_123' });
    });

    it('should disable target object extraction with targetField: null', () => {
      const event = createTestEvent({
        data: {
          target: { type: 'session', id: 'ses_456' },
          targetType: 'user',
          targetId: 'usr_789',
        },
      });
      const payload = toWebhookPayload(event, { targetField: null });

      // Should fallback to field format
      expect(payload.target).toEqual({ type: 'user', id: 'usr_789' });
    });

    it('should not extract target if object is malformed', () => {
      const event = createTestEvent({
        data: {
          target: { type: 'session' }, // missing id
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.target).toBeUndefined();
    });

    it('should not extract target if object has wrong types', () => {
      const event = createTestEvent({
        data: {
          target: { type: 123, id: 'ses_456' }, // type is not string
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.target).toBeUndefined();
    });
  });

  describe('target extraction - field format (fallback)', () => {
    it('should extract target from targetType/targetId fields', () => {
      const event = createTestEvent({
        data: {
          targetType: 'user',
          targetId: 'usr_123',
          changes: { name: 'New Name' },
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.target).toEqual({ type: 'user', id: 'usr_123' });
    });

    it('should use custom typeField and idField options', () => {
      const event = createTestEvent({
        data: {
          resourceType: 'client',
          resourceId: 'cli_456',
        },
      });
      const payload = toWebhookPayload(event, {
        targetField: null,
        typeField: 'resourceType',
        idField: 'resourceId',
      });

      expect(payload.target).toEqual({ type: 'client', id: 'cli_456' });
    });

    it('should not extract target if fields are missing', () => {
      const event = createTestEvent({
        data: {
          userId: 'usr_123',
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.target).toBeUndefined();
    });

    it('should not extract target if fields have wrong types', () => {
      const event = createTestEvent({
        data: {
          targetType: 123, // not a string
          targetId: 'usr_123',
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.target).toBeUndefined();
    });
  });

  describe('target extraction priority', () => {
    it('should prefer object format over field format', () => {
      const event = createTestEvent({
        data: {
          target: { type: 'session', id: 'ses_456' },
          targetType: 'user',
          targetId: 'usr_789',
        },
      });
      const payload = toWebhookPayload(event);

      // Object format takes priority
      expect(payload.target).toEqual({ type: 'session', id: 'ses_456' });
    });
  });

  describe('data preservation', () => {
    it('should preserve all data fields', () => {
      const event = createTestEvent({
        data: {
          userId: 'usr_123',
          scopes: ['openid', 'profile'],
          extra: { nested: 'value' },
        },
      });
      const payload = toWebhookPayload(event);

      expect(payload.data).toEqual({
        userId: 'usr_123',
        scopes: ['openid', 'profile'],
        extra: { nested: 'value' },
      });
    });

    it('should handle empty data', () => {
      const event = createTestEvent({
        data: {},
      });
      const payload = toWebhookPayload(event);

      expect(payload.data).toEqual({});
    });
  });
});

// =============================================================================
// fromWebhookPayload Tests
// =============================================================================

describe('fromWebhookPayload', () => {
  describe('basic transformation', () => {
    it('should transform WebhookPayload to UnifiedEvent', () => {
      const payload = createTestPayload();
      const event = fromWebhookPayload(payload);

      expect(event.id).toBe('evt_test_123');
      expect(event.type).toBe('auth.login.succeeded');
      expect(event.tenantId).toBe('tenant_default');
      expect(event.data).toEqual({ userId: 'user_456' });
    });

    it('should convert Unix milliseconds to ISO timestamp', () => {
      const unixMs = new Date('2024-01-15T10:30:00.000Z').getTime();
      const payload = createTestPayload({
        timestamp: unixMs,
      });
      const event = fromWebhookPayload(payload);

      expect(event.timestamp).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should set default version to 1.0', () => {
      const payload = createTestPayload();
      const event = fromWebhookPayload(payload);

      expect(event.version).toBe('1.0');
    });

    it('should allow custom version', () => {
      const payload = createTestPayload();
      const event = fromWebhookPayload(payload, '2.0');

      expect(event.version).toBe('2.0');
    });
  });

  describe('actor restoration', () => {
    it('should restore actor to metadata', () => {
      const payload = createTestPayload({
        actor: { type: 'user', id: 'user_123' },
      });
      const event = fromWebhookPayload(payload);

      expect(event.metadata.actor).toEqual({ type: 'user', id: 'user_123' });
    });

    it('should leave actor undefined if not present', () => {
      const payload = createTestPayload({
        actor: undefined,
      });
      const event = fromWebhookPayload(payload);

      expect(event.metadata.actor).toBeUndefined();
    });
  });

  describe('context restoration', () => {
    it('should restore context fields to metadata', () => {
      const payload = createTestPayload({
        context: {
          requestId: 'req_xyz789',
          sessionId: 'ses_def456',
          clientId: 'my-app',
          ipAddress: '203.0.113.1',
          userAgent: 'Mozilla/5.0...',
        },
      });
      const event = fromWebhookPayload(payload);

      expect(event.metadata.requestId).toBe('req_xyz789');
      expect(event.metadata.sessionId).toBe('ses_def456');
      expect(event.metadata.clientId).toBe('my-app');
      expect(event.metadata.ipAddress).toBe('203.0.113.1');
      expect(event.metadata.userAgent).toBe('Mozilla/5.0...');
    });

    it('should restore geoLocation to geo', () => {
      const payload = createTestPayload({
        context: {
          geoLocation: {
            country: 'JP',
            region: 'Tokyo',
            city: 'Shibuya',
          },
        },
      });
      const event = fromWebhookPayload(payload);

      expect(event.metadata.geo).toEqual({
        country: 'JP',
        region: 'Tokyo',
        city: 'Shibuya',
      });
    });
  });
});

// =============================================================================
// Round-Trip Tests
// =============================================================================

describe('Round-trip conversion', () => {
  it('should preserve essential fields in round-trip', () => {
    const originalEvent = createTestEvent({
      metadata: {
        actor: { type: 'user', id: 'user_123' },
        requestId: 'req_789',
        sessionId: 'ses_456',
        clientId: 'my-app',
      },
    });

    const payload = toWebhookPayload(originalEvent);
    const restoredEvent = fromWebhookPayload(payload);

    expect(restoredEvent.id).toBe(originalEvent.id);
    expect(restoredEvent.type).toBe(originalEvent.type);
    expect(restoredEvent.tenantId).toBe(originalEvent.tenantId);
    expect(restoredEvent.data).toEqual(originalEvent.data);
    expect(restoredEvent.metadata.actor).toEqual(originalEvent.metadata.actor);
    expect(restoredEvent.metadata.requestId).toBe(originalEvent.metadata.requestId);
    expect(restoredEvent.metadata.sessionId).toBe(originalEvent.metadata.sessionId);
    expect(restoredEvent.metadata.clientId).toBe(originalEvent.metadata.clientId);
  });

  it('should handle complex event data in round-trip', () => {
    const originalEvent = createTestEvent({
      data: {
        userId: 'usr_123',
        scopes: ['openid', 'profile', 'email'],
        claims: {
          email_verified: true,
          name: 'Test User',
        },
        metadata: {
          loginCount: 5,
          lastLogin: '2024-01-14T10:00:00Z',
        },
      },
      metadata: {
        actor: { type: 'user', id: 'usr_123' },
        geo: {
          country: 'JP',
          region: 'Tokyo',
        },
      },
    });

    const payload = toWebhookPayload(originalEvent);
    const restoredEvent = fromWebhookPayload(payload);

    expect(restoredEvent.data).toEqual(originalEvent.data);
    expect(restoredEvent.metadata.geo).toEqual(originalEvent.metadata.geo);
  });

  it('should preserve timestamp precision in round-trip', () => {
    const originalEvent = createTestEvent({
      timestamp: '2024-01-15T10:30:45.123Z',
    });

    const payload = toWebhookPayload(originalEvent);
    const restoredEvent = fromWebhookPayload(payload);

    // Note: Millisecond precision is preserved
    expect(restoredEvent.timestamp).toBe(originalEvent.timestamp);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge cases', () => {
  it('should handle event with all optional fields empty', () => {
    const event: UnifiedEvent = {
      id: 'evt_minimal',
      type: 'system.health.check',
      version: '1.0',
      timestamp: '2024-01-15T00:00:00.000Z',
      tenantId: 'default',
      data: {},
      metadata: {},
    };

    const payload = toWebhookPayload(event);

    expect(payload.eventId).toBe('evt_minimal');
    expect(payload.actor).toBeUndefined();
    expect(payload.target).toBeUndefined();
    expect(payload.context).toEqual({
      requestId: undefined,
      sessionId: undefined,
      clientId: undefined,
      ipAddress: undefined,
      userAgent: undefined,
      geoLocation: undefined,
    });
  });

  it('should handle event with special characters in strings', () => {
    const event = createTestEvent({
      data: {
        message: 'User\'s data with "quotes" and <brackets>',
        url: 'https://example.com/path?query=value&other=123',
      },
    });

    const payload = toWebhookPayload(event);

    expect(payload.data.message).toBe('User\'s data with "quotes" and <brackets>');
    expect(payload.data.url).toBe('https://example.com/path?query=value&other=123');
  });

  it('should handle event with unicode characters', () => {
    const event = createTestEvent({
      data: {
        name: '田中太郎',
        emoji: '🔐🎉',
      },
    });

    const payload = toWebhookPayload(event);

    expect(payload.data.name).toBe('田中太郎');
    expect(payload.data.emoji).toBe('🔐🎉');
  });

  it('should handle very long event IDs', () => {
    const longId = 'evt_' + 'a'.repeat(1000);
    const event = createTestEvent({
      id: longId,
    });

    const payload = toWebhookPayload(event);

    expect(payload.eventId).toBe(longId);
  });

  it('should handle timestamp at epoch zero', () => {
    const event = createTestEvent({
      timestamp: '1970-01-01T00:00:00.000Z',
    });

    const payload = toWebhookPayload(event);

    expect(payload.timestamp).toBe(0);
  });

  it('should handle future timestamps', () => {
    const event = createTestEvent({
      timestamp: '2099-12-31T23:59:59.999Z',
    });

    const payload = toWebhookPayload(event);

    expect(payload.timestamp).toBe(new Date('2099-12-31T23:59:59.999Z').getTime());
  });
});
