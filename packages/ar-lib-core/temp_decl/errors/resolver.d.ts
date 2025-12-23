/**
 * Error Message Resolver
 *
 * Handles message localization and placeholder replacement.
 *
 * @packageDocumentation
 */
import type { ErrorLocale, ErrorMessages } from './types';
/**
 * Get message by key and locale
 *
 * @param key - Message key (e.g., 'auth.session_expired.title')
 * @param locale - Target locale
 * @param variables - Optional placeholder values
 * @returns Resolved message string
 */
export declare function getMessage(
  key: string,
  locale?: ErrorLocale,
  variables?: Record<string, string | number>
): string;
/**
 * Get RFC error message by error code
 *
 * @param rfcError - RFC error code (e.g., 'invalid_request')
 * @param locale - Target locale
 * @returns RFC error message
 */
export declare function getRFCErrorMessage(rfcError: string, locale?: ErrorLocale): string;
/**
 * Get title message for an error
 *
 * @param titleKey - Title message key
 * @param locale - Target locale
 * @returns Title string
 */
export declare function getTitle(titleKey: string, locale?: ErrorLocale): string;
/**
 * Get detail message for an error
 *
 * @param detailKey - Detail message key
 * @param locale - Target locale
 * @param variables - Optional placeholder values
 * @returns Detail string
 */
export declare function getDetail(
  detailKey: string,
  locale?: ErrorLocale,
  variables?: Record<string, string | number>
): string;
/**
 * Replace placeholders in message
 *
 * Placeholders use {key} format.
 * Example: "Retry after {retry_after} seconds" -> "Retry after 30 seconds"
 *
 * @param message - Message with placeholders
 * @param variables - Values to substitute
 * @returns Message with substituted values
 */
export declare function replacePlaceholders(
  message: string,
  variables: Record<string, string | number>
): string;
/**
 * Check if locale is supported
 *
 * @param locale - Locale to check
 * @returns True if locale is supported
 */
export declare function isLocaleSupported(locale: string): locale is ErrorLocale;
/**
 * Get all supported locales
 *
 * @returns Array of supported locale codes
 */
export declare function getSupportedLocales(): ErrorLocale[];
/**
 * Register custom messages for a locale
 *
 * This allows adding or overriding messages at runtime.
 * Useful for adding custom error messages or supporting additional locales.
 *
 * @param locale - Target locale
 * @param messages - Messages to add/override
 */
export declare function registerMessages(
  locale: ErrorLocale,
  messages: Partial<ErrorMessages>
): void;
/**
 * Create a resolver instance with a fixed locale
 *
 * @param locale - Fixed locale for this resolver
 * @returns Object with resolver methods
 */
export declare function createResolver(locale?: ErrorLocale): {
  getMessage: (key: string, variables?: Record<string, string | number>) => string;
  getRFCErrorMessage: (rfcError: string) => string;
  getTitle: (titleKey: string) => string;
  getDetail: (detailKey: string, variables?: Record<string, string | number>) => string;
  locale: ErrorLocale;
};
//# sourceMappingURL=resolver.d.ts.map
