/**
 * Scope Validation Tests
 *
 * Tests for AI scope namespace validation
 */

import { describe, it, expect } from 'vitest';
import { validateScope, validateRequestedAIScopes } from '../utils/validation';

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

  describe('AI Ephemeral Auth - requiresCapabilityScope', () => {
    it('should require at least one AI capability scope when enabled', () => {
      const result = validateScope('openid profile', {
        allowAIScopes: true,
        requiresCapabilityScope: true,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('AI capability scope is required');
    });

    it('should accept scope with ai:read when requiresCapabilityScope is true', () => {
      const result = validateScope('openid ai:read', {
        allowAIScopes: true,
        requiresCapabilityScope: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept scope with ai:write when requiresCapabilityScope is true', () => {
      const result = validateScope('openid ai:write', {
        allowAIScopes: true,
        requiresCapabilityScope: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept scope with ai:execute when requiresCapabilityScope is true', () => {
      const result = validateScope('openid ai:execute', {
        allowAIScopes: true,
        requiresCapabilityScope: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept scope with ai:admin when requiresCapabilityScope is true', () => {
      const result = validateScope('openid ai:admin', {
        allowAIScopes: true,
        requiresCapabilityScope: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept multiple AI capability scopes', () => {
      const result = validateScope('openid ai:read ai:write ai:execute', {
        allowAIScopes: true,
        requiresCapabilityScope: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should not require AI scope when requiresCapabilityScope is false', () => {
      const result = validateScope('openid profile', {
        allowAIScopes: true,
        requiresCapabilityScope: false,
      });
      expect(result.valid).toBe(true);
    });
  });
});

describe('validateRequestedAIScopes (Flat Model)', () => {
  describe('Basic Validation', () => {
    it('should validate when requested scope is in granted scopes', () => {
      const result = validateRequestedAIScopes('ai:read', 'ai:read ai:write');
      expect(result.valid).toBe(true);
    });

    it('should validate when all requested scopes are granted', () => {
      const result = validateRequestedAIScopes('ai:read ai:write', 'ai:read ai:write ai:execute');
      expect(result.valid).toBe(true);
    });

    it('should reject when requested scope is not granted', () => {
      const result = validateRequestedAIScopes('ai:execute', 'ai:read ai:write');
      expect(result.valid).toBe(false);
      expect(result.missingScopes).toContain('ai:execute');
    });

    it('should reject when some requested scopes are not granted', () => {
      const result = validateRequestedAIScopes('ai:read ai:admin', 'ai:read ai:write');
      expect(result.valid).toBe(false);
      expect(result.missingScopes).toContain('ai:admin');
      expect(result.missingScopes).not.toContain('ai:read');
    });
  });

  describe('Flat Model - No Implicit Inheritance', () => {
    it('should NOT grant ai:read when only ai:admin is granted', () => {
      const result = validateRequestedAIScopes('ai:read', 'ai:admin');
      expect(result.valid).toBe(false);
      expect(result.missingScopes).toContain('ai:read');
      expect(result.error).toContain('no implicit inheritance');
    });

    it('should NOT grant ai:write when only ai:admin is granted', () => {
      const result = validateRequestedAIScopes('ai:write', 'ai:admin');
      expect(result.valid).toBe(false);
      expect(result.missingScopes).toContain('ai:write');
    });

    it('should NOT grant ai:execute when only ai:admin is granted', () => {
      const result = validateRequestedAIScopes('ai:execute', 'ai:admin');
      expect(result.valid).toBe(false);
      expect(result.missingScopes).toContain('ai:execute');
    });

    it('should require explicit grant for all needed scopes', () => {
      // Agent needs read, write, and admin - must request all explicitly
      const result = validateRequestedAIScopes(
        'ai:read ai:write ai:admin',
        'ai:read ai:write ai:admin'
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Array Input', () => {
    it('should accept array input for requested scopes', () => {
      const result = validateRequestedAIScopes(['ai:read', 'ai:write'], 'ai:read ai:write');
      expect(result.valid).toBe(true);
    });

    it('should accept array input for granted scopes', () => {
      const result = validateRequestedAIScopes('ai:read', ['ai:read', 'ai:write']);
      expect(result.valid).toBe(true);
    });

    it('should accept array input for both', () => {
      const result = validateRequestedAIScopes(
        ['ai:read', 'ai:write'],
        ['ai:read', 'ai:write', 'ai:execute']
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Non-AI Scopes', () => {
    it('should ignore non-AI scopes in requested scopes', () => {
      const result = validateRequestedAIScopes('openid profile ai:read', 'ai:read');
      expect(result.valid).toBe(true);
    });

    it('should only check ai: prefixed scopes', () => {
      const result = validateRequestedAIScopes('openid custom:scope ai:write', 'ai:write');
      expect(result.valid).toBe(true);
    });
  });
});
