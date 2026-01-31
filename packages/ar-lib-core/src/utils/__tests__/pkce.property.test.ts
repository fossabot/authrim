/**
 * PKCE Property-Based Tests
 *
 * Uses fast-check to discover edge cases in PKCE implementation
 * that traditional unit tests might miss.
 *
 * RFC 7636: Proof Key for Code Exchange by OAuth Public Clients
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateCodeChallenge } from '../crypto';
import {
  codeVerifierArb,
  tooShortCodeVerifierArb,
  tooLongCodeVerifierArb,
  base64urlArb,
} from './helpers/fc-generators';

// =============================================================================
// Code Verifier Validation (inline for testing)
// =============================================================================

/**
 * Validate code_verifier format per RFC 7636
 * - Length: 43-128 characters
 * - Characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 */
function validateCodeVerifier(codeVerifier: string): { valid: boolean; error?: string } {
  if (codeVerifier.length < 43) {
    return {
      valid: false,
      error: `code_verifier must be at least 43 characters (got ${codeVerifier.length})`,
    };
  }

  if (codeVerifier.length > 128) {
    return {
      valid: false,
      error: `code_verifier must be at most 128 characters (got ${codeVerifier.length})`,
    };
  }

  // Check character set: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  if (!validPattern.test(codeVerifier)) {
    return {
      valid: false,
      error: 'code_verifier contains invalid characters. Allowed: [A-Za-z0-9-._~]',
    };
  }

  return { valid: true };
}

/**
 * Verify PKCE code challenge against verifier
 */
async function verifyPKCE(
  codeChallenge: string,
  codeVerifier: string,
  method: 'S256' | 'plain'
): Promise<boolean> {
  if (method === 'plain') {
    return codeChallenge === codeVerifier;
  }

  // S256: BASE64URL(SHA256(code_verifier))
  const calculatedChallenge = await generateCodeChallenge(codeVerifier);
  return codeChallenge === calculatedChallenge;
}

// =============================================================================
// Property-Based Tests
// =============================================================================

