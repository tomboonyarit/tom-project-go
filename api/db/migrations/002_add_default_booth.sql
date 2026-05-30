-- ============================================================
-- Migration: 002_add_default_booth
-- Description: Add default_booth_id to users table
--   - Allow vendors to set a default booth for quick order entry
-- ============================================================

ALTER TABLE users
    ADD COLUMN default_booth_id UUID REFERENCES booths(id);

-- Index for faster lookups by default booth
CREATE INDEX idx_users_default_booth ON users(default_booth_id);
