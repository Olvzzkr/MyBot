-- Migração 005: Tabela de Preços de Produtos para o Painel de Gerenciamento
CREATE TABLE IF NOT EXISTS product_prices (
  product_id TEXT PRIMARY KEY,
  price REAL NOT NULL,
  default_price REAL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_by TEXT
);
