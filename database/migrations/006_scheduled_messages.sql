CREATE TABLE IF NOT EXISTS message_automation_settings (
  guild_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  send_hour INTEGER NOT NULL DEFAULT 12 CHECK (send_hour BETWEEN 0 AND 23),
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS scheduled_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_guild
  ON scheduled_messages (guild_id, id);

CREATE TABLE IF NOT EXISTS scheduled_message_deliveries (
  message_id INTEGER NOT NULL,
  scheduled_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED')),
  sent_at TEXT,
  error TEXT,
  PRIMARY KEY (message_id, scheduled_date)
);
