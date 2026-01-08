/**
 * Issuer URL Builder Tests
 *
 * Tests for:
 * - buildIssuerUrl: single-tenant vs multi-tenant
 * - isMultiTenantEnabled: MT mode detection
 * - validateHostHeader: Host validation
 * - extractSubdomain: subdomain extraction
 */

import { describe, it, expect } from 'vitest';
import {
  buildIssuerUrl,
  isMultiTenantEnabled,
  validateHostHeader,
  extractSubdomain,
} from '../issuer';
import type { Env } from '../../types/env';

describe('Issuer URL Builder', () => {
  describe('buildIssuerUrl', () => {
    describe('single-tenant mode', () => {
      it('should return ISSUER_URL when BASE_DOMAIN not set', () => {
        const env = {
          ISSUER_URL: 'https://auth.example.com',
        } as Env;

        const issuer = buildIssuerUrl(env);
        expect(issuer).toBe('https://auth.example.com');
      });

      it('should return ISSUER_URL when ENABLE_TENANT_ISOLATION is not "true"', () => {
        const env = {
          ISSUER_URL: 'https://auth.example.com',
          BASE_DOMAIN: 'authrim.com',
          ENABLE_TENANT_ISOLATION: 'false',
        } as Env;

        const issuer = buildIssuerUrl(env);
        expect(issuer).toBe('https://auth.example.com');
      });

      it('should ignore tenantSubdomain parameter in single-tenant mode', () => {
        const env = {
          ISSUER_URL: 'https://auth.example.com',
        } as Env;

        const issuer = buildIssuerUrl(env, 'acme');
        expect(issuer).toBe('https://auth.example.com');
      });
    });

    describe('multi-tenant mode', () => {
      const mtEnv = {
        ISSUER_URL: 'https://auth.example.com',
        BASE_DOMAIN: 'authrim.com',
        ENABLE_TENANT_ISOLATION: 'true',
      } as Env;

      it('should build issuer from subdomain + BASE_DOMAIN', () => {
        const issuer = buildIssuerUrl(mtEnv, 'acme');
        expect(issuer).toBe('https://acme.authrim.com');
      });

      it('should use default tenant ID when subdomain not provided', () => {
        const issuer = buildIssuerUrl(mtEnv);
        expect(issuer).toBe('https://default.authrim.com');
      });

      it('should handle different subdomains', () => {
        expect(buildIssuerUrl(mtEnv, 'tenant1')).toBe('https://tenant1.authrim.com');
        expect(buildIssuerUrl(mtEnv, 'company-a')).toBe('https://company-a.authrim.com');
        expect(buildIssuerUrl(mtEnv, 'dev')).toBe('https://dev.authrim.com');
      });

      it('should handle complex tenant subdomains', () => {
        // Tenant ID can include environment suffix
        expect(buildIssuerUrl(mtEnv, 'acme-prod')).toBe('https://acme-prod.authrim.com');
        expect(buildIssuerUrl(mtEnv, 'acme-staging')).toBe('https://acme-staging.authrim.com');
      });
    });
  });

  describe('isMultiTenantEnabled', () => {
    it('should return true when BASE_DOMAIN and ENABLE_TENANT_ISOLATION are set', () => {
      const env = {
        BASE_DOMAIN: 'authrim.com',
        ENABLE_TENANT_ISOLATION: 'true',
      };

      expect(isMultiTenantEnabled(env)).toBe(true);
    });

    it('should return false when BASE_DOMAIN is not set', () => {
      const env = {
        ENABLE_TENANT_ISOLATION: 'true',
      };

      expect(isMultiTenantEnabled(env)).toBe(false);
    });

    it('should return false when ENABLE_TENANT_ISOLATION is not "true"', () => {
      const env = {
        BASE_DOMAIN: 'authrim.com',
        ENABLE_TENANT_ISOLATION: 'false',
      };

      expect(isMultiTenantEnabled(env)).toBe(false);
    });

    it('should return false when ENABLE_TENANT_ISOLATION is undefined', () => {
      const env = {
        BASE_DOMAIN: 'authrim.com',
      };

      expect(isMultiTenantEnabled(env)).toBe(false);
    });

    it('should return false for empty env', () => {
      expect(isMultiTenantEnabled({})).toBe(false);
    });

    it('should be case-sensitive for ENABLE_TENANT_ISOLATION', () => {
      const env = {
        BASE_DOMAIN: 'authrim.com',
        ENABLE_TENANT_ISOLATION: 'TRUE', // Capital letters
      };

      // Only exactly "true" enables MT mode
      expect(isMultiTenantEnabled(env)).toBe(false);
    });
  });

  describe('validateHostHeader', () => {
    describe('single-tenant mode', () => {
      it('should always return valid with default tenant', () => {
        const result = validateHostHeader('auth.example.com', {
          ISSUER_URL: 'https://auth.example.com',
        });

        expect(result.valid).toBe(true);
        expect(result.tenantId).toBe('default');
        expect(result.error).toBeUndefined();
      });

      it('should use DEFAULT_TENANT_ID from env if provided', () => {
        const result = validateHostHeader('auth.example.com', {
          ISSUER_URL: 'https://auth.example.com',
          DEFAULT_TENANT_ID: 'main',
        });

        expect(result.valid).toBe(true);
        expect(result.tenantId).toBe('main');
      });

      it('should ignore host value in single-tenant mode', () => {
        const result = validateHostHeader(undefined, {
          ISSUER_URL: 'https://auth.example.com',
        });

        expect(result.valid).toBe(true);
        expect(result.tenantId).toBe('default');
      });
    });

    describe('multi-tenant mode', () => {
      const mtEnv = {
        BASE_DOMAIN: 'authrim.com',
        ENABLE_TENANT_ISOLATION: 'true',
      };

      it('should extract tenant from valid subdomain', () => {
        const result = validateHostHeader('acme.authrim.com', mtEnv);

        expect(result.valid).toBe(true);
        expect(result.tenantId).toBe('acme');
        expect(result.error).toBeUndefined();
      });

      it('should handle host with port', () => {
        const result = validateHostHeader('acme.authrim.com:443', mtEnv);

        expect(result.valid).toBe(true);
        expect(result.tenantId).toBe('acme');
      });

      it('should return error for missing Host header', () => {
        const result = validateHostHeader(undefined, mtEnv);

        expect(result.valid).toBe(false);
        expect(result.tenantId).toBeNull();
        expect(result.error).toBe('missing_host');
        expect(result.statusCode).toBe(400);
      });

      it('should return error for invalid Host format', () => {
        const result = validateHostHeader('!invalid!.authrim.com', mtEnv);

        expect(result.valid).toBe(false);
        expect(result.tenantId).toBeNull();
        expect(result.error).toBe('invalid_format');
        expect(result.statusCode).toBe(400);
      });

      it('should return error for apex domain (no subdomain)', () => {
        const result = validateHostHeader('authrim.com', mtEnv);

        expect(result.valid).toBe(false);
        expect(result.tenantId).toBeNull();
        expect(result.error).toBe('tenant_not_found');
        expect(result.statusCode).toBe(404);
      });

      it('should return error for different base domain', () => {
        const result = validateHostHeader('acme.other-domain.com', mtEnv);

        expect(result.valid).toBe(false);
        expect(result.tenantId).toBeNull();
        expect(result.error).toBe('tenant_not_found');
        expect(result.statusCode).toBe(404);
      });

      it('should handle complex tenant subdomain', () => {
        const result = validateHostHeader('acme-prod.authrim.com', mtEnv);

        expect(result.valid).toBe(true);
        expect(result.tenantId).toBe('acme-prod');
      });
    });

    describe('Host format validation', () => {
      const mtEnv = {
        BASE_DOMAIN: 'authrim.com',
        ENABLE_TENANT_ISOLATION: 'true',
      };

      it('should reject Host starting with hyphen', () => {
        const result = validateHostHeader('-invalid.authrim.com', mtEnv);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('invalid_format');
      });

      it('should reject Host ending with hyphen', () => {
        const result = validateHostHeader('invalid-.authrim.com', mtEnv);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('invalid_format');
      });

      it('should reject Host with special characters', () => {
        const result = validateHostHeader('inv@lid.authrim.com', mtEnv);

        expect(result.valid).toBe(false);
        expect(result.error).toBe('invalid_format');
      });

      it('should accept valid alphanumeric with hyphens', () => {
        const result = validateHostHeader('my-tenant-1.authrim.com', mtEnv);

        expect(result.valid).toBe(true);
        expect(result.tenantId).toBe('my-tenant-1');
      });
    });
  });

  describe('extractSubdomain', () => {
    it('should extract simple subdomain', () => {
      const subdomain = extractSubdomain('acme.authrim.com', 'authrim.com');
      expect(subdomain).toBe('acme');
    });

    it('should extract subdomain with hyphen', () => {
      const subdomain = extractSubdomain('acme-prod.authrim.com', 'authrim.com');
      expect(subdomain).toBe('acme-prod');
    });

    it('should handle host with port', () => {
      const subdomain = extractSubdomain('acme.authrim.com:8080', 'authrim.com');
      expect(subdomain).toBe('acme');
    });

    it('should return null for apex domain', () => {
      const subdomain = extractSubdomain('authrim.com', 'authrim.com');
      expect(subdomain).toBeNull();
    });

    it('should return null for different base domain', () => {
      const subdomain = extractSubdomain('acme.other.com', 'authrim.com');
      expect(subdomain).toBeNull();
    });

    it('should return null for partial base domain match', () => {
      // notauthrim.com should not match authrim.com
      const subdomain = extractSubdomain('acme.notauthrim.com', 'authrim.com');
      expect(subdomain).toBeNull();
    });

    it('should handle multi-level subdomain', () => {
      // dev.acme.authrim.com should extract "dev.acme"
      const subdomain = extractSubdomain('dev.acme.authrim.com', 'authrim.com');
      expect(subdomain).toBe('dev.acme');
    });

    it('should return null for empty hostname', () => {
      const subdomain = extractSubdomain('', 'authrim.com');
      expect(subdomain).toBeNull();
    });

    it('should handle base domain with subdomain itself', () => {
      // api.authrim.app as base domain
      const subdomain = extractSubdomain('acme.api.authrim.app', 'api.authrim.app');
      expect(subdomain).toBe('acme');
    });
  });
});
