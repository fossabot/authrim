/**
 * D1 Database Retry Utilities
 *
 * Provides exponential backoff retry logic for D1 database operations
 * to improve reliability of audit logging and data persistence.
 *
 * Problem: D1 writes can fail due to transient network issues, causing
 * missing audit logs which violates compliance requirements.
 *
 * Solution: Retry failed operations with exponential backoff, with
 * monitoring/alerting for persistent failures.
 */
/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}
/**
 * Execute a D1 operation with exponential backoff retry logic
 *
 * @param operation - The D1 operation to execute
 * @param operationName - Name of the operation for logging
 * @param config - Retry configuration
 * @returns Promise that resolves when operation succeeds or all retries exhausted
 *
 * @example
 * await retryD1Operation(
 *   async () => {
 *     await this.env.DB.prepare('INSERT INTO ...').bind(...).run();
 *   },
 *   'SessionStore.saveToD1',
 *   { maxRetries: 3 }
 * );
 */
export declare function retryD1Operation<T>(
  operation: () => Promise<T>,
  operationName: string,
  config?: RetryConfig
): Promise<T | null>;
/**
 * Execute a D1 batch operation with retry logic
 *
 * @param operations - Array of D1 prepared statements to execute in batch
 * @param operationName - Name of the operation for logging
 * @param config - Retry configuration
 * @returns Promise that resolves when batch succeeds or all retries exhausted
 *
 * @example
 * await retryD1Batch(
 *   [
 *     env.DB.prepare('INSERT INTO ...').bind(...),
 *     env.DB.prepare('UPDATE ...').bind(...),
 *   ],
 *   'SessionStore.batchUpdate',
 * );
 */
export declare function retryD1Batch(
  operations: Array<D1PreparedStatement>,
  operationName: string,
  config?: RetryConfig
): Promise<D1Result[] | null>;
/**
 * Type definitions for D1
 * (These should ideally come from @cloudflare/workers-types)
 */
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<D1Result>;
  all(): Promise<D1Result>;
  first(column?: string): Promise<unknown>;
}
export interface D1Result {
  success: boolean;
  meta?: {
    duration?: number;
    changes?: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
  };
  results?: unknown[];
  error?: string;
}
//# sourceMappingURL=d1-retry.d.ts.map
