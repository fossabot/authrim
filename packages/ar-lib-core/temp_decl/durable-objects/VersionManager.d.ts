/**
 * VersionManager Durable Object
 *
 * Manages code version identifiers for Cloudflare Workers to detect and
 * reject stale bundles. Each Worker's version is tracked independently,
 * allowing partial deployments.
 *
 * Key Features:
 * - UUID-based version identification (CODE_VERSION_UUID)
 * - Worker-specific version tracking
 * - Deploy timestamp tracking (DEPLOY_TIME_UTC)
 * - Forced shutdown of outdated Worker bundles
 *
 * Security:
 * - Version information is never exposed to external clients
 * - All write operations require Bearer token authentication
 * - Used only for internal deployment tracking
 */
import type { Env } from '../types/env';
/**
 * Version record for a single Worker
 */
interface VersionRecord {
  uuid: string;
  deployTime: string;
  registeredAt: number;
}
/**
 * VersionManager Durable Object
 *
 * Centralized version management for all Workers in the deployment.
 */
export declare class VersionManager {
  private state;
  private env;
  private versionManagerState;
  constructor(state: DurableObjectState, env: Env);
  /**
   * Initialize the VersionManager state
   */
  private initializeState;
  /**
   * Get state with assertion that it has been initialized
   */
  private getState;
  /**
   * Save state to durable storage
   */
  private saveState;
  /**
   * Register a new version for a Worker
   */
  registerVersion(workerName: string, uuid: string, deployTime: string): Promise<void>;
  /**
   * Get the latest version for a Worker
   */
  getVersion(workerName: string): Promise<VersionRecord | null>;
  /**
   * Get all registered versions
   */
  getAllVersions(): Promise<Record<string, VersionRecord>>;
  /**
   * Authenticate requests using Bearer token
   */
  private authenticate;
  /**
   * Create an unauthorized response
   */
  private unauthorizedResponse;
  /**
   * Handle HTTP requests to the VersionManager Durable Object
   */
  fetch(request: Request): Promise<Response>;
}
export {};
//# sourceMappingURL=VersionManager.d.ts.map
