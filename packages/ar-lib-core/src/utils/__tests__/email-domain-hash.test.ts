/**
 * Email Domain Hash Utility Unit Tests
 *
 * Tests for the email domain hash generation with key rotation support.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateEmailDomainHash,
  generateEmailDomainHashWithVersion,
  generateEmailDomainHashAllVersions,
  normalizeDomain,
  validateDomainHashConfig,
} from '../email-domain-hash';
import type { EmailDomainHashConfig } from '../../types/jit-config';

describe('Email Domain Hash Utility', () => {
  describe('normalizeDomain', () => {
    it('should extract and lowercase domain from email', () => {
      expect(normalizeDomain('user@Example.COM')).toBe('example.com');
    });

    it('should handle already lowercase email', () => {
      expect(normalizeDomain('user@example.com')).toBe('example.com');
    });

    it('should handle mixed case domain', () => {
      expect(normalizeDomain('user@ExAmPlE.CoM')).toBe('example.com');
    });

    it('should handle subdomain', () => {
      expect(normalizeDomain('user@mail.Example.COM')).toBe('mail.example.com');
    });

    it('should throw error for invalid email without @', () => {
      expect(() => normalizeDomain('invalid-email')).toThrow('Invalid email format');
    });

    it('should throw error for empty input', () => {
      expect(() => normalizeDomain('')).toThrow('Invalid email format');
    });

    it('should throw error for email ending with @', () => {
      expect(() => normalizeDomain('user@')).toThrow('Invalid email format');
    });
  });

  describe('generateEmailDomainHash', () => {
    const testSecret = 'test-secret-key-for-hmac-hashing';

    it('should generate consistent hash for same email and secret', async () => {
      const hash1 = await generateEmailDomainHash('user@example.com', testSecret);
      const hash2 = await generateEmailDomainHash('user@example.com', testSecret);
      expect(hash1).toBe(hash2);
    });

    it('should generate same hash for different users at same domain', async () => {
      const hash1 = await generateEmailDomainHash('alice@example.com', testSecret);
      const hash2 = await generateEmailDomainHash('bob@example.com', testSecret);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different domains', async () => {
      const hash1 = await generateEmailDomainHash('user@example.com', testSecret);
      const hash2 = await generateEmailDomainHash('user@other.com', testSecret);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hash with different secrets', async () => {
      const hash1 = await generateEmailDomainHash('user@example.com', 'secret1');
      const hash2 = await generateEmailDomainHash('user@example.com', 'secret2');
      expect(hash1).not.toBe(hash2);
    });

    it('should normalize domain case before hashing', async () => {
      const hash1 = await generateEmailDomainHash('user@Example.COM', testSecret);
      const hash2 = await generateEmailDomainHash('user@example.com', testSecret);
      expect(hash1).toBe(hash2);
    });

    it('should return 64 character hex string (HMAC-SHA256)', async () => {
      const hash = await generateEmailDomainHash('user@example.com', testSecret);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should throw error for invalid email', async () => {
      await expect(generateEmailDomainHash('invalid-email', testSecret)).rejects.toThrow(
        'Invalid email format'
      );
    });
  });

  describe('generateEmailDomainHashWithVersion', () => {
    const testConfig: EmailDomainHashConfig = {
      current_version: 2,
      secrets: {
        1: 'old-secret-key-for-version-1',
        2: 'new-secret-key-for-version-2',
      },
      migration_in_progress: true,
      deprecated_versions: [],
    };

    it('should generate hash with current version by default', async () => {
      const result = await generateEmailDomainHashWithVersion('user@example.com', testConfig);
      expect(result.version).toBe(2);
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate hash with specified version', async () => {
      const result = await generateEmailDomainHashWithVersion('user@example.com', testConfig, 1);
      expect(result.version).toBe(1);
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different hashes for different versions', async () => {
      const result1 = await generateEmailDomainHashWithVersion('user@example.com', testConfig, 1);
      const result2 = await generateEmailDomainHashWithVersion('user@example.com', testConfig, 2);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should throw error for non-existent version', async () => {
      await expect(
        generateEmailDomainHashWithVersion('user@example.com', testConfig, 99)
      ).rejects.toThrow('No secret found for version 99');
    });
  });

  describe('generateEmailDomainHashAllVersions', () => {
    const testConfig: EmailDomainHashConfig = {
      current_version: 2,
      secrets: {
        1: 'old-secret-key-for-version-1',
        2: 'new-secret-key-for-version-2',
      },
      migration_in_progress: true,
      deprecated_versions: [],
    };

    it('should generate hashes for all versions', async () => {
      const results = await generateEmailDomainHashAllVersions('user@example.com', testConfig);
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.version).sort()).toEqual([1, 2]);
    });

    it('should generate correct hash for each version', async () => {
      const results = await generateEmailDomainHashAllVersions('user@example.com', testConfig);

      const v1Result = results.find((r) => r.version === 1);
      const v2Result = results.find((r) => r.version === 2);

      expect(v1Result?.hash).not.toBe(v2Result?.hash);
      expect(v1Result?.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(v2Result?.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle config with single version', async () => {
      const singleVersionConfig: EmailDomainHashConfig = {
        current_version: 1,
        secrets: { 1: 'single-secret' },
        migration_in_progress: false,
        deprecated_versions: [],
      };

      const results = await generateEmailDomainHashAllVersions(
        'user@example.com',
        singleVersionConfig
      );
      expect(results).toHaveLength(1);
      expect(results[0].version).toBe(1);
    });
  });

  describe('validateDomainHashConfig', () => {
    it('should pass for valid config', () => {
      const config: EmailDomainHashConfig = {
        current_version: 1,
        secrets: { 1: 'valid-secret-key-16+' },
        migration_in_progress: false,
        deprecated_versions: [],
      };
      expect(validateDomainHashConfig(config)).toEqual([]);
    });

    it('should fail if current_version is not in secrets', () => {
      const config: EmailDomainHashConfig = {
        current_version: 2,
        secrets: { 1: 'only-version-1-secret' },
        migration_in_progress: false,
        deprecated_versions: [],
      };
      const errors = validateDomainHashConfig(config);
      expect(errors).toContain('secrets must contain current_version (2)');
    });

    it('should fail if secrets is empty', () => {
      const config: EmailDomainHashConfig = {
        current_version: 1,
        secrets: {},
        migration_in_progress: false,
        deprecated_versions: [],
      };
      const errors = validateDomainHashConfig(config);
      expect(errors).toContain('secrets must contain at least one version');
    });

    it('should fail if deprecated version is current version', () => {
      const config: EmailDomainHashConfig = {
        current_version: 1,
        secrets: { 1: 'secret-at-least-16' },
        migration_in_progress: false,
        deprecated_versions: [1],
      };
      const errors = validateDomainHashConfig(config);
      expect(errors).toContain('current_version cannot be in deprecated_versions');
    });

    it('should fail if secret is too short', () => {
      const config: EmailDomainHashConfig = {
        current_version: 1,
        secrets: { 1: 'short' },
        migration_in_progress: false,
        deprecated_versions: [],
      };
      const errors = validateDomainHashConfig(config);
      expect(errors).toContain('Secret for version 1 must be at least 16 characters');
    });
  });

  describe('Key Rotation Scenarios', () => {
    it('should support key rotation workflow', async () => {
      // Step 1: Initial config with single key (16+ chars)
      const initialConfig: EmailDomainHashConfig = {
        current_version: 1,
        secrets: { 1: 'initial-secret-key-16+' },
        migration_in_progress: false,
        deprecated_versions: [],
      };

      const initialHash = await generateEmailDomainHashWithVersion(
        'user@example.com',
        initialConfig
      );
      expect(initialHash.version).toBe(1);

      // Step 2: Add new key and start migration
      const migrationConfig: EmailDomainHashConfig = {
        current_version: 2,
        secrets: {
          1: 'initial-secret-key-16+',
          2: 'new-rotated-secret-key-16+',
        },
        migration_in_progress: true,
        deprecated_versions: [],
      };

      // New logins use version 2
      const newUserHash = await generateEmailDomainHashWithVersion(
        'user@example.com',
        migrationConfig
      );
      expect(newUserHash.version).toBe(2);

      // Can still lookup by old version
      const oldVersionHash = await generateEmailDomainHashWithVersion(
        'user@example.com',
        migrationConfig,
        1
      );
      expect(oldVersionHash.hash).toBe(initialHash.hash);

      // Step 3: Complete migration and deprecate old key
      const completedConfig: EmailDomainHashConfig = {
        current_version: 2,
        secrets: {
          1: 'initial-secret-key-16+',
          2: 'new-rotated-secret-key-16+',
        },
        migration_in_progress: false,
        deprecated_versions: [1],
      };

      expect(validateDomainHashConfig(completedConfig)).toEqual([]);
    });

    it('should generate all hashes for migration lookup', async () => {
      const migrationConfig: EmailDomainHashConfig = {
        current_version: 2,
        secrets: {
          1: 'old-secret-key-16+char',
          2: 'new-secret-key-16+char',
        },
        migration_in_progress: true,
        deprecated_versions: [],
      };

      const allHashes = await generateEmailDomainHashAllVersions(
        'user@example.com',
        migrationConfig
      );

      // Both hashes should be valid for domain lookup during migration
      expect(allHashes).toHaveLength(2);
      expect(allHashes.every((h) => h.hash.length === 64)).toBe(true);
    });
  });
});
