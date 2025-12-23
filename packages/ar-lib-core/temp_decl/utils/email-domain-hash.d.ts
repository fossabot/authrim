/**
 * Email Domain Hash Utility
 *
 * Generates blind indexes for email domains to enable domain-based
 * policy evaluation without storing PII.
 *
 * Algorithm: HMAC-SHA256(lowercase(domain), secret_key)
 * Output: 64-character hex string
 *
 * Supports key rotation with versioned secrets.
 */
import type { Env } from '../types/env';
import type { EmailDomainHashConfig } from '../types/jit-config';
/**
 * Extract and normalize domain from email address
 *
 * @param email - Email address (e.g., "User@Example.COM")
 * @returns Normalized domain (e.g., "example.com")
 * @throws Error if email format is invalid
 */
export declare function normalizeDomain(email: string): string;
/**
 * Generate email domain hash from email address
 *
 * @param email - Email address
 * @param secretKey - HMAC secret key
 * @returns 64-character hex string (blind index)
 */
export declare function generateEmailDomainHash(email: string, secretKey: string): Promise<string>;
/**
 * Generate email domain hash with specific version
 *
 * @param email - Email address
 * @param config - Email domain hash configuration
 * @param version - Optional version (defaults to current_version)
 * @returns Hash and version used
 */
export declare function generateEmailDomainHashWithVersion(
  email: string,
  config: EmailDomainHashConfig,
  version?: number
): Promise<{
  hash: string;
  version: number;
}>;
/**
 * Generate hashes for all active versions
 * Used during migration to enable lookup by any version
 *
 * @param email - Email address
 * @param config - Email domain hash configuration
 * @returns Array of hashes with their versions
 */
export declare function generateEmailDomainHashAllVersions(
  email: string,
  config: EmailDomainHashConfig
): Promise<
  Array<{
    hash: string;
    version: number;
  }>
>;
/**
 * Get email domain hash configuration
 *
 * Priority: KV → ENV → Error
 *
 * @param env - Environment bindings
 * @returns EmailDomainHashConfig
 * @throws Error if no secret is configured
 */
export declare function getEmailDomainHashConfig(env: Env): Promise<EmailDomainHashConfig>;
/**
 * Get secret for current version
 * Convenience function for simple use cases
 *
 * @param env - Environment bindings
 * @returns Secret key string
 */
export declare function getEmailDomainHashSecret(env: Env): Promise<string>;
/**
 * Check if a hash version needs migration
 *
 * @param userVersion - User's current hash version
 * @param config - Email domain hash configuration
 * @returns True if user should be migrated to current version
 */
export declare function needsMigration(userVersion: number, config: EmailDomainHashConfig): boolean;
/**
 * Check if a version is deprecated
 *
 * @param version - Version to check
 * @param config - Email domain hash configuration
 * @returns True if version is in deprecated list
 */
export declare function isDeprecatedVersion(
  version: number,
  config: EmailDomainHashConfig
): boolean;
/**
 * Build SQL WHERE clause for domain hash lookup
 * Handles multiple versions during migration
 *
 * @param domainHash - Primary domain hash to search
 * @param config - Email domain hash configuration
 * @param allHashes - Optional array of hashes for all versions
 * @returns SQL condition string and bind values
 */
export declare function buildDomainHashLookupCondition(
  domainHash: string,
  config: EmailDomainHashConfig,
  allHashes?: Array<{
    hash: string;
    version: number;
  }>
): {
  condition: string;
  values: string[];
};
/**
 * Validate email domain hash format
 *
 * @param hash - Hash to validate
 * @returns True if valid 64-character hex string
 */
export declare function isValidDomainHash(hash: string): boolean;
/**
 * Validate email domain hash configuration
 *
 * @param config - Configuration to validate
 * @returns Array of validation errors (empty if valid)
 */
export declare function validateDomainHashConfig(config: EmailDomainHashConfig): string[];
//# sourceMappingURL=email-domain-hash.d.ts.map
