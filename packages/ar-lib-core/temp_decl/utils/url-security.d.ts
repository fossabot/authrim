/**
 * URL Security Utilities
 * Provides protection against SSRF (Server-Side Request Forgery) attacks
 *
 * SSRF attacks occur when an attacker can make a server issue requests to
 * internal/private resources. This module provides validation to prevent
 * requests to internal addresses.
 */
/**
 * Check if a URL hostname points to an internal/private address
 *
 * @param url - The URL to check (string or URL object)
 * @returns true if the URL points to an internal address (should be blocked)
 *
 * @example
 * ```typescript
 * isInternalUrl('https://localhost/api');  // true
 * isInternalUrl('https://192.168.1.1/api');  // true
 * isInternalUrl('https://example.com/api');  // false
 * ```
 */
export declare function isInternalUrl(url: string | URL): boolean;
/**
 * Validate a URL for SSRF protection
 *
 * Returns an error object if the URL is invalid or points to an internal address.
 *
 * @param url - The URL to validate
 * @param options - Validation options
 * @returns null if valid, error object if invalid
 *
 * @example
 * ```typescript
 * const error = validateExternalUrl('https://localhost/api');
 * if (error) {
 *   return c.json({ error: error.error, error_description: error.error_description }, 400);
 * }
 * ```
 */
export declare function validateExternalUrl(
  url: string,
  options?: {
    /** Require HTTPS protocol (default: true) */
    requireHttps?: boolean;
    /** Allow http://localhost for development (default: false) */
    allowLocalhost?: boolean;
    /** Error type to return (default: 'invalid_request') */
    errorType?: string;
    /** Field name for error messages */
    fieldName?: string;
  }
): {
  error: string;
  error_description: string;
} | null;
/**
 * Safe fetch options extending RequestInit
 */
export interface SafeFetchOptions extends RequestInit {
  /** Require HTTPS protocol (default: true) */
  requireHttps?: boolean;
  /** Allow http://localhost for development (default: false) */
  allowLocalhost?: boolean;
  /** Request timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
  /** Maximum response size in bytes (default: 1MB). Set to 0 to disable. */
  maxResponseSize?: number;
}
/**
 * Safe fetch wrapper with SSRF protection, timeout, and response size limits
 *
 * Validates the URL before making the request and prevents requests to internal addresses.
 * Includes timeout to prevent hanging requests and response size limits to prevent DoS.
 *
 * @param url - The URL to fetch
 * @param options - Fetch options plus SSRF validation options
 * @returns Fetch response
 * @throws Error if URL is invalid, points to an internal address, times out, or exceeds size limit
 *
 * @example
 * ```typescript
 * try {
 *   const response = await safeFetch('https://example.com/api', {
 *     requireHttps: true,
 *     timeoutMs: 5000,
 *     headers: { Accept: 'application/json' }
 *   });
 *   const data = await response.json();
 * } catch (error) {
 *   // Handle SSRF block, timeout, or fetch error
 * }
 * ```
 */
export declare function safeFetch(url: string, options?: SafeFetchOptions): Promise<Response>;
/**
 * Safe fetch for JSON responses with size-limited parsing
 *
 * Fetches a URL and parses the response as JSON, with SSRF protection,
 * timeout, and response size limits.
 *
 * @param url - The URL to fetch
 * @param options - Safe fetch options
 * @returns Parsed JSON response
 * @throws Error if URL is invalid, fetch fails, or JSON parsing fails
 *
 * @example
 * ```typescript
 * const data = await safeFetchJson<{ id: string }>('https://example.com/api');
 * ```
 */
export declare function safeFetchJson<T = unknown>(
  url: string,
  options?: SafeFetchOptions
): Promise<T>;
//# sourceMappingURL=url-security.d.ts.map
