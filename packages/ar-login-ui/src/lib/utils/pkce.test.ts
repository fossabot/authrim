import { describe, it, expect } from 'vitest';
import { generateCodeVerifier, generateCodeChallenge, generatePKCE } from './pkce';

describe('PKCE', () => {
	describe('generateCodeVerifier', () => {
		it('should generate a 43-character Base64URL string', () => {
			const verifier = generateCodeVerifier();
			expect(verifier).toHaveLength(43);
			expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		it('should generate unique values', () => {
			const verifier1 = generateCodeVerifier();
			const verifier2 = generateCodeVerifier();
			expect(verifier1).not.toBe(verifier2);
		});

		it('should not contain padding characters', () => {
			const verifier = generateCodeVerifier();
			expect(verifier).not.toContain('=');
		});

		it('should be URL-safe', () => {
			const verifier = generateCodeVerifier();
			expect(verifier).not.toContain('+');
			expect(verifier).not.toContain('/');
		});
	});

	describe('generateCodeChallenge', () => {
		it('should generate a 43-character Base64URL string', async () => {
			const verifier = generateCodeVerifier();
			const challenge = await generateCodeChallenge(verifier);
			expect(challenge).toHaveLength(43);
			expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		it('should generate same challenge for same verifier', async () => {
			const verifier = generateCodeVerifier();
			const challenge1 = await generateCodeChallenge(verifier);
			const challenge2 = await generateCodeChallenge(verifier);
			expect(challenge1).toBe(challenge2);
		});

		it('should generate different challenges for different verifiers', async () => {
			const verifier1 = generateCodeVerifier();
			const verifier2 = generateCodeVerifier();
			const challenge1 = await generateCodeChallenge(verifier1);
			const challenge2 = await generateCodeChallenge(verifier2);
			expect(challenge1).not.toBe(challenge2);
		});

		// RFC 7636 Appendix B Test Vector
		it('should match RFC 7636 test vector', async () => {
			const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
			const expectedChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
			const challenge = await generateCodeChallenge(verifier);
			expect(challenge).toBe(expectedChallenge);
		});
	});

	describe('generatePKCE', () => {
		it('should generate valid PKCE parameters', async () => {
			const pkce = await generatePKCE();

			expect(pkce.codeVerifier).toHaveLength(43);
			expect(pkce.codeVerifier).toMatch(/^[A-Za-z0-9_-]+$/);

			expect(pkce.codeChallenge).toHaveLength(43);
			expect(pkce.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);

			expect(pkce.codeChallengeMethod).toBe('S256');
		});

		it('should generate unique PKCE parameters', async () => {
			const pkce1 = await generatePKCE();
			const pkce2 = await generatePKCE();

			expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
			expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge);
		});

		it('should verify challenge matches verifier', async () => {
			const pkce = await generatePKCE();
			const recomputedChallenge = await generateCodeChallenge(pkce.codeVerifier);
			expect(recomputedChallenge).toBe(pkce.codeChallenge);
		});

		it('should throw error if Web Crypto API is not available', async () => {
			// Save original crypto
			const originalCrypto = globalThis.crypto;

			try {
				// Mock crypto as undefined by using Object.defineProperty
				Object.defineProperty(globalThis, 'crypto', {
					value: undefined,
					configurable: true,
					writable: true
				});

				await expect(generatePKCE()).rejects.toThrow('Web Crypto API is not available');
			} finally {
				// Restore original crypto
				Object.defineProperty(globalThis, 'crypto', {
					value: originalCrypto,
					configurable: true,
					writable: true
				});
			}
		});

		it('should throw error if getRandomValues is not available', async () => {
			// Save original crypto
			const originalCrypto = globalThis.crypto;

			try {
				// Mock crypto without getRandomValues
				Object.defineProperty(globalThis, 'crypto', {
					value: {
						subtle: originalCrypto.subtle
					},
					configurable: true,
					writable: true
				});

				await expect(generatePKCE()).rejects.toThrow('Web Crypto API is not available');
			} finally {
				// Restore original crypto
				Object.defineProperty(globalThis, 'crypto', {
					value: originalCrypto,
					configurable: true,
					writable: true
				});
			}
		});

		it('should throw error if subtle is not available', async () => {
			// Save original crypto
			const originalCrypto = globalThis.crypto;

			try {
				// Mock crypto without subtle
				Object.defineProperty(globalThis, 'crypto', {
					value: {
						getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto)
					},
					configurable: true,
					writable: true
				});

				await expect(generatePKCE()).rejects.toThrow('Web Crypto API is not available');
			} finally {
				// Restore original crypto
				Object.defineProperty(globalThis, 'crypto', {
					value: originalCrypto,
					configurable: true,
					writable: true
				});
			}
		});
	});
});
