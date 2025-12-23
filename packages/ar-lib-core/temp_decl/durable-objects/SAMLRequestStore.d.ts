/**
 * SAMLRequestStore Durable Object
 *
 * Manages SAML Request IDs and Assertion IDs for:
 * - Replay attack prevention (one-time use guarantee)
 * - InResponseTo validation
 * - RelayState preservation
 *
 * Sharding Strategy: By issuer Entity ID
 * Instance name format: `issuer:{entityId}`
 */
import type { Env } from '../types/env';
import type { SAMLRequestData, SAMLArtifactData } from '../types/saml';
/**
 * SAMLRequestStore Durable Object
 */
export declare class SAMLRequestStore {
  private state;
  private env;
  private storeState;
  constructor(state: DurableObjectState, env: Env);
  /**
   * Initialize state from storage
   */
  private initializeState;
  /**
   * Get state with assertion
   */
  private getState;
  /**
   * Save state to storage
   */
  private saveState;
  /**
   * Store a SAML request
   */
  storeRequest(request: SAMLRequestData): Promise<void>;
  /**
   * Get and consume a SAML request (one-time use)
   */
  consumeRequest(requestId: string): Promise<SAMLRequestData | null>;
  /**
   * Check if a request exists and is valid (without consuming)
   */
  checkRequest(requestId: string): Promise<boolean>;
  /**
   * Store a SAML artifact
   */
  storeArtifact(artifact: SAMLArtifactData): Promise<void>;
  /**
   * Resolve and consume a SAML artifact (one-time use)
   */
  resolveArtifact(artifactValue: string): Promise<SAMLArtifactData | null>;
  /**
   * Check if an assertion ID has been consumed (replay detection)
   */
  checkAssertionId(assertionId: string): Promise<boolean>;
  /**
   * Mark an assertion ID as consumed
   */
  consumeAssertionId(assertionId: string): Promise<boolean>;
  /**
   * Clean up expired entries
   */
  private cleanupExpired;
  /**
   * Handle HTTP requests
   */
  fetch(request: Request): Promise<Response>;
}
//# sourceMappingURL=SAMLRequestStore.d.ts.map
