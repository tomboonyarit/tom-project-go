-- Multi-tenancy: Add vendor_id to all business tables
-- Safe to re-run: checks if column exists first

DO $$
BEGIN
    -- categories
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'vendor_id') THEN
        ALTER TABLE categories ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_categories_vendor ON categories(vendor_id);
    END IF;

    -- products
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'vendor_id') THEN
        ALTER TABLE products ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
    END IF;

    -- orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'vendor_id') THEN
        ALTER TABLE orders ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id);
    END IF;

    -- order_items (inherit vendor via the order, but include for direct lookup)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'vendor_id') THEN
        ALTER TABLE order_items ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_order_items_vendor ON order_items(vendor_id);
    END IF;

    -- customer_tags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_tags' AND column_name = 'vendor_id') THEN
        ALTER TABLE customer_tags ADD COLUMN vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_customer_tags_vendor ON customer_tags(vendor_id);
    END IF;

    -- Make vendor_id NOT NULL after adding (existing rows will need to be cleaned up first)
    BEGIN
        ALTER TABLE categories ALTER COLUMN vendor_id SET NOT NULL;
        ALTER TABLE products ALTER COLUMN vendor_id SET NOT NULL;
        ALTER TABLE orders ALTER COLUMN vendor_id SET NOT NULL;
        ALTER TABLE order_items ALTER COLUMN vendor_id SET NOT NULL;
        ALTER TABLE customer_tags ALTER COLUMN vendor_id SET NOT NULL;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set vendor_id NOT NULL — existing rows may need cleanup';
    END;
END;
$$;
