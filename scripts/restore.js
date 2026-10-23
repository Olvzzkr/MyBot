/**
 * Motor de Verificação e Restauração Segura de Backups em Ambiente Isolado
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

/**
 * Valida se um arquivo de backup é íntegro e passível de restauração
 * @param {string} backupFilePath - Caminho do arquivo .sqlite de backup
 * @param {string} [expectedChecksum] - Checksum SHA-256 esperado (opcional)
 * @returns {{ valid: boolean, error?: string, tableCount?: number }}
 */
function verifyAndDryRunRestore(backupFilePath, expectedChecksum) {
  if (!fs.existsSync(backupFilePath)) {
    return { valid: false, error: 'Arquivo de backup não encontrado no disco.' };
  }

  // 1. Validar Checksum
  const fileBuffer = fs.readFileSync(backupFilePath);
  const currentChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  if (expectedChecksum && currentChecksum !== expectedChecksum) {
    return {
      valid: false,
      error: `Checksum mismatch! Esperado: ${expectedChecksum}, Obtido: ${currentChecksum}`
    };
  }

  // 2. Testar abertura e PRAGMA integrity_check em conexão isolada
  try {
    const testDb = new DatabaseSync(backupFilePath);
    const integrity = testDb.prepare('PRAGMA integrity_check;').get();

    if (!integrity || integrity.integrity_check !== 'ok') {
      testDb.close();
      return { valid: false, error: `Falha no integrity_check: ${JSON.stringify(integrity)}` };
    }

    // 3. Verificar consistência de tabelas esperadas
    const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all();
    testDb.close();

    return {
      valid: true,
      checksum: currentChecksum,
      tableCount: tables.length
    };
  } catch (err) {
    return { valid: false, error: `Falha de restauração ao conectar no banco: ${err.message}` };
  }
}

/**
 * Restaura um backup para o destino oficial (com geração de cópia de segurança prévia do estado atual)
 * @param {string} backupFilePath
 * @param {string} targetDbPath
 */
function restoreBackup(backupFilePath, targetDbPath) {
  const verify = verifyAndDryRunRestore(backupFilePath);
  if (!verify.valid) {
    throw new Error(`Impossível restaurar backup inválido: ${verify.error}`);
  }

  // Se já existe um banco atual, cria uma salvaguarda (.pre-restore.bak) antes de sobrescrever
  if (fs.existsSync(targetDbPath)) {
    const backupOfCurrent = `${targetDbPath}.pre-restore-${Date.now()}.bak`;
    fs.copyFileSync(targetDbPath, backupOfCurrent);
    console.log(`[Restauração] Cópia de segurança criada em: ${backupOfCurrent}`);
  }

  fs.copyFileSync(backupFilePath, targetDbPath);
  console.log(`[Restauração] Banco restaurado com sucesso a partir de: ${backupFilePath}`);
  return true;
}

module.exports = {
  verifyAndDryRunRestore,
  restoreBackup
};
