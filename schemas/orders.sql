-- Orders table for agricultural AI agent frontend
-- This table stores order information with personal data masking

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_code TEXT NOT NULL UNIQUE,          -- 注文番号 (例: CRD-2024-001)
    customer_name TEXT NOT NULL,              -- マスキング済み顧客名 (例: 田***郎)
    phone TEXT,                               -- 電話番号 (任意)
    address TEXT,                             -- 住所 (任意)
    price INTEGER NOT NULL,                   -- 金額 (整数)
    order_date DATE NOT NULL,                 -- 注文日 (必須)
    delivery_date DATE,                       -- 希望配達日 (任意)
    notes TEXT,                               -- 備考 (任意)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);