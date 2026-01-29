-- Migration 048: Add require_pkce column to oauth_clients
-- This column indicates whether PKCE (Proof Key for Code Exchange) is required for authorization requests
-- Default is 0 (false) for backward compatibility

ALTER TABLE oauth_clients ADD COLUMN require_pkce INTEGER DEFAULT 0;
