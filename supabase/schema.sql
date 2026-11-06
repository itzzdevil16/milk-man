-- ============================================================================
-- Milk Distributor ERP & Customer Ordering App - Database Schema (Supabase)
-- Route-based Distribution (Pune: Kothrud, Baner, Hadapsar, Wakad)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    distributor_name TEXT NOT NULL DEFAULT 'Pune Fresh Milk Distributors',
    distributor_phone TEXT NOT NULL DEFAULT '+91 9876543210',
    distributor_address TEXT DEFAULT 'Shop 12, Market Yard, Pune, Maharashtra',
    cut_off_time TIME NOT NULL DEFAULT '18:00:00',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    default_crate_deposit NUMERIC(10,2) DEFAULT 0.00,
    upi_vpa TEXT DEFAULT 'milkdistributor@upi',
    upi_payee_name TEXT DEFAULT 'Milk Distributor Pune',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, -- e.g., 'gokul_fc_500'
    brand TEXT NOT NULL,  -- 'Gokul', 'Amul', 'Warana'
    name TEXT NOT NULL,   -- 'Gokul Full Cream 500ml'
    name_mr TEXT NOT NULL,-- 'गोकुळ फुल क्रीम ५०० मि.ली.'
    pack_size TEXT NOT NULL, -- '500ml', '1L'
    rate NUMERIC(10,2) NOT NULL,
    pouches_per_crate INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RETAILERS TABLE
CREATE TABLE IF NOT EXISTS retailers (
    id TEXT PRIMARY KEY, -- e.g., 'RET001' or UUID
    name TEXT NOT NULL,
    shop_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    route TEXT NOT NULL, -- 'Kothrud', 'Baner', 'Hadapsar', 'Wakad'
    address TEXT,
    credit_limit NUMERIC(10,2) DEFAULT 10000.00,
    opening_balance NUMERIC(10,2) DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE (Intake)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    retailer_id TEXT NOT NULL REFERENCES retailers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    order_time TIME NOT NULL DEFAULT CURRENT_TIME,
    source TEXT NOT NULL CHECK (source IN ('App', 'Phone', 'WhatsApp', 'Manual')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Posted', 'Cancelled')),
    items JSONB NOT NULL, -- {"gokul_fc_500": 24, "amul_gold_500": 10}
    is_late BOOLEAN NOT NULL DEFAULT false,
    posted_to_register BOOLEAN NOT NULL DEFAULT false,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DAILY REGISTER (Single source of truth for deliveries)
CREATE TABLE IF NOT EXISTS daily_register (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    register_date DATE NOT NULL DEFAULT CURRENT_DATE,
    retailer_id TEXT NOT NULL REFERENCES retailers(id) ON DELETE RESTRICT,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    ordered_pouches INTEGER, -- NULL means blank/not entered, 0 means confirmed 0
    is_zero_confirmed BOOLEAN DEFAULT false,
    locked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(register_date, retailer_id, product_id)
);

-- 6. CRATE MOVEMENTS & BALANCES (Per Retailer & Per Brand)
CREATE TABLE IF NOT EXISTS crate_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    retailer_id TEXT NOT NULL REFERENCES retailers(id) ON DELETE RESTRICT,
    brand TEXT NOT NULL, -- 'Gokul', 'Amul', 'Warana'
    opening_crates INTEGER NOT NULL DEFAULT 0,
    issued_crates INTEGER NOT NULL DEFAULT 0,
    returned_crates INTEGER NOT NULL DEFAULT 0,
    closing_crates INTEGER GENERATED ALWAYS AS (opening_crates + issued_crates - returned_crates) STORED,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(record_date, retailer_id, brand)
);

-- 7. DAILY BILLS / INVOICES
CREATE TABLE IF NOT EXISTS daily_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE, -- e.g. INV-20261022-RET001
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    retailer_id TEXT NOT NULL REFERENCES retailers(id) ON DELETE RESTRICT,
    line_items JSONB NOT NULL, -- [{productId, name, qty, rate, amount}]
    milk_total NUMERIC(10,2) NOT NULL,
    prev_outstanding NUMERIC(10,2) NOT NULL,
    today_bill NUMERIC(10,2) NOT NULL,
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(10,2) NOT NULL,
    is_finalized BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PAYMENTS & COLLECTIONS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_no TEXT NOT NULL UNIQUE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    retailer_id TEXT NOT NULL REFERENCES retailers(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other')),
    upi_ref TEXT,
    status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Pending Verification', 'Voided')),
    void_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL, -- 'REOPEN_DAY', 'VOID_PAYMENT', 'EDIT_PRICE', 'POST_REGISTER'
    performed_by TEXT NOT NULL DEFAULT 'Staff',
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SEED INITIAL PRODUCTS & SETTINGS
-- ============================================================================

INSERT INTO system_settings (id, distributor_name, cut_off_time, upi_vpa, upi_payee_name)
VALUES ('global', 'Pune Dudh Vitran ERP', '18:00:00', 'pune.milkdist@upi', 'Pune Milk Distributors')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, brand, name, name_mr, pack_size, rate, pouches_per_crate, display_order) VALUES
('gokul_fc_500', 'Gokul', 'Gokul Full Cream 500ml', 'गोकुळ फुल क्रीम ५०० मि.ली.', '500ml', 30.00, 12, 1),
('gokul_toned_1l', 'Gokul', 'Gokul Toned 1L', 'गोकुळ टोन्ड १ लिटर', '1L', 56.00, 10, 2),
('amul_taaza_500', 'Amul', 'Amul Taaza 500ml', 'अमूल ताजा ५०० मि.ली.', '500ml', 29.00, 10, 3),
('amul_gold_500', 'Amul', 'Amul Gold 500ml', 'अमूल गोल्ड ५०० मि.ली.', '500ml', 33.00, 10, 4),
('warana_std_500', 'Warana', 'Warana Standard 500ml', 'वारणा स्टँडर्ड ५०० मि.ली.', '500ml', 28.00, 12, 5)
ON CONFLICT (id) DO NOTHING;

-- Sample Pune Retailers
INSERT INTO retailers (id, name, shop_name, phone, route, address) VALUES
('RET001', 'Ramesh Patil', 'Mahesh Dairy', '9822011223', 'Kothrud', 'Paud Road, Kothrud, Pune'),
('RET002', 'Suresh Jadhav', 'Om Sai Super Market', '9822044556', 'Baner', 'Near Pan Card Club, Baner, Pune'),
('RET003', 'Ganesh Shinde', 'Shree Ganesh Kirana', '9822077889', 'Hadapsar', 'Gadital, Hadapsar, Pune'),
('RET004', 'Vikas More', 'Balaji Provisions', '9822099001', 'Wakad', 'Datta Mandir Road, Wakad, Pune')
ON CONFLICT (id) DO NOTHING;

-- Enable Realtime on key tables for live sync
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_register;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
