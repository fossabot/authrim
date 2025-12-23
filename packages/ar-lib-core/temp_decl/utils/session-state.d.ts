/**
 * OIDC Session Management 1.0 - Session State Utilities
 * https://openid.net/specs/openid-connect-session-1_0.html
 *
 * Provides functions for calculating and validating session state values
 * used in the OIDC Session Management specification.
 */
/**
 * Calculate the session state value according to OIDC Session Management 1.0
 *
 * The session state is calculated as:
 * session_state = hash(client_id + " " + origin + " " + op_browser_state [+ " " + salt]) . salt
 *
 * @param clientId - The client identifier
 * @param origin - The origin of the RP (e.g., "https://example.com")
 * @param opBrowserState - The OP's browser state (typically the session ID)
 * @param salt - Optional salt value (will be generated if not provided)
 * @returns The session state value in format "hash.salt"
 *
 * @example
 * ```ts
 * const sessionState = await calculateSessionState(
 *   'client123',
 *   'https://rp.example.com',
 *   'session-abc-123'
 * );
 * // Returns: "a3f2b1c4d5e6...hash.randomsalt"
 * ```
 */
export declare function calculateSessionState(
  clientId: string,
  origin: string,
  opBrowserState: string,
  salt?: string
): Promise<string>;
/**
 * Parse a session state value into its components
 *
 * @param sessionState - The session state value in format "hash.salt"
 * @returns Object containing hash and salt, or null if invalid format
 */
export declare function parseSessionState(sessionState: string): {
  hash: string;
  salt: string;
} | null;
/**
 * Validate a session state value
 *
 * This function recalculates the session state using the provided parameters
 * and compares it with the provided session state value.
 *
 * @param sessionState - The session state value to validate
 * @param clientId - The client identifier
 * @param origin - The origin of the RP
 * @param opBrowserState - The OP's browser state
 * @returns true if the session state is valid, false otherwise
 */
export declare function validateSessionState(
  sessionState: string,
  clientId: string,
  origin: string,
  opBrowserState: string
): Promise<boolean>;
/**
 * Extract the origin from a URL
 *
 * @param url - The URL to extract origin from
 * @returns The origin (protocol + host + port if non-standard)
 */
export declare function extractOrigin(url: string): string;
/**
 * Generate the HTML content for the check_session_iframe endpoint
 *
 * This iframe is loaded by the RP to monitor session state changes.
 * The RP posts messages with format "client_id session_state" and
 * receives "changed", "unchanged", or "error" responses.
 *
 * @param issuerUrl - The issuer URL of the OP
 * @returns HTML content for the check_session_iframe
 */
export declare function generateCheckSessionIframeHtml(issuerUrl: string): string;
/**
 * Session state change result types
 */
export type SessionStateResult = 'changed' | 'unchanged' | 'error';
//# sourceMappingURL=session-state.d.ts.map
