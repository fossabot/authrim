/**
 * Error Security Tests
 */

import { describe, it, expect } from 'vitest';
import {
  applySecurityMasking,
  generateErrorId,
  shouldLogFullDetails,
  sanitizeForLogging,
  getMaskedMessage,
} from '../security';
import type { ErrorDescriptor, ErrorCodeDefinition } from '../types';

describe('applySecurityMasking', () => {
  const baseDescriptor: ErrorDescriptor = {
    code: 'AR020001',
    rfcError: 'invalid_client',
    typeSlug: 'client/authentication-failed',
    title: 'Client Secret Mismatch',
    detail: 'The provided client_secret does not match the registered secret.',
    status: 401,
    meta: {
      retryable: false,
      user_action: 'update_client',
      severity: 'warn',
    },
  };

  it('should not mask public errors', () => {
    const definition: ErrorCodeDefinition = {
      code: 'AR000001',
      rfcError: 'login_required',
      typeSlug: 'auth/session-expired',
      status: 401,
      titleKey: 'auth.session_expired.title',
      detailKey: 'auth.session_expired.detail',
      meta: {
        retryable: false,
        user_action: 'login',
        severity: 'warn',
      },
      securityLevel: 'public',
    };

    const result = applySecurityMasking(baseDescriptor, definition);
    expect(result.detail).toBe(baseDescriptor.detail);
    expect(result.title).toBe(baseDescriptor.title);
  });

  it('should mask masked errors with generic message', () => {
    const definition: ErrorCodeDefinition = {
      code: 'AR020001',
      rfcError: 'invalid_client',
      typeSlug: 'client/authentication-failed',
      status: 401,
      titleKey: 'client.auth_failed.title',
      detailKey: 'client.auth_failed.detail',
      meta: {
        retryable: false,
        user_action: 'update_client',
        severity: 'warn',
      },
      securityLevel: 'masked',
    };

    const result = applySecurityMasking(baseDescriptor, definition);
    expect(result.detail).toBe('Client authentication failed.');
    expect(result.title).toBe('Client Authentication Failed');
  });

  it('should mask internal errors as server_error', () => {
    const internalDescriptor: ErrorDescriptor = {
      ...baseDescriptor,
      code: 'AR030001',
      rfcError: 'server_error',
      detail: 'User record not found in database',
    };

    const definition: ErrorCodeDefinition = {
      code: 'AR030001',
      rfcError: 'server_error',
      typeSlug: 'user/not-found',
      status: 500,
      titleKey: 'user.not_found.title',
      detailKey: 'user.not_found.detail',
      meta: {
        retryable: false,
        user_action: 'none',
        severity: 'error',
      },
      securityLevel: 'internal',
    };

    const result = applySecurityMasking(internalDescriptor, definition);
    expect(result.code).toBe('AR900001');
    expect(result.rfcError).toBe('server_error');
    expect(result.detail).toBe('An unexpected error occurred.');
    expect(result.status).toBe(500);
  });

  it('should use Japanese messages when locale is ja', () => {
    const definition: ErrorCodeDefinition = {
      code: 'AR020001',
      rfcError: 'invalid_client',
      typeSlug: 'client/authentication-failed',
      status: 401,
      titleKey: 'client.auth_failed.title',
      detailKey: 'client.auth_failed.detail',
      meta: {
        retryable: false,
        user_action: 'update_client',
        severity: 'warn',
      },
      securityLevel: 'masked',
    };

    const result = applySecurityMasking(baseDescriptor, definition, 'ja');
    expect(result.detail).toBe('クライアント認証に失敗しました。');
    expect(result.title).toBe('クライアント認証失敗');
  });
});

describe('generateErrorId', () => {
  it('should generate error ID for all errors when mode is "all"', () => {
    const id = generateErrorId('all', 'login_required', 'auth/session-expired', 401);
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id!.length).toBeGreaterThan(10);
  });

  it('should generate error ID for 5xx errors when mode is "5xx"', () => {
    const id500 = generateErrorId('5xx', 'server_error', 'internal/error', 500);
    const id401 = generateErrorId('5xx', 'login_required', 'auth/session-expired', 401);

    expect(id500).toBeDefined();
    expect(id401).toBeUndefined();
  });

  it('should generate error ID for security errors when mode is "security_only"', () => {
    const idInvalidClient = generateErrorId(
      'security_only',
      'invalid_client',
      'client/authentication-failed',
      401
    );
    const idLoginRequired = generateErrorId(
      'security_only',
      'login_required',
      'auth/session-expired',
      401
    );

    expect(idInvalidClient).toBeDefined();
    expect(idLoginRequired).toBeUndefined();
  });

  it('should match security errors by type slug', () => {
    const idBySlug = generateErrorId(
      'security_only',
      'some_error',
      'client/authentication-failed',
      401
    );
    expect(idBySlug).toBeDefined();
  });

  it('should not generate error ID when mode is "none"', () => {
    const id = generateErrorId('none', 'server_error', 'internal/error', 500);
    expect(id).toBeUndefined();
  });

  it('should generate unique IDs', () => {
    const id1 = generateErrorId('all', 'server_error', 'internal/error', 500);
    const id2 = generateErrorId('all', 'server_error', 'internal/error', 500);

    expect(id1).not.toBe(id2);
  });
});

