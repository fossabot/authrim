/**
 * Authrim Error System
 *
 * Centralized error handling for OAuth/OIDC and Authrim-specific errors.
 *
 * Architecture:
 * ```
 * ErrorFactory → ErrorDescriptor → Serializer → HTTP Response
 * ```
 *
 * Key exports for SDK public exposure:
 * - ErrorDescriptor: Normalized error structure
 * - ErrorMeta: Metadata for AI Agents and SDKs
 * - UserAction: Recommended recovery actions
 * - Severity: Error severity levels
 *
 * @packageDocumentation
 */
export type {
  ErrorDescriptor,
  ErrorMeta,
  UserAction,
  Severity,
  OAuthErrorResponse,
  ProblemDetailsResponse,
  ErrorResponseFormat,
  ErrorLocale,
  ErrorIdMode,
  ErrorSecurityLevel,
  ErrorCodeDefinition,
  ErrorFactoryOptions,
  SerializeOptions,
  ErrorMessages,
  SecurityTrackedError,
  OIDCCoreEndpoint,
} from './types';
export { SECURITY_TRACKED_ERRORS, OIDC_CORE_ENDPOINTS } from './types';
export {
  RFC_ERROR_CODES,
  type RFCErrorCode,
  AR_ERROR_CODES,
  type ARErrorCode,
  ERROR_DEFINITIONS,
  getErrorDefinition,
  getErrorDefinitionBySlug,
} from './codes';
export { ErrorFactory, configureFactory, createError, createRFCError, Errors } from './factory';
export {
  serializeError,
  serializeToOAuth,
  serializeToProblemDetails,
  serializeToRedirect,
  determineFormat,
  createSerializer,
  errorResponse,
  redirectErrorResponse,
} from './serializer';
export {
  getMessage,
  getRFCErrorMessage,
  getTitle,
  getDetail,
  replacePlaceholders,
  isLocaleSupported,
  getSupportedLocales,
  registerMessages,
  createResolver,
} from './resolver';
export {
  applySecurityMasking,
  generateErrorId,
  shouldLogFullDetails,
  sanitizeForLogging,
  getMaskedMessage,
} from './security';
export {
  AuthrimError,
  RFCError,
  errorMiddleware,
  createErrorFactoryFromContext,
  createErrorResponse,
  createRFCErrorResponse,
} from './middleware';
export { errorMessagesEn } from './messages/en';
export { errorMessagesJa } from './messages/ja';
//# sourceMappingURL=index.d.ts.map
