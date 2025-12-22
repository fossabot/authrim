/**
 * Microsoft Provider Configuration Unit Tests
 * Tests for Microsoft-specific OIDC configuration and validation
 */

import { describe, it, expect } from 'vitest';
import {
  MICROSOFT_ISSUER,
  MICROSOFT_DEFAULT_CONFIG,
  MICROSOFT_TENANT_LABELS,
  validateMicrosoftConfig,
  getMicrosoftIssuer,
  getMicrosoftEffectiveIssuer,
  createMicrosoftConfig,
  type MicrosoftTenantType,
} from '../providers/microsoft';
import type { UpstreamProvider } from '../types';

describe('Microsoft Provider Configuration', () => {
  describe('getMicrosoftIssuer', () => {
    it('should return common issuer by default', () => {
      const issuer = getMicrosoftIssuer();
      expect(issuer).toBe('https://login.microsoftonline.com/common/v2.0');
    });

    it('should return common issuer for "common" tenant type', () => {
      const issuer = getMicrosoftIssuer('common');
      expect(issuer).toBe('https://login.microsoftonline.com/common/v2.0');
    });

    it('should return organizations issuer for "organizations" tenant type', () => {
      const issuer = getMicrosoftIssuer('organizations');
      expect(issuer).toBe('https://login.microsoftonline.com/organizations/v2.0');
    });

    it('should return consumers issuer for "consumers" tenant type', () => {
      const issuer = getMicrosoftIssuer('consumers');
      expect(issuer).toBe('https://login.microsoftonline.com/consumers/v2.0');
    });

    it('should return tenant-specific issuer for GUID tenant ID', () => {
      const tenantId = '12345678-1234-1234-1234-123456789012';
      const issuer = getMicrosoftIssuer(tenantId);
      expect(issuer).toBe(`https://login.microsoftonline.com/${tenantId}/v2.0`);
    });

    it('should return tenant-specific issuer for domain', () => {
      const domain = 'contoso.onmicrosoft.com';
      const issuer = getMicrosoftIssuer(domain);
      expect(issuer).toBe(`https://login.microsoftonline.com/${domain}/v2.0`);
    });
  });

  describe('MICROSOFT_ISSUER constant', () => {
    it('should be set to common endpoint', () => {
      expect(MICROSOFT_ISSUER).toBe('https://login.microsoftonline.com/common/v2.0');
    });
  });

  describe('MICROSOFT_DEFAULT_CONFIG', () => {
    it('should have required OIDC fields', () => {
      expect(MICROSOFT_DEFAULT_CONFIG.name).toBe('Microsoft');
      expect(MICROSOFT_DEFAULT_CONFIG.providerType).toBe('oidc');
      expect(MICROSOFT_DEFAULT_CONFIG.issuer).toBe(MICROSOFT_ISSUER);
    });

    it('should include openid scope', () => {
      expect(MICROSOFT_DEFAULT_CONFIG.scopes).toContain('openid');
    });

    it('should include email scope', () => {
      expect(MICROSOFT_DEFAULT_CONFIG.scopes).toContain('email');
    });

    it('should include profile scope', () => {
      expect(MICROSOFT_DEFAULT_CONFIG.scopes).toContain('profile');
    });

    it('should have attribute mappings for standard OIDC claims', () => {
      const mapping = MICROSOFT_DEFAULT_CONFIG.attributeMapping!;
      expect(mapping.sub).toBe('sub');
      expect(mapping.email).toBe('email');
      expect(mapping.email_verified).toBe('email_verified');
      expect(mapping.name).toBe('name');
    });

    it('should require verified email by default', () => {
      expect(MICROSOFT_DEFAULT_CONFIG.requireEmailVerified).toBe(true);
    });

    it('should enable JIT provisioning by default', () => {
      expect(MICROSOFT_DEFAULT_CONFIG.jitProvisioning).toBe(true);
    });

    it('should enable auto-link email by default', () => {
      expect(MICROSOFT_DEFAULT_CONFIG.autoLinkEmail).toBe(true);
    });

    it('should have default tenantType in providerQuirks', () => {
      const quirks = MICROSOFT_DEFAULT_CONFIG.providerQuirks as { tenantType?: string };
      expect(quirks.tenantType).toBe('common');
    });
  });

  describe('MICROSOFT_TENANT_LABELS', () => {
    it('should have label for common tenant type', () => {
      expect(MICROSOFT_TENANT_LABELS.common).toBeDefined();
      expect(MICROSOFT_TENANT_LABELS.common.label).toBe('All accounts');
    });

    it('should have label for organizations tenant type', () => {
      expect(MICROSOFT_TENANT_LABELS.organizations).toBeDefined();
      expect(MICROSOFT_TENANT_LABELS.organizations.label).toBe('Organizational accounts only');
    });

    it('should have label for consumers tenant type', () => {
      expect(MICROSOFT_TENANT_LABELS.consumers).toBeDefined();
      expect(MICROSOFT_TENANT_LABELS.consumers.label).toBe('Personal accounts only');
    });

    it('should have label for custom tenant type', () => {
      expect(MICROSOFT_TENANT_LABELS.custom).toBeDefined();
      expect(MICROSOFT_TENANT_LABELS.custom.label).toBe('Specific tenant');
    });
  });

  describe('validateMicrosoftConfig', () => {
    const validProvider: Partial<UpstreamProvider> = {
      clientId: 'test-client-id',
      clientSecretEncrypted: 'encrypted-secret',
      scopes: 'openid email profile',
      providerQuirks: { tenantType: 'common' },
    };

    it('should pass validation with valid config', () => {
      const errors = validateMicrosoftConfig(validProvider);
      expect(errors).toHaveLength(0);
    });

    it('should fail if clientId is missing', () => {
      const provider = { ...validProvider, clientId: undefined };
      const errors = validateMicrosoftConfig(provider);
      expect(errors).toContain('clientId is required');
    });

    it('should fail if clientSecret is missing', () => {
      const provider = { ...validProvider, clientSecretEncrypted: undefined };
      const errors = validateMicrosoftConfig(provider);
      expect(errors).toContain('clientSecret is required');
    });

    it('should fail if openid scope is missing', () => {
      const provider = { ...validProvider, scopes: 'email profile' };
      const errors = validateMicrosoftConfig(provider);
      expect(errors).toContain('openid scope is required for OIDC');
    });

    describe('tenantType validation', () => {
      it('should accept "common" tenant type', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: 'common' },
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.filter((e) => e.includes('tenantType'))).toHaveLength(0);
      });

      it('should accept "organizations" tenant type', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: 'organizations' },
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.filter((e) => e.includes('tenantType'))).toHaveLength(0);
      });

      it('should accept "consumers" tenant type', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: 'consumers' },
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.filter((e) => e.includes('tenantType'))).toHaveLength(0);
      });

      it('should accept valid GUID tenant ID', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: '12345678-1234-1234-1234-123456789012' },
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.filter((e) => e.includes('tenantType'))).toHaveLength(0);
      });

      it('should accept valid GUID with uppercase letters', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: 'ABCDEF01-1234-1234-1234-123456789012' },
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.filter((e) => e.includes('tenantType'))).toHaveLength(0);
      });

      it('should accept valid domain', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: 'contoso.onmicrosoft.com' },
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.filter((e) => e.includes('tenantType'))).toHaveLength(0);
      });

      it('should accept domain with subdomain', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: 'sub.contoso.com' },
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.filter((e) => e.includes('tenantType'))).toHaveLength(0);
      });

      it('should reject invalid tenant type', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: 'invalid-tenant' },
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.some((e) => e.includes('tenantType'))).toBe(true);
      });

      it('should reject malformed GUID', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: '12345678-1234-1234-1234' }, // Missing last segment
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.some((e) => e.includes('tenantType'))).toBe(true);
      });

      it('should reject GUID with invalid characters', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: 'gggggggg-1234-1234-1234-123456789012' }, // 'g' is invalid
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.some((e) => e.includes('tenantType'))).toBe(true);
      });

      it('should reject single-label domain', () => {
        const provider = {
          ...validProvider,
          providerQuirks: { tenantType: 'localhost' }, // No TLD
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.some((e) => e.includes('tenantType'))).toBe(true);
      });

      it('should allow config without tenantType (uses default)', () => {
        const provider = {
          ...validProvider,
          providerQuirks: {},
        };
        const errors = validateMicrosoftConfig(provider);
        expect(errors.filter((e) => e.includes('tenantType'))).toHaveLength(0);
      });
    });
  });

  describe('getMicrosoftEffectiveIssuer', () => {
    it('should return default issuer when no quirks', () => {
      const provider: Partial<UpstreamProvider> = {};
      const issuer = getMicrosoftEffectiveIssuer(provider);
      expect(issuer).toBe('https://login.microsoftonline.com/common/v2.0');
    });

    it('should return issuer based on tenantType from quirks', () => {
      const provider: Partial<UpstreamProvider> = {
        providerQuirks: { tenantType: 'organizations' },
      };
      const issuer = getMicrosoftEffectiveIssuer(provider);
      expect(issuer).toBe('https://login.microsoftonline.com/organizations/v2.0');
    });

    it('should return issuer based on GUID tenantType', () => {
      const tenantId = '12345678-1234-1234-1234-123456789012';
      const provider: Partial<UpstreamProvider> = {
        providerQuirks: { tenantType: tenantId },
      };
      const issuer = getMicrosoftEffectiveIssuer(provider);
      expect(issuer).toBe(`https://login.microsoftonline.com/${tenantId}/v2.0`);
    });
  });

  describe('createMicrosoftConfig', () => {
    it('should create config with default tenantType', () => {
      const config = createMicrosoftConfig();
      expect(config.issuer).toBe('https://login.microsoftonline.com/common/v2.0');
      expect((config.providerQuirks as { tenantType?: string }).tenantType).toBe('common');
    });

    it('should create config with specified tenantType', () => {
      const config = createMicrosoftConfig('organizations');
      expect(config.issuer).toBe('https://login.microsoftonline.com/organizations/v2.0');
      expect((config.providerQuirks as { tenantType?: string }).tenantType).toBe('organizations');
    });

    it('should create config with GUID tenantType', () => {
      const tenantId = '12345678-1234-1234-1234-123456789012';
      const config = createMicrosoftConfig(tenantId);
      expect(config.issuer).toBe(`https://login.microsoftonline.com/${tenantId}/v2.0`);
      expect((config.providerQuirks as { tenantType?: string }).tenantType).toBe(tenantId);
    });

    it('should merge overrides with default config', () => {
      const config = createMicrosoftConfig('common', {
        name: 'Custom Microsoft',
        buttonText: 'Sign in with Microsoft Account',
      });
      expect(config.name).toBe('Custom Microsoft');
      expect(config.buttonText).toBe('Sign in with Microsoft Account');
      expect(config.providerType).toBe('oidc'); // From defaults
    });

    it('should preserve default attribute mapping', () => {
      const config = createMicrosoftConfig();
      expect(config.attributeMapping).toBeDefined();
      expect(config.attributeMapping?.sub).toBe('sub');
      expect(config.attributeMapping?.email).toBe('email');
    });
  });

  describe('Microsoft issuer pattern validation (security)', () => {
    // These tests validate the issuer pattern that would be returned in ID tokens
    // The pattern is: https://login.microsoftonline.com/{tenant-id}/v2.0

    const validMicrosoftIssuerPattern =
      /^https:\/\/login\.microsoftonline\.com\/[a-f0-9-]+\/v2\.0$/i;

    it('should match valid Microsoft issuer with GUID', () => {
      const issuer = 'https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012/v2.0';
      expect(validMicrosoftIssuerPattern.test(issuer)).toBe(true);
    });

    it('should match valid Microsoft issuer with uppercase GUID', () => {
      const issuer = 'https://login.microsoftonline.com/ABCDEF01-1234-1234-1234-123456789012/v2.0';
      expect(validMicrosoftIssuerPattern.test(issuer)).toBe(true);
    });

    it('should NOT match issuer without v2.0', () => {
      const issuer = 'https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012';
      expect(validMicrosoftIssuerPattern.test(issuer)).toBe(false);
    });

    it('should NOT match issuer with different hostname', () => {
      const issuer = 'https://evil.com/12345678-1234-1234-1234-123456789012/v2.0';
      expect(validMicrosoftIssuerPattern.test(issuer)).toBe(false);
    });

    it('should NOT match issuer with subdomain attack', () => {
      const issuer =
        'https://evil.login.microsoftonline.com/12345678-1234-1234-1234-123456789012/v2.0';
      expect(validMicrosoftIssuerPattern.test(issuer)).toBe(false);
    });

    it('should NOT match issuer with path injection', () => {
      const issuer =
        'https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012/v2.0/extra';
      expect(validMicrosoftIssuerPattern.test(issuer)).toBe(false);
    });

    it('should NOT match issuer with HTTP (non-HTTPS)', () => {
      const issuer = 'http://login.microsoftonline.com/12345678-1234-1234-1234-123456789012/v2.0';
      expect(validMicrosoftIssuerPattern.test(issuer)).toBe(false);
    });

    it('should NOT match issuer with query string', () => {
      const issuer =
        'https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012/v2.0?foo=bar';
      expect(validMicrosoftIssuerPattern.test(issuer)).toBe(false);
    });
  });
});
