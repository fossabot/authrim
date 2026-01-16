/**
 * Check Audit Service Unit Tests
 *
 * Tests for the permission check audit logging service.
 * Features tested:
 * - shouldLog(): Sampling logic for allow/deny events
 * - log(): Three logging modes (waitUntil, sync, queue)
 * - writeLog(): Database persistence
 * - processQueueMessage(): Queue consumer handling
 * - cleanupOldEntries(): Retention-based cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CheckAuditService,
  generateAuditId,
  DEFAULT_CHECK_AUDIT_CONFIG,
  type PermissionCheckAuditEntry,
  type CheckAuditServiceConfig,
} from '../services/check-audit-service';

/**
 * Create a mock D1Database
 */
function createMockDB() {
  const run = vi.fn().mockResolvedValue({ meta: { changes: 0 } });
  const bind = vi.fn().mockReturnValue({ run });
  const prepare = vi.fn().mockReturnValue({ bind });

  return {
    prepare,
    bind,
    run,
    _reset: () => {
      run.mockReset().mockResolvedValue({ meta: { changes: 0 } });
      bind.mockReset().mockReturnValue({ run });
      prepare.mockReset().mockReturnValue({ bind });
    },
  };
}

/**
 * Create a mock Queue
 */
function createMockQueue() {
  const send = vi.fn().mockResolvedValue(undefined);
  return { send };
}

/**
 * Create a mock ExecutionContext
 */
function createMockExecutionContext() {
  const waitUntil = vi.fn();
  return { waitUntil };
}

/**
 * Create a test audit entry
 */
function createTestEntry(
  overrides?: Partial<PermissionCheckAuditEntry>
): PermissionCheckAuditEntry {
  return {
    id: 'aud_test123',
    tenantId: 'tenant_1',
    subjectId: 'user_123',
    permission: 'documents:read',
    allowed: true,
    resolvedVia: ['direct'],
    finalDecision: 'allow',
    ...overrides,
  };
}

