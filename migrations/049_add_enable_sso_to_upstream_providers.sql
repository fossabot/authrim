-- Add enable_sso column to upstream_providers table
-- Phase 2: SSO control for external IdP providers

ALTER TABLE upstream_providers
  ADD COLUMN enable_sso INTEGER NOT NULL DEFAULT 1;

-- Create index for enable_sso
CREATE INDEX idx_upstream_providers_enable_sso
  ON upstream_providers(tenant_id, enable_sso);

-- Comments
-- enable_sso: 1 = SSO enabled (handoff flow), 0 = SSO disabled (Direct Auth flow)
-- Default: 1 (SSO enabled) for backward compatibility
