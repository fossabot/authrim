/**
 * Database Migration Runner
 * Issue #14: Schema version management
 *
 * Provides automated migration management with:
 * - Migration history tracking
 * - Checksum validation
 * - Idempotent execution
 * - Rollback support
 */
import type { D1Database } from '@cloudflare/workers-types';
/**
 * Migration file metadata
 */
export interface Migration {
  version: number;
  name: string;
  filename: string;
  sql: string;
  checksum: string;
}
/**
 * Applied migration record from database
 */
export interface AppliedMigration {
  version: number;
  name: string;
  applied_at: number;
  checksum: string;
  execution_time_ms?: number;
}
/**
 * Migration metadata
 */
export interface MigrationMetadata {
  current_version: number;
  last_migration_at?: number;
  environment: string;
}
/**
 * Migration runner options
 */
export interface MigrationRunnerOptions {
  dryRun?: boolean;
  verbose?: boolean;
}
/**
 * Migration Runner
 *
 * Manages database schema migrations with version tracking and validation
 */
export declare class MigrationRunner {
  private db;
  constructor(db: D1Database);
  /**
   * Initialize migration infrastructure
   * Creates schema_migrations and migration_metadata tables if they don't exist
   */
  initialize(): Promise<void>;
  /**
   * Get all applied migrations from database
   */
  getAppliedMigrations(): Promise<AppliedMigration[]>;
  /**
   * Get migration metadata
   */
  getMetadata(): Promise<MigrationMetadata>;
  /**
   * Get pending migrations that haven't been applied yet
   */
  getPendingMigrations(migrationsDir: string): Promise<Migration[]>;
  /**
   * Load all migration files from directory
   */
  private loadMigrations;
  /**
   * Run all pending migrations
   */
  runMigrations(migrationsDir: string, options?: MigrationRunnerOptions): Promise<void>;
  /**
   * Apply a single migration
   */
  private applyMigration;
  /**
   * Validate migration integrity
   * Checks if applied migrations match their files (via checksum)
   */
  validateMigrations(migrationsDir: string): Promise<boolean>;
  /**
   * Display migration status
   */
  showStatus(migrationsDir: string): Promise<void>;
}
//# sourceMappingURL=runner.d.ts.map
