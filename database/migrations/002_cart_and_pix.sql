-- Migração 002: Sistema de Carrinho de Compras, Cupons e Pagamento PIX

CREATE TABLE IF NOT EXISTS pix_settings (
  guild_id TEXT PRIMARY KEY,
  pix_key TEXT NOT NULL,
  key_type TEXT NOT NULL DEFAULT 'EMAIL', -- EMAIL, CPF, CNPJ, TELEFONE, ALEATORIA
  beneficiary_name TEXT NOT NULL DEFAULT 'BLACKSHOP',
  beneficiary_city TEXT NOT NULL DEFAULT 'SAO PAULO',
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS cart_orders (
  cart_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL UNIQUE,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  items_json TEXT NOT NULL DEFAULT '[]',
  coupon_code TEXT,
  discount_amount REAL NOT NULL DEFAULT 0.0,
  subtotal REAL NOT NULL DEFAULT 0.0,
  total_amount REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, WAITING_PAYMENT, PAID, DELIVERED, CANCELLED
  pix_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

CREATE INDEX IF NOT EXISTS idx_cart_orders_user ON cart_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cart_orders_channel ON cart_orders(channel_id);

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  discount_percent REAL NOT NULL DEFAULT 0.0,
  discount_fixed REAL NOT NULL DEFAULT 0.0,
  max_uses INTEGER NOT NULL DEFAULT 9999,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- Cupons Padrão
INSERT OR IGNORE INTO coupons (code, discount_percent, discount_fixed, is_active)
VALUES 
  ('BLACK10', 10.0, 0.0, 1),
  ('PRIMEIRACOMPRA', 5.0, 0.0, 1),
  ('ATLAS', 15.0, 0.0, 1);
