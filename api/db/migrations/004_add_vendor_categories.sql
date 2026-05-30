-- Add vendor_id to categories so vendors can manage their own categories.
ALTER TABLE categories ADD COLUMN vendor_id UUID REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_categories_vendor ON categories(vendor_id);
