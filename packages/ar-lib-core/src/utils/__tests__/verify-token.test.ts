/**
 * verifyToken Tests
 *
 * Tests the JWT verification function, specifically audience handling.
 * These tests catch regressions like "audience skip causing all rejections".
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT, importJWK } from 'jose';
import type { KeyLike } from 'jose';
import { verifyToken } from '../jwt';

describe('verifyToken - Audience Handling', () => {
  let keyPair: { publicKey: KeyLike; privateKey: KeyLike };
  let publicCryptoKey: CryptoKey;
  const ISSUER = 'https://auth.example.com';

  beforeAll(async () => {
    // Generate key pair for testing
    keyPair = await generateKeyPair('RS256', { extractable: true });

    // Export and re-import to get CryptoKey (needed by verifyToken)
    const jwk = await exportJWK(keyPair.publicKey);
    jwk.alg = 'RS256';
    publicCryptoKey = (await importJWK(jwk, 'RS256')) as CryptoKey;
  });

  /**
   * Helper to create a signed JWT
   */
  async function createJWT(claims: Record<string, unknown>): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return await new SignJWT({
      iss: ISSUER,
      iat: now,
      exp: now + 3600,
      ...claims,
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })
      .sign(keyPair.privateKey);
  }

  describe('Audience verification when provided', () => {
    it('should accept token when audience matches (string)', async () => {
      const token = await createJWT({
        sub: 'user-123',
        aud: 'client-a',
      });

      // Should not throw
      const payload = await verifyToken(token, publicCryptoKey, ISSUER, { audience: 'client-a' });
      expect(payload.sub).toBe('user-123');
      expect(payload.aud).toBe('client-a');
    });

    it('should accept token when audience matches (array)', async () => {
      const token = await createJWT({
        sub: 'user-123',
        aud: ['client-a', 'client-b'],
      });

      // Should accept when one of the audiences matches
      const payload = await verifyToken(token, publicCryptoKey, ISSUER, { audience: 'client-a' });
      expect(payload.sub).toBe('user-123');
    });

    it('should reject token when audience does not match', async () => {
      const token = await createJWT({
        sub: 'user-123',
        aud: 'client-a',
      });

      await expect(
        verifyToken(token, publicCryptoKey, ISSUER, { audience: 'wrong-client' })
      ).rejects.toThrow();
    });

    it('should accept when passed audience array includes token audience', async () => {
      const token = await createJWT({
        sub: 'user-123',
        aud: 'client-a',
      });

      // Pass array of acceptable audiences
      const payload = await verifyToken(token, publicCryptoKey, ISSUER, {
        audience: ['client-a', 'client-b'],
      });
      expect(payload.sub).toBe('user-123');
    });
  });

  describe('Explicit audience skip (skipAudienceCheck: true)', () => {
    it('should accept ANY token when skipAudienceCheck is true', async () => {
      // This test catches the regression where undefined audience was
      // converted to string "undefined" and caused all tokens to fail

      const token = await createJWT({
        sub: 'user-123',
        aud: 'any-client-id', // Specific audience in token
      });

      // When skipAudienceCheck is true, verification should skip aud check
      const payload = await verifyToken(token, publicCryptoKey, ISSUER, {
        skipAudienceCheck: true,
      });
      expect(payload.sub).toBe('user-123');
      expect(payload.aud).toBe('any-client-id');
    });

    it('should accept token with issuer-only audience when skipAudienceCheck is true', async () => {
      const token = await createJWT({
        sub: 'user-123',
        aud: ISSUER, // Audience is issuer URL
      });

      // Should not fail - audience check is skipped
      const payload = await verifyToken(token, publicCryptoKey, ISSUER, {
        skipAudienceCheck: true,
      });
      expect(payload.aud).toBe(ISSUER);
    });

    it('should accept token with array audience when skipAudienceCheck is true', async () => {
      const token = await createJWT({
        sub: 'user-123',
        aud: ['client-a', 'client-b', ISSUER],
      });

      const payload = await verifyToken(token, publicCryptoKey, ISSUER, {
        skipAudienceCheck: true,
      });
      expect(payload.aud).toContain('client-a');
    });

    it('should accept token with no audience claim when skipAudienceCheck is true', async () => {
      const token = await createJWT({
        sub: 'user-123',
        // No aud claim
      });

      const payload = await verifyToken(token, publicCryptoKey, ISSUER, {
        skipAudienceCheck: true,
      });
      expect(payload.sub).toBe('user-123');
      expect(payload.aud).toBeUndefined();
    });
  });

  describe('Safe default - audience required', () => {
    it('should throw error when audience is not provided and skipAudienceCheck is not set', async () => {
      const token = await createJWT({
        sub: 'user-123',
        aud: 'client-a',
      });

      // SECURITY: Calling without audience and without skipAudienceCheck should throw
      await expect(verifyToken(token, publicCryptoKey, ISSUER, {})).rejects.toThrow(
        'audience is required'
      );
    });

    it('should throw error when called with empty options', async () => {
      const token = await createJWT({
        sub: 'user-123',
        aud: 'client-a',
      });

      await expect(verifyToken(token, publicCryptoKey, ISSUER)).rejects.toThrow(
        'audience is required'
      );
    });
  });

  describe('Issuer verification', () => {
    it('should reject token with wrong issuer', async () => {
      const token = await new SignJWT({
        iss: 'https://wrong-issuer.com',
        sub: 'user-123',
        aud: 'client-a',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })
        .sign(keyPair.privateKey);

      await expect(
        verifyToken(token, publicCryptoKey, ISSUER, { audience: 'client-a' })
      ).rejects.toThrow();
    });
  });

  describe('Expiration verification', () => {
    it('should reject expired token', async () => {
      const token = await new SignJWT({
        iss: ISSUER,
        sub: 'user-123',
        aud: 'client-a',
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      })
        .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })
        .sign(keyPair.privateKey);

      await expect(
        verifyToken(token, publicCryptoKey, ISSUER, { audience: 'client-a' })
      ).rejects.toThrow();
    });
  });
});
