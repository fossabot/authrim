/**
 * Device Flow Utilities
 * RFC 8628: OAuth 2.0 Device Authorization Grant
 * https://datatracker.ietf.org/doc/html/rfc8628
 */
import type { DeviceCodeMetadata } from '../types/oidc';
/**
 * Generate a device code (opaque, unique identifier)
 * Uses UUID v4 for uniqueness and unpredictability
 *
 * @returns Device code string (UUID v4)
 */
export declare function generateDeviceCode(): string;
/**
 * Generate a user code (short, human-readable code)
 * RFC 8628 recommends: Short, case-insensitive, human-readable
 * Common format: 8 characters, uppercase letters and digits, with hyphen separator
 *
 * Examples: "WDJB-MJHT", "BDSD-HQMK", "PPZZ-JJKK"
 *
 * Character set: Excludes ambiguous characters (0, O, 1, I, L)
 * to reduce user input errors
 *
 * @returns User code string (format: XXXX-XXXX)
 */
export declare function generateUserCode(): string;
/**
 * Validate user code format
 * Checks if the user code matches the expected format: XXXX-XXXX
 *
 * @param userCode - User code to validate
 * @returns true if valid, false otherwise
 */
export declare function validateUserCodeFormat(userCode: string): boolean;
/**
 * Normalize user code
 * Converts to uppercase and adds hyphen if missing
 *
 * @param userCode - User code to normalize
 * @returns Normalized user code
 */
export declare function normalizeUserCode(userCode: string): string;
/**
 * Check if device code has expired
 *
 * @param metadata - Device code metadata
 * @returns true if expired, false otherwise
 */
export declare function isDeviceCodeExpired(metadata: DeviceCodeMetadata): boolean;
/**
 * Check if device is polling too frequently (slow down detection)
 * RFC 8628: Clients should wait at least the interval specified
 *
 * @param metadata - Device code metadata
 * @param minimumInterval - Minimum interval in seconds (default 5)
 * @returns true if polling too fast, false otherwise
 */
export declare function isDeviceFlowPollingTooFast(
  metadata: DeviceCodeMetadata,
  minimumInterval?: number
): boolean;
/**
 * Get verification URI with user code embedded
 * Useful for QR codes and direct links
 *
 * @param baseUri - Base verification URI
 * @param userCode - User code to embed
 * @returns Complete verification URI
 */
export declare function getVerificationUriComplete(baseUri: string, userCode: string): string;
/**
 * Device Flow Constants
 * RFC 8628 recommended values
 */
export declare const DEVICE_FLOW_CONSTANTS: {
  readonly DEFAULT_EXPIRES_IN: 600;
  readonly MIN_EXPIRES_IN: 300;
  readonly MAX_EXPIRES_IN: 1800;
  readonly DEFAULT_INTERVAL: 5;
  readonly MIN_INTERVAL: 1;
  readonly MAX_INTERVAL: 60;
  readonly SLOW_DOWN_INCREMENT: 5;
  readonly MAX_POLL_COUNT: 120;
};
//# sourceMappingURL=device-flow.d.ts.map
