/**
 * ErrorFactory Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ErrorFactory,
  createError,
  createRFCError,
  Errors,
  AR_ERROR_CODES,
  RFC_ERROR_CODES,
  configureFactory,
} from '../factory';

describe('ErrorFactory', () => {
  describe('create()', () => {
    it('should create error descriptor from AR code', () => {
      const factory = new ErrorFactory();
      const error = factory.create(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);

      expect(error.code).toBe('AR000001');
      expect(error.rfcError).toBe('login_required');
      expect(error.typeSlug).toBe('auth/session-expired');
      expect(error.status).toBe(401);
      expect(error.meta.retryable).toBe(false);
      expect(error.meta.user_action).toBe('login');
      expect(error.meta.severity).toBe('warn');
    });

    it('should create localized error messages', () => {
      const factoryEn = new ErrorFactory({ locale: 'en' });
      const factoryJa = new ErrorFactory({ locale: 'ja' });

      const errorEn = factoryEn.create(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);
      const errorJa = factoryJa.create(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);

      expect(errorEn.title).toBe('Session Expired');
      expect(errorJa.title).toBe('セッション期限切れ');
    });

    it('should include state in error descriptor', () => {
      const factory = new ErrorFactory();
      const error = factory.create(AR_ERROR_CODES.AUTH_SESSION_EXPIRED, {
        state: 'abc123',
      });

      expect(error.state).toBe('abc123');
    });

    it('should replace placeholders in detail message', () => {
      const factory = new ErrorFactory();
      const error = factory.create(AR_ERROR_CODES.RATE_LIMIT_EXCEEDED, {
        variables: { retry_after: 30 },
      });

      expect(error.detail).toContain('30');
    });
  });

  describe('error_id generation', () => {
    it('should generate error ID for 5xx errors when mode is "5xx"', () => {
      const factory = new ErrorFactory({ errorIdMode: '5xx' });

      const error500 = factory.create(AR_ERROR_CODES.INTERNAL_ERROR);
      const error401 = factory.create(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);

      expect(error500.errorId).toBeDefined();
      expect(error401.errorId).toBeUndefined();
    });

    it('should generate error ID for all errors when mode is "all"', () => {
      const factory = new ErrorFactory({ errorIdMode: 'all' });

      const error500 = factory.create(AR_ERROR_CODES.INTERNAL_ERROR);
      const error401 = factory.create(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);

      expect(error500.errorId).toBeDefined();
      expect(error401.errorId).toBeDefined();
    });

    it('should not generate error ID when mode is "none"', () => {
      const factory = new ErrorFactory({ errorIdMode: 'none' });

      const error500 = factory.create(AR_ERROR_CODES.INTERNAL_ERROR);
      const error401 = factory.create(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);

      expect(error500.errorId).toBeUndefined();
      expect(error401.errorId).toBeUndefined();
    });

    it('should generate error ID for security errors when mode is "security_only"', () => {
      const factory = new ErrorFactory({ errorIdMode: 'security_only' });

      const securityError = factory.create(AR_ERROR_CODES.CLIENT_AUTH_FAILED);
      const nonSecurityError = factory.create(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);

      expect(securityError.errorId).toBeDefined();
      expect(nonSecurityError.errorId).toBeUndefined();
    });
  });

  describe('security masking', () => {
    it('should mask internal errors', () => {
      const factory = new ErrorFactory();
      const error = factory.create(AR_ERROR_CODES.USER_NOT_FOUND);

      // USER_NOT_FOUND is marked as 'internal' security level
      // Should be masked to generic server error
      expect(error.rfcError).toBe('server_error');
      expect(error.status).toBe(500);
    });

    it('should mask client authentication details', () => {
      const factory = new ErrorFactory();
      const error = factory.create(AR_ERROR_CODES.CLIENT_AUTH_FAILED);

      // CLIENT_AUTH_FAILED is 'masked' - generic message
      expect(error.detail).toBe('Client authentication failed.');
    });
  });

  describe('createFromRFC()', () => {
    it('should create error from RFC error code', () => {
      const factory = new ErrorFactory();
      const error = factory.createFromRFC(
        RFC_ERROR_CODES.INVALID_REQUEST,
        400,
        'Missing required parameter'
      );

      expect(error.rfcError).toBe('invalid_request');
      expect(error.status).toBe(400);
      expect(error.detail).toBe('Missing required parameter');
    });
  });
});

describe('Convenience functions', () => {
  beforeEach(() => {
    // Reset default factory
    configureFactory({ locale: 'en', errorIdMode: '5xx' });
  });

  describe('createError()', () => {
    it('should create error using default factory', () => {
      const error = createError(AR_ERROR_CODES.AUTH_LOGIN_REQUIRED);

      expect(error.code).toBe('AR000003');
      expect(error.rfcError).toBe('login_required');
    });
  });

  describe('createRFCError()', () => {
    it('should create RFC error using default factory', () => {
      const error = createRFCError(RFC_ERROR_CODES.ACCESS_DENIED, 403);

      expect(error.rfcError).toBe('access_denied');
      expect(error.status).toBe(403);
    });
  });

  describe('Errors namespace', () => {
    it('should provide pre-built error creators', () => {
      const sessionExpired = Errors.sessionExpired();
      expect(sessionExpired.code).toBe('AR000001');

      const loginRequired = Errors.loginRequired();
      expect(loginRequired.code).toBe('AR000003');

      const tokenExpired = Errors.tokenExpired();
      expect(tokenExpired.code).toBe('AR010002');

      const rateLimited = Errors.rateLimitExceeded(60);
      expect(rateLimited.code).toBe('AR110001');
      expect(rateLimited.detail).toContain('60');
    });
  });
});

describe('Error metadata', () => {
  it('should include correct metadata for different error types', () => {
    const factory = new ErrorFactory();

    // Auth error - not retryable, user needs to login
    const authError = factory.create(AR_ERROR_CODES.AUTH_SESSION_EXPIRED);
    expect(authError.meta.retryable).toBe(false);
    expect(authError.meta.user_action).toBe('login');

    // Rate limit error - retryable
    const rateError = factory.create(AR_ERROR_CODES.RATE_LIMIT_EXCEEDED);
    expect(rateError.meta.retryable).toBe(true);
    expect(rateError.meta.user_action).toBe('retry');

    // Internal error - retryable
    const internalError = factory.create(AR_ERROR_CODES.INTERNAL_ERROR);
    expect(internalError.meta.retryable).toBe(true);
    expect(internalError.meta.severity).toBe('error');

    // Token reuse - critical severity
    const reuseError = factory.create(AR_ERROR_CODES.TOKEN_REUSE_DETECTED);
    expect(reuseError.meta.severity).toBe('critical');
  });

  it('should include transient flag for transient errors', () => {
    const factory = new ErrorFactory();

    const providerAuthFailed = factory.create(AR_ERROR_CODES.BRIDGE_PROVIDER_AUTH_FAILED);
    expect(providerAuthFailed.meta.transient).toBe(true);
    expect(providerAuthFailed.meta.retryable).toBe(false);
  });
});
