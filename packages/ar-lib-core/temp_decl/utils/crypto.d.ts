/**
 * Cryptographic Utilities
 *
 * Provides helper functions for generating cryptographically secure random strings
 * and encoding them in base64url format.
 */
/**
 * Generate a cryptographically secure random string in base64url format
 *
 * @param byteLength - Number of random bytes to generate (default: 96, resulting in ~128 chars)
 * @returns A base64url-encoded random string
 *
 * @example
 * ```ts
 * const authCode = generateSecureRandomString(96); // ~128 characters
 * const token = generateSecureRandomString(192); // ~256 characters
 * ```
 */
export declare function generateSecureRandomString(byteLength?: number): string;
/**
 * Convert ArrayBuffer or Uint8Array to base64url string
 *
 * @param buffer - ArrayBuffer or Uint8Array to convert
 * @returns Base64url-encoded string
 */
export declare function arrayBufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string;
/**
 * Convert base64url string to Uint8Array
 *
 * @param base64url - Base64url-encoded string
 * @returns Uint8Array of decoded bytes
 */
export declare function base64UrlToArrayBuffer(base64url: string): Uint8Array;
/**
 * Decode a base64url string to a UTF-8 string
 *
 * @param base64url - Base64url-encoded string
 * @returns Decoded UTF-8 string
 */
export declare function decodeBase64Url(base64url: string): string;
/**
 * Timing-safe string comparison
 *
 * Compares two strings in constant time to prevent timing attacks.
 * This is critical for comparing sensitive values like client secrets,
 * passwords, or authentication tokens.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 *
 * @example
 * ```ts
 * const isValid = timingSafeEqual(clientSecret, providedSecret);
 * if (!isValid) {
 *   return c.json({ error: 'invalid_client' }, 401);
 * }
 * ```
 */
export declare function timingSafeEqual(a: string, b: string): boolean;
/**
 * Hash a password using PBKDF2 with SHA-256
 *
 * Uses cryptographically secure salt and high iteration count to resist
 * brute-force and rainbow table attacks.
 *
 * @param password - Plain text password
 * @returns Hashed password in format: version$iterations$salt$hash (all base64url encoded)
 *
 * @example
 * ```ts
 * const hash = await hashPassword('mySecurePassword');
 * // Returns: "pbkdf2v1$600000$<salt>$<hash>"
 * ```
 *
 * @see NIST SP 800-132: Recommendation for Password-Based Key Derivation
 * @see OWASP Password Storage Cheat Sheet
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Verify a password against a PBKDF2 hash
 *
 * Supports both new PBKDF2 format and legacy SHA-256 format for migration.
 *
 * @param password - Plain text password
 * @param hash - Hashed password (PBKDF2 or legacy SHA-256 format)
 * @returns True if password matches hash
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/**
 * Check if a password hash needs to be upgraded to the latest algorithm
 *
 * @param hash - Current password hash
 * @returns True if hash should be upgraded (e.g., on next successful login)
 */
export declare function passwordHashNeedsUpgrade(hash: string): boolean;
/**
 * Generate a cryptographically secure session ID with 128 bits of entropy
 *
 * Uses 128 bits (16 bytes) of random data encoded as base64url, meeting OWASP
 * recommendations for session identifier entropy. The result is a 22-character
 * URL-safe string.
 *
 * Advantages over UUID v4:
 * - 128 bits of entropy (vs 122 bits for UUIDv4)
 * - Shorter representation (22 chars vs 36 chars)
 * - URL-safe encoding (no special characters)
 * - No predictable version/variant bits
 *
 * @returns A 22-character base64url-encoded random string
 *
 * @example
 * ```ts
 * const sessionId = generateSecureSessionId();
 * // Returns: "X7g9_kPq2Lm4Rn8sT1wZ-A"
 * ```
 *
 * @see OWASP Session Management Cheat Sheet
 * @see RFC 4086: Randomness Requirements for Security
 */
export declare function generateSecureSessionId(): string;
/**
 * Generate PKCE code challenge from code verifier
 * Uses S256 method (SHA-256 hash, base64url-encoded)
 *
 * @param codeVerifier - The code verifier string
 * @returns Base64url-encoded SHA-256 hash of the code verifier
 *
 * @example
 * ```ts
 * const verifier = generateSecureRandomString(32); // 43-128 character string
 * const challenge = await generateCodeChallenge(verifier);
 * // Use challenge in authorization request
 * // Use verifier in token request
 * ```
 */
export declare function generateCodeChallenge(codeVerifier: string): Promise<string>;
//# sourceMappingURL=crypto.d.ts.map
