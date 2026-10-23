-- Migração 003: Sistema de Sorteios, Sugestões, Feedbacks e Automação de Canais da Loja

CREATE TABLE IF NOT EXISTS store_feature_channels (
  guild_id TEXT PRIMARY KEY,
  staff_log_channel_id TEXT,
  suggestions_channel_id TEXT,
  member_counter_channel_id TEXT,
  sales_counter_channel_id TEXT,
  status_counter_channel_id TEXT,
  notification_role_announcements TEXT,
  notification_role_giveaways TEXT,
  notification_role_restock TEXT,
  created_at TEXT DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS giveaways (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  prize TEXT NOT NULL,
  winners_count INTEGER NOT NULL DEFAULT 1,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS giveaway_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  giveaway_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'utc')),
  UNIQUE(giveaway_id, user_id)
);

CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  author_id TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', 'utc'))
);

CREATE TABLE IF NOT EXISTS suggestion_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  suggestion_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  vote_type TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'utc')),
  UNIQUE(suggestion_id, user_id)
);

CREATE TABLE IF NOT EXISTS customer_feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now', 'utc'))
);

-- Configurações padrão para a RealShop (1562230954594934887)
INSERT OR IGNORE INTO store_feature_channels (
  guild_id,
  staff_log_channel_id,
  suggestions_channel_id,
  member_counter_channel_id,
  sales_counter_channel_id,
  status_counter_channel_id,
  notification_role_announcements,
  notification_role_giveaways,
  notification_role_restock
) VALUES (
  '1562230954594934887',
  '1563298647968317440',
  '1563298661214064651',
  '1563298641769136279',
  '1563298643266637834',
  '1563298644424138803',
  '1562909317718474766',
  '1562909319824019496',
  '1563298636962463857'
);
