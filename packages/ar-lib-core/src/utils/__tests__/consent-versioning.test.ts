import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCurrentPolicyVersions,
  checkRequiresReconsent,
  recordConsentHistory,
  upgradeConsentVersion,
  createPolicyVersion,
  listPolicyVersions,
} from '../consent-versioning';
import type { DatabaseAdapter } from '../../db';

/**
 * Consent Versioning Utility Tests
 *
 * Tests for GDPR Article 7 compliant policy version tracking and re-consent detection.
 *
 * @see packages/ar-lib-core/src/utils/consent-versioning.ts
 */

/**
 * Helper to create mock database adapter
 */
function createMockAdapter(queryResults: unknown[] = []): DatabaseAdapter & {
  mockQuery: ReturnType<typeof vi.fn>;
  mockExecute: ReturnType<typeof vi.fn>;
} {
  const mockQuery = vi.fn().mockResolvedValue(queryResults);
  const mockExecute = vi.fn().mockResolvedValue(undefined);

  return {
    query: mockQuery,
    execute: mockExecute,
    transaction: vi.fn(),
    batch: vi.fn(),
    mockQuery,
    mockExecute,
  } as unknown as DatabaseAdapter & {
    mockQuery: ReturnType<typeof vi.fn>;
    mockExecute: ReturnType<typeof vi.fn>;
  };
}