describe('shouldLogFullDetails', () => {
  it('should allow full logging in development', () => {
    const definition: ErrorCodeDefinition = {
      code: 'AR030001',
      rfcError: 'server_error',
      typeSlug: 'user/not-found',
      status: 500,
      titleKey: 'user.not_found.title',
      detailKey: 'user.not_found.detail',
      meta: {
        retryable: false,
        user_action: 'none',
        severity: 'error',
      },
      securityLevel: 'internal',
    };

    expect(shouldLogFullDetails(definition, false)).toBe(true);
  });

  it('should only allow full logging for public errors in production', () => {
    const publicDef: ErrorCodeDefinition = {
      code: 'AR000001',
      rfcError: 'login_required',
      typeSlug: 'auth/session-expired',
      status: 401,
      titleKey: 'auth.session_expired.title',
      detailKey: 'auth.session_expired.detail',
      meta: {
        retryable: false,
        user_action: 'login',
        severity: 'warn',
      },
      securityLevel: 'public',
    };

    const maskedDef: ErrorCodeDefinition = {
      ...publicDef,
      securityLevel: 'masked',
    };

    expect(shouldLogFullDetails(publicDef, true)).toBe(true);
    expect(shouldLogFullDetails(maskedDef, true)).toBe(false);
  });
});

describe('sanitizeForLogging', () => {
  const descriptor: ErrorDescriptor = {
    code: 'AR030001',
    rfcError: 'server_error',
    typeSlug: 'user/not-found',
    title: 'User Not Found',
    detail: 'User john@example.com not found in database',
    status: 500,
    meta: {
      retryable: false,
      user_action: 'none',
      severity: 'error',
    },
    errorId: 'lxf2a1b3c4d5',
  };

  it('should include detail in development', () => {
    const sanitized = sanitizeForLogging(descriptor, false);
    expect(sanitized.detail).toBe('User john@example.com not found in database');
  });

  it('should exclude detail in production', () => {
    const sanitized = sanitizeForLogging(descriptor, true);
    expect(sanitized.detail).toBeUndefined();
    expect(sanitized.code).toBe('AR030001');
    expect(sanitized.errorId).toBe('lxf2a1b3c4d5');
  });
});

describe('getMaskedMessage', () => {
  it('should return correct masked message for known RFC errors', () => {
    const invalidClient = getMaskedMessage('invalid_client');
    expect(invalidClient.title).toBe('Client Authentication Failed');
    expect(invalidClient.detail).toBe('Client authentication failed.');

    const invalidGrant = getMaskedMessage('invalid_grant');
    expect(invalidGrant.title).toBe('Invalid Grant');

    const accessDenied = getMaskedMessage('access_denied');
    expect(accessDenied.title).toBe('Access Denied');
  });

  it('should return server_error for unknown RFC errors', () => {
    const unknown = getMaskedMessage('unknown_error');
    expect(unknown.title).toBe('Server Error');
    expect(unknown.detail).toBe('An unexpected error occurred.');
  });

  it('should return Japanese messages when locale is ja', () => {
    const invalidClient = getMaskedMessage('invalid_client', 'ja');
    expect(invalidClient.title).toBe('クライアント認証失敗');
    expect(invalidClient.detail).toBe('クライアント認証に失敗しました。');
  });
});

describe('Enumeration Attack Prevention', () => {
  /**
   * These tests verify that error messages do not leak information
   * that could help attackers enumerate valid resources.
   */

  it('should use generic messages that do not reveal resource existence', () => {
    // RFC error messages should be generic to prevent enumeration attacks
    const invalidClient = getMaskedMessage('invalid_client');
    const invalidGrant = getMaskedMessage('invalid_grant');

    // Messages should NOT contain "not found" or similar phrases
    expect(invalidClient.detail.toLowerCase()).not.toContain('not found');
    expect(invalidGrant.detail.toLowerCase()).not.toContain('not found');

    // Messages should NOT reveal specific failure reasons
    expect(invalidClient.detail.toLowerCase()).not.toContain('does not exist');
    expect(invalidGrant.detail.toLowerCase()).not.toContain('already used');
  });

  it('should mask user-related errors to prevent user enumeration', () => {
    const invalidGrant = getMaskedMessage('invalid_grant');

    // User enumeration prevention: same message for valid/invalid users
    expect(invalidGrant.detail).not.toContain('User');
    expect(invalidGrant.detail).not.toContain('user');

    // Should use generic authentication failure message
    expect(invalidGrant.detail.toLowerCase()).toContain('invalid');
  });

  it('should mask client-related errors to prevent client enumeration', () => {
    const invalidClient = getMaskedMessage('invalid_client');

    // Client enumeration prevention
    expect(invalidClient.detail).not.toContain('not found');
    expect(invalidClient.detail).not.toContain('does not exist');

    // Should use generic authentication failure message
    expect(invalidClient.detail.toLowerCase()).toContain('failed');
  });

  it('should provide identical error structure for valid and invalid resources', () => {
    // Same error code and HTTP status should be returned
    // regardless of whether the resource exists
    const baseDescriptor: ErrorDescriptor = {
      code: 'AR020001',
      rfcError: 'invalid_client',
      typeSlug: 'client/authentication-failed',
      title: 'Test',
      detail: 'Client abc123 not found', // Sensitive detail
      status: 401,
      meta: {
        retryable: false,
        user_action: 'update_client',
        severity: 'warn',
      },
    };

    const definition: ErrorCodeDefinition = {
      code: 'AR020001',
      rfcError: 'invalid_client',
      typeSlug: 'client/authentication-failed',
      status: 401,
      titleKey: 'client.auth_failed.title',
      detailKey: 'client.auth_failed.detail',
      meta: {
        retryable: false,
        user_action: 'update_client',
        severity: 'warn',
      },
      securityLevel: 'masked',
    };

    const masked = applySecurityMasking(baseDescriptor, definition);

    // Sensitive details should be removed
    expect(masked.detail).not.toContain('abc123');
    expect(masked.detail).not.toContain('not found');

    // Error structure should be consistent
    expect(masked.status).toBe(401);
    expect(masked.rfcError).toBe('invalid_client');
  });
});

