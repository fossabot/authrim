/**
 * Organization Domain Mappings Admin API
 *
 * CRUD operations for organization domain mappings used in JIT Provisioning.
 *
 * POST   /api/admin/org-domain-mappings              - Create mapping
 * GET    /api/admin/org-domain-mappings              - List mappings
 * GET    /api/admin/org-domain-mappings/:id          - Get mapping
 * PUT    /api/admin/org-domain-mappings/:id          - Update mapping
 * DELETE /api/admin/org-domain-mappings/:id          - Delete mapping
 * GET    /api/admin/organizations/:org_id/domain-mappings - List by org
 */

import type { Context } from 'hono';
import {
  D1Adapter,
  type DatabaseAdapter,
  type OrgDomainMapping,
  type OrgDomainMappingRow,
  type OrgDomainMappingInput,
  generateEmailDomainHashWithVersion,
  getEmailDomainHashConfig,
  listDomainMappings,
  createDomainMapping,
  updateDomainMapping,
  deleteDomainMapping,
  getDomainMappingById,
} from '@authrim/ar-lib-core';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_TENANT_ID = 'default';
const MAX_MAPPINGS_PER_PAGE = 100;

// =============================================================================
// Handlers
// =============================================================================

/**
 * POST /api/admin/org-domain-mappings
 * Create a new domain mapping
 */
export async function createOrgDomainMapping(c: Context) {
  const body = await c.req.json<OrgDomainMappingInput>();
  const tenantId = DEFAULT_TENANT_ID;

  // Validate input
  if (!body.domain || body.domain.trim().length === 0) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'domain is required',
      },
      400
    );
  }

  if (!body.org_id || body.org_id.trim().length === 0) {
    return c.json(
      {
        error: 'invalid_request',
        error_description: 'org_id is required',
      },
      400
    );
  }

  try {
    // Generate domain hash
    const hashConfig = await getEmailDomainHashConfig(c.env);
    const hashResult = await generateEmailDomainHashWithVersion(
      `user@${body.domain.toLowerCase()}`,
      hashConfig
    );

    // Verify org exists
    const coreAdapter: DatabaseAdapter = new D1Adapter({ db: c.env.DB });
    const org = await coreAdapter.queryOne<{ id: string }>(
      'SELECT id FROM organizations WHERE id = ? AND tenant_id = ?',
      [body.org_id, tenantId]
    );

    if (!org) {
      return c.json(
        {
          error: 'not_found',
          error_description: `Organization ${body.org_id} not found`,
        },
        404
      );
    }

    // Check for existing mapping
    const existing = await coreAdapter.queryOne<{ id: string }>(
      `SELECT id FROM org_domain_mappings
       WHERE tenant_id = ? AND domain_hash = ? AND org_id = ?`,
      [tenantId, hashResult.hash, body.org_id]
    );

    if (existing) {
      return c.json(
        {
          error: 'conflict',
          error_description: `Domain mapping already exists for this org`,
        },
        409
      );
    }

    // Create mapping
    const mapping = await createDomainMapping(
      c.env.DB,
      tenantId,
      hashResult.hash,
      hashResult.version,
      body.org_id,
      {
        autoJoinEnabled: body.auto_join_enabled,
        membershipType: body.membership_type,
        autoAssignRoleId: body.auto_assign_role_id,
        verified: body.verified,
        priority: body.priority,
        isActive: body.is_active,
      }
    );

    return c.json(
      {
        ...mapping,
        domain: body.domain.toLowerCase(), // Return domain for reference
      },
      201
    );
  } catch (error) {
    console.error('[Org Domain Mappings API] Create error:', error);
    return c.json(
      {
        error: 'server_error',
        error_description: 'Failed to create domain mapping',
      },
      500
    );
  }
}

/**
 * GET /api/admin/org-domain-mappings
 * List all domain mappings
 */
export async function listOrgDomainMappings(c: Context) {
  const tenantId = DEFAULT_TENANT_ID;
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), MAX_MAPPINGS_PER_PAGE);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  const orgId = c.req.query('org_id');
  const verified = c.req.query('verified');
  const isActive = c.req.query('is_active');

  try {
    const result = await listDomainMappings(c.env.DB, tenantId, {
      orgId: orgId || undefined,
      verified: verified !== undefined ? verified === 'true' : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      limit,
      offset,
    });

    return c.json({
      mappings: result.mappings,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Org Domain Mappings API] List error:', error);
    return c.json(
      {
        error: 'server_error',
        error_description: 'Failed to list domain mappings',
      },
      500
    );
  }
}

/**
 * GET /api/admin/org-domain-mappings/:id
 * Get a single mapping by ID
 */
