-- Migration: Add button_color_dark column for dark theme support
-- Allows external IdP providers to specify a separate button color for dark mode

ALTER TABLE upstream_providers ADD COLUMN button_color_dark TEXT;
