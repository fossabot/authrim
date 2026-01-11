/**
 * Locale Detection for CLI and Web
 */

import { type Locale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from './types.js';

/**
 * Check if a locale code is supported
 */
export function isValidLocale(code: string): code is Locale {
  return SUPPORTED_LOCALES.some((l) => l.code === code);
}

/**
 * Normalize locale code to our supported format
 * e.g., "ja_JP.UTF-8" -> "ja", "zh_CN" -> "zh-CN"
 */
export function normalizeLocale(code: string): Locale | null {
  if (!code) return null;

  // Remove encoding suffix (e.g., .UTF-8)
  const withoutEncoding = code.split('.')[0];

  // Convert underscore to hyphen
  const normalized = withoutEncoding.replace('_', '-');

  // Check for exact match first
  if (isValidLocale(normalized)) {
    return normalized;
  }

  // Try base language only (e.g., "ja-JP" -> "ja")
  const baseLang = normalized.split('-')[0];
  if (isValidLocale(baseLang)) {
    return baseLang;
  }

  // Special handling for Chinese variants
  if (baseLang === 'zh') {
    const region = normalized.split('-')[1]?.toUpperCase();
    if (region === 'TW' || region === 'HK') {
      return 'zh-TW';
    }
    return 'zh-CN'; // Default to Simplified Chinese
  }

  return null;
}

/**
 * Detect locale from CLI environment variables
 * Priority: AUTHRIM_LANG > LC_ALL > LC_MESSAGES > LANG
 */
export function detectSystemLocale(): Locale {
  const env = process.env;

  // Check our custom env var first
  if (env.AUTHRIM_LANG) {
    const locale = normalizeLocale(env.AUTHRIM_LANG);
    if (locale) return locale;
  }

  // Check standard locale env vars
  const localeEnvVars = ['LC_ALL', 'LC_MESSAGES', 'LANG'];

  for (const varName of localeEnvVars) {
    const value = env[varName];
    if (value && value !== 'C' && value !== 'POSIX') {
      const locale = normalizeLocale(value);
      if (locale) return locale;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Parse Accept-Language header and return best matching locale
 * Example: "ja,en-US;q=0.9,en;q=0.8" -> "ja"
 */
export function detectBrowserLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.trim(),
        quality: qValue ? parseFloat(qValue) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find first matching supported locale
  for (const { code } of languages) {
    const locale = normalizeLocale(code);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Get locale from query parameter
 */
export function getLocaleFromQuery(query: Record<string, string> | URLSearchParams): Locale | null {
  const lang = query instanceof URLSearchParams ? query.get('lang') : query['lang'];

  if (lang) {
    const locale = normalizeLocale(lang);
    if (locale) return locale;
  }

  return null;
}
