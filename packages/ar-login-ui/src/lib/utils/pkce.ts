/**
 * PKCE (Proof Key for Code Exchange) implementation for OAuth 2.0
 * RFC 7636: https://tools.ietf.org/html/rfc7636
 */

/**
 * Base64URL encode (RFC 4648)
 * Converts binary data to URL-safe base64 encoding
 *
 * Note: Safe to use spread operator for PKCE use case (max 32 bytes)
 */
function base64UrlEncode(buffer: Uint8Array): string {
	const binary = String.fromCharCode(...buffer);
	const base64 = btoa(binary);
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate code verifier (32 bytes → 43 characters)
 * Creates a cryptographically random string for PKCE
 *
 * @returns A 43-character Base64URL-encoded string
 */
export function generateCodeVerifier(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return base64UrlEncode(array);
}

/**
 * Generate code challenge (SHA-256)
 * Creates a SHA-256 hash of the code verifier
 *
 * @param verifier - The code verifier to hash
 * @returns A Base64URL-encoded SHA-256 hash
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Generate PKCE parameters
 * Creates both code verifier and code challenge
 *
 * @throws Error if Web Crypto API is not available
 * @returns PKCE parameters for OAuth 2.0 authorization request
 */
export async function generatePKCE(): Promise<{
	codeVerifier: string;
	codeChallenge: string;
	codeChallengeMethod: 'S256';
}> {
	if (typeof crypto === 'undefined' || !crypto.getRandomValues || !crypto.subtle) {
		throw new Error('Web Crypto API is not available');
	}

	const codeVerifier = generateCodeVerifier();
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	return {
		codeVerifier,
		codeChallenge,
		codeChallengeMethod: 'S256'
	};
}