describe('CheckAuditService', () => {
  let mockDB: ReturnType<typeof createMockDB>;

  beforeEach(() => {
    mockDB = createMockDB();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // DEFAULT_CHECK_AUDIT_CONFIG
  // ===========================================================================

  describe('DEFAULT_CHECK_AUDIT_CONFIG', () => {
    it('should have secure defaults', () => {
      expect(DEFAULT_CHECK_AUDIT_CONFIG).toEqual({
        mode: 'waitUntil',
        logDeny: 'always',
        logAllow: 'sample',
        sampleRate: 0.01,
        retentionDays: 90,
      });
    });
  });

  // ===========================================================================
  // shouldLog()
  // ===========================================================================

  describe('shouldLog()', () => {
    it('should always log deny events when logDeny is "always"', () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        logDeny: 'always',
      });

      expect(service.shouldLog(false)).toBe(true);
    });

    it('should always log allow events when logAllow is "always"', () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        logAllow: 'always',
      });

      expect(service.shouldLog(true)).toBe(true);
    });

    it('should never log allow events when logAllow is "never"', () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        logAllow: 'never',
      });

      expect(service.shouldLog(true)).toBe(false);
    });

    it('should sample allow events when logAllow is "sample"', () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        logAllow: 'sample',
        sampleRate: 0.5, // 50%
      });

      // Run many times and check that some are logged
      let logged = 0;
      for (let i = 0; i < 1000; i++) {
        if (service.shouldLog(true)) {
          logged++;
        }
      }

      // Should be roughly 50% (with some variance)
      expect(logged).toBeGreaterThan(400);
      expect(logged).toBeLessThan(600);
    });

    it('should log all allow events with sampleRate 1.0', () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        logAllow: 'sample',
        sampleRate: 1.0,
      });

      // All should be logged
      for (let i = 0; i < 10; i++) {
        expect(service.shouldLog(true)).toBe(true);
      }
    });

    it('should log no allow events with sampleRate 0.0', () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        logAllow: 'sample',
        sampleRate: 0.0,
      });

      // None should be logged
      for (let i = 0; i < 10; i++) {
        expect(service.shouldLog(true)).toBe(false);
      }
    });
  });

  // ===========================================================================
  // log() - waitUntil mode
  // ===========================================================================

  describe('log() - waitUntil mode', () => {
    it('should use ctx.waitUntil when ExecutionContext is provided', async () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        mode: 'waitUntil',
        logAllow: 'always',
      });

      const ctx = createMockExecutionContext();
      const entry = createTestEntry();

      await service.log(entry, ctx as unknown as ExecutionContext);

      expect(ctx.waitUntil).toHaveBeenCalledTimes(1);
      expect(ctx.waitUntil).toHaveBeenCalledWith(expect.any(Promise));
    });

    it('should fallback to sync when no ExecutionContext provided', async () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        mode: 'waitUntil',
        logAllow: 'always',
      });

      const entry = createTestEntry();

      await service.log(entry);

      // Should have called prepare directly (sync fallback)
      expect(mockDB.prepare).toHaveBeenCalled();
    });

    it('should not log when shouldLog returns false', async () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        mode: 'waitUntil',
        logAllow: 'never',
      });

      const ctx = createMockExecutionContext();
      const entry = createTestEntry({ allowed: true });

      await service.log(entry, ctx as unknown as ExecutionContext);

      expect(ctx.waitUntil).not.toHaveBeenCalled();
      expect(mockDB.prepare).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // log() - sync mode
  // ===========================================================================

  describe('log() - sync mode', () => {
    it('should write directly to database', async () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        mode: 'sync',
        logAllow: 'always',
      });

      const entry = createTestEntry();

      await service.log(entry);

      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'));
      expect(mockDB.bind).toHaveBeenCalled();
      expect(mockDB.run).toHaveBeenCalled();
    });

    it('should bind all entry fields correctly', async () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        mode: 'sync',
        logAllow: 'always',
      });

      const entry = createTestEntry({
        id: 'aud_xyz',
        tenantId: 'tenant_abc',
        subjectId: 'user_456',
        permission: 'projects:write',
        permissionParsed: {
          type: 'type_level',
          resource: 'projects',
          action: 'write',
          original: 'projects:write',
        },
        allowed: false,
        resolvedVia: ['role', 'computed'],
        finalDecision: 'deny',
        reason: 'No matching role',
        apiKeyId: 'key_123',
        clientId: 'client_abc',
      });

      await service.log(entry);

      expect(mockDB.bind).toHaveBeenCalledWith(
        'aud_xyz',
        'tenant_abc',
        'user_456',
        'projects:write',
        expect.any(String), // JSON stringified permissionParsed
        0, // allowed = false -> 0
        expect.any(String), // JSON stringified resolvedVia
        'deny',
        'No matching role',
        'key_123',
        'client_abc',
        expect.any(Number) // checkedAt timestamp
      );
    });
  });

  // ===========================================================================
  // log() - queue mode
  // ===========================================================================

  describe('log() - queue mode', () => {
    it('should send to queue when queue is configured', async () => {
      const mockQueue = createMockQueue();
      const service = new CheckAuditService(
        mockDB as unknown as D1Database,
        { mode: 'queue', logAllow: 'always' },
        mockQueue as unknown as Queue
      );

      const entry = createTestEntry();

      await service.log(entry);

      expect(mockQueue.send).toHaveBeenCalledWith({
        type: 'permission_check_audit',
        entry,
      });
      expect(mockDB.prepare).not.toHaveBeenCalled();
    });

    it('should fallback to sync when queue is not configured', async () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        mode: 'queue',
        logAllow: 'always',
      });

      const entry = createTestEntry();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await service.log(entry);

      // Should fallback to DB write
      expect(mockDB.prepare).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  // ===========================================================================
  // log() - error handling
  // ===========================================================================

  describe('log() - error handling', () => {
    it('should not throw when database write fails', async () => {
      mockDB.run.mockRejectedValue(new Error('DB write failed'));

      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        mode: 'sync',
        logAllow: 'always',
      });

      const entry = createTestEntry();

      // Should not throw
      await expect(service.log(entry)).resolves.toBeUndefined();
    });

    it('should not throw when queue send fails', async () => {
      const mockQueue = createMockQueue();
      mockQueue.send.mockRejectedValue(new Error('Queue send failed'));

      const service = new CheckAuditService(
        mockDB as unknown as D1Database,
        { mode: 'queue', logAllow: 'always' },
        mockQueue as unknown as Queue
      );

      const entry = createTestEntry();

      // Should not throw
      await expect(service.log(entry)).resolves.toBeUndefined();
    });
  });

  // ===========================================================================
  // processQueueMessage()
  // ===========================================================================

  describe('processQueueMessage()', () => {
    it('should write entry to database for permission_check_audit messages', async () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database);

      const entry = createTestEntry();
      await service.processQueueMessage({
        type: 'permission_check_audit',
        entry,
      });

      expect(mockDB.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO'));
      expect(mockDB.run).toHaveBeenCalled();
    });

    it('should ignore non-permission_check_audit messages', async () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database);

      await service.processQueueMessage({
        type: 'other_type' as 'permission_check_audit',
        entry: createTestEntry(),
      });

      expect(mockDB.prepare).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // updateConfig() and getConfig()
  // ===========================================================================

  describe('updateConfig() and getConfig()', () => {
    it('should update config at runtime', () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database);

      service.updateConfig({ logAllow: 'always', sampleRate: 0.5 });

      const config = service.getConfig();
      expect(config.logAllow).toBe('always');
      expect(config.sampleRate).toBe(0.5);
    });

    it('should return a copy of config', () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database);

      const config1 = service.getConfig();
      config1.sampleRate = 0.99;

      const config2 = service.getConfig();
      expect(config2.sampleRate).not.toBe(0.99);
    });
  });

  // ===========================================================================
  // cleanupOldEntries()
  // ===========================================================================

  describe('cleanupOldEntries()', () => {
    it('should delete entries older than retention period', async () => {
      mockDB.run.mockResolvedValue({ meta: { changes: 42 } });

      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        retentionDays: 30,
      });

      const deleted = await service.cleanupOldEntries();

      expect(deleted).toBe(42);
      expect(mockDB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM permission_check_audit')
      );
    });

    it('should return 0 when retentionDays is not set', async () => {
      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        retentionDays: undefined,
      });

      const deleted = await service.cleanupOldEntries();

      expect(deleted).toBe(0);
      expect(mockDB.prepare).not.toHaveBeenCalled();
    });

    it('should use correct cutoff timestamp', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));

      const service = new CheckAuditService(mockDB as unknown as D1Database, {
        retentionDays: 30,
      });

      await service.cleanupOldEntries();

      // 30 days = 2592000 seconds
      // 2024-01-15 12:00:00 UTC = 1705320000
      // Cutoff should be 1705320000 - 2592000 = 1702728000
      const expectedCutoff = 1705320000 - 30 * 24 * 60 * 60;
      expect(mockDB.bind).toHaveBeenCalledWith(expectedCutoff);

      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // generateAuditId()
  // ===========================================================================

  describe('generateAuditId()', () => {
    it('should generate IDs with "aud_" prefix', () => {
      const id = generateAuditId();
      expect(id).toMatch(/^aud_/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateAuditId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate IDs of reasonable length', () => {
      const id = generateAuditId();
      // aud_ prefix (4) + timestamp (variable) + random (up to 8)
      expect(id.length).toBeGreaterThan(10);
      expect(id.length).toBeLessThan(30);
    });
  });
});
