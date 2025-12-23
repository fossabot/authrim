/**
 * Error Security Configuration
 *
 * Handles error message masking and security classification.
 * Prevents information leakage to potential attackers.
 *
 * @packageDocumentation
 */
import type { ErrorCodeDefinition, ErrorDescriptor, ErrorIdMode, ErrorLocale } from './types';
/**
 * Apply security masking to error descriptor
 *
 * Based on the security level:
 * - public: No changes
 * - masked: Replace with generic message
 * - internal: Replace with generic server error
 *
 * @param descriptor - Original error descriptor
 * @param definition - Error code definition with security level
 * @param locale - Target locale
 * @returns Masked error descriptor
 */
export declare function applySecurityMasking(
  descriptor: ErrorDescriptor,
  definition: ErrorCodeDefinition,
  locale?: ErrorLocale
): ErrorDescriptor;
/**
 * Generate error ID based on error_id_mode setting
 *
 * @param mode - Error ID generation mode
 * @param rfcError - RFC error code
 * @param typeSlug - Type URI slug
 * @param status - HTTP status code
 * @returns Generated error ID or undefined
 */
export declare function generateErrorId(
  mode: ErrorIdMode,
  rfcError: string,
  typeSlug: string,
  status: number
): string | undefined;
/**
 * Check if an error should be logged with full details
 *
 * In production, certain errors should only log minimal information
 * to prevent PII leakage in logs.
 *
 * @param definition - Error code definition
 * @param isProduction - Whether running in production
 * @returns True if full details should be logged
 */
export declare function shouldLogFullDetails(
  definition: ErrorCodeDefinition,
  isProduction: boolean
): boolean;
/**
 * Sanitize error for logging
 *
 * Removes sensitive information from error descriptor for logging.
 *
 * @param descriptor - Error descriptor
 * @param isProduction - Whether running in production
 * @returns Sanitized error object for logging
 */
export declare function sanitizeForLogging(
  descriptor: ErrorDescriptor,
  isProduction: boolean
): Record<string, unknown>;
/**
 * Get masked RFC error message
 *
 * @param rfcError - RFC error code
 * @param locale - Target locale
 * @returns Masked message
 */
export declare function getMaskedMessage(
  rfcError: string,
  locale?: ErrorLocale
): {
  title: string;
  detail: string;
};
//# sourceMappingURL=security.d.ts.map
