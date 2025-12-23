/**
 * CIBA Ping Mode Notification
 * OpenID Connect CIBA Core 1.0
 *
 * In ping mode, the OP sends a notification to the client's callback endpoint
 * when the authentication request has been approved or denied.
 *
 * Security measures:
 * - SSRF protection: Blocks requests to internal/private addresses
 * - Timeout: Prevents hanging requests (5 seconds)
 * - Response size limit: Prevents DoS from large responses (64KB)
 * - HTTPS required: Ensures secure transport (configurable for dev)
 */
/**
 * Send ping notification to client
 *
 * @param clientNotificationEndpoint - Client's callback URL (must be HTTPS in production)
 * @param clientNotificationToken - Bearer token for authentication
 * @param authReqId - Authentication request ID
 * @param options - Additional options
 * @returns Promise<void>
 */
export declare function sendPingNotification(
  clientNotificationEndpoint: string,
  clientNotificationToken: string,
  authReqId: string,
  options?: {
    /** Allow http://localhost for development (default: false) */
    allowLocalhost?: boolean;
    /** Custom timeout in milliseconds (default: 5000) */
    timeoutMs?: number;
  }
): Promise<void>;
/**
 * Validate ping mode requirements
 * @param clientNotificationEndpoint - Client's callback URL
 * @param clientNotificationToken - Bearer token for authentication
 * @returns boolean
 */
export declare function validatePingModeRequirements(
  clientNotificationEndpoint: string | null | undefined,
  clientNotificationToken: string | null | undefined
): boolean;
//# sourceMappingURL=ciba-ping.d.ts.map
