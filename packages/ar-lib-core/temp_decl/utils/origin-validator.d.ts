/**
 * Origin Validator Utility
 * Validates request origins against an allowlist with wildcard support
 */
/**
 * Check if an origin matches an allowed pattern
 * Supports exact matches and wildcard patterns (e.g., https://*.example.com)
 *
 * @param origin - The origin to validate (e.g., "https://example.com")
 * @param allowedPatterns - Array of allowed origin patterns
 * @returns true if origin is allowed, false otherwise
 */
export declare function isAllowedOrigin(
  origin: string | undefined,
  allowedPatterns: string[]
): boolean;
/**
 * Parse ALLOWED_ORIGINS environment variable into array
 * Supports comma-separated values
 *
 * @param allowedOriginsEnv - Environment variable value
 * @returns Array of allowed origin patterns
 */
export declare function parseAllowedOrigins(allowedOriginsEnv: string | undefined): string[];
//# sourceMappingURL=origin-validator.d.ts.map
