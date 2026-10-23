/**
 * Repositório para Registro e Auditoria de Backups
 */

const { getDatabase } = require('../connection');

class BackupsRepository {
  constructor(db) {
    this.db = db || getDatabase();
  }

  recordBackup({
    backupFileName,
    backupPath,
    fileSizeBytes,
    checksumSha256,
    isValid = 1,
    status = 'SUCCESS',
    notes = null
  }) {
    const info = this.db.prepare(`
      INSERT INTO backup_records (
        backup_file_name, backup_path, file_size_bytes,
        checksum_sha256, is_valid, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      backupFileName,
      backupPath,
      Number(fileSizeBytes),
      checksumSha256,
      isValid ? 1 : 0,
      status,
      notes
    );
    return Number(info.lastInsertRowid);
  }

  listBackups(limit = 20) {
    return this.db.prepare(`
      SELECT * FROM backup_records
      ORDER BY created_at DESC
      LIMIT ?
    `).all(Number(limit));
  }

  getBackupById(id) {
    return this.db.prepare(
      'SELECT * FROM backup_records WHERE id = ?'
    ).get(Number(id));
  }
}

module.exports = BackupsRepository;
