/**
 * Error Serializer Tests
 */

import { describe, it, expect } from 'vitest';
import {
  serializeError,
  serializeToOAuth,
  serializeToProblemDetails,
  serializeToRedirect,
  determineFormat,
} from '../serializer';
import type { ErrorDescriptor } from '../types';

describe('serializeToOAuth', () => {
  const baseDescriptor: ErrorDescriptor = {
    code: 'AR000001',
    rfcError: 'login_required',
    typeSlug: 'auth/session-expired',
    title: 'Session Expired',
    detail: 'Your session has expired. Please login again.',
    status: 401,
    meta: {
      retryable: false,
      user_action: 'login',
      severity: 'warn',
    },
  };

  it('should serialize to OAuth format', async () => {
    const response = serializeToOAuth(baseDescriptor);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(body.error).toBe('login_required');
    expect(body.error_description).toBe('Your session has expired. Please login again.');
    expect(body.error_code).toBe('AR000001');
  });

  it('should include state if provided', async () => {
    const descriptorWithState: ErrorDescriptor = {
      ...baseDescriptor,
      state: 'abc123',
    };
    const response = serializeToOAuth(descriptorWithState);
    const body = await response.json();

    expect(body.state).toBe('abc123');
  });

  it('should include error_id if provided', async () => {
    const descriptorWithErrorId: ErrorDescriptor = {
      ...baseDescriptor,
      errorId: 'lxf2a1b3c4d5',
    };
    const response = serializeToOAuth(descriptorWithErrorId);
    const body = await response.json();

    expect(body.error_id).toBe('lxf2a1b3c4d5');
  });

  it('should add WWW-Authenticate header for 401 responses', () => {
    const response = serializeToOAuth(baseDescriptor);
    // RFC 6750 Section 3.1: Include error and error_description
    expect(response.headers.get('WWW-Authenticate')).toBe(
      'Bearer error="login_required", error_description="Your session has expired. Please login again."'
    );
  });

  it('should add Retry-After header when provided', () => {
    const descriptorWithRetry: ErrorDescriptor = {
      ...baseDescriptor,
      status: 429,
      retryAfter: 60,
    };
    const response = serializeToOAuth(descriptorWithRetry);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('should not include error_code for RFC errors', async () => {
    const rfcDescriptor: ErrorDescriptor = {
      ...baseDescriptor,
      code: 'RFC_INVALID_REQUEST',
    };
    const response = serializeToOAuth(rfcDescriptor);
    const body = await response.json();

    expect(body.error_code).toBeUndefined();
  });
});

describe('serializeToProblemDetails', () => {
  const baseDescriptor: ErrorDescriptor = {
    code: 'AR000001',
    rfcError: 'login_required',
    typeSlug: 'auth/session-expired',
    title: 'Session Expired',
    detail: 'Your session has expired. Please login again.',
    status: 401,
    meta: {
      retryable: false,
      user_action: 'login',
      severity: 'warn',
    },
  };

  it('should serialize to Problem Details format', async () => {
    const response = serializeToProblemDetails(baseDescriptor);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get('Content-Type')).toBe('application/problem+json');
    expect(body.type).toBe('https://authrim.com/problems/auth/session-expired');
    expect(body.title).toBe('Session Expired');
    expect(body.status).toBe(401);
    expect(body.detail).toBe('Your session has expired. Please login again.');
    expect(body.error).toBe('login_required');
    expect(body.error_code).toBe('AR000001');
  });

  it('should include error_meta', async () => {
    const response = serializeToProblemDetails(baseDescriptor);
    const body = await response.json();

    expect(body.error_meta).toEqual({
      retryable: false,
      user_action: 'login',
      severity: 'warn',
    });
  });

  it('should include instance when error_id is provided', async () => {
    const descriptorWithErrorId: ErrorDescriptor = {
      ...baseDescriptor,
      errorId: 'lxf2a1b3c4d5',
    };
    const response = serializeToProblemDetails(descriptorWithErrorId);
    const body = await response.json();

    expect(body.error_id).toBe('lxf2a1b3c4d5');
    expect(body.instance).toBe('/errors/lxf2a1b3c4d5');
  });

  it('should use custom base URL', async () => {
    const response = serializeToProblemDetails(baseDescriptor, 'https://custom.example.com');
    const body = await response.json();

    expect(body.type).toBe('https://custom.example.com/problems/auth/session-expired');
  });
});

describe('serializeToRedirect', () => {
  const baseDescriptor: ErrorDescriptor = {
    code: 'AR000001',
    rfcError: 'access_denied',
    typeSlug: 'auth/access-denied',
    title: 'Access Denied',
    detail: 'The resource owner denied the request.',
    status: 403,
    meta: {
      retryable: false,
      user_action: 'none',
      severity: 'warn',
    },
    state: 'xyz789',
  };

  it('should serialize to redirect with query parameters', () => {
    const response = serializeToRedirect(baseDescriptor, 'https://example.com/callback', 'query');

    expect(response.status).toBe(302);
    const location = response.headers.get('Location');
    expect(location).toContain('error=access_denied');
    expect(location).toContain('error_description=The+resource+owner+denied+the+request');
    expect(location).toContain('state=xyz789');
    expect(location).toContain('error_code=AR000001');
  });

  it('should serialize to redirect with fragment', () => {
    const response = serializeToRedirect(
      baseDescriptor,
      'https://example.com/callback',
      'fragment'
    );

    const location = response.headers.get('Location');
    expect(location).toContain('#error=access_denied');
  });
});

describe('determineFormat', () => {
  it('should return oauth for OIDC core endpoints', () => {
    expect(determineFormat('/token', null)).toBe('oauth');
    expect(determineFormat('/authorize', null)).toBe('oauth');
    expect(determineFormat('/userinfo', null)).toBe('oauth');
    expect(determineFormat('/introspect', null)).toBe('oauth');
    expect(determineFormat('/revoke', null)).toBe('oauth');
  });

  it('should return oauth for OIDC core endpoints regardless of Accept header', () => {
    expect(determineFormat('/token', 'application/problem+json')).toBe('oauth');
    expect(determineFormat('/authorize', 'application/problem+json')).toBe('oauth');
  });

  it('should respect Accept header for non-OIDC endpoints', () => {
    expect(determineFormat('/api/admin/users', 'application/problem+json')).toBe('problem_details');
    expect(determineFormat('/api/admin/users', 'application/json')).toBe('oauth');
  });

  it('should use default format when no Accept header', () => {
    expect(determineFormat('/api/admin/users', null, 'oauth')).toBe('oauth');
    expect(determineFormat('/api/admin/users', null, 'problem_details')).toBe('problem_details');
  });
});

describe('serializeError', () => {
  const descriptor: ErrorDescriptor = {
    code: 'AR000001',
    rfcError: 'login_required',
    typeSlug: 'auth/session-expired',
    title: 'Session Expired',
    detail: 'Your session has expired.',
    status: 401,
    meta: {
      retryable: false,
      user_action: 'login',
      severity: 'warn',
    },
  };

  it('should serialize to OAuth format when specified', async () => {
    const response = serializeError(descriptor, { format: 'oauth' });
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should serialize to Problem Details format when specified', async () => {
    const response = serializeError(descriptor, { format: 'problem_details' });
    expect(response.headers.get('Content-Type')).toBe('application/problem+json');
  });
});
