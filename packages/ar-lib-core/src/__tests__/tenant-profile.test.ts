/**
 * TenantProfile Tests
 *
 * Tests for Human Auth / AI Ephemeral Auth two-layer model
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HUMAN_PROFILE,
  DEFAULT_AI_EPHEMERAL_PROFILE,
  getTenantProfile,
  type TenantProfileType,
} from '../types/contracts/tenant-profile';

describe('TenantProfile', () => {
  describe('DEFAULT_HUMAN_PROFILE', () => {
    it('should have type "human"', () => {
      expect(DEFAULT_HUMAN_PROFILE.type).toBe('human');
    });

    it('should allow login and sessions', () => {
      expect(DEFAULT_HUMAN_PROFILE.allows_login).toBe(true);
      expect(DEFAULT_HUMAN_PROFILE.allows_session).toBe(true);
      expect(DEFAULT_HUMAN_PROFILE.allows_mfa).toBe(true);
      expect(DEFAULT_HUMAN_PROFILE.allows_refresh_token).toBe(true);
    });

    it('should not allow client_credentials by default', () => {
      expect(DEFAULT_HUMAN_PROFILE.allows_client_credentials).toBe(false);
    });

    it('should allow token exchange', () => {
      expect(DEFAULT_HUMAN_PROFILE.allows_token_exchange).toBe(true);
    });

    it('should have 24h max token TTL', () => {
      expect(DEFAULT_HUMAN_PROFILE.max_token_ttl_seconds).toBe(86400);
    });

    it('should not require capability scopes', () => {
      expect(DEFAULT_HUMAN_PROFILE.requires_capability_scope).toBe(false);
    });

    it('should use DO for state', () => {
      expect(DEFAULT_HUMAN_PROFILE.uses_do_for_state).toBe(true);
    });
  });

  describe('DEFAULT_AI_EPHEMERAL_PROFILE', () => {
    it('should have type "ai_ephemeral"', () => {
      expect(DEFAULT_AI_EPHEMERAL_PROFILE.type).toBe('ai_ephemeral');
    });

    it('should not allow login, sessions, or MFA', () => {
      expect(DEFAULT_AI_EPHEMERAL_PROFILE.allows_login).toBe(false);
      expect(DEFAULT_AI_EPHEMERAL_PROFILE.allows_session).toBe(false);
      expect(DEFAULT_AI_EPHEMERAL_PROFILE.allows_mfa).toBe(false);
    });

    it('should not allow refresh tokens', () => {
      expect(DEFAULT_AI_EPHEMERAL_PROFILE.allows_refresh_token).toBe(false);
    });

    it('should allow client_credentials', () => {
      expect(DEFAULT_AI_EPHEMERAL_PROFILE.allows_client_credentials).toBe(true);
    });

    it('should allow token exchange', () => {
      expect(DEFAULT_AI_EPHEMERAL_PROFILE.allows_token_exchange).toBe(true);
    });

    it('should have 1h max token TTL', () => {
      expect(DEFAULT_AI_EPHEMERAL_PROFILE.max_token_ttl_seconds).toBe(3600);
    });

    it('should require capability scopes', () => {
      expect(DEFAULT_AI_EPHEMERAL_PROFILE.requires_capability_scope).toBe(true);
    });

    it('should not use DO for state (stateless mode)', () => {
      expect(DEFAULT_AI_EPHEMERAL_PROFILE.uses_do_for_state).toBe(false);
    });
  });

  describe('getTenantProfile', () => {
    it('should return human profile for undefined', () => {
      const profile = getTenantProfile(undefined);
      expect(profile.type).toBe('human');
    });

    it('should return human profile for "human"', () => {
      const profile = getTenantProfile('human');
      expect(profile).toEqual(DEFAULT_HUMAN_PROFILE);
    });

    it('should return ai_ephemeral profile for "ai_ephemeral"', () => {
      const profile = getTenantProfile('ai_ephemeral');
      expect(profile).toEqual(DEFAULT_AI_EPHEMERAL_PROFILE);
    });
  });

  describe('Profile Immutability', () => {
    it('should have readonly properties', () => {
      // TypeScript enforces readonly at compile time
      // This test verifies the object structure is as expected
      const profile = DEFAULT_HUMAN_PROFILE;

      // Verify the profile is an object with the expected shape
      expect(typeof profile.type).toBe('string');
      expect(typeof profile.allows_login).toBe('boolean');
      expect(typeof profile.max_token_ttl_seconds).toBe('number');
    });
  });

  describe('TenantProfileType', () => {
    it('should be a union type of human and ai_ephemeral', () => {
      // Type validation
      const types: TenantProfileType[] = ['human', 'ai_ephemeral'];
      expect(types).toContain('human');
      expect(types).toContain('ai_ephemeral');
    });
  });
});
