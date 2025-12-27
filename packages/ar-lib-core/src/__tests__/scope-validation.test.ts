/**
 * Scope Validation Tests
 *
 * Tests for AI scope namespace validation
 */

import { describe, it, expect } from 'vitest';
import { validateScope } from '../utils/validation';

describe('Scope Validation with AI Scopes', () => {
  describe('Standard Scopes', () => {
    it('should validate standard scopes', () => {
      const result = validateScope('openid profile email');
      expect(result.valid).toBe(true);
    });

    it('should validate openid scope alone', () => {
      const result = validateScope('openid');
      expect(result.valid).toBe(true);
    });

    it('should reject empty scope', () => {
      const result = validateScope('');
      expect(result.valid).toBe(false);
    });
  });

  describe('AI Scopes (Default Disabled)', () => {
    it('should reject ai:read scope by default', () => {
      const result = validateScope('openid ai:read');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('AI scope');
    });

    it('should reject ai:write scope by default', () => {
      const result = validateScope('openid ai:write');
      expect(result.valid).toBe(false);
    });

    it('should reject ai:execute scope by default', () => {
      const result = validateScope('openid ai:execute');
      expect(result.valid).toBe(false);
    });

    it('should reject ai:admin scope by default', () => {
      const result = validateScope('openid ai:admin');
      expect(result.valid).toBe(false);
    });

    it('should reject custom ai: namespace scope', () => {
      const result = validateScope('openid ai:custom');
      expect(result.valid).toBe(false);
    });
  });

  describe('AI Scopes (When Enabled)', () => {
    it('should allow ai:read when AI scopes are enabled', () => {
      const result = validateScope('openid ai:read', {
        allowAIScopes: true,
        requireOpenID: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should allow ai:write when AI scopes are enabled', () => {
      const result = validateScope('openid ai:write', {
        allowAIScopes: true,
        requireOpenID: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should allow ai:execute when AI scopes are enabled', () => {
      const result = validateScope('openid ai:execute', {
        allowAIScopes: true,
        requireOpenID: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should allow ai:admin when AI scopes are enabled', () => {
      const result = validateScope('openid ai:admin', {
        allowAIScopes: true,
        requireOpenID: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should allow multiple AI scopes when enabled', () => {
      const result = validateScope('openid ai:read ai:write ai:execute', {
        allowAIScopes: true,
        requireOpenID: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should allow mixing standard and AI scopes when enabled', () => {
      const result = validateScope('openid profile ai:read email', {
        allowAIScopes: true,
        requireOpenID: true,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('Reserved Namespaces', () => {
    it('should reject system: namespace', () => {
      const result = validateScope('openid system:internal');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Reserved namespace');
    });

    it('should reject internal: namespace', () => {
      const result = validateScope('openid internal:debug');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Reserved namespace');
    });

    it('should reject authrim: namespace', () => {
      const result = validateScope('openid authrim:custom');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Reserved namespace');
    });
  });

  describe('Edge Cases', () => {
    it('should handle scope with only whitespace correctly', () => {
      const result = validateScope('   ');
      expect(result.valid).toBe(false);
    });

    it('should handle scope with multiple spaces between scopes', () => {
      const result = validateScope('openid   profile   email');
      expect(result.valid).toBe(true);
    });

    it('should handle undefined scope', () => {
      const result = validateScope(undefined);
      expect(result.valid).toBe(false);
    });

    it('should reject scopes that look like ai: but are not valid', () => {
      const result = validateScope('openid ai:', {
        allowAIScopes: true,
        requireOpenID: true,
      });
      expect(result.valid).toBe(false);
    });
  });
});
