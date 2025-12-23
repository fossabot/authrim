/**
 * Error Factory
 *
 * Creates normalized ErrorDescriptor instances.
 * The factory does NOT produce HTTP responses - serialization happens at the endpoint layer.
 *
 * Design Principle:
 * ErrorFactory → ErrorDescriptor → Endpoint Layer (serialize to OAuth/Problem Details)
 *
 * @packageDocumentation
 */
import type { ErrorDescriptor, ErrorFactoryOptions, ErrorIdMode, ErrorLocale } from './types';
import type { ARErrorCode, RFCErrorCode } from './codes';
import { AR_ERROR_CODES, RFC_ERROR_CODES } from './codes';
/**
 * Error Factory class
 *
 * Produces ErrorDescriptor instances with proper localization and security masking.
 */
export declare class ErrorFactory {
  private locale;
  private errorIdMode;
  constructor(options?: { locale?: ErrorLocale; errorIdMode?: ErrorIdMode });
  /**
   * Create error descriptor from AR error code
   *
   * @param code - Authrim error code (e.g., AR_ERROR_CODES.AUTH_SESSION_EXPIRED)
   * @param options - Additional options
   * @returns ErrorDescriptor
   */
  create(code: ARErrorCode, options?: ErrorFactoryOptions): ErrorDescriptor;
  /**
   * Create error descriptor from RFC error code
   *
   * Used when only RFC error code is known (e.g., from external validation).
   *
   * @param rfcError - RFC error code
   * @param status - HTTP status code
   * @param customDetail - Optional custom detail message
   * @param options - Additional options
   * @returns ErrorDescriptor
   */
  createFromRFC(
    rfcError: RFCErrorCode,
    status: number,
    customDetail?: string,
    options?: ErrorFactoryOptions
  ): ErrorDescriptor;
  /**
   * Create internal error descriptor
   *
   * Used for unexpected errors or when error code is not found.
   *
   * @param options - Additional options
   * @returns ErrorDescriptor
   */
  createInternalError(options?: ErrorFactoryOptions): ErrorDescriptor;
  /**
   * Update locale
   *
   * @param locale - New locale
   */
  setLocale(locale: ErrorLocale): void;
  /**
   * Update error ID mode
   *
   * @param mode - New error ID mode
   */
  setErrorIdMode(mode: ErrorIdMode): void;
  /**
   * Get current locale
   */
  getLocale(): ErrorLocale;
  /**
   * Get current error ID mode
   */
  getErrorIdMode(): ErrorIdMode;
  /**
   * Replace placeholders in a string
   */
  private replacePlaceholders;
}
/**
 * Configure default factory
 *
 * @param options - Factory options
 */
export declare function configureFactory(options: {
  locale?: ErrorLocale;
  errorIdMode?: ErrorIdMode;
}): void;
/**
 * Create error descriptor using default factory
 *
 * @param code - AR error code
 * @param options - Additional options
 * @returns ErrorDescriptor
 */
export declare function createError(
  code: ARErrorCode,
  options?: ErrorFactoryOptions
): ErrorDescriptor;
/**
 * Create error from RFC error code using default factory
 *
 * @param rfcError - RFC error code
 * @param status - HTTP status code
 * @param customDetail - Optional custom detail
 * @param options - Additional options
 * @returns ErrorDescriptor
 */
export declare function createRFCError(
  rfcError: RFCErrorCode,
  status: number,
  customDetail?: string,
  options?: ErrorFactoryOptions
): ErrorDescriptor;
/**
 * Pre-built error creators for common errors
 *
 * These provide a convenient API for creating common errors.
 */
export declare const Errors: {
  sessionExpired: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  sessionNotFound: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  loginRequired: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  mfaRequired: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  passkeyFailed: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  invalidCode: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  codeExpired: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  pkceRequired: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  pkceInvalid: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  tokenInvalid: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  tokenExpired: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  tokenRevoked: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  tokenReuseDetected: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  dpopRequired: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  dpopInvalid: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  dpopNonceRequired: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  clientAuthFailed: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  clientInvalid: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  redirectUriInvalid: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  clientMetadataInvalid: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  grantNotAllowed: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  scopeNotAllowed: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  invalidCredentials: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  userLocked: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  userInactive: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  featureDisabled: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  insufficientPermissions: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  invalidApiKey: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  rateLimitExceeded: (retryAfter?: number, options?: ErrorFactoryOptions) => ErrorDescriptor;
  slowDown: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  adminAuthRequired: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  adminInsufficientPermissions: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  adminResourceNotFound: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  internalError: (options?: ErrorFactoryOptions) => ErrorDescriptor;
  serverError: (options?: ErrorFactoryOptions) => ErrorDescriptor;
};
export { AR_ERROR_CODES, RFC_ERROR_CODES };
//# sourceMappingURL=factory.d.ts.map
