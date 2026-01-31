/**
 * fast-check Custom Arbitraries for Bridge (External IdP) Property-Based Testing
 *
 * Generators for testing encryption, PKCE, and state management.
 *
 * Note: Uses fast-check v4 API (string with unit constraint)
 */

import * as fc from 'fast-check';

// =============================================================================
// Hex Key Generators
// =============================================================================

/**
 * Hex character set
 */
const HEX_CHARS = '0123456789abcdef';

/**
 * Valid 256-bit hex key (64 characters)
 */
export const validHexKeyArb = fc
  .string({
    unit: fc.constantFrom(...HEX_CHARS.split('')),
    minLength: 64,
    maxLength: 64,
  })
  .filter((key) => {
    // Filter out weak patterns
    const lowerKey = key.toLowerCase();
    // Check for all identical characters
    if (/^(.)\1+$/.test(lowerKey)) return false;
    // Check for short repeating patterns (2-8 chars)
    for (let patternLen = 2; patternLen <= 8; patternLen++) {
      const pattern = lowerKey.slice(0, patternLen);
      const repeated = pattern
        .repeat(Math.ceil(lowerKey.length / patternLen))
        .slice(0, lowerKey.length);
      if (lowerKey === repeated) return false;
    }
    return true;
  });

/**
 * Invalid hex key: wrong length
 */
export const wrongLengthHexKeyArb = fc.oneof(
  fc.string({ unit: fc.constantFrom(...HEX_CHARS.split('')), minLength: 1, maxLength: 63 }),
  fc.string({ unit: fc.constantFrom(...HEX_CHARS.split('')), minLength: 65, maxLength: 128 })
);

/**
 * Invalid hex key: contains non-hex characters
 */
export const nonHexKeyArb = fc
  .string({
    unit: fc.constantFrom(...HEX_CHARS.split('')),
    minLength: 60,
    maxLength: 63,
  })
  .chain((prefix) =>
    fc
      .constantFrom('g', 'h', 'z', 'G', 'Z', '!', '@', '#', ' ')
      .map((invalid) => prefix + invalid + HEX_CHARS.slice(0, 63 - prefix.length))
  )
  .map((s) => s.slice(0, 64));

/**
 * Weak key patterns (zero entropy or repeating)
 */
export const weakKeyPatternArb = fc.constantFrom(
  '0'.repeat(64),
  'a'.repeat(64),
  'f'.repeat(64),
  'abcd'.repeat(16),
  'deadbeef'.repeat(8),
  '01234567'.repeat(8),
  'aabbccdd'.repeat(8)
);

// =============================================================================
// PKCE Generators
// =============================================================================

/**
 * Valid PKCE code_verifier characters per RFC 7636
 * unreserved = ALPHA / DIGIT / "-" / "." / "_" / "~"
 */
const CODE_VERIFIER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

/**
 * Valid code verifier (43-128 characters)
 */
export const codeVerifierArb = fc.string({
  unit: fc.constantFrom(...CODE_VERIFIER_CHARS.split('')),
  minLength: 43,
  maxLength: 128,
});

/**
 * Base64URL character set
 */
const BASE64URL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Valid base64url string
 */
export const base64urlArb = (minLength = 1, maxLength = 256) =>
  fc.string({
    unit: fc.constantFrom(...BASE64URL_CHARS.split('')),
    minLength,
    maxLength,
  });

// =============================================================================
// Plaintext Generators
// =============================================================================

/**
 * ASCII plaintext for encryption testing
 */
export const asciiPlaintextArb = fc.string({
  minLength: 1,
  maxLength: 1000,
});

/**
 * Unicode plaintext for encryption testing
 */
export const unicodePlaintextArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 500 }),
  fc.constant('日本語テスト'),
  fc.constant('émoji: 🔐🔑🛡️'),
  fc.constant('Привет мир'),
  fc.constant('مرحبا بالعالم'),
  fc.constant('Mixed: Hello 世界 🌍')
);

/**
 * JSON plaintext (common use case for tokens)
 */
export const jsonPlaintextArb = fc
  .record({
    sub: fc.uuid(),
    email: fc
      .tuple(
        fc.string({
          unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
          minLength: 3,
          maxLength: 10,
        }),
        fc.constantFrom('example.com', 'test.org')
      )
      .map(([local, domain]) => `${local}@${domain}`),
    name: fc.string({ minLength: 2, maxLength: 30 }),
    iat: fc.integer({ min: 1600000000, max: 1800000000 }),
    exp: fc.integer({ min: 1800000001, max: 2000000000 }),
  })
  .map((obj) => JSON.stringify(obj));

// =============================================================================
// State/Nonce Generators
// =============================================================================

/**
 * State parameter (base64url, typically 22 chars for 16 random bytes)
 */
export const stateArb = base64urlArb(20, 24);

/**
 * Nonce parameter (base64url, typically 22 chars for 16 random bytes)
 */
export const nonceArb = base64urlArb(20, 24);

/**
 * Session ID
 */
export const sessionIdArb = fc.uuid();

/**
 * Provider ID
 */
export const providerIdArb = fc.constantFrom(
  'google',
  'github',
  'microsoft',
  'apple',
  'facebook',
  'linkedin',
  'twitter'
);

/**
 * Redirect URI
 */
export const redirectUriArb = fc
  .tuple(
    fc.constantFrom('example.com', 'app.company.com', 'localhost:3000'),
    fc.constantFrom('/callback', '/auth/callback', '/oauth/callback')
  )
  .map(([domain, path]) => `https://${domain}${path}`);

// =============================================================================
// Timestamp Generators
// =============================================================================

/**
 * Valid timestamp (in the future for expires_at)
 */
export const futureTimestampArb = fc.integer({
  min: Date.now(),
  max: Date.now() + 86400000, // +1 day
});

/**
 * Past timestamp (expired)
 */
export const pastTimestampArb = fc.integer({
  min: Date.now() - 86400000, // -1 day
  max: Date.now() - 1000, // -1 second
});
