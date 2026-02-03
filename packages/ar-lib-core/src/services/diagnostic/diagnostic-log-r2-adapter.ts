/**
 * Diagnostic Log R2 Storage Adapter
 *
 * Storage adapter for diagnostic logs to Cloudflare R2.
 * Supports JSONL format with date-based partitioning.
 *
 * Path structure:
 * - {prefix}/{logType}/{tenantId}/{YYYY-MM-DD}/{HH}.jsonl
 * - {prefix}/{logType}/{tenantId}/{clientId}/{YYYY-MM-DD}/{HH}.jsonl
 */

import type {
  DiagnosticLogEntry,
  DiagnosticLogWriteResult,
  DiagnosticLogQueryOptions,
  DiagnosticLogQueryResult,
  DiagnosticLogCategory,
} from './types';

/**
 * R2 adapter configuration
 */
export interface DiagnosticLogR2AdapterConfig {
  /** R2 bucket binding */
  bucket: R2Bucket;

  /** Path prefix (e.g., "diagnostic-logs") */
  pathPrefix: string;

  /** Tenant ID */
  tenantId: string;

  /** Client ID (optional, for future client-scoped logging) */
  clientId?: string;
}

/**
 * Build R2 object key for diagnostic logs
 *
 * Tenant path by default; include clientId when available.
 *
 * @param options - Path construction options
 * @returns R2 object key
 */
export function buildDiagnosticLogPath(options: {
  pathPrefix: string;
  tenantId: string;
  clientId?: string;
  category: DiagnosticLogCategory;
  timestamp: number;
}): string {
  const date = new Date(options.timestamp);
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const hour = date.getUTCHours().toString().padStart(2, '0');

  // Tenant only
  if (!options.clientId) {
    return `${options.pathPrefix}/${options.category}/${options.tenantId}/${dateStr}/${hour}.jsonl`;
  }

  // Tenant + client
  return `${options.pathPrefix}/${options.category}/${options.tenantId}/${options.clientId}/${dateStr}/${hour}.jsonl`;
}

/**
 * Diagnostic Log R2 Adapter
 */
export class DiagnosticLogR2Adapter {
  private readonly bucket: R2Bucket;
  private readonly pathPrefix: string;
  private readonly tenantId: string;
  private readonly clientId?: string;

  constructor(config: DiagnosticLogR2AdapterConfig) {
    this.bucket = config.bucket;
    this.pathPrefix = config.pathPrefix.replace(/\/$/, ''); // Remove trailing slash
    this.tenantId = config.tenantId;
    this.clientId = config.clientId;
  }

  /**
   * Write a single diagnostic log entry
   */
  async writeLog(entry: DiagnosticLogEntry): Promise<DiagnosticLogWriteResult> {
    return this.writeLogBatch([entry]);
  }

