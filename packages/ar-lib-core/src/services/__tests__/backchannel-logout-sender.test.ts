/**
 * Backchannel Logout Sender Service Tests
 *
 * Tests for the Logout Token generation and sending functionality.
 *
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import {
  createLogoutToken,
  sendLogoutToken,
  isRetryableError,
  calculateRetryDelay,
  LogoutKVHelpers,
  createBackchannelLogoutOrchestrator,
} from '../backchannel-logout-sender';
import type { BackchannelLogoutConfig } from '../../types/logout';
import type { SessionClientWithDetails } from '../../repositories/core/session-client';
import { generateKeyPair, jwtVerify } from 'jose';

// Test key pair - generated dynamically at test time
let testPrivateKey: CryptoKey;
let testPublicKey: CryptoKey;

// Generate key pair once for all tests
beforeAll(async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  testPrivateKey = privateKey;
  testPublicKey = publicKey;
});

// Mock KV namespace
function createMockKV(): KVNamespace {
  const store = new Map<string, string>();

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    list: vi.fn(async ({ prefix, limit }: { prefix: string; limit?: number }) => {
      const keys = Array.from(store.keys())
        .filter((k) => k.startsWith(prefix))
        .slice(0, limit ?? 100)
        .map((name) => ({ name }));
      return { keys, list_complete: true, cursor: '' };
    }),
  } as unknown as KVNamespace;
}

describe('createLogoutToken', () => {
  it('should create a valid logout token with both sub and sid', async () => {
    const token = await createLogoutToken(
      {
        issuer: 'https://example.com',
        clientId: 'test-client',
        userId: 'user-123',
        sessionId: 'session-456',
        expirationSeconds: 120,
        includeSub: true,
        includeSid: true,
      },
      testPrivateKey,
      'kid-123'
    );

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    // Verify the token
    const { payload } = await jwtVerify(token, testPublicKey);

    expect(payload.iss).toBe('https://example.com');
    expect(payload.aud).toBe('test-client');
    expect(payload.sub).toBe('user-123');
    expect(payload.sid).toBe('session-456');
    expect(payload.jti).toBeDefined();
    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
    expect(payload.events).toEqual({
      'http://schemas.openid.net/event/backchannel-logout': {},
    });
  });

  it('should create a token with only sub claim', async () => {
    const token = await createLogoutToken(
      {
        issuer: 'https://example.com',
        clientId: 'test-client',
        userId: 'user-123',
        expirationSeconds: 120,
        includeSub: true,
        includeSid: false,
      },
      testPrivateKey,
      'kid-123'
    );

    const { payload } = await jwtVerify(token, testPublicKey);

    expect(payload.sub).toBe('user-123');
    expect(payload.sid).toBeUndefined();
  });

  it('should create a token with only sid claim', async () => {
    const token = await createLogoutToken(
      {
        issuer: 'https://example.com',
        clientId: 'test-client',
        sessionId: 'session-456',
        expirationSeconds: 120,
        includeSub: false,
        includeSid: true,
      },
      testPrivateKey,
      'kid-123'
    );

    const { payload } = await jwtVerify(token, testPublicKey);

    expect(payload.sub).toBeUndefined();
    expect(payload.sid).toBe('session-456');
  });

  it('should throw error when neither sub nor sid is provided', async () => {
    await expect(
      createLogoutToken(
        {
          issuer: 'https://example.com',
          clientId: 'test-client',
          expirationSeconds: 120,
          includeSub: false,
          includeSid: false,
        },
        testPrivateKey,
        'kid-123'
      )
    ).rejects.toThrow('Logout token must contain either sub or sid claim');
  });

  it('should set correct expiration time', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expirationSeconds = 300;

    const token = await createLogoutToken(
      {
        issuer: 'https://example.com',
        clientId: 'test-client',
        userId: 'user-123',
        expirationSeconds,
        includeSub: true,
        includeSid: false,
      },
      testPrivateKey,
      'kid-123'
    );

    const { payload } = await jwtVerify(token, testPublicKey);

    const iat = payload.iat as number;
    const exp = payload.exp as number;

    expect(exp - iat).toBe(expirationSeconds);
    expect(iat).toBeGreaterThanOrEqual(now);
    expect(iat).toBeLessThanOrEqual(now + 5); // Allow 5 second tolerance
  });
});

describe('sendLogoutToken', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return success for 200 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    });

    const result = await sendLogoutToken({
      logoutToken: 'test-token',
      backchannelLogoutUri: 'https://example.com/logout',
      timeoutMs: 5000,
    });

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/logout',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
        body: expect.stringContaining('logout_token='),
      })
    );
  });

  it('should return success for 204 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 204,
      ok: true,
    });

    const result = await sendLogoutToken({
      logoutToken: 'test-token',
      backchannelLogoutUri: 'https://example.com/logout',
      timeoutMs: 5000,
    });

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(204);
  });

  it('should return failure for 400 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 400,
      ok: false,
      text: vi.fn().mockResolvedValue('Invalid token'),
    });

    const result = await sendLogoutToken({
      logoutToken: 'test-token',
      backchannelLogoutUri: 'https://example.com/logout',
      timeoutMs: 5000,
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(400);
    expect(result.error).toContain('rejected_by_rp');
  });

  it('should return failure for 500 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 500,
      ok: false,
    });

    const result = await sendLogoutToken({
      logoutToken: 'test-token',
      backchannelLogoutUri: 'https://example.com/logout',
      timeoutMs: 5000,
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.error).toBe('HTTP 500');
  });

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await sendLogoutToken({
      logoutToken: 'test-token',
      backchannelLogoutUri: 'https://example.com/logout',
      timeoutMs: 5000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});

describe('isRetryableError', () => {
  it('should return false for 400 status', () => {
    expect(isRetryableError(400, undefined)).toBe(false);
  });

  it('should return true for 500 status', () => {
    expect(isRetryableError(500, undefined)).toBe(true);
  });

  it('should return true for 502 status', () => {
    expect(isRetryableError(502, undefined)).toBe(true);
  });

  it('should return true for 503 status', () => {
    expect(isRetryableError(503, undefined)).toBe(true);
  });

  it('should return false for rejected_by_rp error', () => {
    expect(isRetryableError(undefined, 'rejected_by_rp: Invalid token')).toBe(false);
  });

  it('should return true for network error', () => {
    expect(isRetryableError(undefined, 'Network error')).toBe(true);
  });

  it('should return true for timeout error', () => {
    expect(isRetryableError(undefined, 'timeout')).toBe(true);
  });
});

describe('calculateRetryDelay', () => {
  const config = {
    initial_delay_ms: 1000,
    max_delay_ms: 30000,
    backoff_multiplier: 2,
  };

  it('should return initial delay for first retry', () => {
    expect(calculateRetryDelay(0, config)).toBe(1000);
  });

  it('should double delay for second retry', () => {
    expect(calculateRetryDelay(1, config)).toBe(2000);
  });

  it('should respect max delay', () => {
    expect(calculateRetryDelay(10, config)).toBe(30000);
  });

  it('should calculate exponential backoff correctly', () => {
    expect(calculateRetryDelay(2, config)).toBe(4000);
    expect(calculateRetryDelay(3, config)).toBe(8000);
    expect(calculateRetryDelay(4, config)).toBe(16000);
  });
});

describe('LogoutKVHelpers', () => {
  let kv: KVNamespace;

  beforeEach(() => {
    kv = createMockKV();
  });

  describe('pending lock', () => {
    it('should check if pending lock exists', async () => {
      expect(await LogoutKVHelpers.isPending(kv, 'session-1', 'client-1')).toBe(false);

      await LogoutKVHelpers.setPending(kv, 'session-1', 'client-1', 1, 300);

      expect(await LogoutKVHelpers.isPending(kv, 'session-1', 'client-1')).toBe(true);
    });

    it('should clear pending lock', async () => {
      await LogoutKVHelpers.setPending(kv, 'session-1', 'client-1', 1, 300);
      expect(await LogoutKVHelpers.isPending(kv, 'session-1', 'client-1')).toBe(true);

      await LogoutKVHelpers.clearPending(kv, 'session-1', 'client-1');

      expect(await LogoutKVHelpers.isPending(kv, 'session-1', 'client-1')).toBe(false);
    });
  });

  describe('failure records', () => {
    it('should record and retrieve failure', async () => {
      await LogoutKVHelpers.recordFailure(kv, 'client-1', {
        statusCode: 500,
        error: 'Internal error',
        errorDetail: 'Server crashed',
      });

      const failure = await LogoutKVHelpers.getFailure(kv, 'client-1');

      expect(failure).toBeDefined();
      expect(failure?.statusCode).toBe(500);
      expect(failure?.error).toBe('Internal error');
      expect(failure?.errorDetail).toBe('Server crashed');
      expect(failure?.timestamp).toBeDefined();
    });

    it('should return null for non-existent failure', async () => {
      const failure = await LogoutKVHelpers.getFailure(kv, 'non-existent');
      expect(failure).toBeNull();
    });

    it('should clear failure record', async () => {
      await LogoutKVHelpers.recordFailure(kv, 'client-1', {
        error: 'Test error',
      });

      await LogoutKVHelpers.clearFailure(kv, 'client-1');

      const failure = await LogoutKVHelpers.getFailure(kv, 'client-1');
      expect(failure).toBeNull();
    });

    it('should list all failures', async () => {
      await LogoutKVHelpers.recordFailure(kv, 'client-1', { error: 'Error 1' });
      await LogoutKVHelpers.recordFailure(kv, 'client-2', { error: 'Error 2' });
      await LogoutKVHelpers.recordFailure(kv, 'client-3', { error: 'Error 3' });

      const failures = await LogoutKVHelpers.listFailures(kv);

      expect(failures).toHaveLength(3);
      expect(failures).toContain('client-1');
      expect(failures).toContain('client-2');
      expect(failures).toContain('client-3');
    });
  });
});

describe('createBackchannelLogoutOrchestrator', () => {
  let kv: KVNamespace;

  const mockConfig: BackchannelLogoutConfig = {
    enabled: true,
    logout_token_exp_seconds: 120,
    include_sub_claim: true,
    include_sid_claim: true,
    request_timeout_ms: 5000,
    retry: {
      max_attempts: 3,
      initial_delay_ms: 1000,
      max_delay_ms: 30000,
      backoff_multiplier: 2,
    },
    on_final_failure: 'log_only',
  };

  beforeEach(() => {
    kv = createMockKV();
    vi.resetAllMocks();
  });

  it('should send logout notifications to all clients', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    });

    const orchestrator = createBackchannelLogoutOrchestrator(kv);

    const clients: SessionClientWithDetails[] = [
      {
        id: 'sc-1',
        session_id: 'session-1',
        client_id: 'client-1',
        first_token_at: Date.now(),
        last_token_at: Date.now(),
        last_seen_at: null,
        client_name: 'Test Client 1',
        backchannel_logout_uri: 'https://client1.example.com/logout',
        backchannel_logout_session_required: false,
        frontchannel_logout_uri: null,
        frontchannel_logout_session_required: false,
      },
      {
        id: 'sc-2',
        session_id: 'session-1',
        client_id: 'client-2',
        first_token_at: Date.now(),
        last_token_at: Date.now(),
        last_seen_at: null,
        client_name: 'Test Client 2',
        backchannel_logout_uri: 'https://client2.example.com/logout',
        backchannel_logout_session_required: true,
        frontchannel_logout_uri: null,
        frontchannel_logout_session_required: false,
      },
    ];

    const results = await orchestrator.sendToAll(
      clients,
      {
        issuer: 'https://example.com',
        userId: 'user-123',
        sessionId: 'session-1',
        privateKey: testPrivateKey,
        kid: 'kid-123',
      },
      mockConfig
    );

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[0].clientId).toBe('client-1');
    expect(results[1].success).toBe(true);
    expect(results[1].clientId).toBe('client-2');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should skip clients without backchannel_logout_uri', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
    });

    const orchestrator = createBackchannelLogoutOrchestrator(kv);

    const clients: SessionClientWithDetails[] = [
      {
        id: 'sc-1',
        session_id: 'session-1',
        client_id: 'client-1',
        first_token_at: Date.now(),
        last_token_at: Date.now(),
        last_seen_at: null,
        client_name: 'Test Client 1',
        backchannel_logout_uri: null, // No URI
        backchannel_logout_session_required: false,
        frontchannel_logout_uri: null,
        frontchannel_logout_session_required: false,
      },
    ];

    const results = await orchestrator.sendToAll(
      clients,
      {
        issuer: 'https://example.com',
        userId: 'user-123',
        sessionId: 'session-1',
        privateKey: testPrivateKey,
        kid: 'kid-123',
      },
      mockConfig
    );

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should not retry when already pending', async () => {
    // Set pending lock first
    await LogoutKVHelpers.setPending(kv, 'session-1', 'client-1', 1);

    const orchestrator = createBackchannelLogoutOrchestrator(kv);

    const clients: SessionClientWithDetails[] = [
      {
        id: 'sc-1',
        session_id: 'session-1',
        client_id: 'client-1',
        first_token_at: Date.now(),
        last_token_at: Date.now(),
        last_seen_at: null,
        client_name: 'Test Client 1',
        backchannel_logout_uri: 'https://client1.example.com/logout',
        backchannel_logout_session_required: false,
        frontchannel_logout_uri: null,
        frontchannel_logout_session_required: false,
      },
    ];

    const results = await orchestrator.sendToAll(
      clients,
      {
        issuer: 'https://example.com',
        userId: 'user-123',
        sessionId: 'session-1',
        privateKey: testPrivateKey,
        kid: 'kid-123',
      },
      mockConfig
    );

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe('already_pending');
  });
});