describe('consent-versioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock crypto.randomUUID
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-12345');
  });

  describe('getCurrentPolicyVersions', () => {
    it('should return null when no policy versions exist', async () => {
      const adapter = createMockAdapter([]);

      const result = await getCurrentPolicyVersions(adapter, 'tenant-1');

      expect(result).toBeNull();
      expect(adapter.mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM consent_policy_versions'),
        expect.any(Array)
      );
    });

    it('should return privacy policy version', async () => {
      const adapter = createMockAdapter([
        {
          policy_type: 'privacy_policy',
          version: 'v1.0.0',
          policy_uri: 'https://example.com/privacy',
          effective_at: 1700000000000,
        },
      ]);

      const result = await getCurrentPolicyVersions(adapter, 'tenant-1');

      expect(result).toEqual({
        privacyPolicy: {
          version: 'v1.0.0',
          policyType: 'privacy_policy',
          effectiveAt: 1700000000000,
          policyUri: 'https://example.com/privacy',
        },
      });
    });

    it('should return multiple policy types', async () => {
      const adapter = createMockAdapter([
        {
          policy_type: 'privacy_policy',
          version: 'v2.0.0',
          policy_uri: 'https://example.com/privacy',
          effective_at: 1700000000000,
        },
        {
          policy_type: 'terms_of_service',
          version: 'v1.5.0',
          policy_uri: 'https://example.com/tos',
          effective_at: 1700000000000,
        },
        {
          policy_type: 'cookie_policy',
          version: 'v1.0.0',
          policy_uri: null,
          effective_at: 1699000000000,
        },
      ]);

      const result = await getCurrentPolicyVersions(adapter, 'tenant-1');

      expect(result).toEqual({
        privacyPolicy: {
          version: 'v2.0.0',
          policyType: 'privacy_policy',
          effectiveAt: 1700000000000,
          policyUri: 'https://example.com/privacy',
        },
        termsOfService: {
          version: 'v1.5.0',
          policyType: 'terms_of_service',
          effectiveAt: 1700000000000,
          policyUri: 'https://example.com/tos',
        },
        cookiePolicy: {
          version: 'v1.0.0',
          policyType: 'cookie_policy',
          effectiveAt: 1699000000000,
          policyUri: undefined,
        },
      });
    });

    it('should return only the latest version for each policy type', async () => {
      // Results ordered by effective_at DESC
      const adapter = createMockAdapter([
        {
          policy_type: 'privacy_policy',
          version: 'v2.0.0', // Latest
          policy_uri: null,
          effective_at: 1700000000000,
        },
        {
          policy_type: 'privacy_policy',
          version: 'v1.0.0', // Older, should be skipped
          policy_uri: null,
          effective_at: 1690000000000,
        },
      ]);

      const result = await getCurrentPolicyVersions(adapter, 'tenant-1');

      expect(result?.privacyPolicy?.version).toBe('v2.0.0');
    });
  });

  describe('checkRequiresReconsent', () => {
    it('should return no re-consent needed for first-time consent', async () => {
      const adapter = createMockAdapter([]);

      const result = await checkRequiresReconsent(adapter, 'user-1', 'client-1', 'tenant-1', {
        privacyPolicy: {
          version: 'v1.0.0',
          policyType: 'privacy_policy',
          effectiveAt: Date.now(),
        },
      });

      expect(result).toEqual({
        requiresReconsent: false,
        changedPolicies: [],
        existingConsent: null,
      });
    });

    it('should return no re-consent needed when versions match', async () => {
      const adapter = createMockAdapter([
        {
          privacy_policy_version: 'v1.0.0',
          tos_version: 'v1.0.0',
          consent_version: 1,
        },
      ]);

      const result = await checkRequiresReconsent(adapter, 'user-1', 'client-1', 'tenant-1', {
        privacyPolicy: {
          version: 'v1.0.0',
          policyType: 'privacy_policy',
          effectiveAt: Date.now(),
        },
        termsOfService: {
          version: 'v1.0.0',
          policyType: 'terms_of_service',
          effectiveAt: Date.now(),
        },
      });

      expect(result.requiresReconsent).toBe(false);
      expect(result.changedPolicies).toEqual([]);
    });

    it('should require re-consent when privacy policy version changes', async () => {
      const adapter = createMockAdapter([
        {
          privacy_policy_version: 'v1.0.0', // Old version
          tos_version: 'v1.0.0',
          consent_version: 1,
        },
      ]);

      const result = await checkRequiresReconsent(adapter, 'user-1', 'client-1', 'tenant-1', {
        privacyPolicy: {
          version: 'v2.0.0', // New version
          policyType: 'privacy_policy',
          effectiveAt: Date.now(),
        },
      });

      expect(result.requiresReconsent).toBe(true);
      expect(result.changedPolicies).toContain('privacy_policy');
    });

    it('should require re-consent when ToS version changes', async () => {
      const adapter = createMockAdapter([
        {
          privacy_policy_version: 'v1.0.0',
          tos_version: 'v1.0.0',
          consent_version: 1,
        },
      ]);

      const result = await checkRequiresReconsent(adapter, 'user-1', 'client-1', 'tenant-1', {
        termsOfService: {
          version: 'v2.0.0', // New version
          policyType: 'terms_of_service',
          effectiveAt: Date.now(),
        },
      });

      expect(result.requiresReconsent).toBe(true);
      expect(result.changedPolicies).toContain('terms_of_service');
    });

    it('should report multiple changed policies', async () => {
      const adapter = createMockAdapter([
        {
          privacy_policy_version: 'v1.0.0',
          tos_version: 'v1.0.0',
          consent_version: 1,
        },
      ]);

      const result = await checkRequiresReconsent(adapter, 'user-1', 'client-1', 'tenant-1', {
        privacyPolicy: {
          version: 'v2.0.0',
          policyType: 'privacy_policy',
          effectiveAt: Date.now(),
        },
        termsOfService: {
          version: 'v2.0.0',
          policyType: 'terms_of_service',
          effectiveAt: Date.now(),
        },
      });

      expect(result.requiresReconsent).toBe(true);
      expect(result.changedPolicies).toContain('privacy_policy');
      expect(result.changedPolicies).toContain('terms_of_service');
    });

    it('should return existing consent info', async () => {
      const adapter = createMockAdapter([
        {
          privacy_policy_version: 'v1.0.0',
          tos_version: 'v1.5.0',
          consent_version: 3,
        },
      ]);

      const result = await checkRequiresReconsent(adapter, 'user-1', 'client-1', 'tenant-1', null);

      expect(result.existingConsent).toEqual({
        privacyPolicyVersion: 'v1.0.0',
        tosVersion: 'v1.5.0',
        consentVersion: 3,
      });
    });

    it('should default consent_version to 1 if null', async () => {
      const adapter = createMockAdapter([
        {
          privacy_policy_version: 'v1.0.0',
          tos_version: null,
          consent_version: null,
        },
      ]);

      const result = await checkRequiresReconsent(adapter, 'user-1', 'client-1', 'tenant-1', null);

      expect(result.existingConsent?.consentVersion).toBe(1);
    });
  });

  describe('recordConsentHistory', () => {
    it('should insert consent history record with all fields', async () => {
      const adapter = createMockAdapter();
      const params = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        clientId: 'client-1',
        action: 'granted' as const,
        scopesBefore: ['openid'],
        scopesAfter: ['openid', 'profile', 'email'],
        privacyPolicyVersion: 'v1.0.0',
        tosVersion: 'v1.0.0',
        ipAddressHash: 'hashed-ip',
        userAgent: 'Mozilla/5.0',
        metadata: { source: 'web' },
      };

      const historyId = await recordConsentHistory(adapter, params);

      expect(historyId).toBe('test-uuid-12345');
      expect(adapter.mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO consent_history'),
        expect.arrayContaining([
          'test-uuid-12345',
          'tenant-1',
          'user-1',
          'client-1',
          'granted',
          JSON.stringify(['openid']),
          JSON.stringify(['openid', 'profile', 'email']),
          'v1.0.0',
          'v1.0.0',
          'hashed-ip',
          'Mozilla/5.0',
        ])
      );
    });

    it('should handle minimal fields', async () => {
      const adapter = createMockAdapter();
      const params = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        clientId: 'client-1',
        action: 'revoked' as const,
      };

      await recordConsentHistory(adapter, params);

      expect(adapter.mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO consent_history'),
        expect.arrayContaining([
          'test-uuid-12345',
          'tenant-1',
          'user-1',
          'client-1',
          'revoked',
          null, // scopes_before
          null, // scopes_after
        ])
      );
    });

    it('should record version_upgraded action', async () => {
      const adapter = createMockAdapter();

      await recordConsentHistory(adapter, {
        tenantId: 'tenant-1',
        userId: 'user-1',
        clientId: 'client-1',
        action: 'version_upgraded',
        privacyPolicyVersion: 'v2.0.0',
      });

      expect(adapter.mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO consent_history'),
        expect.arrayContaining(['version_upgraded', 'v2.0.0'])
      );
    });
  });

  describe('upgradeConsentVersion', () => {
    it('should update consent and return new version', async () => {
      const adapter = createMockAdapter([{ consent_version: 2 }]);

      const newVersion = await upgradeConsentVersion(adapter, 'user-1', 'client-1', 'tenant-1', {
        privacyPolicyVersion: 'v2.0.0',
        tosVersion: 'v1.5.0',
      });

      expect(newVersion).toBe(2);
      expect(adapter.mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE oauth_client_consents'),
        expect.arrayContaining(['v2.0.0', 'v1.5.0'])
      );
    });

    it('should return 1 if consent not found after update', async () => {
      const adapter = createMockAdapter([]);

      const newVersion = await upgradeConsentVersion(adapter, 'user-1', 'client-1', 'tenant-1', {});

      expect(newVersion).toBe(1);
    });

    it('should handle partial version updates', async () => {
      const adapter = createMockAdapter([{ consent_version: 3 }]);

      await upgradeConsentVersion(adapter, 'user-1', 'client-1', 'tenant-1', {
        tosVersion: 'v2.0.0',
      });

      expect(adapter.mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE oauth_client_consents'),
        expect.arrayContaining([null, 'v2.0.0']) // null for privacyPolicyVersion
      );
    });
  });

  describe('createPolicyVersion', () => {
    it('should insert policy version record', async () => {
      const adapter = createMockAdapter();

      const id = await createPolicyVersion(adapter, {
        tenantId: 'tenant-1',
        policyType: 'privacy_policy',
        version: 'v1.0.0',
        policyUri: 'https://example.com/privacy',
        policyHash: 'sha256-hash',
        effectiveAt: 1700000000000,
      });

      expect(id).toBe('test-uuid-12345');
      expect(adapter.mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO consent_policy_versions'),
        expect.arrayContaining([
          'test-uuid-12345',
          'tenant-1',
          'v1.0.0',
          'privacy_policy',
          'https://example.com/privacy',
          'sha256-hash',
          1700000000000,
        ])
      );
    });

    it('should handle optional fields as null', async () => {
      const adapter = createMockAdapter();

      await createPolicyVersion(adapter, {
        tenantId: 'tenant-1',
        policyType: 'terms_of_service',
        version: 'v1.0.0',
        effectiveAt: 1700000000000,
      });

      expect(adapter.mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO consent_policy_versions'),
        expect.arrayContaining([null, null]) // policyUri and policyHash
      );
    });
  });

  describe('listPolicyVersions', () => {
    it('should return policy versions for tenant', async () => {
      const adapter = createMockAdapter([
        {
          id: 'id-1',
          policy_type: 'privacy_policy',
          version: 'v2.0.0',
          policy_uri: 'https://example.com/privacy',
          effective_at: 1700000000000,
          created_at: 1699000000000,
        },
        {
          id: 'id-2',
          policy_type: 'privacy_policy',
          version: 'v1.0.0',
          policy_uri: null,
          effective_at: 1690000000000,
          created_at: 1689000000000,
        },
      ]);

      const result = await listPolicyVersions(adapter, 'tenant-1');

      expect(result).toEqual([
        {
          id: 'id-1',
          policyType: 'privacy_policy',
          version: 'v2.0.0',
          policyUri: 'https://example.com/privacy',
          effectiveAt: 1700000000000,
          createdAt: 1699000000000,
        },
        {
          id: 'id-2',
          policyType: 'privacy_policy',
          version: 'v1.0.0',
          policyUri: undefined,
          effectiveAt: 1690000000000,
          createdAt: 1689000000000,
        },
      ]);
    });

    it('should filter by policy type', async () => {
      const adapter = createMockAdapter([]);

      await listPolicyVersions(adapter, 'tenant-1', 'terms_of_service');

      expect(adapter.mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND policy_type = ?'),
        expect.arrayContaining(['tenant-1', 'terms_of_service'])
      );
    });

    it('should respect limit parameter', async () => {
      const adapter = createMockAdapter([]);

      await listPolicyVersions(adapter, 'tenant-1', undefined, 10);

      expect(adapter.mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        expect.arrayContaining([10])
      );
    });

    it('should use default limit of 50', async () => {
      const adapter = createMockAdapter([]);

      await listPolicyVersions(adapter, 'tenant-1');

      expect(adapter.mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        expect.arrayContaining([50])
      );
    });
  });
});