  /**
   * Write a batch of diagnostic log entries
   */
  async writeLogBatch(entries: DiagnosticLogEntry[]): Promise<DiagnosticLogWriteResult> {
    if (entries.length === 0) {
      return {
        success: true,
        entriesWritten: 0,
        backend: 'r2-diagnostic',
        durationMs: 0,
      };
    }

    const startTime = Date.now();

    // Group entries by category and hour
    const grouped = this.groupEntriesByHour(entries);

    let written = 0;
    const errors: string[] = [];

    for (const [key, groupEntries] of grouped) {
      try {
        const [category, dateHour] = key.split('|') as [DiagnosticLogCategory, string];
        const r2Key = buildDiagnosticLogPath({
          pathPrefix: this.pathPrefix,
          tenantId: this.tenantId,
          clientId: this.clientId,
          category,
          timestamp: groupEntries[0].timestamp,
        });

        // Append to existing file or create new
        const existing = await this.bucket.get(r2Key);
        const existingContent = existing ? await existing.text() : '';
        const newLines = groupEntries.map((e) => JSON.stringify(e)).join('\n');
        const content = existingContent ? `${existingContent}\n${newLines}` : newLines;

        await this.bucket.put(r2Key, content, {
          httpMetadata: { contentType: 'application/x-ndjson' },
          customMetadata: {
            tenantId: this.tenantId,
            clientId: this.clientId ?? '',
            category,
            entryCount: String(content.split('\n').length),
            lastModified: new Date().toISOString(),
          },
        });

        written += groupEntries.length;
      } catch (error) {
        errors.push(String(error));
      }
    }

    return {
      success: errors.length === 0,
      entriesWritten: written,
      backend: 'r2-diagnostic',
      durationMs: Date.now() - startTime,
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * Query diagnostic logs
   */
  async query(options: DiagnosticLogQueryOptions): Promise<DiagnosticLogQueryResult> {
    const startTime = Date.now();

    const prefix = this.buildQueryPrefix(options);
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    try {
      // List objects in the date range
      const listed = await this.bucket.list({
        prefix,
        limit: 1000, // R2 list limit
      });

      const entries: DiagnosticLogEntry[] = [];

      // Filter by date if provided
      const filteredObjects = this.filterObjectsByDate(
        listed.objects,
        options.startTime,
        options.endTime
      );

      // Read and parse entries
      for (const obj of filteredObjects) {
        if (entries.length >= limit + offset) break;

        const content = await this.bucket.get(obj.key);
        if (!content) continue;

        const text = await content.text();

        // Parse JSONL
        const lines = text.split('\n').filter((l) => l.trim());
        for (const line of lines) {
          if (entries.length >= limit + offset) break;
          try {
            const entry = JSON.parse(line) as DiagnosticLogEntry;
            if (this.matchesQueryOptions(entry, options)) {
              entries.push(entry);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }

      // Apply pagination
      const paginatedEntries = entries.slice(offset, offset + limit);

      return {
        entries: paginatedEntries,
        totalCount: entries.length,
        hasMore: entries.length > offset + limit,
        durationMs: Date.now() - startTime,
        backend: 'r2-diagnostic',
      };
    } catch (error) {
      return {
        entries: [],
        totalCount: 0,
        hasMore: false,
        durationMs: Date.now() - startTime,
        backend: 'r2-diagnostic',
      };
    }
  }

  /**
   * Delete logs older than retention period
   */
  async deleteByRetention(beforeTime: number, batchSize: number = 100): Promise<number> {
    const prefix = this.clientId
      ? `${this.pathPrefix}/${this.tenantId}/${this.clientId}/`
      : `${this.pathPrefix}/${this.tenantId}/`;

    try {
      const listed = await this.bucket.list({ prefix, limit: batchSize });
      let deleted = 0;

      for (const obj of listed.objects) {
        // Check if object is older than retention
        const dateMatch = obj.key.match(/\/(\d{4}-\d{2}-\d{2})\//);
        if (dateMatch) {
          const objDate = new Date(dateMatch[1]).getTime();
          if (objDate < beforeTime) {
            await this.bucket.delete(obj.key);
            deleted++;
          }
        }
      }

      return deleted;
    } catch {
      return 0;
    }
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<{ healthy: boolean; latencyMs: number; errorMessage?: string }> {
    const startTime = Date.now();

    try {
      // List a small number of objects to check connectivity
      await this.bucket.list({ prefix: this.pathPrefix, limit: 1 });

      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        errorMessage: String(error),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------

  private groupEntriesByHour(
    entries: DiagnosticLogEntry[]
  ): Map<string, DiagnosticLogEntry[]> {
    const grouped = new Map<string, DiagnosticLogEntry[]>();

    for (const entry of entries) {
      const date = new Date(entry.timestamp);
      const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
      const hour = date.getUTCHours().toString().padStart(2, '0');
      const key = `${entry.category}|${dateStr}/${hour}`;

      const existing = grouped.get(key) ?? [];
      existing.push(entry);
      grouped.set(key, existing);
    }

    return grouped;
  }

  private buildQueryPrefix(options: DiagnosticLogQueryOptions): string {
    let prefix = `${this.pathPrefix}/`;

    // Add category if specified
    if (options.category) {
      prefix += `${options.category}/`;
    }

    // Add tenant ID
    prefix += `${options.tenantId}/`;

    // Add client ID if specified
    if (options.clientId) {
      prefix += `${options.clientId}/`;
    }

    return prefix;
  }

  private filterObjectsByDate(
    objects: R2Object[],
    startTime?: number,
    endTime?: number
  ): R2Object[] {
    if (!startTime && !endTime) return objects;

    return objects.filter((obj) => {
      const dateMatch = obj.key.match(/\/(\d{4}-\d{2}-\d{2})\//);
      if (!dateMatch) return true; // Include if no date in path

      const objDate = new Date(dateMatch[1]).getTime();
      if (startTime && objDate < startTime - 86400000) return false; // Day buffer
      if (endTime && objDate > endTime + 86400000) return false;
      return true;
    });
  }

  private matchesQueryOptions(
    entry: DiagnosticLogEntry,
    options: DiagnosticLogQueryOptions
  ): boolean {
    // Time range filter
    if (options.startTime && entry.timestamp < options.startTime) return false;
    if (options.endTime && entry.timestamp >= options.endTime) return false;

    // Diagnostic session ID filter
    if (
      options.diagnosticSessionId &&
      entry.diagnosticSessionId !== options.diagnosticSessionId
    ) {
      return false;
    }

    // Request ID filter
    if (options.requestId && entry.requestId !== options.requestId) {
      return false;
    }

    // Category filter (already filtered by prefix, but double-check)
    if (options.category && entry.category !== options.category) {
      return false;
    }

    return true;
  }
}

/**
 * Create a diagnostic log R2 adapter
 */
export function createDiagnosticLogR2Adapter(
  bucket: R2Bucket,
  options: {
    pathPrefix?: string;
    tenantId: string;
    clientId?: string;
  }
): DiagnosticLogR2Adapter {
  return new DiagnosticLogR2Adapter({
    bucket,
    pathPrefix: options.pathPrefix ?? 'diagnostic-logs',
    tenantId: options.tenantId,
    clientId: options.clientId,
  });
}
