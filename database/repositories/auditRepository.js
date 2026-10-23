/**
 * Repositório de Auditoria com Retenção de 90 dias
 */

const { getDatabase } = require('../connection');

class AuditRepository {
  constructor(db) {
    this.db = db || getDatabase();
  }

  logAudit({
    guildId,
    actorId,
    actionType,
    targetId = null,
    reason = null,
    result = 'SUCCESS',
    errorMessage = null,
    correlationId = null,
    metadata = null
  }) {
    const metaJson = metadata ? JSON.stringify(metadata) : null;
    const info = this.db.prepare(`
      INSERT INTO audit_logs (
        guild_id, actor_id, action_type, target_id,
        reason, result, error_message, correlation_id, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(guildId),
      String(actorId),
      String(actionType),
      targetId ? String(targetId) : null,
      reason ? String(reason) : null,
      String(result),
      errorMessage ? String(errorMessage) : null,
      correlationId ? String(correlationId) : null,
      metaJson
    );
    return Number(info.lastInsertRowid);
  }

  listAuditLogs(guildId, limit = 50, offset = 0) {
    const rows = this.db.prepare(`
      SELECT * FROM audit_logs
      WHERE guild_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `).all(String(guildId), Number(limit), Number(offset));

    return rows.map(r => ({
      ...r,
      metadata: r.metadata_json ? JSON.parse(r.metadata_json) : null
    }));
  }

  /**
   * Remove registros de auditoria com mais de N dias (padrão 90 dias)
   * @param {number} [days=90]
   * @returns {number} Quantidade de registros removidos
   */
  purgeOldLogs(days = 90) {
    const thresholdDays = Number(days);
    const info = this.db.prepare(`
      DELETE FROM audit_logs
      WHERE created_at < datetime('now', '-' || ? || ' days')
    `).run(thresholdDays);

    return info.changes;
  }
}

module.exports = AuditRepository;
