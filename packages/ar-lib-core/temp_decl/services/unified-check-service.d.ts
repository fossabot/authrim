/**
 * Unified Check Service
 *
 * Phase 8.3: Real-time Check API Model
 *
 * Provides unified permission checking across:
 * - ID-level permissions (resource:id:action)
 * - Type-level permissions (resource:action)
 * - ReBAC relationship checks
 * - RBAC role-based checks
 *
 * Evaluation Order (first match wins):
 * 1. ID-Level Permission Check (resource_permissions table)
 * 2. Role-Based Permission Check (RBAC)
 * 3. ReBAC Check (relationships via ReBACService)
 * 4. Computed/ABAC (resource_context evaluation)
 */
import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type {
  CheckApiRequest,
  CheckApiResponse,
  BatchCheckRequest,
  BatchCheckResponse,
  ParsedPermission,
  PermissionInput,
  AuditLogConfig,
} from '../types/check-api';
import type { ReBACService } from '../rebac';
/**
 * Parse permission input into structured format
 *
 * @param input - Permission string or object
 * @returns Parsed permission with type information
 * @throws Error if permission format is invalid
 */
export declare function parsePermission(input: PermissionInput): ParsedPermission;
/**
 * Format parsed permission back to string
 */
export declare function formatPermission(parsed: ParsedPermission): string;
/**
 * Configuration for UnifiedCheckService
 */
export interface UnifiedCheckServiceConfig {
  /** D1 database for permission queries */
  db: D1Database;
  /** KV namespace for caching (optional) */
  cache?: KVNamespace;
  /** ReBAC service for relationship checks (optional) */
  rebacService?: ReBACService;
  /** Cache TTL in seconds (default: 60) */
  cacheTTL?: number;
  /** Enable debug mode */
  debugMode?: boolean;
  /** Audit log configuration */
  auditConfig?: AuditLogConfig;
}
/**
 * Unified Check Service
 *
 * Provides unified permission checking with multiple resolution strategies.
 */
export declare class UnifiedCheckService {
  private db;
  private cache?;
  private rebacService?;
  private cacheTTL;
  private debugMode;
  private auditConfig;
  constructor(config: UnifiedCheckServiceConfig);
  /**
   * Check a single permission
   */
  check(request: CheckApiRequest): Promise<CheckApiResponse>;
  /**
   * Check multiple permissions in batch
   */
  batchCheck(request: BatchCheckRequest): Promise<BatchCheckResponse>;
  /**
   * Evaluate permission through all resolution strategies
   */
  private evaluate;
  /**
   * Check ID-level permission in resource_permissions table
   */
  private checkIdLevelPermission;
  /**
   * Check role-based permission via RBAC
   */
  private checkRoleBasedPermission;
  /**
   * Check ReBAC relationship permission
   */
  private checkReBACPermission;
  /**
   * Check computed/ABAC permission based on resource context
   */
  private checkComputedPermission;
  /**
   * Build cache key for check result
   */
  private buildCacheKey;
  /**
   * Get cached result
   */
  private getCachedResult;
  /**
   * Cache check result
   */
  private cacheResult;
  /**
   * Build final response
   */
  private buildResponse;
  /**
   * Invalidate cache for a subject
   */
  invalidateCache(tenantId: string, subjectId: string): Promise<void>;
}
/**
 * Create UnifiedCheckService instance
 */
export declare function createUnifiedCheckService(
  config: UnifiedCheckServiceConfig
): UnifiedCheckService;
//# sourceMappingURL=unified-check-service.d.ts.map
