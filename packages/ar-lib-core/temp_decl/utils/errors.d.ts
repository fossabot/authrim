/**
 * OIDC Error Handling Utilities
 *
 * Provides centralized error handling for OpenID Connect and OAuth 2.0 errors.
 * Ensures consistent error responses across all endpoints.
 */
import type { Context } from 'hono';
/**
 * OIDC Error class
 * Represents an OAuth 2.0 or OpenID Connect error with standardized properties
 */
export declare class OIDCError extends Error {
  readonly error: string;
  readonly error_description?: string;
  readonly error_uri?: string;
  readonly statusCode: number;
  constructor(error: string, error_description?: string, statusCode?: number, error_uri?: string);
  /**
   * Convert error to JSON response object
   */
  toJSON(): {
    error: string;
    error_description?: string;
    error_uri?: string;
  };
}
/**
 * Handle OIDC error and return JSON response
 */
export declare function handleOIDCError(_c: Context, error: OIDCError): Response;
/**
 * Handle token endpoint error
 * Includes no-cache headers as per OAuth 2.0 spec
 */
export declare function handleTokenError(_c: Context, error: OIDCError): Response;
/**
 * Handle UserInfo endpoint error
 * Includes WWW-Authenticate header as per OAuth 2.0 Bearer Token spec
 */
export declare function handleUserInfoError(_c: Context, error: OIDCError): Response;
/**
 * Redirect with error parameters (for authorization endpoint)
 * https://tools.ietf.org/html/rfc6749#section-4.1.2.1
 */
export declare function redirectWithError(
  redirectUri: string,
  error: string,
  errorDescription?: string,
  state?: string,
  errorUri?: string
): Response;
/**
 * Pre-defined error factory functions for common errors
 */
export declare const ErrorFactory: {
  /**
   * Invalid request error
   */
  invalidRequest: (description?: string) => OIDCError;
  /**
   * Invalid client error
   */
  invalidClient: (description?: string) => OIDCError;
  /**
   * Invalid grant error
   */
  invalidGrant: (description?: string) => OIDCError;
  /**
   * Unauthorized client error
   */
  unauthorizedClient: (description?: string) => OIDCError;
  /**
   * Unsupported grant type error
   */
  unsupportedGrantType: (description?: string) => OIDCError;
  /**
   * Invalid scope error
   */
  invalidScope: (description?: string) => OIDCError;
  /**
   * Invalid token error
   */
  invalidToken: (description?: string) => OIDCError;
  /**
   * Server error
   */
  serverError: (description?: string) => OIDCError;
  /**
   * Access denied error
   */
  accessDenied: (description?: string) => OIDCError;
  /**
   * Unsupported response type error
   */
  unsupportedResponseType: (description?: string) => OIDCError;
  /**
   * Interaction required error (OIDC specific)
   */
  interactionRequired: (description?: string) => OIDCError;
  /**
   * Login required error (OIDC specific)
   */
  loginRequired: (description?: string) => OIDCError;
};
/**
 * Wrap async handler with error handling
 */
export declare function withErrorHandling<T extends Context>(
  handler: (c: T) => Promise<Response>,
  errorHandler?: (c: T, error: OIDCError) => Response
): (c: T) => Promise<Response>;
//# sourceMappingURL=errors.d.ts.map
