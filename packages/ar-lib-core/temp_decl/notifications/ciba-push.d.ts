/**
 * CIBA Push Mode Token Delivery
 * OpenID Connect CIBA Core 1.0
 *
 * In push mode, the OP sends the tokens directly to the client's callback endpoint
 * instead of requiring the client to poll the token endpoint.
 *
 * Security measures:
 * - SSRF protection: Blocks requests to internal/private addresses
 * - Timeout: Prevents hanging requests (5 seconds)
 * - Response size limit: Prevents DoS from large responses (64KB)
 * - HTTPS required: Ensures secure transport (configurable for dev)
 */
/**
 * Send tokens directly to client in push mode
 *
 * @param clientNotificationEndpoint - Client's callback URL (must be HTTPS in production)
 * @param clientNotificationToken - Bearer token for authentication
 * @param authReqId - Authentication request ID
 * @param accessToken - Access token
 * @param idToken - ID token
 * @param refreshToken - Refresh token (optional)
 * @param expiresIn - Token expiration time in seconds
 * @param options - Additional options
 * @returns Promise<void>
 */
export declare function sendPushModeTokens(
  clientNotificationEndpoint: string,
  clientNotificationToken: string,
  authReqId: string,
  accessToken: string,
  idToken: string,
  refreshToken: string | null,
  expiresIn: number,
  options?: {
    /** Allow http://localhost for development (default: false) */
    allowLocalhost?: boolean;
    /** Custom timeout in milliseconds (default: 5000) */
    timeoutMs?: number;
  }
): Promise<void>;
/**
 * Validate push mode requirements
 * @param clientNotificationEndpoint - Client's callback URL
 * @param clientNotificationToken - Bearer token for authentication
 * @returns boolean
 */
export declare function validatePushModeRequirements(
  clientNotificationEndpoint: string | null | undefined,
  clientNotificationToken: string | null | undefined
): boolean;
//# sourceMappingURL=ciba-push.d.ts.map
