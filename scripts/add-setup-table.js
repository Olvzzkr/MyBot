const { getDatabase } = require('../database/connection');

const db = getDatabase();

db.exec(`
  CREATE TABLE IF NOT EXISTS setup_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL UNIQUE,
    author_id TEXT NOT NULL,
    author_tag TEXT NOT NULL,
    image_url TEXT NOT NULL,
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    likes_users_json TEXT DEFAULT '[]',
    thread_id TEXT,
    created_at TEXT DEFAULT (datetime('now', 'utc'))
  );
`);

// Tentar adicionar setup_channel_id caso ainda não exista
try {
  db.exec('ALTER TABLE guild_settings ADD COLUMN setup_channel_id TEXT;');
  console.log('Coluna setup_channel_id adicionada.');
} catch (e) {
  console.log('Coluna setup_channel_id já existe ou erro ignorado:', e.message);
}

// Configurar o canal 💻-setups (1553647551352275074) como padrão para o servidor 1553633196296511498
db.prepare(`
  UPDATE guild_settings SET setup_channel_id = '1553647551352275074' WHERE guild_id = '1553633196296511498'
`).run();

console.log('Tabela setup_posts e configuração de canal prontas!');
