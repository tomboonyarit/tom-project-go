-- Customer Tag System for walk-in orders
-- Tags help vendors track customer characteristics

-- Predefined tags table
CREATE TABLE IF NOT EXISTS customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add tags column to orders (comma-separated tag names for speed)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
