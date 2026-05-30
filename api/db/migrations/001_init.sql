-- ============================================================
-- Migration: 001_init
-- Description: Initial schema for Market Order System
--   - ระบบสมาชิก (Member System)
--   - ระบบตลาดนัด (Market System)
--   - ระบบรับ Order (Order System)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM Types
-- ============================================================

CREATE TYPE user_role AS ENUM ('customer', 'vendor', 'admin');

CREATE TYPE market_status AS ENUM ('draft', 'published', 'active', 'closed', 'cancelled');

CREATE TYPE booth_status AS ENUM ('pending', 'approved', 'active', 'closed', 'rejected');

CREATE TYPE order_status AS ENUM (
    'pending',          -- รอตรวจสอบ
    'confirmed',        -- ยืนยันแล้ว
    'preparing',        -- กำลังจัดเตรียม
    'ready_for_pickup', -- พร้อมรับสินค้า
    'completed',        -- รับสินค้าแล้ว
    'cancelled'         -- ยกเลิก
);

CREATE TYPE payment_status AS ENUM ('unpaid', 'pending_approval', 'paid', 'refunded');

CREATE TYPE payment_method AS ENUM ('cash_on_pickup', 'bank_transfer', 'promptpay', 'qr_code');

-- ============================================================
-- 1. ระบบสมาชิก (Member System)
-- ============================================================

-- ตาราง: users - ผู้ใช้งานทั้งหมด (ลูกค้า, พ่อค้า/แม่ค้า, ผู้ดูแลระบบ)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,           -- ชื่อ-นามสกุล
    phone           VARCHAR(20),
    role            user_role NOT NULL DEFAULT 'customer',
    avatar_url      TEXT,
    address         TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);

-- ============================================================
-- 2. ระบบตลาดนัด (Market System)
-- ============================================================

-- ตาราง: markets - ตลาดนัด/อีเวนต์
CREATE TABLE markets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,           -- ชื่อตลาดนัด (e.g. "ตลาดนัดจตุจักร")
    description     TEXT,
    location        VARCHAR(255) NOT NULL,           -- ชื่อสถานที่
    address         TEXT,                            -- ที่อยู่เต็ม
    latitude        DECIMAL(10, 7),                  -- พิกัด GPS
    longitude       DECIMAL(10, 7),
    market_date     DATE NOT NULL,                   -- วันที่จัดตลาด
    start_time      TIME,                            -- เวลาเริ่ม
    end_time        TIME,                            -- เวลาสิ้นสุด
    status          market_status NOT NULL DEFAULT 'draft',
    banner_url      TEXT,                            -- รูปแบนเนอร์
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_markets_date ON markets(market_date);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_created_by ON markets(created_by);

-- ตาราง: booths - แผง/ร้านค้าที่ลงทะเบียนในตลาดนัด
CREATE TABLE booths (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id       UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    vendor_id       UUID NOT NULL REFERENCES users(id),
    booth_name      VARCHAR(255) NOT NULL,           -- ชื่อร้าน
    booth_number    VARCHAR(20),                     -- เลขที่แผง (e.g. "A-12")
    zone            VARCHAR(100),                    -- โซน (e.g. "โซนอาหาร", "โซนเสื้อผ้า")
    description     TEXT,                            -- รายละเอียดร้าน
    logo_url        TEXT,
    status          booth_status NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(market_id, vendor_id)                     -- ห้ามลงทะเบียนซ้ำ market เดียวกัน
);

-- Indexes
CREATE INDEX idx_booths_market ON booths(market_id);
CREATE INDEX idx_booths_vendor ON booths(vendor_id);
CREATE INDEX idx_booths_status ON booths(status);

-- ตาราง: categories - หมวดหมู่สินค้า
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,           -- ชื่อหมวดหมู่
    slug            VARCHAR(100) UNIQUE NOT NULL,    -- URL-friendly name
    description     TEXT,
    image_url       TEXT,
    parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL, -- self-referencing for subcategories
    sort_order      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort ON categories(sort_order);

