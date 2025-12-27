/**
 * Setup Token Utilities
 *
 * Manages one-time setup tokens for initial admin account creation.
 * The setup token is generated during deployment and stored in KV with a TTL.
 * Once setup is complete, the token is invalidated and the feature is permanently disabled.
 */

import type { Env } from '../types/env';
import { timingSafeEqual, generateSecureRandomString } from './crypto';

/** KV key for setup token */
const SETUP_TOKEN_KEY = 'setup:token';

/** KV key for setup completion flag */
const SETUP_COMPLETED_KEY = 'setup:completed';

/** Default setup token TTL in seconds (1 hour) */
const DEFAULT_SETUP_TOKEN_TTL = 3600;

/**
 * Validation result for setup token
 */
export interface SetupTokenValidationResult {
  valid: boolean;
  reason?: 'no_token' | 'invalid_token' | 'setup_completed';
}

/**
 * Generate a cryptographically secure setup token
 *
 * @returns A 64-character hex string (256 bits of entropy)
 */
export function generateSetupToken(): string {
  // 32 bytes = 256 bits of entropy
  return generateSecureRandomString(32);
}

/**
 * Check if setup has already been completed
 *
 * Once setup is complete, the setup:completed flag is set permanently.
 * This prevents re-running the setup flow even if someone generates a new token.
 *
 * @param env - Cloudflare Workers environment
 * @returns true if setup is disabled (already completed)
 */
export async function isSetupDisabled(env: Env): Promise<boolean> {
  if (!env.AUTHRIM_CONFIG) {
    return false;
  }

  const completed = await env.AUTHRIM_CONFIG.get(SETUP_COMPLETED_KEY);
  return completed === 'true';
}

/**
 * Validate a setup token
 *
 * Performs timing-safe comparison to prevent timing attacks.
 * Also checks if setup has already been completed.
 *
 * @param env - Cloudflare Workers environment
 * @param token - The token to validate
 * @returns Validation result with reason if invalid
 */
export async function validateSetupToken(
  env: Env,
  token: string
): Promise<SetupTokenValidationResult> {
  if (!env.AUTHRIM_CONFIG) {
    return { valid: false, reason: 'no_token' };
  }

  // Check if setup is already completed
  if (await isSetupDisabled(env)) {
    return { valid: false, reason: 'setup_completed' };
  }

  // Get stored token
  const storedToken = await env.AUTHRIM_CONFIG.get(SETUP_TOKEN_KEY);

  if (!storedToken) {
    return { valid: false, reason: 'no_token' };
  }

  // Timing-safe comparison
  if (!timingSafeEqual(storedToken, token)) {
    return { valid: false, reason: 'invalid_token' };
  }

  return { valid: true };
}

/**
 * Store a setup token in KV
 *
 * @param env - Cloudflare Workers environment
 * @param token - The token to store
 * @param ttlSeconds - Token TTL in seconds (default: 1 hour)
 */
export async function storeSetupToken(
  env: Env,
  token: string,
  ttlSeconds: number = DEFAULT_SETUP_TOKEN_TTL
): Promise<void> {
  if (!env.AUTHRIM_CONFIG) {
    throw new Error('AUTHRIM_CONFIG KV namespace is not available');
  }

  await env.AUTHRIM_CONFIG.put(SETUP_TOKEN_KEY, token, {
    expirationTtl: ttlSeconds,
  });
}

/**
 * Invalidate the setup token and mark setup as complete
 *
 * This is called after successful admin account creation.
 * Once complete, the setup flow is permanently disabled.
 *
 * @param env - Cloudflare Workers environment
 */
export async function completeSetup(env: Env): Promise<void> {
  if (!env.AUTHRIM_CONFIG) {
    throw new Error('AUTHRIM_CONFIG KV namespace is not available');
  }

  // Delete the setup token
  await env.AUTHRIM_CONFIG.delete(SETUP_TOKEN_KEY);

  // Set the completion flag permanently (no TTL)
  await env.AUTHRIM_CONFIG.put(SETUP_COMPLETED_KEY, 'true');
}
