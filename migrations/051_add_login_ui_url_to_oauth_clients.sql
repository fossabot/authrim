-- Add login_ui_url column to oauth_clients table
-- Allows per-client login UI URL configuration

ALTER TABLE oauth_clients
  ADD COLUMN login_ui_url TEXT;

-- login_ui_url: Optional per-client login UI base URL
--   - If set, overrides global UI_URL for this client
--   - If NULL, falls back to global UI configuration
--   - Must use HTTPS (localhost exception for development)
