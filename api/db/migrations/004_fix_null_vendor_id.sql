-- Fix NULL vendor_id on existing rows (safe re-run)

DO $$
DECLARE
    _first_vendor_id UUID;
BEGIN
    SELECT id INTO _first_vendor_id FROM vendors ORDER BY created_at ASC LIMIT 1;

    IF _first_vendor_id IS NOT NULL THEN
        UPDATE categories SET vendor_id = _first_vendor_id WHERE vendor_id IS NULL;
        UPDATE products SET vendor_id = _first_vendor_id WHERE vendor_id IS NULL;
        UPDATE orders SET vendor_id = _first_vendor_id WHERE vendor_id IS NULL;
        UPDATE order_items SET vendor_id = _first_vendor_id WHERE vendor_id IS NULL;
        UPDATE customer_tags SET vendor_id = _first_vendor_id WHERE vendor_id IS NULL;
    END IF;
END;
$$;

-- Make columns NOT NULL (idempotent)
ALTER TABLE categories ALTER COLUMN vendor_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN vendor_id SET NOT NULL;
ALTER TABLE orders ALTER COLUMN vendor_id SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN vendor_id SET NOT NULL;
ALTER TABLE customer_tags ALTER COLUMN vendor_id SET NOT NULL;
