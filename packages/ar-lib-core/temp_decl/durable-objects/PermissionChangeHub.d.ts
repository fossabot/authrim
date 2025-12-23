/**
 * PermissionChangeHub Durable Object
 *
 * Phase 8.3: Real-time Check API Model
 *
 * WebSocket-based permission change notification hub using Durable Objects.
 * Uses WebSocket Hibernation API for cost optimization.
 *
 * Features:
 * - Subscribe to permission changes for specific subjects/resources
 * - Broadcast permission change events to connected clients
 * - Hibernation support for cost optimization
 * - Automatic cleanup of stale connections
 *
 * Note: Each tenant has its own hub instance for isolation.
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types/env';
export declare class PermissionChangeHub extends DurableObject<Env> {
  /** Map of subscription ID to subscription details */
  private subscriptions;
  /** Tenant ID for this hub instance */
  private tenantId;
  constructor(ctx: DurableObjectState, env: Env);
  /**
   * Handle HTTP request (WebSocket upgrade or REST)
   */
  fetch(request: Request): Promise<Response>;
  /**
   * Setup tenant ID for this hub
   */
  private handleSetup;
  /**
   * Get hub statistics
   */
  private handleStats;
  /**
   * Handle WebSocket upgrade request
   */
  private handleWebSocketUpgrade;
  /**
   * Handle WebSocket message (called from hibernation)
   */
  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void>;
  /**
   * Handle WebSocket close
   */
  webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void>;
  /**
   * Handle WebSocket error
   */
  webSocketError(ws: WebSocket, error: Error): Promise<void>;
  /**
   * Handle subscribe message
   */
  private handleSubscribe;
  /**
   * Handle unsubscribe message
   */
  private handleUnsubscribe;
  /**
   * Handle ping message
   */
  private handlePing;
  /**
   * Handle broadcast request (from permission change notifier)
   */
  private handleBroadcast;
  /**
   * Check if a subscription should receive an event
   */
  private shouldNotify;
  /**
   * Get WebSocket attachment
   */
  private getAttachment;
  /**
   * Send error message to WebSocket
   */
  private sendError;
}
//# sourceMappingURL=PermissionChangeHub.d.ts.map
