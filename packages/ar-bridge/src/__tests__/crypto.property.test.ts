/**
 * Crypto Property-Based Tests
 *
 * Uses fast-check to verify AES-256-GCM encryption behavior across
 * a wide range of inputs, ensuring correctness and security properties.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { encrypt, decrypt, getEncryptionKey, getEncryptionKeyOrUndefined, EncryptionKeyInvalidError } from '../utils/crypto';
import {
  validHexKeyArb,
  wrongLengthHexKeyArb,
  nonHexKeyArb,
  weakKeyPatternArb,
  asciiPlaintextArb,
  unicodePlaintextArb,
  jsonPlaintextArb,
} from './helpers/fc-generators';

// =============================================================================
// Encryption/Decryption Round-Trip Properties
// =============================================================================

describe('Crypto Property Tests', () => {
  describe('Encryption/Decryption Round-Trip', () => {
    it('∀ plaintext, valid key: decrypt(encrypt(plaintext, key), key) === plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(asciiPlaintextArb, validHexKeyArb, async (plaintext, key) => {
          const encrypted = await encrypt(plaintext, key);
          const decrypted = await decrypt(encrypted, key);

          expect(decrypted).toBe(plaintext);
        }),
        { numRuns: 100 }
      );
    });

    it('∀ unicode plaintext, valid key: round-trip preserves unicode', async () => {
      await fc.assert(
        fc.asyncProperty(unicodePlaintextArb, validHexKeyArb, async (plaintext, key) => {
          const encrypted = await encrypt(plaintext, key);
          const decrypted = await decrypt(encrypted, key);

          expect(decrypted).toBe(plaintext);
        }),
        { numRuns: 50 }
      );
    });

    it('∀ JSON plaintext, valid key: round-trip preserves JSON structure', async () => {
      await fc.assert(
        fc.asyncProperty(jsonPlaintextArb, validHexKeyArb, async (plaintext, key) => {
          const encrypted = await encrypt(plaintext, key);
          const decrypted = await decrypt(encrypted, key);

          expect(decrypted).toBe(plaintext);
          // Verify JSON is still valid
          expect(() => JSON.parse(decrypted)).not.toThrow();
        }),
        { numRuns: 50 }
      );
    });

    it('empty string: round-trip works for empty plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(validHexKeyArb, async (key) => {
          const encrypted = await encrypt('', key);
          const decrypted = await decrypt(encrypted, key);

          expect(decrypted).toBe('');
        }),
        { numRuns: 20 }
      );
    });
  });

  // =============================================================================
  // Ciphertext Properties
  // =============================================================================

  describe('Ciphertext Properties', () => {
    it('∀ same plaintext, same key: different ciphertexts (IV randomness)', async () => {
      await fc.assert(
        fc.asyncProperty(asciiPlaintextArb, validHexKeyArb, async (plaintext, key) => {
          const encrypted1 = await encrypt(plaintext, key);
          const encrypted2 = await encrypt(plaintext, key);

          // Should be different due to random IV
          expect(encrypted1).not.toBe(encrypted2);
        }),
        { numRuns: 50 }
      );
    });

    it('∀ different plaintexts, same key: different ciphertexts', async () => {
      await fc.assert(
        fc.asyncProperty(
          asciiPlaintextArb,
          asciiPlaintextArb,
          validHexKeyArb,
          async (pt1, pt2, key) => {
            // Skip if plaintexts are the same
            if (pt1 === pt2) return;

            const encrypted1 = await encrypt(pt1, key);
            const encrypted2 = await encrypt(pt2, key);

            expect(encrypted1).not.toBe(encrypted2);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('∀ plaintext, valid key: ciphertext is valid base64', async () => {
      await fc.assert(
        fc.asyncProperty(asciiPlaintextArb, validHexKeyArb, async (plaintext, key) => {
          const encrypted = await encrypt(plaintext, key);

          // Should be valid base64
          expect(encrypted).toMatch(/^[A-Za-z0-9+/=]*$/);

          // Should be longer than plaintext (IV + tag overhead)
          // IV: 12 bytes, Tag: 16 bytes, minimum overhead is 28 bytes base64 encoded
        }),
        { numRuns: 50 }
      );
    });

    it('∀ plaintext, valid key: ciphertext can be base64 decoded', async () => {
      await fc.assert(
        fc.asyncProperty(asciiPlaintextArb, validHexKeyArb, async (plaintext, key) => {
          const encrypted = await encrypt(plaintext, key);
          const decoded = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

          // Should be at least IV (12) + Tag (16) = 28 bytes
          expect(decoded.length).toBeGreaterThanOrEqual(28);
        }),
        { numRuns: 50 }
      );
    });
  });

  // =============================================================================
  // Decryption Failure Properties
  // =============================================================================

  describe('Decryption Failure Properties', () => {
    it('∀ ciphertext, wrong key: decryption fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          asciiPlaintextArb,
          validHexKeyArb,
          validHexKeyArb,
          async (plaintext, key1, key2) => {
            // Skip if keys are the same (very unlikely but possible)
            if (key1 === key2) return;

            const encrypted = await encrypt(plaintext, key1);

            // Decryption with wrong key should fail
            await expect(decrypt(encrypted, key2)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('∀ tampered ciphertext: decryption fails (integrity check)', async () => {
      await fc.assert(
        fc.asyncProperty(
          asciiPlaintextArb,
          validHexKeyArb,
          fc.integer({ min: 0, max: 100 }),
          async (plaintext, key, tamperedIndex) => {
            const encrypted = await encrypt(plaintext, key);
            const decoded = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));

            // Tamper with a byte
            const idx = tamperedIndex % decoded.length;
            decoded[idx] = (decoded[idx] + 1) % 256;

            const tampered = btoa(String.fromCharCode(...decoded));

            // Decryption should fail due to authentication tag mismatch
            await expect(decrypt(tampered, key)).rejects.toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('invalid base64: decrypt throws error', async () => {
      await fc.assert(
        fc.asyncProperty(validHexKeyArb, async (key) => {
          const invalidBase64 = 'not-valid-base64!!!';

          await expect(decrypt(invalidBase64, key)).rejects.toThrow();
        }),
        { numRuns: 10 }
      );
    });

    it('too short ciphertext: decrypt throws error', async () => {
      await fc.assert(
        fc.asyncProperty(validHexKeyArb, async (key) => {
          // Create a short valid base64 (less than IV + tag)
          const shortData = btoa('short');

          await expect(decrypt(shortData, key)).rejects.toThrow('too short');
        }),
        { numRuns: 10 }
      );
    });
  });

  // =============================================================================
  // Key Validation Properties
  // =============================================================================

  describe('Key Validation Properties', () => {
    it('∀ valid hex key: getEncryptionKey returns the key', () => {
      fc.assert(
        fc.property(validHexKeyArb, (key) => {
          const env = { RP_TOKEN_ENCRYPTION_KEY: key };
          const result = getEncryptionKey(env);
          expect(result).toBe(key);
        }),
        { numRuns: 50 }
      );
    });

    it('∀ wrong length key: getEncryptionKey throws EncryptionKeyInvalidError', () => {
      fc.assert(
        fc.property(wrongLengthHexKeyArb, (key) => {
          const env = { RP_TOKEN_ENCRYPTION_KEY: key };
          expect(() => getEncryptionKey(env)).toThrow(EncryptionKeyInvalidError);
        }),
        { numRuns: 50 }
      );
    });

    it('∀ non-hex key: getEncryptionKey throws EncryptionKeyInvalidError', () => {
      fc.assert(
        fc.property(nonHexKeyArb, (key) => {
          const env = { RP_TOKEN_ENCRYPTION_KEY: key };
          expect(() => getEncryptionKey(env)).toThrow(EncryptionKeyInvalidError);
        }),
        { numRuns: 50 }
      );
    });

    it('∀ weak key pattern: getEncryptionKey throws EncryptionKeyInvalidError', () => {
      fc.assert(
        fc.property(weakKeyPatternArb, (key) => {
          const env = { RP_TOKEN_ENCRYPTION_KEY: key };
          expect(() => getEncryptionKey(env)).toThrow(EncryptionKeyInvalidError);
        }),
        { numRuns: 20 }
      );
    });

    it('missing key: getEncryptionKey throws error', () => {
      const env = {};
      expect(() => getEncryptionKey(env)).toThrow('RP_TOKEN_ENCRYPTION_KEY is not configured');
    });

    it('empty key: getEncryptionKey throws error', () => {
      const env = { RP_TOKEN_ENCRYPTION_KEY: '' };
      expect(() => getEncryptionKey(env)).toThrow('RP_TOKEN_ENCRYPTION_KEY is not configured');
    });
  });

  // =============================================================================
  // getEncryptionKeyOrUndefined Properties
  // =============================================================================

  describe('getEncryptionKeyOrUndefined Properties', () => {
    it('∀ valid hex key: returns the key', () => {
      fc.assert(
        fc.property(validHexKeyArb, (key) => {
          const env = { RP_TOKEN_ENCRYPTION_KEY: key };
          const result = getEncryptionKeyOrUndefined(env);
          expect(result).toBe(key);
        }),
        { numRuns: 50 }
      );
    });

    it('missing key: returns undefined', () => {
      const env = {};
      const result = getEncryptionKeyOrUndefined(env);
      expect(result).toBeUndefined();
    });

    it('empty key: returns undefined', () => {
      const env = { RP_TOKEN_ENCRYPTION_KEY: '' };
      const result = getEncryptionKeyOrUndefined(env);
      expect(result).toBeUndefined();
    });

    it('∀ invalid key (present but malformed): throws EncryptionKeyInvalidError', () => {
      fc.assert(
        fc.property(wrongLengthHexKeyArb, (key) => {
          const env = { RP_TOKEN_ENCRYPTION_KEY: key };
          expect(() => getEncryptionKeyOrUndefined(env)).toThrow(EncryptionKeyInvalidError);
        }),
        { numRuns: 30 }
      );
    });
  });

  // =============================================================================
  // Security Properties
  // =============================================================================

  describe('Security Properties', () => {
    it('∀ plaintext, key: ciphertext does not contain plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }),
          validHexKeyArb,
          async (plaintext, key) => {
            const encrypted = await encrypt(plaintext, key);

            // Ciphertext should not contain the plaintext (very basic check)
            // Note: This is not a cryptographic guarantee, just a sanity check
            expect(encrypted).not.toContain(plaintext);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('∀ plaintext, key: key is not in ciphertext', async () => {
      await fc.assert(
        fc.asyncProperty(asciiPlaintextArb, validHexKeyArb, async (plaintext, key) => {
          const encrypted = await encrypt(plaintext, key);

          // Key should not appear in ciphertext
          expect(encrypted).not.toContain(key);
        }),
        { numRuns: 50 }
      );
    });
  });
});
