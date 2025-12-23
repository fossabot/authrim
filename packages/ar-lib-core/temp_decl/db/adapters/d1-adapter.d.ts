/**
 * D1 Database Adapter
 *
 * Implementation of DatabaseAdapter for Cloudflare D1.
 * Provides:
 * - Type-safe query methods
 * - Transaction support via batch API
 * - Retry logic with exponential backoff
 * - Health check functionality
 *
 * D1 Characteristics:
 * - Serverless SQLite database
 * - Batch API provides transaction-like semantics (all-or-nothing)
 * - No persistent connections (stateless)
 */
import type {
  DatabaseAdapter,
  ExecuteResult,
  PreparedStatement,
  TransactionContext,
  HealthStatus,
  QueryOptions,
} from '../adapter';
import { type RetryConfig } from '../../utils/d1-retry';
/**
 * D1 Database type (from @cloudflare/workers-types)
 */
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}
interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: D1Meta;
  error?: string;
}
interface D1Meta {
  duration?: number;
  changes?: number;
  last_row_id?: number;
  rows_read?: number;
  rows_written?: number;
}
interface D1ExecResult {
  count: number;
  duration: number;
}
/**
 * D1 Adapter Configuration
 */
export interface D1AdapterConfig {
  /** D1 database binding */
  db: D1Database;
  /** Partition identifier for logging/monitoring */
  partition?: string;
  /** Retry configuration */
  retryConfig?: RetryConfig;
  /** Enable debug logging */
  debug?: boolean;
}
/**
 * D1 Database Adapter Implementation
 */
export declare class D1Adapter implements DatabaseAdapter {
  private readonly db;
  private readonly partition;
  private readonly retryConfig;
  private readonly debug;
  constructor(config: D1AdapterConfig);
  /**
   * Execute a SELECT query and return all results
   */
  query<T>(sql: string, params?: unknown[], options?: QueryOptions): Promise<T[]>;
  /**
   * Execute a SELECT query and return the first result
   */
  queryOne<T>(sql: string, params?: unknown[], options?: QueryOptions): Promise<T | null>;
  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   */
  execute(sql: string, params?: unknown[]): Promise<ExecuteResult>;
  /**
   * Execute multiple statements in a transaction
   *
   * D1 doesn't have traditional transactions, but batch() provides
   * all-or-nothing semantics. We collect statements and execute them
   * in a batch at the end.
   */
  transaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
  /**
   * Execute multiple statements in a batch
   */
  batch(statements: PreparedStatement[]): Promise<ExecuteResult[]>;
  /**
   * Check if the database is healthy
   */
  isHealthy(): Promise<HealthStatus>;
  /**
   * Get the database type
   */
  getType(): string;
  /**
   * Close the connection (no-op for D1)
   */
  close(): Promise<void>;
  /**
   * Truncate SQL for logging (avoid logging sensitive data)
   */
  private truncateSql;
}
/**
 * Create a D1 adapter from environment binding
 *
 * @param db - D1 database binding from Cloudflare Worker environment
 * @param partition - Partition identifier (default: 'default')
 * @returns D1Adapter instance
 *
 * @example
 * ```typescript
 * const adapter = createD1Adapter(env.DB, 'core');
 * const users = await adapter.query<User>('SELECT * FROM users');
 * ```
 */
export declare function createD1Adapter(
  db: D1Database,
  partition?: string,
  options?: {
    retryConfig?: RetryConfig;
    debug?: boolean;
  }
): D1Adapter;
export {};
//# sourceMappingURL=d1-adapter.d.ts.map
