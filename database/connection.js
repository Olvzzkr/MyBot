/**
 * Gerenciador de conexão com o banco de dados SQLite nativo (node:sqlite)
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

let instance = null;

/**
 * Obtém ou inicializa a conexão com o banco de dados SQLite
 * @param {string} [customPath] - Caminho customizado para arquivo de banco (útil para testes isolados)
 * @returns {DatabaseSync}
 */
function getDatabase(customPath) {
  if (instance && !customPath) {
    return instance;
  }

  const dbPath = customPath || process.env.SQLITE_DB_PATH || path.join(__dirname, 'storage.sqlite');
  
  // Garantir diretório do banco se não for em memória
  if (dbPath !== ':memory:') {
    const dir = path.dirname(path.resolve(dbPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // Configurações de segurança e desempenho
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');

  if (!customPath) {
    instance = db;
  }

  return db;
}

/**
 * Fecha a conexão ativa com o banco
 */
function closeDatabase() {
  if (instance) {
    try {
      instance.close();
    } catch {
      // Ignorar se já estiver fechado
    }
    instance = null;
  }
}

module.exports = {
  getDatabase,
  closeDatabase
};
