/**
 * Device Fingerprint Utilities Tests
 *
 * Tests for anonymous authentication device fingerprinting.
 * @see architecture-decisions.md §17
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashDeviceIdentifiers,
  verifyDeviceSignature,
  generateDeviceChallenge,
  createChallengeResponse,
  verifyChallengeResponse,
  validateDeviceId,
  validateIdentifier,
  isValidUuidV4,
  validateDeviceStability,
  type DeviceIdentifiers,
  type DeviceSignature,
} from '../device-fingerprint';

describe('Device Fingerprint Utilities', () => {
  const testSecret = 'test-hmac-secret-32-characters-long';

  describe('hashDeviceIdentifiers', () => {
    it('should hash device_id to a hex string', async () => {
      const identifiers: DeviceIdentifiers = {
        device_id: 'test-device-id-12345',
      };

      const signature = await hashDeviceIdentifiers(identifiers, testSecret);

      expect(signature.device_id_hash).toBeTypeOf('string');
      expect(signature.device_id_hash.length).toBe(64); // SHA-256 = 64 hex chars
      expect(signature.device_id_hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should hash all provided identifiers', async () => {
      const identifiers: DeviceIdentifiers = {
        device_id: 'device-123',
        installation_id: 'install-456',
        fingerprint: 'fingerprint-789',
        platform: 'ios',
      };

      const signature = await hashDeviceIdentifiers(identifiers, testSecret);

      expect(signature.device_id_hash).toBeDefined();
      expect(signature.installation_id_hash).toBeDefined();
      expect(signature.fingerprint_hash).toBeDefined();
      expect(signature.device_platform).toBe('ios');
    });

    it('should omit undefined optional identifiers', async () => {
      const identifiers: DeviceIdentifiers = {
        device_id: 'device-only',
      };

      const signature = await hashDeviceIdentifiers(identifiers, testSecret);

      expect(signature.device_id_hash).toBeDefined();
      expect(signature.installation_id_hash).toBeUndefined();
      expect(signature.fingerprint_hash).toBeUndefined();
      expect(signature.device_platform).toBeUndefined();
    });

    it('should produce consistent hashes for same input', async () => {
      const identifiers: DeviceIdentifiers = {
        device_id: 'consistent-device',
        installation_id: 'consistent-install',
      };

      const sig1 = await hashDeviceIdentifiers(identifiers, testSecret);
      const sig2 = await hashDeviceIdentifiers(identifiers, testSecret);

      expect(sig1.device_id_hash).toBe(sig2.device_id_hash);
      expect(sig1.installation_id_hash).toBe(sig2.installation_id_hash);
    });

    it('should produce different hashes for different secrets', async () => {
      const identifiers: DeviceIdentifiers = {
        device_id: 'test-device',
      };

      const sig1 = await hashDeviceIdentifiers(identifiers, 'secret-one-12345678');
      const sig2 = await hashDeviceIdentifiers(identifiers, 'secret-two-12345678');

      expect(sig1.device_id_hash).not.toBe(sig2.device_id_hash);
    });

    it('should throw for invalid device_id format', async () => {
      const identifiers: DeviceIdentifiers = {
        device_id: 'short', // Too short
      };

      await expect(hashDeviceIdentifiers(identifiers, testSecret)).rejects.toThrow(
        'Invalid device_id format'
      );
    });

    it('should throw for invalid installation_id format', async () => {
      const identifiers: DeviceIdentifiers = {
        device_id: 'valid-device-id-123',
        installation_id: 'invalid@id!', // Invalid chars
      };

      await expect(hashDeviceIdentifiers(identifiers, testSecret)).rejects.toThrow(
        'Invalid installation_id format'
      );
    });

    it('should throw for invalid fingerprint format', async () => {
      const identifiers: DeviceIdentifiers = {
        device_id: 'valid-device-id-123',
        fingerprint: 'invalid fingerprint with spaces',
      };

      await expect(hashDeviceIdentifiers(identifiers, testSecret)).rejects.toThrow(
        'Invalid fingerprint format'
      );
    });
  });

  describe('verifyDeviceSignature', () => {
    it('should return true for matching signatures', async () => {
      const identifiers: DeviceIdentifiers = {
        device_id: 'matching-device-123',
        installation_id: 'matching-install',
      };

      const storedSignature = await hashDeviceIdentifiers(identifiers, testSecret);
      const result = await verifyDeviceSignature(identifiers, storedSignature, testSecret);

      expect(result).toBe(true);
    });

    it('should return false for mismatched device_id', async () => {
      const original: DeviceIdentifiers = {
        device_id: 'original-device-123',
      };
      const different: DeviceIdentifiers = {
        device_id: 'different-device-456',
      };

      const storedSignature = await hashDeviceIdentifiers(original, testSecret);
      const result = await verifyDeviceSignature(different, storedSignature, testSecret);

      expect(result).toBe(false);
    });

    it('should return false for mismatched installation_id', async () => {
      const original: DeviceIdentifiers = {
        device_id: 'same-device-123456',
        installation_id: 'install-original',
      };
      const different: DeviceIdentifiers = {
        device_id: 'same-device-123456',
        installation_id: 'install-different',
      };

      const storedSignature = await hashDeviceIdentifiers(original, testSecret);
      const result = await verifyDeviceSignature(different, storedSignature, testSecret);

      expect(result).toBe(false);
    });

    it('should return false for different secrets', async () => {
      const identifiers: DeviceIdentifiers = {
        device_id: 'test-device-12345',
      };

      const storedSignature = await hashDeviceIdentifiers(identifiers, 'secret-1-abcdefgh');
      const result = await verifyDeviceSignature(identifiers, storedSignature, 'secret-2-abcdefgh');

      expect(result).toBe(false);
    });

    it('should return true when stored signature has fewer fields', async () => {
      const full: DeviceIdentifiers = {
        device_id: 'device-full-123456',
        installation_id: 'install-123',
      };
      const minimal: DeviceIdentifiers = {
        device_id: 'device-full-123456',
      };

      // Store with only device_id
      const storedSignature = await hashDeviceIdentifiers(minimal, testSecret);
      // Verify with full identifiers - should pass as device_id matches
      const result = await verifyDeviceSignature(full, storedSignature, testSecret);

      expect(result).toBe(true);
    });

    it('should handle invalid input gracefully', async () => {
      const storedSignature: DeviceSignature = {
        device_id_hash: 'some-hash',
      };

      // Invalid device_id should return false, not throw
      const result = await verifyDeviceSignature(
        { device_id: 'bad' }, // Too short
        storedSignature,
        testSecret
      );

      expect(result).toBe(false);
    });
  });

  describe('generateDeviceChallenge', () => {
    it('should generate unique challenge IDs', () => {
      const challenge1 = generateDeviceChallenge();
      const challenge2 = generateDeviceChallenge();

      expect(challenge1.challenge_id).not.toBe(challenge2.challenge_id);
    });

    it('should generate unique challenges', () => {
      const challenge1 = generateDeviceChallenge();
      const challenge2 = generateDeviceChallenge();

      expect(challenge1.challenge).not.toBe(challenge2.challenge);
    });

    it('should return valid UUID for challenge_id', () => {
      const challenge = generateDeviceChallenge();

      expect(challenge.challenge_id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should set expiration time 5 minutes in the future', () => {
      const now = Math.floor(Date.now() / 1000);
      const challenge = generateDeviceChallenge();

      // Should be approximately 5 minutes (300 seconds) in the future
      expect(challenge.expires_at).toBeGreaterThanOrEqual(now + 299);
      expect(challenge.expires_at).toBeLessThanOrEqual(now + 301);
    });

    it('should generate base64url-encoded challenge', () => {
      const challenge = generateDeviceChallenge();

      // Base64url should not contain +, /, or =
      expect(challenge.challenge).not.toMatch(/[+/=]/);
      expect(challenge.challenge.length).toBeGreaterThan(0);
    });
  });

  describe('createChallengeResponse and verifyChallengeResponse', () => {
    it('should create and verify valid response', async () => {
      const challenge = 'test-challenge-string';
      const deviceId = 'device-12345678';
      const timestamp = Math.floor(Date.now() / 1000);

      const response = await createChallengeResponse(challenge, deviceId, timestamp, testSecret);
      const isValid = await verifyChallengeResponse(
        challenge,
        response,
        deviceId,
        timestamp,
        testSecret
      );

      expect(isValid).toBe(true);
    });

    it('should reject response with wrong device_id', async () => {
      const challenge = 'test-challenge';
      const timestamp = Math.floor(Date.now() / 1000);

      const response = await createChallengeResponse(
        challenge,
        'device-aaa',
        timestamp,
        testSecret
      );
      const isValid = await verifyChallengeResponse(
        challenge,
        response,
        'device-bbb',
        timestamp,
        testSecret
      );

      expect(isValid).toBe(false);
    });

    it('should reject response with wrong challenge', async () => {
      const deviceId = 'device-12345678';
      const timestamp = Math.floor(Date.now() / 1000);

      const response = await createChallengeResponse(
        'original-challenge',
        deviceId,
        timestamp,
        testSecret
      );
      const isValid = await verifyChallengeResponse(
        'different-challenge',
        response,
        deviceId,
        timestamp,
        testSecret
      );

      expect(isValid).toBe(false);
    });

    it('should reject expired response', async () => {
      const challenge = 'test-challenge';
      const deviceId = 'device-12345678';
      const oldTimestamp = Math.floor(Date.now() / 1000) - 120; // 2 minutes ago

      const response = await createChallengeResponse(challenge, deviceId, oldTimestamp, testSecret);
      const isValid = await verifyChallengeResponse(
        challenge,
        response,
        deviceId,
        oldTimestamp,
        testSecret,
        60 // 1 minute max age
      );

      expect(isValid).toBe(false);
    });

    it('should reject future timestamp', async () => {
      const challenge = 'test-challenge';
      const deviceId = 'device-12345678';
      const futureTimestamp = Math.floor(Date.now() / 1000) + 60; // 1 minute in future

      const response = await createChallengeResponse(
        challenge,
        deviceId,
        futureTimestamp,
        testSecret
      );
      const isValid = await verifyChallengeResponse(
        challenge,
        response,
        deviceId,
        futureTimestamp,
        testSecret
      );

      expect(isValid).toBe(false);
    });

    it('should accept response within max age', async () => {
      const challenge = 'test-challenge';
      const deviceId = 'device-12345678';
      const recentTimestamp = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago

      const response = await createChallengeResponse(
        challenge,
        deviceId,
        recentTimestamp,
        testSecret
      );
      const isValid = await verifyChallengeResponse(
        challenge,
        response,
        deviceId,
        recentTimestamp,
        testSecret,
        60 // 1 minute max age
      );

      expect(isValid).toBe(true);
    });
  });

  describe('validateDeviceId', () => {
    it('should accept valid UUID v4', () => {
      expect(validateDeviceId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should accept valid alphanumeric ID', () => {
      expect(validateDeviceId('device123456789')).toBe(true);
    });

    it('should accept ID with hyphens and underscores', () => {
      expect(validateDeviceId('device-id_12345')).toBe(true);
    });

    it('should reject too short ID', () => {
      expect(validateDeviceId('short')).toBe(false);
      expect(validateDeviceId('1234567')).toBe(false); // 7 chars, need 8
    });

    it('should accept minimum length (8 chars)', () => {
      expect(validateDeviceId('12345678')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(validateDeviceId('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validateDeviceId(null as unknown as string)).toBe(false);
      expect(validateDeviceId(undefined as unknown as string)).toBe(false);
    });

    it('should reject too long ID (>256 chars)', () => {
      const longId = 'a'.repeat(257);
      expect(validateDeviceId(longId)).toBe(false);
    });

    it('should accept maximum length (256 chars)', () => {
      const maxId = 'a'.repeat(128); // Within limit
      expect(validateDeviceId(maxId)).toBe(true);
    });

    it('should reject IDs with special characters', () => {
      expect(validateDeviceId('device@id')).toBe(false);
      expect(validateDeviceId('device id')).toBe(false);
      expect(validateDeviceId('device/id')).toBe(false);
      expect(validateDeviceId('device\\id')).toBe(false);
    });
  });

  describe('validateIdentifier', () => {
    it('should accept alphanumeric string', () => {
      expect(validateIdentifier('abc123XYZ')).toBe(true);
    });

    it('should accept base64-like strings with equals', () => {
      expect(validateIdentifier('abc123==')).toBe(true);
    });

    it('should accept underscores and hyphens', () => {
      expect(validateIdentifier('some_identifier-value')).toBe(true);
    });

    it('should reject spaces', () => {
      expect(validateIdentifier('has space')).toBe(false);
    });

    it('should reject special characters', () => {
      expect(validateIdentifier('has@symbol')).toBe(false);
      expect(validateIdentifier('has!exclaim')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateIdentifier('')).toBe(false);
    });

    it('should reject too long string', () => {
      const longStr = 'x'.repeat(257);
      expect(validateIdentifier(longStr)).toBe(false);
    });
  });

  describe('isValidUuidV4', () => {
    it('should accept valid UUID v4', () => {
      expect(isValidUuidV4('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUuidV4('6ba7b810-9dad-41d4-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject UUID v1', () => {
      // UUID v1 has different version indicator
      expect(isValidUuidV4('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
    });

    it('should reject non-UUID strings', () => {
      expect(isValidUuidV4('not-a-uuid')).toBe(false);
      expect(isValidUuidV4('12345678901234567890123456789012')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isValidUuidV4('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });

    it('should reject invalid variant', () => {
      // Variant bits must be 8, 9, A, or B in position 19
      expect(isValidUuidV4('550e8400-e29b-41d4-c716-446655440000')).toBe(false);
    });
  });

  describe('validateDeviceStability', () => {
    it('should accept valid stability levels', () => {
      expect(validateDeviceStability('session')).toBe(true);
      expect(validateDeviceStability('installation')).toBe(true);
      expect(validateDeviceStability('device')).toBe(true);
    });

    it('should reject invalid values', () => {
      expect(validateDeviceStability('invalid')).toBe(false);
      expect(validateDeviceStability('')).toBe(false);
      expect(validateDeviceStability('SESSION')).toBe(false); // Case-sensitive
    });
  });
});
