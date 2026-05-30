-- ============================================================
-- Migration: 003_add_customer_description
-- Description: Add customer_description for walk-in customer observations
-- ============================================================

ALTER TABLE orders ADD COLUMN customer_description TEXT;
