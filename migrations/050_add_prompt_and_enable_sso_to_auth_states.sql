-- Add prompt and enable_sso columns to external_idp_auth_states table
-- Phase 1: Silent Auth (prompt=none support)
-- Phase 2: SSO control per authentication flow

ALTER TABLE external_idp_auth_states
  ADD COLUMN prompt TEXT;

ALTER TABLE external_idp_auth_states
  ADD COLUMN enable_sso INTEGER NOT NULL DEFAULT 1;

-- Comments
-- prompt: OIDC prompt parameter (none, login, consent, select_account)
--   Note: Can be space-separated multiple values per OIDC Core spec
-- enable_sso: 1 = SSO enabled (handoff flow), 0 = SSO disabled (Direct Auth flow)
-- Default: 1 (SSO enabled) for backward compatibility
-- No index needed: Silent Auth uses Session DO directly, not DB queries
