/**
 * Rotina Automatizada de Backup Consistente com Verificação de Integridade e Rotação
 */

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { getDatabase } = require('../database/connection');
const BackupsRepository = require('../database/repositories/backupsRepository');

/**
 * Executa o backup consistente do banco de dados SQLite
 * @param {string} [customDbPath]
 * @param {string} [customBackupDir]
 * @returns {{ success: boolean, backupFile?: string, checksum?: string, sizeBytes?: number, error?: string }}
 */
function performBackup(customDbPath, customBackupDir) {
  const dbPath = customDbPath || process.env.SQLITE_DB_PATH || path.resolve(__dirname, '../database/storage.sqlite');
  const backupDir = customBackupDir || process.env.BACKUP_STORAGE_PATH || path.resolve(__dirname, '../backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-${timestamp}.sqlite`;
  const destinationPath = path.join(backupDir, backupFileName);

  const db = new DatabaseSync(dbPath);
  const backupsRepo = new BackupsRepository(db);

  try {
    // 1. Criação atômica via VACUUM INTO (opera com segurança com modo WAL ativo)
    // Escapa aspas simples no caminho do arquivo para o comando SQL
    const sanitizedDest = destinationPath.replace(/'/g, "''");
    db.exec(`VACUUM INTO '${sanitizedDest}';`);

    if (!fs.existsSync(destinationPath)) {
      throw new Error('Arquivo de backup não foi gerado pelo SQLite.');
    }

    // 2. Cálculo do Checksum SHA-256
    const fileBuffer = fs.readFileSync(destinationPath);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const sizeBytes = fileBuffer.length;

    // 3. Teste Rígido de Integridade no Arquivo Gerado
    const testDb = new DatabaseSync(destinationPath);
    const integrityRow = testDb.prepare('PRAGMA integrity_check;').get();
    testDb.close();

    const isIntegrityOk = integrityRow && integrityRow.integrity_check === 'ok';
    if (!isIntegrityOk) {
      throw new Error(`Falha no PRAGMA integrity_check do arquivo de backup: ${JSON.stringify(integrityRow)}`);
    }

    // 4. Registro no Banco de Dados
    backupsRepo.recordBackup({
      backupFileName,
      backupPath: destinationPath,
      fileSizeBytes: sizeBytes,
      checksumSha256: checksum,
      isValid: 1,
      status: 'SUCCESS',
      notes: 'Backup consistente e verificado com sucesso via VACUUM INTO e PRAGMA integrity_check.'
    });

    // 5. Rotação de Backups Antigos
    const retentionLimit = parseInt(process.env.BACKUP_RETENTION_COPIES || '7', 10);
    rotateBackups(backupDir, retentionLimit);

    try { db.close(); } catch {}

    return {
      success: true,
      backupFile: backupFileName,
      checksum,
      sizeBytes
    };
  } catch (err) {
    console.error('[Backup Engine] Erro fatal durante o backup:', err);
    try {
      backupsRepo.recordBackup({
        backupFileName,
        backupPath: destinationPath,
        fileSizeBytes: 0,
        checksumSha256: 'ERROR',
        isValid: 0,
        status: 'CORRUPT',
        notes: `Falha: ${err.message}`
      });
    } catch {}

    try { db.close(); } catch {}

    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Remove backups que excedem a quantidade limite de retenção
 */
function rotateBackups(backupDir, maxCopies) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
      .map(f => ({
        name: f,
        fullPath: path.join(backupDir, f),
        mtime: fs.statSync(path.join(backupDir, f)).mtimeMs
      }))
      .sort((a, b) => b.mtime - a.mtime); // Mais recentes primeiro

    if (files.length > maxCopies) {
      const toDelete = files.slice(maxCopies);
      for (const item of toDelete) {
        fs.unlinkSync(item.fullPath);
        console.log(`[Backup Rotação] Arquivo antigo removido: ${item.name}`);
      }
    }
  } catch (err) {
    console.warn('[Backup Rotação] Erro ao rotacionar backups:', err.message);
  }
}

if (require.main === module) {
  console.log('[Backup Engine] Iniciando processo de backup seguro...');
  const res = performBackup();
  if (res.success) {
    console.log(`[Backup Engine] ✅ Concluído com sucesso!`);
    console.log(`Arquivo: ${res.backupFile}`);
    console.log(`SHA-256: ${res.checksum}`);
    console.log(`Tamanho: ${(res.sizeBytes / 1024).toFixed(2)} KB`);
  } else {
    console.error(`[Backup Engine] ❌ Falha: ${res.error}`);
    process.exit(1);
  }
}

module.exports = {
  performBackup,
  rotateBackups
};
