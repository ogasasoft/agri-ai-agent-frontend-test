-- Orders table for agricultural AI agent frontend
-- This table stores order information with multi-tenant isolation and shipping tracking

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(100) NOT NULL,         -- 注文番号 (例: CRD-2024-001)
    customer_name VARCHAR(255) NOT NULL,      -- 顧客名
    phone VARCHAR(50),                        -- 電話番号 (任意)
    address TEXT,                             -- 住所 (任意)
    price INTEGER,                            -- 金額 (整数)
    order_date DATE,                          -- 注文日
    delivery_date DATE,                       -- 希望配達日 (任意)
    notes TEXT,                               -- 備考 (任意)
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, -- カテゴリFK
    source VARCHAR(50) DEFAULT 'manual',      -- 登録元 (manual, csv_upload, api)
    extra_data JSONB DEFAULT '{}',            -- 追加データ (JSON)
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- 多重テナント分離
    status VARCHAR(50) DEFAULT 'pending',     -- 注文状態 (pending, processing, shipped, delivered)
    shipped_at TIMESTAMP,                     -- 発送日時
    tracking_number VARCHAR(100),             -- 追跡番号
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_code, user_id)               -- ユーザー内での注文番号重複防止
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_category_id ON orders(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);