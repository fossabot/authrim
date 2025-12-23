/**
 * Error Response Serializer
 *
 * Converts ErrorDescriptor to HTTP responses in OAuth or Problem Details format.
 *
 * Architecture:
 * ErrorFactory → ErrorDescriptor → Serializer → HTTP Response
 *
 * @packageDocumentation
 */
import type { ErrorDescriptor, ErrorResponseFormat, SerializeOptions } from './types';
/**
 * Serialize error descriptor to HTTP response
 *
 * @param descriptor - Error descriptor to serialize
 * @param options - Serialization options
 * @returns HTTP Response
 */
export declare function serializeError(
  descriptor: ErrorDescriptor,
  options: SerializeOptions
): Response;
/**
 * Serialize to OAuth/OIDC standard format
 *
 * RFC 6749 Section 5.2 compliant response format.
 *
 * @param descriptor - Error descriptor
 * @returns HTTP Response with OAuth error format
 */
export declare function serializeToOAuth(descriptor: ErrorDescriptor): Response;
/**
 * Serialize to RFC 9457 Problem Details format
 *
 * @param descriptor - Error descriptor
 * @param baseUrl - Base URL for type URIs
 * @returns HTTP Response with Problem Details format
 */
export declare function serializeToProblemDetails(
  descriptor: ErrorDescriptor,
  baseUrl?: string
): Response;
/**
 * Serialize to redirect response (for Authorization Endpoint errors)
 *
 * RFC 6749 Section 4.1.2.1 - Authorization endpoint errors are returned
 * as query parameters in a redirect.
 *
 * @param descriptor - Error descriptor
 * @param redirectUri - Redirect URI
 * @param responseMode - Response mode ('query' or 'fragment')
 * @returns HTTP Redirect Response
 */
export declare function serializeToRedirect(
  descriptor: ErrorDescriptor,
  redirectUri: string,
  responseMode?: 'query' | 'fragment'
): Response;
/**
 * Determine the appropriate response format for an endpoint
 *
 * OIDC core endpoints always use OAuth format (no Accept header switching).
 * Other endpoints can be switched via Accept header or settings.
 *
 * @param path - Request path
 * @param acceptHeader - Accept header value
 * @param defaultFormat - Default format from settings
 * @returns Appropriate response format
 */
export declare function determineFormat(
  path: string,
  acceptHeader: string | null,
  defaultFormat?: ErrorResponseFormat
): ErrorResponseFormat;
/**
 * Create serializer function with preset options
 *
 * @param options - Preset options
 * @returns Serializer function
 */
export declare function createSerializer(
  options?: Partial<SerializeOptions>
): (descriptor: ErrorDescriptor, overrides?: Partial<SerializeOptions>) => Response;
/**
 * Error response helper for Hono context
 *
 * Usage in Hono handlers:
 * ```ts
 * import { errorResponse } from '@authrim/ar-lib-core/errors';
 *
 * app.get('/api/resource', (c) => {
 *   const error = Errors.loginRequired();
 *   return errorResponse(c, error);
 * });
 * ```
 *
 * @param c - Hono context
 * @param descriptor - Error descriptor
 * @param options - Optional serialization options
 * @returns HTTP Response
 */
export declare function errorResponse(
  c: {
    req: {
      path: string;
      header: (name: string) => string | undefined;
    };
  },
  descriptor: ErrorDescriptor,
  options?: Partial<SerializeOptions>
): Response;
/**
 * Redirect error response helper for Authorization Endpoint
 *
 * @param redirectUri - Client redirect URI
 * @param descriptor - Error descriptor
 * @param responseMode - Response mode
 * @returns HTTP Redirect Response
 */
export declare function redirectErrorResponse(
  redirectUri: string,
  descriptor: ErrorDescriptor,
  responseMode?: 'query' | 'fragment'
): Response;
//# sourceMappingURL=serializer.d.ts.map
