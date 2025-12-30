import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createHealthCheckHandlers,
  createLivenessHandler,
  createReadinessHandler,
} from '../health-check';
import type { Context } from 'hono';
import type { Env } from '../../types/env';

// Mock context
function createMockContext(env: Partial<Env> = {}): Context<{ Bindings: Env }> {
  return {
    env: env as Env,
    json: vi.fn((data: unknown, status?: number) => {
      return new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  } as unknown as Context<{ Bindings: Env }>;
}

describe('Health Check Utilities', () => {
  describe('createLivenessHandler', () => {
    it('should return 200 with ok status', () => {
      const handler = createLivenessHandler();
      const c = createMockContext();

      const response = handler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
        }),
        200
      );
    });
  });

  describe('createReadinessHandler', () => {
    it('should return ready when all checks pass', async () => {
      const mockDB = {
        prepare: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ '1': 1 }),
        }),
      };
      const mockKV = {
        get: vi.fn().mockResolvedValue(null),
      };

      const handler = createReadinessHandler({
        serviceName: 'test-service',
        checkDatabase: true,
        checkKV: true,
      });

      const c = createMockContext({
        DB: mockDB as unknown as Env['DB'],
        KV: mockKV as unknown as Env['KV'],
      });

      await handler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          checks: expect.objectContaining({
            database: expect.objectContaining({ status: 'ok' }),
            kv: expect.objectContaining({ status: 'ok' }),
          }),
        }),
        200
      );
    });

    it('should return not_ready when database check fails', async () => {
      const mockDB = {
        prepare: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Connection failed')),
        }),
      };
      const mockKV = {
        get: vi.fn().mockResolvedValue(null),
      };

      const handler = createReadinessHandler({
        serviceName: 'test-service',
        checkDatabase: true,
        checkKV: true,
      });

      const c = createMockContext({
        DB: mockDB as unknown as Env['DB'],
        KV: mockKV as unknown as Env['KV'],
      });

      await handler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not_ready',
          checks: expect.objectContaining({
            database: expect.objectContaining({
              status: 'error',
              error: 'Connection failed',
            }),
          }),
        }),
        503
      );
    });

    it('should skip database check when checkDatabase is false', async () => {
      const mockKV = {
        get: vi.fn().mockResolvedValue(null),
      };

      const handler = createReadinessHandler({
        serviceName: 'test-service',
        checkDatabase: false,
        checkKV: true,
      });

      const c = createMockContext({
        KV: mockKV as unknown as Env['KV'],
      });

      await handler(c);

      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          checks: expect.not.objectContaining({
            database: expect.anything(),
          }),
        }),
        200
      );
    });
  });

  describe('createHealthCheckHandlers', () => {
    it('should return both liveness and readiness handlers', () => {
      const handlers = createHealthCheckHandlers({
        serviceName: 'test-service',
        version: '1.0.0',
      });

      expect(handlers.liveness).toBeDefined();
      expect(handlers.readiness).toBeDefined();
      expect(typeof handlers.liveness).toBe('function');
      expect(typeof handlers.readiness).toBe('function');
    });
  });
});
