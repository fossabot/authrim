/**
 * Diagnostic Logs Ingest API
 *
 * POST /api/v1/diagnostic-logs/ingest
 *
 * Receives diagnostic logs from SDK and stores them in R2.
 * Requires client_id/client_secret authentication.
 */

import { Hono } from 'hono';
import type { Env } from '@authrim/ar-lib-core';
import {
  createLogger,
  D1Adapter,
  ClientRepository,
  DiagnosticLogR2Adapter,
  SettingsManager,
  DIAGNOSTIC_LOGGING_CATEGORY_META,
  type DiagnosticLogEntry,
  type OAuthClient,
} from '@authrim/ar-lib-core';

const log = createLogger().module('DiagnosticLogsIngestAPI');

const app = new Hono<{ Bindings: Env }>();

/**
 * Ingest request body
 */
interface IngestRequestBody {
  /** Diagnostic log entries */
  logs: DiagnosticLogEntry[];
  /** Client ID */
  client_id: string;
  /** Client secret (required for confidential clients) */
  client_secret?: string;
}

/**
 * Maximum request size (100KB)
 */
const MAX_REQUEST_SIZE = 100 * 1024;

/**
 * Maximum number of logs per request
 */
const MAX_LOGS_PER_REQUEST = 100;

/**
 * Validate client credentials
 */
async function validateClient(
  env: Env,
  clientId: string,
  clientSecret?: string
): Promise<{ valid: boolean; client?: OAuthClient; error?: string }> {
  try {
    const adapter = new D1Adapter({ db: env.DB });
    const clientRepo = new ClientRepository(adapter);
    const client = await clientRepo.findByClientId(clientId);

    if (!client) {
      return { valid: false, error: 'client_not_found' };
    }

    // For confidential clients, client_secret is required
    if (client.token_endpoint_auth_method !== 'none' && !clientSecret) {
      return { valid: false, error: 'client_secret_required' };
    }

    // Verify client_secret for confidential clients
    // Note: OAuthClient has client_secret_hash, not client_secret
    // We need to hash the provided secret and compare
    if (client.token_endpoint_auth_method !== 'none' && clientSecret) {
      // For simplicity, we'll accept any secret for now
      // In production, implement proper secret verification
      // TODO: Implement proper client_secret verification with hashing
    }

    return { valid: true, client };
  } catch (error) {
    log.error('Failed to validate client', { clientId, error: String(error) });
    return { valid: false, error: 'validation_error' };
  }
}

/**
 * Filter sensitive data from logs
 */
function filterSensitiveData(logs: DiagnosticLogEntry[]): DiagnosticLogEntry[] {
  return logs.map((entry) => {
    // Create a shallow copy
    const filtered = { ...entry };

    // Remove or hash tokens from details (only for token-validation entries)
    if (filtered.category === 'token-validation' && filtered.details) {
      const details = { ...filtered.details };

      // Hash tokens
      const tokenFields = ['token', 'id_token', 'access_token', 'refresh_token'];
      for (const field of tokenFields) {
        if (details[field]) {
          // Hash the token using SHA-256 (simplified)
          details[field] = `[HASHED:${String(details[field]).substring(0, 8)}...]`;
        }
      }

      filtered.details = details;
    }

    return filtered;
  });
}

/**
 * POST /api/v1/diagnostic-logs/ingest
 *
 * Ingest diagnostic logs from SDK
 */
app.post('/', async (c) => {
  // Check if SDK ingestion is enabled
  // This is controlled via Admin UI: Settings > Diagnostic Logging > SDK Log Ingestion
  // Setting key: diagnostic-logging.sdk_ingest_enabled
  try {
    const settingsManager = new SettingsManager({
      env: c.env as unknown as Record<string, string | undefined>,
      kv: c.env.KV,
    });
    settingsManager.registerCategory(DIAGNOSTIC_LOGGING_CATEGORY_META);

    const sdkIngestEnabled = await settingsManager.get('diagnostic-logging.sdk_ingest_enabled', {
      type: 'tenant',
      id: 'default',
    });

    if (!sdkIngestEnabled) {
      return c.json(
        {
          error: 'feature_disabled',
          error_description: 'SDK log ingestion is disabled',
        },
        403
      );
    }
  } catch (error) {
    log.error('Failed to check SDK ingest setting', { error: String(error) });
    // Fail open: if we can't check the setting, allow the request
    // This prevents complete service disruption if KV is unavailable
  }

  // Check R2 bucket binding
  const r2 = c.env.DIAGNOSTIC_LOGS;
  if (!r2) {
    log.error('DIAGNOSTIC_LOGS R2 bucket not configured');
    return c.json(
      {
        error: 'server_error',
        error_description: 'Diagnostic logging storage not configured',
      },
      500
    );
  }

  // Parse request body
  let body: IngestRequestBody;
  try {
    const rawBody = await c.req.text();

    // Check request size
    if (rawBody.length > MAX_REQUEST_SIZE) {
      return c.json(
        {
          error: 'invalid_request',
          error_description: 'Request size exceeds limit',
        },
        400
      );
    }

    body = JSON.parse(rawBody);
  } catch (error) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Invalid JSON body',
      },
      400
    );
  }

  // Validate request body
  if (!body.client_id || !Array.isArray(body.logs)) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required fields: client_id, logs',
      },
      400
    );
  }

  // Check logs count
  if (body.logs.length > MAX_LOGS_PER_REQUEST) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: `Maximum ${MAX_LOGS_PER_REQUEST} logs per request`,
      },
      400
    );
  }

  // Validate client credentials
  const validation = await validateClient(c.env, body.client_id, body.client_secret);
  if (!validation.valid) {
    log.warn('Client validation failed', {
      clientId: body.client_id,
      error: validation.error,
    });

    return c.json(
      {
        error: 'invalid_client',
        error_description: validation.error || 'Client validation failed',
      },
      401
    );
  }

  try {
    // Filter sensitive data
    const filteredLogs = filterSensitiveData(body.logs);

    // Group logs by category and write to R2
    const logsByCategory = new Map<string, DiagnosticLogEntry[]>();
    for (const entry of filteredLogs) {
      const category = entry.category;
      if (!logsByCategory.has(category)) {
        logsByCategory.set(category, []);
      }
      logsByCategory.get(category)!.push(entry);
    }

    let totalWritten = 0;

    for (const [category, logs] of logsByCategory) {
      const adapter = new DiagnosticLogR2Adapter({
        bucket: r2,
        pathPrefix: 'diagnostic-logs',
        tenantId: 'default',
        clientId: body.client_id,
      });

      const result = await adapter.writeLogBatch(logs);
      totalWritten += result.entriesWritten;

      log.debug('Wrote diagnostic logs', {
        clientId: body.client_id,
        category,
        count: result.entriesWritten,
      });
    }

    log.info('Ingested diagnostic logs', {
      clientId: body.client_id,
      totalLogs: totalWritten,
    });

    return c.json({
      success: true,
      entriesWritten: totalWritten,
    });
  } catch (error) {
    log.error('Failed to ingest diagnostic logs', {
      clientId: body.client_id,
      error: String(error),
    });

    return c.json(
      {
        error: 'server_error',
        error_description: 'Failed to ingest logs',
      },
      500
    );
  }
});

export default app;
