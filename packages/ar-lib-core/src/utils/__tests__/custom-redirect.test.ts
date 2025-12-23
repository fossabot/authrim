/**
 * Custom Redirect URI Validation Tests
 *
 * Tests for:
 * - validateCustomRedirectUri: single URI validation
 * - validateCustomRedirectParams: multiple parameter validation
 * - parseClientAllowedOrigins: JSON parsing with strict mode
 * - normalizeOrigin: origin normalization
 * - validateAllowedOrigins: client registration validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateCustomRedirectUri,
  validateCustomRedirectParams,
  parseClientAllowedOrigins,
  normalizeOrigin,
  validateAllowedOrigins,
} from '../custom-redirect';

describe('Custom Redirect URI Validation', () => {
  describe('validateCustomRedirectUri', () => {
    const redirectUri = 'https://app.example.com/callback';
    const allowedOrigins = ['https://admin.example.com', 'https://other.example.com'];

    describe('empty/undefined input', () => {
      it('should return valid for undefined customUri', () => {
        const result = validateCustomRedirectUri(undefined, redirectUri, []);
        expect(result.valid).toBe(true);
        expect(result.normalizedUri).toBeUndefined();
      });

      it('should return valid for empty string customUri', () => {
        const result = validateCustomRedirectUri('', redirectUri, []);
        expect(result.valid).toBe(true);
      });

      it('should return valid for whitespace-only customUri', () => {
        const result = validateCustomRedirectUri('   ', redirectUri, []);
        expect(result.valid).toBe(true);
      });
    });

    describe('same-origin validation', () => {
      it('should allow custom URI with same origin as redirect_uri', () => {
        const result = validateCustomRedirectUri('https://app.example.com/error', redirectUri, []);

        expect(result.valid).toBe(true);
        expect(result.normalizedUri).toBe('https://app.example.com/error');
        expect(result.allowedReason).toBe('same_origin');
      });

      it('should allow different path on same origin', () => {
        const result = validateCustomRedirectUri(
          'https://app.example.com/auth/failed',
          redirectUri,
          []
        );

        expect(result.valid).toBe(true);
        expect(result.allowedReason).toBe('same_origin');
      });

      it('should allow same origin with query parameters', () => {
        const result = validateCustomRedirectUri(
          'https://app.example.com/error?type=auth',
          redirectUri,
          []
        );

        expect(result.valid).toBe(true);
        expect(result.normalizedUri).toBe('https://app.example.com/error?type=auth');
      });

      it('should handle port differences (different origin)', () => {
        // Different port = different origin
        const result = validateCustomRedirectUri(
          'https://app.example.com:8443/error',
          redirectUri,
          []
        );

        // Default HTTPS port (443) vs explicit 8443 = different origins
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Origin not allowed');
      });
    });

    describe('allowlist validation', () => {
      it('should allow URI when origin is in allowed_redirect_origins', () => {
        const result = validateCustomRedirectUri(
          'https://admin.example.com/error',
          redirectUri,
          allowedOrigins
        );

        expect(result.valid).toBe(true);
        expect(result.normalizedUri).toBe('https://admin.example.com/error');
        expect(result.allowedReason).toBe('pre_registered');
      });

      it('should allow any path on pre-registered origin', () => {
        const result = validateCustomRedirectUri(
          'https://admin.example.com/deep/nested/path/error',
          redirectUri,
          allowedOrigins
        );

        expect(result.valid).toBe(true);
        expect(result.allowedReason).toBe('pre_registered');
      });

      it('should reject URI when origin is not in allowed list', () => {
        const result = validateCustomRedirectUri(
          'https://evil.com/steal',
          redirectUri,
          allowedOrigins
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Origin not allowed');
        expect(result.error).toContain('https://evil.com');
      });

      it('should be case-insensitive for origin comparison', () => {
        const result = validateCustomRedirectUri('https://ADMIN.EXAMPLE.COM/error', redirectUri, [
          'https://admin.example.com',
        ]);

        expect(result.valid).toBe(true);
        expect(result.allowedReason).toBe('pre_registered');
      });
    });

    describe('security validation', () => {
      it('should reject http:// URIs (except localhost)', () => {
        const result = validateCustomRedirectUri('http://app.example.com/error', redirectUri, []);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('HTTPS is required');
      });

      it('should allow http://localhost', () => {
        const result = validateCustomRedirectUri(
          'http://localhost:3000/error',
          'http://localhost:3000/callback',
          []
        );

        expect(result.valid).toBe(true);
        expect(result.allowedReason).toBe('same_origin');
      });

      it('should allow http://127.0.0.1', () => {
        const result = validateCustomRedirectUri(
          'http://127.0.0.1:8080/error',
          'http://127.0.0.1:8080/callback',
          []
        );

        expect(result.valid).toBe(true);
      });

      it('should reject URIs with fragment identifiers', () => {
        const result = validateCustomRedirectUri(
          'https://app.example.com/error#token=xyz',
          redirectUri,
          []
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Fragment identifiers');
      });

      it('should allow URIs with empty fragment', () => {
        // Just "#" with nothing after is OK (browsers normalize this)
        const result = validateCustomRedirectUri('https://app.example.com/error#', redirectUri, []);

        expect(result.valid).toBe(true);
      });

      it('should reject invalid URLs', () => {
        const result = validateCustomRedirectUri('not-a-valid-url', redirectUri, []);

        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid URL format');
      });

      it('should reject javascript: URLs', () => {
        const result = validateCustomRedirectUri('javascript:alert(1)', redirectUri, []);

        expect(result.valid).toBe(false);
        // Will fail as invalid URL or insecure protocol
      });

      it('should reject data: URLs', () => {
        const result = validateCustomRedirectUri(
          'data:text/html,<script>alert(1)</script>',
          redirectUri,
          []
        );

        expect(result.valid).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle invalid redirect_uri gracefully', () => {
        const result = validateCustomRedirectUri(
          'https://app.example.com/error',
          'not-a-valid-url',
          []
        );

        expect(result.valid).toBe(false);
        expect(result.error).toContain('redirect_uri is invalid');
      });

      it('should handle unicode in URLs', () => {
        const result = validateCustomRedirectUri(
          'https://app.example.com/error?name=日本語',
          redirectUri,
          []
        );

        expect(result.valid).toBe(true);
      });

      it('should handle encoded characters', () => {
        const result = validateCustomRedirectUri(
          'https://app.example.com/error%20page',
          redirectUri,
          []
        );

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateCustomRedirectParams', () => {
    const redirectUri = 'https://app.example.com/callback';
    const allowedOrigins = ['https://errors.example.com'];

    it('should validate both error_uri and cancel_uri', () => {
      const result = validateCustomRedirectParams(
        {
          error_uri: 'https://app.example.com/error',
          cancel_uri: 'https://app.example.com/cancelled',
        },
        redirectUri,
        []
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.validatedUris?.error_uri).toBe('https://app.example.com/error');
      expect(result.validatedUris?.cancel_uri).toBe('https://app.example.com/cancelled');
    });

    it('should return errors for invalid URIs', () => {
      const result = validateCustomRedirectParams(
        {
          error_uri: 'https://evil.com/error',
          cancel_uri: 'https://malicious.com/cancel',
        },
        redirectUri,
        []
      );

      expect(result.valid).toBe(false);
      expect(result.errors['error_uri']).toContain('Origin not allowed');
      expect(result.errors['cancel_uri']).toContain('Origin not allowed');
      expect(result.validatedUris).toBeUndefined();
    });

    it('should handle partial validation (one valid, one invalid)', () => {
      const result = validateCustomRedirectParams(
        {
          error_uri: 'https://app.example.com/error',
          cancel_uri: 'https://evil.com/cancel',
        },
        redirectUri,
        []
      );

      expect(result.valid).toBe(false);
      expect(result.errors['error_uri']).toBeUndefined();
      expect(result.errors['cancel_uri']).toBeDefined();
    });

    it('should handle empty params', () => {
      const result = validateCustomRedirectParams({}, redirectUri, []);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should use allowedOrigins for validation', () => {
      const result = validateCustomRedirectParams(
        {
          error_uri: 'https://errors.example.com/auth-error',
        },
        redirectUri,
        allowedOrigins
      );

      expect(result.valid).toBe(true);
      expect(result.validatedUris?.error_uri).toBe('https://errors.example.com/auth-error');
    });
  });

  describe('parseClientAllowedOrigins', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should parse valid JSON array', () => {
      const result = parseClientAllowedOrigins(
        '["https://app1.example.com", "https://app2.example.com"]'
      );

      expect(result).toEqual(['https://app1.example.com', 'https://app2.example.com']);
    });

    it('should return empty array for null', () => {
      const result = parseClientAllowedOrigins(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = parseClientAllowedOrigins('');
      expect(result).toEqual([]);
    });

    it('should return empty array for invalid JSON (strict mode)', () => {
      const result = parseClientAllowedOrigins('not-json');

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse allowed_redirect_origins')
      );
    });

    it('should return empty array for non-array JSON', () => {
      const result = parseClientAllowedOrigins('{"origin": "https://example.com"}');

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('is not an array'));
    });

    it('should filter out non-string elements', () => {
      const result = parseClientAllowedOrigins(
        '["https://valid.com", 123, null, "https://also-valid.com"]'
      );

      expect(result).toEqual(['https://valid.com', 'https://also-valid.com']);
    });

    it('should handle empty array', () => {
      const result = parseClientAllowedOrigins('[]');
      expect(result).toEqual([]);
    });
  });

  describe('normalizeOrigin', () => {
    it('should extract origin from full URL', () => {
      const result = normalizeOrigin('https://example.com/path?query=1#hash');
      expect(result).toBe('https://example.com');
    });

    it('should lowercase the origin', () => {
      const result = normalizeOrigin('HTTPS://EXAMPLE.COM');
      expect(result).toBe('https://example.com');
    });

    it('should preserve port', () => {
      const result = normalizeOrigin('https://example.com:8443');
      expect(result).toBe('https://example.com:8443');
    });

    it('should handle invalid URL gracefully', () => {
      const result = normalizeOrigin('not-a-url');
      expect(result).toBe('not-a-url');
    });

    it('should remove trailing slash from invalid URL-like string', () => {
      const result = normalizeOrigin('not-a-url/');
      expect(result).toBe('not-a-url');
    });
  });

  describe('validateAllowedOrigins', () => {
    it('should validate and normalize valid origins', () => {
      const result = validateAllowedOrigins([
        'https://app1.example.com',
        'https://app2.example.com',
      ]);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.normalizedOrigins).toEqual([
        'https://app1.example.com',
        'https://app2.example.com',
      ]);
    });

    it('should reject origins with paths', () => {
      const result = validateAllowedOrigins(['https://example.com/path']);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must not contain path');
    });

    it('should reject origins with query strings', () => {
      const result = validateAllowedOrigins(['https://example.com?query=1']);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must not contain path');
    });

    it('should reject origins with fragments', () => {
      const result = validateAllowedOrigins(['https://example.com#hash']);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must not contain path');
    });

    it('should reject non-HTTPS origins (except localhost)', () => {
      const result = validateAllowedOrigins(['http://example.com']);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('HTTPS required');
    });

    it('should allow localhost with HTTP', () => {
      const result = validateAllowedOrigins([
        'http://localhost',
        'http://localhost:3000',
        'http://127.0.0.1:8080',
      ]);

      expect(result.valid).toBe(true);
      expect(result.normalizedOrigins).toHaveLength(3);
    });

    it('should deduplicate origins', () => {
      const result = validateAllowedOrigins([
        'https://example.com',
        'https://EXAMPLE.COM',
        'https://example.com/',
      ]);

      expect(result.valid).toBe(true);
      expect(result.normalizedOrigins).toEqual(['https://example.com']);
    });

    it('should reject invalid URLs', () => {
      const result = validateAllowedOrigins(['not-a-url']);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid origin format');
    });

    it('should handle mixed valid and invalid origins', () => {
      const result = validateAllowedOrigins([
        'https://valid.example.com',
        'not-a-url',
        'https://also-valid.example.com',
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.normalizedOrigins).toEqual([
        'https://valid.example.com',
        'https://also-valid.example.com',
      ]);
    });

    it('should handle empty array', () => {
      const result = validateAllowedOrigins([]);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.normalizedOrigins).toEqual([]);
    });
  });

  describe('Open Redirect Prevention', () => {
    // These tests specifically verify Open Redirect attack prevention

    it('should prevent redirect to external domain', () => {
      const result = validateCustomRedirectUri(
        'https://evil-site.com/steal-token',
        'https://legitimate-app.com/callback',
        []
      );

      expect(result.valid).toBe(false);
    });

    it('should prevent redirect via subdomain confusion', () => {
      // evil.legitimate-app.com is NOT same origin as legitimate-app.com
      const result = validateCustomRedirectUri(
        'https://evil.legitimate-app.com/phishing',
        'https://legitimate-app.com/callback',
        []
      );

      expect(result.valid).toBe(false);
    });

    it('should prevent redirect via protocol downgrade', () => {
      const result = validateCustomRedirectUri(
        'http://legitimate-app.com/mitm',
        'https://legitimate-app.com/callback',
        []
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTPS is required');
    });

    it('should prevent redirect via port confusion', () => {
      const result = validateCustomRedirectUri(
        'https://legitimate-app.com:8443/evil',
        'https://legitimate-app.com/callback',
        []
      );

      expect(result.valid).toBe(false);
    });

    it('should prevent fragment-based attacks', () => {
      const result = validateCustomRedirectUri(
        'https://legitimate-app.com/ok#evil=https://attacker.com',
        'https://legitimate-app.com/callback',
        []
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Fragment');
    });
  });
});
