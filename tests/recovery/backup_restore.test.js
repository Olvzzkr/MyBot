const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { runMigrations } = require('../../database/migrate');
const { performBackup } = require('../../scripts/backup');
const { verifyAndDryRunRestore, restoreBackup } = require('../../scripts/restore');

test('Recuperação de Falhas: ciclo completo de backup consistente, integridade e restauração', () => {
  const testDir = path.resolve(__dirname, '../../backups/test-sandbox');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const primaryDbPath = path.join(testDir, 'primary.sqlite');
  const backupDir = path.join(testDir, 'backup-store');
  const restoredDbPath = path.join(testDir, 'restored.sqlite');

  // Limpar resíduos de testes anteriores
  [primaryDbPath, restoredDbPath].forEach(f => {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  });

  // 1. Criar banco primário com migrações e dados de teste
  const db = new DatabaseSync(primaryDbPath);
  runMigrations(db);
  db.prepare(`
    INSERT INTO authorized_guilds (guild_id, authorized_by, reason)
    VALUES ('999999999', 'admin', 'Backup Test Guild')
  `).run();
  db.close();

  // 2. Executar backup atômico
  const backupResult = performBackup(primaryDbPath, backupDir);
  assert.strictEqual(backupResult.success, true);
  assert.ok(backupResult.checksum);

  const backupFilePath = path.join(backupDir, backupResult.backupFile);
  assert.strictEqual(fs.existsSync(backupFilePath), true);

  // 3. Validação de Integridade do Arquivo de Backup
  const verifyValid = verifyAndDryRunRestore(backupFilePath, backupResult.checksum);
  assert.strictEqual(verifyValid.valid, true);
  assert.ok(verifyValid.tableCount > 20);

  // 4. Detecção de Backup Corrompido
  const corruptFilePath = path.join(testDir, 'corrupt.sqlite');
  fs.copyFileSync(backupFilePath, corruptFilePath);
  // Escreve bytes corrompidos no cabeçalho do arquivo
  const fd = fs.openSync(corruptFilePath, 'r+');
  fs.writeSync(fd, Buffer.from('CORRUPTED_DATABASE_HEADER_GARBAGE'), 0, 32, 0);
  fs.closeSync(fd);

  const verifyCorrupt = verifyAndDryRunRestore(corruptFilePath);
  assert.strictEqual(verifyCorrupt.valid, false);
  assert.match(verifyCorrupt.error, /integrity_check|database disk image is malformed|Falha de restauração/i);

  // 5. Restauração Completa em Ambiente Isolado e Conferência de Dados
  restoreBackup(backupFilePath, restoredDbPath);
  assert.strictEqual(fs.existsSync(restoredDbPath), true);

  const restoredDb = new DatabaseSync(restoredDbPath);
  const row = restoredDb.prepare('SELECT * FROM authorized_guilds WHERE guild_id = ?').get('999999999');
  assert.ok(row);
  assert.strictEqual(row.reason, 'Backup Test Guild');
  restoredDb.close();

  // Limpeza do sandbox de testes
  try {
    fs.rmSync(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  } catch {}
});
