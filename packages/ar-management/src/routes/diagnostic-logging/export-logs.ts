/**
 * Diagnostic Logs Export API
 *
 * GET /api/admin/diagnostic-logging/export
 *
 * Exports diagnostic logs from R2 in various formats (JSON, JSONL, Text).
 */

import { Hono } from 'hono';
import type { Env, DiagnosticLogEntry } from '@authrim/ar-lib-core';
import {
  adminAuthMiddleware,
  createLogger,
  formatAsJSON,
  formatAsJSONL,
  formatAsText,
  getLogStatistics,
  type ExportOptions,
} from '@authrim/ar-lib-core';

const log = createLogger().module('DiagnosticLogsExportAPI');

const app = new Hono<{ Bindings: Env }>();

/**
 * Export query parameters
 */
interface ExportQuery {
  /** Tenant ID */
  tenantId: string;
  /** Client ID (optional) */
  clientId?: string;
  /** Client IDs (comma-separated) */
  clientIds?: string;
  /** Start date (ISO 8601 or Unix timestamp) */
  startDate?: string;
  /** End date (ISO 8601 or Unix timestamp) */
  endDate?: string;
  /** Session IDs (comma-separated) */
  sessionIds?: string;
  /** Categories (comma-separated) */
  categories?: string;
  /** Output format */
  format?: 'json' | 'jsonl' | 'text';
  /** Include statistics */
  includeStats?: string;
}

/**
 * Parse client IDs from query
 */
function parseClientIds(value?: string): string[] | undefined {
  if (!value) return undefined;
  const ids = value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
}

/**
 * Parse date string to Unix timestamp
 */
function parseDate(dateStr: string): number {
  // Try parsing as Unix timestamp first
  const timestamp = parseInt(dateStr, 10);
  if (!isNaN(timestamp)) {
    // If it's a reasonable Unix timestamp (in milliseconds)
    if (timestamp > 1000000000000) {
      return timestamp;
    }
    // If it's in seconds, convert to milliseconds
    if (timestamp > 1000000000) {
      return timestamp * 1000;
    }
  }

  // Try parsing as ISO 8601
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }

  throw new Error(`Invalid date format: ${dateStr}`);
}

/**
 * Parse date string with day-boundary handling for date-only inputs.
 */
function parseDateWithBoundary(dateStr: string, boundary: 'start' | 'end'): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const base = new Date(`${dateStr}T00:00:00.000Z`).getTime();
    return boundary === 'end' ? base + 24 * 60 * 60 * 1000 - 1 : base;
  }
  return parseDate(dateStr);
}

/**
 * List R2 objects in date range
 */
async function listR2Objects(
  r2: R2Bucket,
  prefix: string,
  startDate: Date,
  endDate: Date
): Promise<string[]> {
  const keys: string[] = [];
  const dateRanges = generateDateRanges(startDate, endDate);

  for (const dateStr of dateRanges) {
    const datePrefix = `${prefix}/${dateStr}/`;
    const listed = await r2.list({ prefix: datePrefix });

    for (const object of listed.objects) {
      keys.push(object.key);
    }
  }

  return keys;
}

/**
 * Generate date range strings (YYYY-MM-DD format)
 */
function generateDateRanges(startDate: Date, endDate: Date): string[] {
  const ranges: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    ranges.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return ranges;
}

/**
 * Fetch and parse diagnostic logs from R2
 */
async function fetchLogsFromR2(
  r2: R2Bucket,
  keys: string[]
): Promise<DiagnosticLogEntry[]> {
  const logs: DiagnosticLogEntry[] = [];

  for (const key of keys) {
    try {
      const object = await r2.get(key);
      if (!object) continue;

      const text = await object.text();
      const lines = text.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as DiagnosticLogEntry;
          logs.push(parsed);
        } catch (error) {
          log.warn('Failed to parse log line', { key, error: String(error) });
        }
      }
    } catch (error) {
      log.warn('Failed to fetch R2 object', { key, error: String(error) });
    }
  }

  return logs;
}

/**
 * GET /api/admin/diagnostic-logging/export
 *
 * Export diagnostic logs
 */