describe('PKCE Property Tests', () => {
  describe('Code Verifier Validation Properties', () => {
    it('∀ valid verifier: validateCodeVerifier returns valid=true', () => {
      fc.assert(
        fc.property(codeVerifierArb, (verifier) => {
          const result = validateCodeVerifier(verifier);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }),
        { numRuns: 500 }
      );
    });

    it('∀ too-short verifier: validateCodeVerifier returns valid=false', () => {
      fc.assert(
        fc.property(tooShortCodeVerifierArb, (verifier) => {
          const result = validateCodeVerifier(verifier);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('at least 43 characters');
        }),
        { numRuns: 200 }
      );
    });

    it('∀ too-long verifier: validateCodeVerifier returns valid=false', () => {
      fc.assert(
        fc.property(tooLongCodeVerifierArb, (verifier) => {
          const result = validateCodeVerifier(verifier);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('at most 128 characters');
        }),
        { numRuns: 200 }
      );
    });

    it('∀ verifier with invalid chars: validateCodeVerifier returns valid=false', () => {
      // Generate verifiers with characters outside RFC 7636 allowed set
      const invalidCharArb = fc
        .tuple(
          fc.string({
            unit: fc.constantFrom(
              ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'.split('')
            ),
            minLength: 42,
            maxLength: 127,
          }),
          fc.constantFrom(
            '+',
            '/',
            '=',
            ' ',
            '\n',
            '\t',
            '@',
            '#',
            '$',
            '%',
            '^',
            '&',
            '*',
            '日',
            'ё'
          )
        )
        .map(([prefix, invalidChar]) => prefix + invalidChar);

      fc.assert(
        fc.property(invalidCharArb, (verifier) => {
          const result = validateCodeVerifier(verifier);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('invalid characters');
        }),
        { numRuns: 300 }
      );
    });

    it('∀ verifier with NULL byte: validateCodeVerifier returns valid=false', () => {
      const nullByteArb = fc
        .string({
          unit: fc.constantFrom(
            ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'.split('')
          ),
          minLength: 42,
          maxLength: 127,
        })
        .map((s) => s + '\x00');

      fc.assert(
        fc.property(nullByteArb, (verifier) => {
          const result = validateCodeVerifier(verifier);
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('∀ verifier with control characters: validateCodeVerifier returns valid=false', () => {
      const controlCharArb = fc
        .tuple(
          fc.string({
            unit: fc.constantFrom(
              ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'.split('')
            ),
            minLength: 42,
            maxLength: 127,
          }),
          fc.integer({ min: 0, max: 31 }).map((n) => String.fromCharCode(n))
        )
        .map(([prefix, ctrl]) => prefix + ctrl);

      fc.assert(
        fc.property(controlCharArb, (verifier) => {
          const result = validateCodeVerifier(verifier);
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('length boundaries: 42 chars invalid, 43 chars valid, 128 chars valid, 129 chars invalid', () => {
      const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

      // 42 chars - should be invalid
      const v42 = validChars.slice(0, 42);
      expect(validateCodeVerifier(v42).valid).toBe(false);

      // 43 chars - should be valid
      const v43 = validChars.slice(0, 43);
      expect(validateCodeVerifier(v43).valid).toBe(true);

      // 128 chars - should be valid
      const v128 = validChars.repeat(2).slice(0, 128);
      expect(validateCodeVerifier(v128).valid).toBe(true);

      // 129 chars - should be invalid
      const v129 = validChars.repeat(2).slice(0, 129);
      expect(validateCodeVerifier(v129).valid).toBe(false);
    });
  });

  describe('PKCE Challenge/Verification Properties', () => {
    it('∀ valid verifier: verifyPKCE(generateCodeChallenge(v), v, S256) === true', async () => {
      await fc.assert(
        fc.asyncProperty(codeVerifierArb, async (verifier) => {
          const challenge = await generateCodeChallenge(verifier);
          const result = await verifyPKCE(challenge, verifier, 'S256');
          expect(result).toBe(true);
        }),
        { numRuns: 200 }
      );
    });

    it('∀ valid verifier: generateCodeChallenge produces 43-char base64url output', async () => {
      await fc.assert(
        fc.asyncProperty(codeVerifierArb, async (verifier) => {
          const challenge = await generateCodeChallenge(verifier);

          // SHA-256 = 32 bytes = 43 base64url chars (no padding)
          expect(challenge.length).toBe(43);

          // Must be valid base64url (no +, /, =)
          expect(challenge).not.toContain('+');
          expect(challenge).not.toContain('/');
          expect(challenge).not.toContain('=');

          // Must only contain base64url chars
          expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
        }),
        { numRuns: 200 }
      );
    });

    it('∀ different verifiers: produce different challenges (collision resistance)', async () => {
      const verifierPairArb = fc
        .tuple(codeVerifierArb, codeVerifierArb)
        .filter(([v1, v2]) => v1 !== v2);

      await fc.assert(
        fc.asyncProperty(verifierPairArb, async ([v1, v2]) => {
          const c1 = await generateCodeChallenge(v1);
          const c2 = await generateCodeChallenge(v2);
          expect(c1).not.toBe(c2);
        }),
        { numRuns: 200 }
      );
    });

    it('∀ verifier: same verifier always produces same challenge (determinism)', async () => {
      await fc.assert(
        fc.asyncProperty(codeVerifierArb, async (verifier) => {
          const c1 = await generateCodeChallenge(verifier);
          const c2 = await generateCodeChallenge(verifier);
          expect(c1).toBe(c2);
        }),
        { numRuns: 100 }
      );
    });

    it('∀ valid verifier, wrong challenge: verifyPKCE returns false', async () => {
      const wrongChallengeArb = fc
        .tuple(codeVerifierArb, base64urlArb(43, 43))
        .filter(([_v, c]) => c.length === 43); // Ensure 43 chars like real challenge

      await fc.assert(
        fc.asyncProperty(wrongChallengeArb, async ([verifier, wrongChallenge]) => {
          const correctChallenge = await generateCodeChallenge(verifier);
          // Skip if by chance we generated the correct challenge
          if (wrongChallenge === correctChallenge) return;

          const result = await verifyPKCE(wrongChallenge, verifier, 'S256');
          expect(result).toBe(false);
        }),
        { numRuns: 200 }
      );
    });

    it('∀ challenge, wrong verifier: verifyPKCE returns false', async () => {
      const challengeVerifierPairArb = fc
        .tuple(codeVerifierArb, codeVerifierArb)
        .filter(([v1, v2]) => v1 !== v2);

      await fc.assert(
        fc.asyncProperty(challengeVerifierPairArb, async ([correctVerifier, wrongVerifier]) => {
          const challenge = await generateCodeChallenge(correctVerifier);
          const result = await verifyPKCE(challenge, wrongVerifier, 'S256');
          expect(result).toBe(false);
        }),
        { numRuns: 200 }
      );
    });

    it('plain method: verifyPKCE(v, v, plain) === true', async () => {
      await fc.assert(
        fc.asyncProperty(codeVerifierArb, async (verifier) => {
          const result = await verifyPKCE(verifier, verifier, 'plain');
          expect(result).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('plain method: verifyPKCE(different, verifier, plain) === false', async () => {
      const differentPairArb = fc
        .tuple(codeVerifierArb, codeVerifierArb)
        .filter(([a, b]) => a !== b);

      await fc.assert(
        fc.asyncProperty(differentPairArb, async ([challenge, verifier]) => {
          const result = await verifyPKCE(challenge, verifier, 'plain');
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Security Properties', () => {
    it('∀ verifier: challenge cannot be reversed to verifier (one-way)', async () => {
      // This test documents the security property - we cannot reverse SHA-256
      await fc.assert(
        fc.asyncProperty(codeVerifierArb, async (verifier) => {
          const challenge = await generateCodeChallenge(verifier);

          // The challenge should not contain the verifier (trivially)
          expect(challenge).not.toBe(verifier);

          // The challenge should have different length (43 vs 43-128)
          // unless verifier is exactly 43 chars of the same encoding
          // This demonstrates that info is lost in hashing
          if (verifier.length !== 43) {
            expect(challenge.length).not.toBe(verifier.length);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('empty string should produce valid challenge (edge case)', async () => {
      const challenge = await generateCodeChallenge('');
      expect(challenge.length).toBe(43);
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('very long string should produce valid challenge', async () => {
      const longString = 'a'.repeat(10000);
      const challenge = await generateCodeChallenge(longString);
      expect(challenge.length).toBe(43);
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('unicode string should produce valid challenge', async () => {
      const unicodeStrings = ['日本語', 'émoji', '🔐🔑', 'тест', 'مرحبا'];

      for (const str of unicodeStrings) {
        const challenge = await generateCodeChallenge(str);
        expect(challenge.length).toBe(43);
        expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
      }
    });
  });
});
