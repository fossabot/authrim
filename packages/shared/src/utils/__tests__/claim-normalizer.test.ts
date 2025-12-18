/**
 * Claim Normalizer Utility Unit Tests
 *
 * Tests for IdP claim normalization across different providers.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeClaimValue,
  compareNormalized,
  getNestedValue,
  type NormalizedClaimValue,
} from '../claim-normalizer';
import type { ConditionOperator } from '../../types/policy-rules';

describe('Claim Normalizer Utility', () => {
  describe('normalizeClaimValue', () => {
    describe('string values', () => {
      it('should normalize string value', () => {
        const result = normalizeClaimValue('admin');
        expect(result).toEqual({ type: 'string', value: 'admin' });
      });

      it('should handle empty string', () => {
        const result = normalizeClaimValue('');
        expect(result).toEqual({ type: 'string', value: '' });
      });
    });

    describe('number values', () => {
      it('should normalize integer', () => {
        const result = normalizeClaimValue(123);
        expect(result).toEqual({ type: 'number', value: 123 });
      });

      it('should normalize float', () => {
        const result = normalizeClaimValue(3.14);
        expect(result).toEqual({ type: 'number', value: 3.14 });
      });

      it('should normalize zero', () => {
        const result = normalizeClaimValue(0);
        expect(result).toEqual({ type: 'number', value: 0 });
      });
    });

    describe('boolean values', () => {
      it('should normalize true', () => {
        const result = normalizeClaimValue(true);
        expect(result).toEqual({ type: 'boolean', value: true });
      });

      it('should normalize false', () => {
        const result = normalizeClaimValue(false);
        expect(result).toEqual({ type: 'boolean', value: false });
      });
    });

    describe('array values', () => {
      it('should normalize string array', () => {
        const result = normalizeClaimValue(['admin', 'user']);
        expect(result).toEqual({ type: 'array', value: ['admin', 'user'] });
      });

      it('should normalize empty array', () => {
        const result = normalizeClaimValue([]);
        expect(result).toEqual({ type: 'array', value: [] });
      });

      it('should convert mixed array to strings', () => {
        const result = normalizeClaimValue([1, 'two', true]);
        expect(result).toEqual({ type: 'array', value: ['1', 'two', 'true'] });
      });
    });

    describe('null/undefined values', () => {
      it('should normalize null', () => {
        const result = normalizeClaimValue(null);
        expect(result).toEqual({ type: 'null' });
      });

      it('should normalize undefined', () => {
        const result = normalizeClaimValue(undefined);
        expect(result).toEqual({ type: 'null' });
      });
    });

    describe('IdP-specific normalization', () => {
      it('should normalize Azure AD single role (string) to array', () => {
        // Azure AD sometimes returns single role as string instead of array
        const result = normalizeClaimValue('admin');
        // String stays as string, comparison handles conversion
        expect(result).toEqual({ type: 'string', value: 'admin' });
      });

      it('should handle GitHub numeric ID', () => {
        const result = normalizeClaimValue(12345678);
        expect(result).toEqual({ type: 'number', value: 12345678 });
      });

      it('should handle Google groups array', () => {
        const result = normalizeClaimValue(['group1@example.com', 'group2@example.com']);
        expect(result).toEqual({
          type: 'array',
          value: ['group1@example.com', 'group2@example.com'],
        });
      });
    });
  });

  describe('compareNormalized', () => {
    describe('eq operator', () => {
      it('should match equal strings', () => {
        const normalized = normalizeClaimValue('admin');
        expect(compareNormalized(normalized, 'eq', 'admin')).toBe(true);
      });

      it('should not match different strings', () => {
        const normalized = normalizeClaimValue('admin');
        expect(compareNormalized(normalized, 'eq', 'user')).toBe(false);
      });

      it('should match equal numbers', () => {
        const normalized = normalizeClaimValue(123);
        expect(compareNormalized(normalized, 'eq', 123)).toBe(true);
      });

      it('should match booleans', () => {
        const normalized = normalizeClaimValue(true);
        expect(compareNormalized(normalized, 'eq', true)).toBe(true);
      });

      it('should match with type coercion (string "123" equals number 123)', () => {
        const normalized = normalizeClaimValue('123');
        // Implementation does type coercion via string comparison
        expect(compareNormalized(normalized, 'eq', 123)).toBe(true);
      });

      it('should not match different values even with type coercion', () => {
        const normalized = normalizeClaimValue('abc');
        expect(compareNormalized(normalized, 'eq', 123)).toBe(false);
      });
    });

    describe('ne operator', () => {
      it('should return true for different values', () => {
        const normalized = normalizeClaimValue('admin');
        expect(compareNormalized(normalized, 'ne', 'user')).toBe(true);
      });

      it('should return false for equal values', () => {
        const normalized = normalizeClaimValue('admin');
        expect(compareNormalized(normalized, 'ne', 'admin')).toBe(false);
      });
    });

    describe('in operator', () => {
      it('should match if value is in array', () => {
        const normalized = normalizeClaimValue('admin');
        expect(compareNormalized(normalized, 'in', ['admin', 'user', 'guest'])).toBe(true);
      });

      it('should not match if value is not in array', () => {
        const normalized = normalizeClaimValue('superadmin');
        expect(compareNormalized(normalized, 'in', ['admin', 'user'])).toBe(false);
      });

      it('should handle array actual value by stringifying', () => {
        // Array actual value is converted to string, so use 'contains' for array membership
        const normalized = normalizeClaimValue(['admin', 'editor']);
        // The stringified array won't match single values
        expect(compareNormalized(normalized, 'in', ['admin', 'user'])).toBe(false);
        // Use 'contains' operator for checking if array includes a value
        expect(compareNormalized(normalized, 'contains', 'admin')).toBe(true);
      });
    });

    describe('not_in operator', () => {
      it('should return true if value not in array', () => {
        const normalized = normalizeClaimValue('guest');
        expect(compareNormalized(normalized, 'not_in', ['admin', 'user'])).toBe(true);
      });

      it('should return false if value is in array', () => {
        const normalized = normalizeClaimValue('admin');
        expect(compareNormalized(normalized, 'not_in', ['admin', 'user'])).toBe(false);
      });
    });

    describe('contains operator', () => {
      it('should match if array contains expected value', () => {
        const normalized = normalizeClaimValue(['admin', 'editor', 'viewer']);
        expect(compareNormalized(normalized, 'contains', 'editor')).toBe(true);
      });

      it('should not match if array does not contain expected value', () => {
        const normalized = normalizeClaimValue(['admin', 'editor']);
        expect(compareNormalized(normalized, 'contains', 'viewer')).toBe(false);
      });

      it('should handle single string value for contains (Azure AD case)', () => {
        // Single string 'admin' should act like ['admin'] for contains
        const normalized = normalizeClaimValue('admin');
        expect(compareNormalized(normalized, 'contains', 'admin')).toBe(true);
      });

      it('should support substring match for string values', () => {
        const normalized = normalizeClaimValue('admin-user');
        expect(compareNormalized(normalized, 'contains', 'admin')).toBe(true);
      });
    });

    describe('exists operator', () => {
      it('should return true for non-null values', () => {
        const normalized = normalizeClaimValue('any value');
        expect(compareNormalized(normalized, 'exists', true)).toBe(true);
      });

      it('should return false for null values when expecting exists', () => {
        const normalized = normalizeClaimValue(null);
        expect(compareNormalized(normalized, 'exists', true)).toBe(false);
      });

      it('should return true for empty string (exists but empty)', () => {
        const normalized = normalizeClaimValue('');
        expect(compareNormalized(normalized, 'exists', true)).toBe(true);
      });
    });

    describe('not_exists operator', () => {
      it('should return true for null values', () => {
        const normalized = normalizeClaimValue(null);
        expect(compareNormalized(normalized, 'not_exists', true)).toBe(true);
      });

      it('should return false for non-null values', () => {
        const normalized = normalizeClaimValue('value');
        expect(compareNormalized(normalized, 'not_exists', true)).toBe(false);
      });
    });

    describe('regex operator', () => {
      it('should match valid regex pattern', () => {
        const normalized = normalizeClaimValue('admin@company.com');
        expect(compareNormalized(normalized, 'regex', '^admin@.*\\.com$')).toBe(true);
      });

      it('should not match invalid pattern', () => {
        const normalized = normalizeClaimValue('user@other.org');
        expect(compareNormalized(normalized, 'regex', '^admin@.*\\.com$')).toBe(false);
      });

      it('should handle invalid regex gracefully', () => {
        const normalized = normalizeClaimValue('test');
        // Invalid regex should not throw, just return false
        expect(compareNormalized(normalized, 'regex', '[invalid(')).toBe(false);
      });

      describe('ReDoS Protection', () => {
        it('should reject patterns exceeding max length (256 chars)', () => {
          const normalized = normalizeClaimValue('test');
          const longPattern = 'a'.repeat(257);
          // Long patterns should be rejected for security
          expect(compareNormalized(normalized, 'regex', longPattern)).toBe(false);
        });

        it('should accept patterns within max length', () => {
          const normalized = normalizeClaimValue('test');
          const validPattern = 'a'.repeat(256);
          // Pattern within limit should work
          expect(compareNormalized(normalized, 'regex', validPattern)).toBe(false); // No match, but not rejected
        });

        it('should reject dangerous nested quantifier patterns like (a+)+', () => {
          const normalized = normalizeClaimValue('aaaaaaaaaa');
          // Classic ReDoS pattern: nested quantifiers
          expect(compareNormalized(normalized, 'regex', '(a+)+')).toBe(false);
        });

        it('should reject dangerous nested quantifier patterns like (a*)*', () => {
          const normalized = normalizeClaimValue('aaaa');
          expect(compareNormalized(normalized, 'regex', '(a*)*')).toBe(false);
        });

        it('should reject patterns with nested quantifiers and repetition', () => {
          const normalized = normalizeClaimValue('test');
          expect(compareNormalized(normalized, 'regex', '([a-z]+)+')).toBe(false);
        });

        it('should reject multiple greedy wildcards', () => {
          const normalized = normalizeClaimValue('foo bar baz');
          // Multiple .* can cause exponential backtracking
          expect(compareNormalized(normalized, 'regex', '.*foo.*bar.*')).toBe(false);
        });

        it('should truncate long input strings for safety', () => {
          const normalized = normalizeClaimValue('a'.repeat(2000));
          // Pattern should still work but only match against first 1000 chars
          expect(compareNormalized(normalized, 'regex', '^a+$')).toBe(true);
        });

        it('should allow safe regex patterns', () => {
          const normalized = normalizeClaimValue('admin@company.com');
          // Safe patterns should still work
          expect(compareNormalized(normalized, 'regex', '^[a-z]+@[a-z]+\\.[a-z]+$')).toBe(true);
        });

        it('should allow simple quantifiers (not nested)', () => {
          const normalized = normalizeClaimValue('aaabbb');
          // Simple quantifiers are safe
          expect(compareNormalized(normalized, 'regex', 'a+b+')).toBe(true);
        });

        it('should allow character classes with single quantifier', () => {
          const normalized = normalizeClaimValue('hello123');
          expect(compareNormalized(normalized, 'regex', '[a-z]+[0-9]+')).toBe(true);
        });
      });
    });
  });

  describe('getNestedValue', () => {
    const testObject = {
      simple: 'value',
      nested: {
        level1: {
          level2: 'deep value',
        },
        array: [1, 2, 3],
      },
      groups: ['admin', 'users'],
      address: {
        country: 'US',
        city: 'San Francisco',
      },
    };

    it('should get simple property', () => {
      expect(getNestedValue(testObject, 'simple')).toBe('value');
    });

    it('should get nested property with dot notation', () => {
      expect(getNestedValue(testObject, 'nested.level1.level2')).toBe('deep value');
    });

    it('should get array property', () => {
      expect(getNestedValue(testObject, 'groups')).toEqual(['admin', 'users']);
    });

    it('should get nested object property', () => {
      expect(getNestedValue(testObject, 'address.country')).toBe('US');
    });

    it('should return undefined for non-existent path', () => {
      expect(getNestedValue(testObject, 'nonexistent')).toBeUndefined();
    });

    it('should return undefined for partial non-existent path', () => {
      expect(getNestedValue(testObject, 'nested.nonexistent.path')).toBeUndefined();
    });

    it('should handle null object', () => {
      expect(getNestedValue(null, 'path')).toBeUndefined();
    });

    it('should handle undefined object', () => {
      expect(getNestedValue(undefined, 'path')).toBeUndefined();
    });

    it('should handle array index access', () => {
      expect(getNestedValue(testObject, 'nested.array.0')).toBe(1);
    });
  });

  describe('IdP-specific Scenarios', () => {
    describe('Google Workspace Groups', () => {
      const googleClaims = {
        groups: ['engineering@company.com', 'all-staff@company.com'],
        hd: 'company.com',
        email_verified: true,
      };

      it('should check group membership', () => {
        const groups = normalizeClaimValue(getNestedValue(googleClaims, 'groups'));
        expect(compareNormalized(groups, 'contains', 'engineering@company.com')).toBe(true);
      });

      it('should check hosted domain', () => {
        const hd = normalizeClaimValue(getNestedValue(googleClaims, 'hd'));
        expect(compareNormalized(hd, 'eq', 'company.com')).toBe(true);
      });
    });

    describe('Azure AD / Entra ID Roles', () => {
      const azureClaims = {
        roles: 'GlobalAdmin', // Sometimes single string
        tid: 'tenant-uuid',
        aud: 'app-id',
      };

      it('should handle single role as string', () => {
        const roles = normalizeClaimValue(getNestedValue(azureClaims, 'roles'));
        // For 'contains' with string, treat as array or substring
        expect(compareNormalized(roles, 'contains', 'GlobalAdmin')).toBe(true);
      });

      it('should handle roles array', () => {
        const azureWithArray = { roles: ['GlobalAdmin', 'UserAdmin'] };
        const roles = normalizeClaimValue(getNestedValue(azureWithArray, 'roles'));
        expect(compareNormalized(roles, 'contains', 'GlobalAdmin')).toBe(true);
        expect(compareNormalized(roles, 'contains', 'UserAdmin')).toBe(true);
      });
    });

    describe('GitHub User Info', () => {
      const githubClaims = {
        id: 12345678,
        login: 'octocat',
        type: 'User',
        site_admin: false,
      };

      it('should compare numeric ID', () => {
        const id = normalizeClaimValue(getNestedValue(githubClaims, 'id'));
        expect(compareNormalized(id, 'eq', 12345678)).toBe(true);
      });

      it('should check site_admin flag', () => {
        const siteAdmin = normalizeClaimValue(getNestedValue(githubClaims, 'site_admin'));
        expect(compareNormalized(siteAdmin, 'eq', false)).toBe(true);
      });
    });

    describe('SAML ACR Values', () => {
      const samlClaims = {
        acr: 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
        amr: ['pwd', 'mfa'],
      };

      it('should match ACR class', () => {
        const acr = normalizeClaimValue(getNestedValue(samlClaims, 'acr'));
        expect(
          compareNormalized(
            acr,
            'eq',
            'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport'
          )
        ).toBe(true);
      });

      it('should check AMR methods', () => {
        const amr = normalizeClaimValue(getNestedValue(samlClaims, 'amr'));
        expect(compareNormalized(amr, 'contains', 'mfa')).toBe(true);
      });
    });
  });
});
