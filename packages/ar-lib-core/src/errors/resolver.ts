/**
 * Error Message Resolver
 *
 * Handles message localization and placeholder replacement.
 *
 * @packageDocumentation
 */

import type { ErrorLocale, ErrorMessages } from './types';
import { errorMessagesEn } from './messages/en';
import { errorMessagesJa } from './messages/ja';

/**
 * Message registry by locale
 */
const messageRegistry: Record<ErrorLocale, ErrorMessages> = {
  en: errorMessagesEn,
  ja: errorMessagesJa,
};

/**
 * Default locale when not specified
 */
const DEFAULT_LOCALE: ErrorLocale = 'en';

/**
 * Get message by key and locale
 *
 * @param key - Message key (e.g., 'auth.session_expired.title')
 * @param locale - Target locale
 * @param variables - Optional placeholder values
 * @returns Resolved message string
 */
export function getMessage(
  key: string,
  locale: ErrorLocale = DEFAULT_LOCALE,
  variables?: Record<string, string | number>
): string {
  // Try to get message from specified locale
  let message = messageRegistry[locale]?.[key];

  // Fallback to English if not found
  if (!message && locale !== 'en') {
    message = messageRegistry.en[key];
  }

  // If still not found, return the key itself
  if (!message) {
    return key;
  }

  // Replace placeholders
  if (variables) {
    message = replacePlaceholders(message, variables);
  }

  return message;
}

/**
 * Get RFC error message by error code
 *
 * @param rfcError - RFC error code (e.g., 'invalid_request')
 * @param locale - Target locale
 * @returns RFC error message
 */
export function getRFCErrorMessage(rfcError: string, locale: ErrorLocale = DEFAULT_LOCALE): string {
  return getMessage(rfcError, locale);
}

/**
 * Get title message for an error
 *
 * @param titleKey - Title message key
 * @param locale - Target locale
 * @returns Title string
 */
export function getTitle(titleKey: string, locale: ErrorLocale = DEFAULT_LOCALE): string {
  return getMessage(titleKey, locale);
}

/**
 * Get detail message for an error
 *
 * @param detailKey - Detail message key
 * @param locale - Target locale
 * @param variables - Optional placeholder values
 * @returns Detail string
 */
export function getDetail(
  detailKey: string,
  locale: ErrorLocale = DEFAULT_LOCALE,
  variables?: Record<string, string | number>
): string {
  return getMessage(detailKey, locale, variables);
}

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
export function replacePlaceholders(
  message: string,
  variables: Record<string, string | number>
): string {
  return message.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Check if locale is supported
 *
 * @param locale - Locale to check
 * @returns True if locale is supported
 */
export function isLocaleSupported(locale: string): locale is ErrorLocale {
  return locale in messageRegistry;
}

/**
 * Get all supported locales
 *
 * @returns Array of supported locale codes
 */
export function getSupportedLocales(): ErrorLocale[] {
  return Object.keys(messageRegistry) as ErrorLocale[];
}

/**
 * Register custom messages for a locale
 *
 * This allows adding or overriding messages at runtime.
 * Useful for adding custom error messages or supporting additional locales.
 *
 * @param locale - Target locale
 * @param messages - Messages to add/override
 */
export function registerMessages(locale: ErrorLocale, messages: Partial<ErrorMessages>): void {
  if (!messageRegistry[locale]) {
    messageRegistry[locale] = {} as ErrorMessages;
  }
  Object.assign(messageRegistry[locale], messages);
}

/**
 * Create a resolver instance with a fixed locale
 *
 * @param locale - Fixed locale for this resolver
 * @returns Object with resolver methods
 */
export function createResolver(locale: ErrorLocale = DEFAULT_LOCALE) {
  return {
    getMessage: (key: string, variables?: Record<string, string | number>) =>
      getMessage(key, locale, variables),
    getRFCErrorMessage: (rfcError: string) => getRFCErrorMessage(rfcError, locale),
    getTitle: (titleKey: string) => getTitle(titleKey, locale),
    getDetail: (detailKey: string, variables?: Record<string, string | number>) =>
      getDetail(detailKey, locale, variables),
    locale,
  };
}
