/**
 * Structured Logger with Tenant Context
 *
 * Provides JSON-structured logging with automatic tenant ID inclusion.
 * This ensures all logs can be filtered by tenant for future multi-tenant support.
 *
 * Output format:
 * {"timestamp":"2024-01-01T00:00:00.000Z","level":"info","tenantId":"default","message":"..."}
 */
/**
 * Log context that is included with every log entry.
 */
export interface LogContext {
  /** Tenant identifier (defaults to 'default' in single-tenant mode) */
  tenantId: string;
  /** Unique request identifier for correlation */
  requestId?: string;
  /** User identifier if authenticated */
  userId?: string;
  /** OAuth client identifier */
  clientId?: string;
  /** Action being performed */
  action?: string;
  /** Additional context fields */
  [key: string]: unknown;
}
/**
 * Logger interface for structured logging.
 */
export interface Logger {
  /** Log informational messages */
  info(message: string, context?: Partial<LogContext>): void;
  /** Log warning messages */
  warn(message: string, context?: Partial<LogContext>): void;
  /** Log error messages with optional error object */
  error(message: string, context?: Partial<LogContext>, error?: Error): void;
  /** Log debug messages (useful for development) */
  debug(message: string, context?: Partial<LogContext>): void;
}
/**
 * Create a logger instance with base context.
 *
 * @param baseContext - Default context to include in all log entries
 * @returns Logger instance
 *
 * @example
 * const logger = createLogger({ requestId: 'abc123', tenantId: 'default' });
 * logger.info('User logged in', { userId: 'user-1' });
 * // Output: {"timestamp":"...","level":"info","tenantId":"default","requestId":"abc123","message":"User logged in","userId":"user-1"}
 */
export declare function createLogger(baseContext?: Partial<LogContext>): Logger;
/**
 * Create a child logger with additional context merged in.
 *
 * @param parent - Parent logger's context
 * @param additionalContext - Additional context to merge
 * @returns New logger with merged context
 *
 * @example
 * const requestLogger = createLogger({ requestId: 'abc' });
 * const userLogger = createChildLogger(requestLogger, { userId: 'user-1' });
 */
export declare function createChildLogger(
  parentContext: Partial<LogContext>,
  additionalContext: Partial<LogContext>
): Logger;
/**
 * Simple one-off structured log (for cases where you don't need a logger instance).
 *
 * @param level - Log level
 * @param message - Log message
 * @param context - Log context
 *
 * @example
 * structuredLog('info', 'Server started', { tenantId: 'default' });
 */
export declare function structuredLog(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context?: Partial<LogContext>
): void;
//# sourceMappingURL=logger.d.ts.map