describe('Security Error ID Tracking', () => {
  /**
   * Tests for security-tracked errors that should always
   * generate trace IDs for audit purposes.
   */

  const securityErrors = [
    'invalid_client',
    'invalid_grant',
    'unauthorized_client',
    'access_denied',
  ];

  const securityTypeSlugs = [
    'client/authentication-failed',
    'user/invalid-credentials',
    'user/locked',
    'token/reuse-detected',
    'rate-limit/exceeded',
    'policy/invalid-api-key',
    'admin/authentication-required',
  ];

  securityErrors.forEach((rfcError) => {
    it(`should generate error ID for security error: ${rfcError}`, () => {
      const id = generateErrorId('security_only', rfcError, 'test/slug', 401);
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });
  });

  securityTypeSlugs.forEach((typeSlug) => {
    it(`should generate error ID for security type slug: ${typeSlug}`, () => {
      const id = generateErrorId('security_only', 'some_error', typeSlug, 401);
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });
  });

  it('should NOT generate error ID for non-security errors in security_only mode', () => {
    const nonSecurityErrors = ['login_required', 'consent_required', 'interaction_required'];

    nonSecurityErrors.forEach((rfcError) => {
      const id = generateErrorId('security_only', rfcError, 'auth/session-expired', 401);
      expect(id).toBeUndefined();
    });
  });
});

describe('Production Log Sanitization', () => {
  /**
   * Tests verifying that sensitive information is not logged in production.
   */

  it('should not include PII in production logs', () => {
    const descriptorWithPII: ErrorDescriptor = {
      code: 'AR030001',
      rfcError: 'invalid_grant',
      typeSlug: 'user/invalid-credentials',
      title: 'Invalid Credentials',
      detail: 'Password for user@example.com is incorrect',
      status: 400,
      meta: {
        retryable: false,
        user_action: 'retry',
        severity: 'warn',
      },
    };

    const sanitized = sanitizeForLogging(descriptorWithPII, true);

    // Production should not log email addresses
    expect(JSON.stringify(sanitized)).not.toContain('user@example.com');
    expect(JSON.stringify(sanitized)).not.toContain('Password');

    // Should still include error identification
    expect(sanitized.code).toBe('AR030001');
    expect(sanitized.rfcError).toBe('invalid_grant');
  });

  it('should not include client secrets in production logs', () => {
    const descriptorWithSecret: ErrorDescriptor = {
      code: 'AR020001',
      rfcError: 'invalid_client',
      typeSlug: 'client/authentication-failed',
      title: 'Client Authentication Failed',
      detail: 'Client secret abc123xyz789 does not match',
      status: 401,
      meta: {
        retryable: false,
        user_action: 'update_client',
        severity: 'warn',
      },
    };

    const sanitized = sanitizeForLogging(descriptorWithSecret, true);

    // Production should not log secrets
    expect(JSON.stringify(sanitized)).not.toContain('abc123xyz789');
    expect(JSON.stringify(sanitized)).not.toContain('secret');
  });

  it('should include full details in development for debugging', () => {
    const descriptor: ErrorDescriptor = {
      code: 'AR020001',
      rfcError: 'invalid_client',
      typeSlug: 'client/authentication-failed',
      title: 'Client Authentication Failed',
      detail: 'Client secret abc123xyz789 does not match',
      status: 401,
      meta: {
        retryable: false,
        user_action: 'update_client',
        severity: 'warn',
      },
    };

    const sanitized = sanitizeForLogging(descriptor, false);

    // Development should include full details for debugging
    expect(sanitized.detail).toContain('abc123xyz789');
  });
});
