/**
 * Error Security Configuration
 *
 * Handles error message masking and security classification.
 * Prevents information leakage to potential attackers.
 *
 * @packageDocumentation
 */

import type { ErrorCodeDefinition, ErrorDescriptor, ErrorIdMode, ErrorLocale } from './types';
import { SECURITY_TRACKED_ERRORS } from './types';

/**
 * Generic error messages for masked errors
 */
const MASKED_MESSAGES: Record<string, { title: string; detail: string }> = {
  invalid_client: {
    title: 'Client Authentication Failed',
    detail: 'Client authentication failed.',
  },
  invalid_grant: {
    title: 'Invalid Grant',
    detail: 'The provided authorization grant is invalid, expired, or revoked.',
  },
  access_denied: {
    title: 'Access Denied',
    detail: 'Access denied.',
  },
  server_error: {
    title: 'Server Error',
    detail: 'An unexpected error occurred.',
  },
};

/**
 * Generic error messages for masked errors (Japanese)
 */
const MASKED_MESSAGES_JA: Record<string, { title: string; detail: string }> = {
  invalid_client: {
    title: 'クライアント認証失敗',
    detail: 'クライアント認証に失敗しました。',
  },
  invalid_grant: {
    title: '無効なグラント',
    detail: '認可グラントが無効、期限切れ、または取り消されています。',
  },
  access_denied: {
    title: 'アクセス拒否',
    detail: 'アクセスが拒否されました。',
  },
  server_error: {
    title: 'サーバーエラー',
    detail: '予期しないエラーが発生しました。',
  },
};

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
export function applySecurityMasking(
  descriptor: ErrorDescriptor,
  definition: ErrorCodeDefinition,
  locale: ErrorLocale = 'en'
): ErrorDescriptor {
  switch (definition.securityLevel) {
    case 'public':
      // No masking needed
      return descriptor;

    case 'masked': {
      // Replace with generic message for this RFC error type
      const maskedMessages = locale === 'ja' ? MASKED_MESSAGES_JA : MASKED_MESSAGES;
      const masked = maskedMessages[definition.rfcError] || maskedMessages.server_error;

      return {
        ...descriptor,
        title: masked.title,
        detail: masked.detail,
      };
    }

    case 'internal': {
      // Replace with generic server error - don't leak any details
      const maskedMessages = locale === 'ja' ? MASKED_MESSAGES_JA : MASKED_MESSAGES;
      const serverError = maskedMessages.server_error;

      return {
        ...descriptor,
        code: 'AR900001', // Generic internal error code
        rfcError: 'server_error',
        typeSlug: 'internal/error',
        title: serverError.title,
        detail: serverError.detail,
        status: 500,
        meta: {
          retryable: true,
          user_action: 'retry',
          severity: 'error',
        },
      };
    }

    default:
      return descriptor;
  }
}

/**
 * Generate error ID based on error_id_mode setting
 *
 * @param mode - Error ID generation mode
 * @param rfcError - RFC error code
 * @param typeSlug - Type URI slug
 * @param status - HTTP status code
 * @returns Generated error ID or undefined
 */
export function generateErrorId(
  mode: ErrorIdMode,
  rfcError: string,
  typeSlug: string,
  status: number
): string | undefined {
  switch (mode) {
    case 'all':
      return createTraceId();

    case '5xx':
      if (status >= 500) {
        return createTraceId();
      }
      return undefined;

    case 'security_only':
      // Check if this is a security-tracked error
      if (
        SECURITY_TRACKED_ERRORS.includes(rfcError as (typeof SECURITY_TRACKED_ERRORS)[number]) ||
        SECURITY_TRACKED_ERRORS.includes(typeSlug as (typeof SECURITY_TRACKED_ERRORS)[number])
      ) {
        return createTraceId();
      }
      return undefined;

    case 'none':
    default:
      return undefined;
  }
}

/**
 * Create a unique trace ID
 *
 * Format: timestamp (base36) + random (base36)
 * Example: "lxf2a1b3c4d5"
 *
 * @returns Unique trace ID
 */
function createTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}${random}`;
}

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
export function shouldLogFullDetails(
  definition: ErrorCodeDefinition,
  isProduction: boolean
): boolean {
  if (!isProduction) {
    return true;
  }

  // In production, only log full details for public errors
  return definition.securityLevel === 'public';
}

/**
 * Sanitize error for logging
 *
 * Removes sensitive information from error descriptor for logging.
 *
 * @param descriptor - Error descriptor
 * @param isProduction - Whether running in production
 * @returns Sanitized error object for logging
 */
export function sanitizeForLogging(
  descriptor: ErrorDescriptor,
  isProduction: boolean
): Record<string, unknown> {
  if (!isProduction) {
    // In development, log everything
    return {
      code: descriptor.code,
      rfcError: descriptor.rfcError,
      status: descriptor.status,
      detail: descriptor.detail,
      errorId: descriptor.errorId,
    };
  }

  // In production, only log minimal information
  return {
    code: descriptor.code,
    rfcError: descriptor.rfcError,
    status: descriptor.status,
    errorId: descriptor.errorId,
    // Don't log detail in production - may contain PII
  };
}

/**
 * Get masked RFC error message
 *
 * @param rfcError - RFC error code
 * @param locale - Target locale
 * @returns Masked message
 */
export function getMaskedMessage(
  rfcError: string,
  locale: ErrorLocale = 'en'
): { title: string; detail: string } {
  const maskedMessages = locale === 'ja' ? MASKED_MESSAGES_JA : MASKED_MESSAGES;
  return maskedMessages[rfcError] || maskedMessages.server_error;
}