export async function getOrgDomainMapping(c: Context) {
  const id = c.req.param('id');
  const tenantId = DEFAULT_TENANT_ID;

  try {
    const mapping = await getDomainMappingById(c.env.DB, id, tenantId);

    if (!mapping) {
      return c.json(
        {
          error: 'not_found',
          error_description: `Domain mapping ${id} not found`,
        },
        404
      );
    }

    return c.json(mapping);
  } catch (error) {
    console.error('[Org Domain Mappings API] Get error:', error);
    return c.json(
      {
        error: 'server_error',
        error_description: 'Failed to get domain mapping',
      },
      500
    );
  }
}

/**
 * PUT /api/admin/org-domain-mappings/:id
 * Update a mapping
 */
export async function updateOrgDomainMapping(c: Context) {
  const id = c.req.param('id');
  const tenantId = DEFAULT_TENANT_ID;
  const body = await c.req.json<Partial<OrgDomainMappingInput>>();

  try {
    // Note: domain cannot be updated. Create a new mapping instead.
    const updated = await updateDomainMapping(c.env.DB, id, tenantId, {
      autoJoinEnabled: body.auto_join_enabled,
      membershipType: body.membership_type,
      autoAssignRoleId: body.auto_assign_role_id,
      verified: body.verified,
      priority: body.priority,
      isActive: body.is_active,
    });

    if (!updated) {
      return c.json(
        {
          error: 'not_found',
          error_description: `Domain mapping ${id} not found`,
        },
        404
      );
    }

    return c.json(updated);
  } catch (error) {
    console.error('[Org Domain Mappings API] Update error:', error);
    return c.json(
      {
        error: 'server_error',
        error_description: 'Failed to update domain mapping',
      },
      500
    );
  }
}

/**
 * DELETE /api/admin/org-domain-mappings/:id
 * Delete a mapping
 */
export async function deleteOrgDomainMapping(c: Context) {
  const id = c.req.param('id');
  const tenantId = DEFAULT_TENANT_ID;

  try {
    const success = await deleteDomainMapping(c.env.DB, id, tenantId);

    if (!success) {
      return c.json(
        {
          error: 'not_found',
          error_description: `Domain mapping ${id} not found`,
        },
        404
      );
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('[Org Domain Mappings API] Delete error:', error);
    return c.json(
      {
        error: 'server_error',
        error_description: 'Failed to delete domain mapping',
      },
      500
    );
  }
}

/**
 * GET /api/admin/organizations/:org_id/domain-mappings
 * List domain mappings for a specific organization
 */
export async function listOrgDomainMappingsByOrg(c: Context) {
  const orgId = c.req.param('org_id');
  const tenantId = DEFAULT_TENANT_ID;
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), MAX_MAPPINGS_PER_PAGE);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  try {
    // Verify org exists
    const coreAdapter: DatabaseAdapter = new D1Adapter({ db: c.env.DB });
    const org = await coreAdapter.queryOne<{ id: string }>(
      'SELECT id FROM organizations WHERE id = ? AND tenant_id = ?',
      [orgId, tenantId]
    );

    if (!org) {
      return c.json(
        {
          error: 'not_found',
          error_description: `Organization ${orgId} not found`,
        },
        404
      );
    }

    const result = await listDomainMappings(c.env.DB, tenantId, {
      orgId,
      limit,
      offset,
    });

    return c.json({
      mappings: result.mappings,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Org Domain Mappings API] List by org error:', error);
    return c.json(
      {
        error: 'server_error',
        error_description: 'Failed to list domain mappings',
      },
      500
    );
  }
}

/**
 * POST /api/admin/org-domain-mappings/verify
 * Verify domain ownership (placeholder for future implementation)
 */
export async function verifyDomainOwnership(c: Context) {
  const body = await c.req.json<{ mapping_id: string; verification_method: string }>();
  const tenantId = DEFAULT_TENANT_ID;

  // TODO: Implement domain verification (DNS TXT record, email, etc.)
  // For now, just mark as verified

  try {
    const updated = await updateDomainMapping(c.env.DB, body.mapping_id, tenantId, {
      verified: true,
    });

    if (!updated) {
      return c.json(
        {
          error: 'not_found',
          error_description: `Domain mapping ${body.mapping_id} not found`,
        },
        404
      );
    }

    return c.json({
      success: true,
      mapping: updated,
      message: 'Domain marked as verified. Full verification support coming soon.',
    });
  } catch (error) {
    console.error('[Org Domain Mappings API] Verify error:', error);
    return c.json(
      {
        error: 'server_error',
        error_description: 'Failed to verify domain',
      },
      500
    );
  }
}
