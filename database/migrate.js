/**
 * Executor de Migrações do Banco de Dados SQLite
 */

const fs = require('node:fs');
const path = require('node:path');
const { getDatabase } = require('./connection');

/**
 * Executa todas as migrações pendentes em ordem cronológica/alfabética
 * @param {import('node:sqlite').DatabaseSync} [customDb] - Conexão customizada opcional
 * @returns {{ applied: string[], total: number }}
 */
function runMigrations(customDb) {
  const db = customDb || getDatabase();
  const migrationsDir = path.join(__dirname, 'migrations');

  // 1. Criar tabela de controle de migrações
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
    );
  `);

  // 2. Buscar migrações já executadas
  const appliedRows = db.prepare('SELECT name FROM schema_migrations ORDER BY id ASC').all();
  const appliedNames = new Set(appliedRows.map(r => r.name));

  // 3. Listar arquivos de migração
  if (!fs.existsSync(migrationsDir)) {
    return { applied: [], total: appliedNames.size };
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const freshlyApplied = [];

  for (const file of files) {
    if (appliedNames.has(file)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Execução atômica por migração
    db.exec('BEGIN TRANSACTION;');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
      db.exec('COMMIT;');
      freshlyApplied.push(file);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw new Error(`Falha na migração "${file}": ${err.message}`);
    }
  }

  return {
    applied: freshlyApplied,
    total: appliedNames.size + freshlyApplied.length
  };
}

// Se executado diretamente via terminal
if (require.main === module) {
  try {
    const result = runMigrations();
    console.log(`[Migrações] Executadas com sucesso! Aplicadas nesta rodada: ${result.applied.length}. Total histórico: ${result.total}.`);
    if (result.applied.length > 0) {
      console.log(`Arquivos: ${result.applied.join(', ')}`);
    }
  } catch (err) {
    console.error(`[Migrações] Erro fatal:`, err);
    process.exit(1);
  }
}

module.exports = {
  runMigrations
};