app.get(
  '/',
  adminAuthMiddleware({ requirePermissions: ['admin:diagnostics:read'] }),
  async (c) => {
    const query = c.req.query() as unknown as ExportQuery;

    // Validate required parameters
    if (!query.tenantId) {
      return c.json(
        {
          error: 'missing_tenant_id',
          message: 'tenantId query parameter is required',
        },
        400
      );
    }

    // Parse query parameters
    const tenantId = query.tenantId;
    const clientIds = parseClientIds(query.clientIds ?? query.clientId);
    const format = query.format || 'json';
    const includeStats = query.includeStats === 'true';

    // Parse date range
    let startTime: number | undefined;
    let endTime: number | undefined;

    try {
      if (query.startDate) {
        startTime = parseDateWithBoundary(query.startDate, 'start');
      }
      if (query.endDate) {
        endTime = parseDateWithBoundary(query.endDate, 'end');
      }
    } catch (error) {
      return c.json(
        {
          error: 'invalid_date',
          message: error instanceof Error ? error.message : 'Invalid date format',
        },
        400
      );
    }

    // Default to last 7 days if no date range specified
    if (!startTime && !endTime) {
      endTime = Date.now();
      startTime = endTime - 7 * 24 * 60 * 60 * 1000; // 7 days ago
    }

    const startDate = new Date(startTime || 0);
    const endDate = new Date(endTime || Date.now());

    // Parse session IDs and categories
    const sessionIds = query.sessionIds
      ? query.sessionIds.split(',').map((s) => s.trim())
      : undefined;
    const categories = query.categories
      ? query.categories.split(',').map((c) => c.trim())
      : undefined;

    // Check R2 bucket binding
    const r2 = c.env.DIAGNOSTIC_LOGS;
    if (!r2) {
      return c.json(
        {
          error: 'r2_not_configured',
          message: 'DIAGNOSTIC_LOGS R2 bucket is not configured',
        },
        500
      );
    }

    try {
      // Build R2 prefix
      const logTypes = categories || ['token-validation', 'auth-decision'];
      const allLogs: DiagnosticLogEntry[] = [];

      const prefixes: string[] = [];

      for (const logType of logTypes) {
        if (clientIds && clientIds.length > 0) {
          for (const clientId of clientIds) {
            prefixes.push(`diagnostic-logs/${logType}/${tenantId}/${clientId}`);
          }
        } else {
          prefixes.push(`diagnostic-logs/${logType}/${tenantId}`);
        }
      }

      const keySet = new Set<string>();

      for (const prefix of prefixes) {
        const keys = await listR2Objects(r2, prefix, startDate, endDate);
        log.debug('Listed R2 objects', { prefix, keyCount: keys.length });
        for (const key of keys) {
          keySet.add(key);
        }
      }

      const logs = await fetchLogsFromR2(r2, Array.from(keySet));
      allLogs.push(...logs);

      log.info('Fetched diagnostic logs', {
        tenantId,
        clientIds,
        totalLogs: allLogs.length,
      });

      // Build export options
      const exportOptions: ExportOptions = {
        sessionIds,
        startTime,
        endTime,
        categories,
        sortOrder: 'asc',
      };

      // Format logs
      let output: string;
      let contentType: string;
      let filename: string;

      if (format === 'jsonl') {
        output = formatAsJSONL(allLogs, exportOptions);
        contentType = 'application/x-ndjson';
        filename = `diagnostic-logs-${tenantId}-${Date.now()}.jsonl`;
      } else if (format === 'text') {
        output = formatAsText(allLogs, exportOptions);
        contentType = 'text/plain';
        filename = `diagnostic-logs-${tenantId}-${Date.now()}.txt`;
      } else {
        // Default: JSON
        const jsonData: Record<string, unknown> = {
          logs: JSON.parse(formatAsJSON(allLogs, exportOptions)),
        };

        if (includeStats) {
          jsonData.statistics = getLogStatistics(allLogs);
        }

        output = JSON.stringify(jsonData, null, 2);
        contentType = 'application/json';
        filename = `diagnostic-logs-${tenantId}-${Date.now()}.json`;
      }

      // Return as downloadable file
      return new Response(output, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      log.error('Failed to export diagnostic logs', {
        error: String(error),
        tenantId,
      });

      return c.json(
        {
          error: 'export_failed',
          message: 'Failed to export diagnostic logs',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      );
    }
  }
);

export default app;