-- ตาราง: products - สินค้า
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booth_id        UUID NOT NULL REFERENCES booths(id) ON DELETE CASCADE,
    vendor_id       UUID NOT NULL REFERENCES users(id),
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,           -- ชื่อสินค้า
    description     TEXT,
    price           DECIMAL(10, 2) NOT NULL,         -- ราคาปกติ
    sale_price      DECIMAL(10, 2),                  -- ราคาพิเศษ (null = ไม่มีโปร)
    image_urls      JSONB DEFAULT '[]'::JSONB,       -- Array of image URLs
    stock_quantity  INT DEFAULT NULL,                -- จำนวนคงเหลือ (null = ไม่จำกัด)
    unit            VARCHAR(50) DEFAULT 'ชิ้น',       -- หน่วยนับ (ชิ้น, กิโล, ชุด, แพ็ค)
    is_available    BOOLEAN NOT NULL DEFAULT true,   -- พร้อมขายหรือไม่
    is_featured     BOOLEAN NOT NULL DEFAULT false,  -- สินค้าแนะนำ
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_products_booth ON products(booth_id);
CREATE INDEX idx_products_vendor ON products(vendor_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(is_available, booth_id) WHERE is_available = true;
CREATE INDEX idx_products_featured ON products(is_featured, booth_id) WHERE is_featured = true;

-- ============================================================
-- 3. ระบบรับ Order (Order System)
-- ============================================================

-- ตาราง: orders - คำสั่งซื้อ
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number    VARCHAR(30) UNIQUE NOT NULL,     -- e.g. "ORD-20260525-A3F8"
    customer_id     UUID NOT NULL REFERENCES users(id),
    market_id       UUID NOT NULL REFERENCES markets(id),
    booth_id        UUID NOT NULL REFERENCES booths(id),
    total_amount    DECIMAL(10, 2) NOT NULL,         -- ยอดรวมก่อนลด
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    final_amount    DECIMAL(10, 2) NOT NULL,         -- ยอดสุทธิ
    status          order_status NOT NULL DEFAULT 'pending',
    payment_status  payment_status NOT NULL DEFAULT 'unpaid',
    payment_method  payment_method,                  -- ชำระด้วยวิธีไหน
    payment_proof_url TEXT,                          -- หลักฐานการโอนเงิน
    pickup_date     DATE,
    pickup_time     TIME,                            -- เวลาที่สะดวกมารับ
    customer_note   TEXT,                            -- หมายเหตุจากลูกค้า
    vendor_note     TEXT,                            -- หมายเหตุจากพ่อค้า/แม่ค้า
    cancelled_reason TEXT,                           -- เหตุผลการยกเลิก
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_market ON orders(market_id);
CREATE INDEX idx_orders_booth ON orders(booth_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);

-- ตาราง: order_items - รายการสินค้าในคำสั่งซื้อ
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name    VARCHAR(255) NOT NULL,           -- Snapshot ชื่อสินค้าตอนสั่งซื้อ
    quantity        INT NOT NULL CHECK (quantity > 0),
    unit_price      DECIMAL(10, 2) NOT NULL,         -- ราคาต่อหน่วย ณ ตอนสั่งซื้อ
    subtotal        DECIMAL(10, 2) NOT NULL,         -- unit_price * quantity
    notes           TEXT                             -- คำขอพิเศษ (e.g. "ไม่ใส่พริก")
);

-- Indexes
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ตาราง: order_status_history - บันทึกประวัติการเปลี่ยนสถานะ
CREATE TABLE order_status_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status     order_status,
    to_status       order_status NOT NULL,
    changed_by      UUID REFERENCES users(id),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_order_history_order ON order_status_history(order_id);
CREATE INDEX idx_order_history_created ON order_status_history(created_at DESC);

-- ============================================================
-- 4. ระบบตะกร้าสินค้า (Shopping Cart) - Optional
-- ============================================================

-- ตาราง: carts - ตะกร้า (1 user = 1 active cart)
CREATE TABLE carts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_carts_customer ON carts(customer_id);

-- ตาราง: cart_items - สินค้าในตะกร้า
CREATE TABLE cart_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id         UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity        INT NOT NULL CHECK (quantity > 0),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(cart_id, product_id)                     -- ห้ามใส่สินค้าซ้ำในตะกร้า
);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Function: auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_markets_updated_at
    BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_booths_updated_at
    BEFORE UPDATE ON booths
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_carts_updated_at
    BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: auto-generate order_number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    date_part VARCHAR;
    random_part VARCHAR;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    random_part := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 4));
    NEW.order_number := 'ORD-' || date_part || '-' || random_part;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- ============================================================
-- Seed Data: หมวดหมู่สินค้าเริ่มต้น
-- ============================================================

INSERT INTO categories (name, slug, description, sort_order) VALUES
    ('อาหาร', 'food', 'อาหารคาวหวานทุกประเภท', 1),
    ('เครื่องดื่ม', 'beverages', 'เครื่องดื่ม น้ำผลไม้ ชา กาแฟ', 2),
    ('เสื้อผ้า', 'clothing', 'เสื้อผ้าแฟชั่น ชาย-หญิง', 3),
    ('ของใช้', 'household', 'ของใช้ในบ้าน เครื่องครัว', 4),
    ('ต้นไม้', 'plants', 'ต้นไม้ ดอกไม้ อุปกรณ์จัดสวน', 5),
    ('สัตว์เลี้ยง', 'pets', 'สัตว์เลี้ยงและอุปกรณ์', 6),
    ('Handmade', 'handmade', 'งาน handmade งานฝีมือ', 7),
    ('อื่นๆ', 'others', 'สินค้าอื่นๆ', 99);
