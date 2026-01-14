/**
 * External IdP Provider Management Proxy
 *
 * Proxies requests from Admin UI to ar-bridge's external IdP admin API.
 * Converts session-based authentication to Bearer token authentication.
 *
 * @module external-providers
 */

import type { Context } from 'hono';
import type { Env } from '@authrim/ar-lib-core/types/env';
import { createErrorResponse, AR_ERROR_CODES, getLogger } from '@authrim/ar-lib-core';

/**
 * Base URL path for external IdP admin API in ar-bridge
 * Must match the routes in ar-bridge/src/index.ts
 */
const EXTERNAL_IDP_ADMIN_PATH = '/api/admin/external-providers';

/**
 * Creates a proxied request to ar-bridge with Bearer token authentication
 */
async function proxyToExternalIdp(
  c: Context<{ Bindings: Env }>,
  path: string,
  method: string,
  body?: string
): Promise<Response> {
  const log = getLogger(c).module('EXTERNAL-PROVIDERS');

  // Ensure EXTERNAL_IDP service binding is configured
  if (!c.env.EXTERNAL_IDP) {
    log.error('EXTERNAL_IDP service binding not configured');
    return createErrorResponse(c, AR_ERROR_CODES.INTERNAL_ERROR);
  }

  // Ensure ADMIN_API_SECRET is configured
  if (!c.env.ADMIN_API_SECRET) {
    log.error('ADMIN_API_SECRET not configured');
    return createErrorResponse(c, AR_ERROR_CODES.INTERNAL_ERROR);
  }

  try {
    // Debug: Log ADMIN_API_SECRET status (not the actual value)
    log.info('Proxying to ar-bridge', {
      hasAdminApiSecret: !!c.env.ADMIN_API_SECRET,
      secretLength: c.env.ADMIN_API_SECRET?.length || 0,
      path,
      method,
    });

    // Build request to ar-bridge
    const headers: HeadersInit = {
      Authorization: `Bearer ${c.env.ADMIN_API_SECRET}`,
      'Content-Type': 'application/json',
    };

    // Forward tenant_id query parameter if present
    const url = new URL(c.req.url);
    const tenantId = url.searchParams.get('tenant_id');
    const targetUrl = tenantId
      ? `https://external-idp${path}?tenant_id=${encodeURIComponent(tenantId)}`
      : `https://external-idp${path}`;

    const requestInit: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestInit.body = body;
    }

    // Call ar-bridge via service binding
    const response = await c.env.EXTERNAL_IDP.fetch(targetUrl, requestInit);

    // Return response with appropriate status
    const responseBody = await response.text();

    // Debug: Log response status
    log.info('ar-bridge response', {
      status: response.status,
      responseLength: responseBody.length,
      isError: response.status >= 400,
    });

    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error) {
    log.error('Failed to proxy request to external IdP', {}, error as Error);
    return createErrorResponse(c, AR_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * GET /api/admin/external-providers - List all external IdP providers
 */
export async function adminExternalProvidersListHandler(c: Context<{ Bindings: Env }>) {
  return proxyToExternalIdp(c, EXTERNAL_IDP_ADMIN_PATH, 'GET');
}

/**
 * POST /api/admin/external-providers - Create a new external IdP provider
 */
export async function adminExternalProvidersCreateHandler(c: Context<{ Bindings: Env }>) {
  const body = await c.req.text();
  return proxyToExternalIdp(c, EXTERNAL_IDP_ADMIN_PATH, 'POST', body);
}

/**
 * GET /api/admin/external-providers/:id - Get external IdP provider details
 */
export async function adminExternalProvidersGetHandler(c: Context<{ Bindings: Env }>) {
  const id = c.req.param('id');
  if (!id) {
    return createErrorResponse(c, AR_ERROR_CODES.VALIDATION_REQUIRED_FIELD, {
      variables: { field: 'id' },
    });
  }
  return proxyToExternalIdp(c, `${EXTERNAL_IDP_ADMIN_PATH}/${encodeURIComponent(id)}`, 'GET');
}

/**
 * PUT /api/admin/external-providers/:id - Update external IdP provider
 */
export async function adminExternalProvidersUpdateHandler(c: Context<{ Bindings: Env }>) {
  const id = c.req.param('id');
  if (!id) {
    return createErrorResponse(c, AR_ERROR_CODES.VALIDATION_REQUIRED_FIELD, {
      variables: { field: 'id' },
    });
  }
  const body = await c.req.text();
  return proxyToExternalIdp(c, `${EXTERNAL_IDP_ADMIN_PATH}/${encodeURIComponent(id)}`, 'PUT', body);
}

/**
 * DELETE /api/admin/external-providers/:id - Delete external IdP provider
 */
export async function adminExternalProvidersDeleteHandler(c: Context<{ Bindings: Env }>) {
  const id = c.req.param('id');
  if (!id) {
    return createErrorResponse(c, AR_ERROR_CODES.VALIDATION_REQUIRED_FIELD, {
      variables: { field: 'id' },
    });
  }
  return proxyToExternalIdp(c, `${EXTERNAL_IDP_ADMIN_PATH}/${encodeURIComponent(id)}`, 'DELETE');
}
