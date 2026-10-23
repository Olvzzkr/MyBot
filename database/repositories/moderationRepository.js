/**
 * Repositório para Casos de Moderação e Advertências
 */

const { getDatabase } = require('../connection');

class ModerationRepository {
  constructor(db) {
    this.db = db || getDatabase();
  }

  getNextCaseNumber(guildId) {
    const row = this.db.prepare(`
      SELECT COALESCE(MAX(case_number), 0) + 1 AS next_case
      FROM moderation_cases
      WHERE guild_id = ?
    `).get(String(guildId));
    return row.next_case;
  }

  createCase({
    guildId,
    action,
    targetId,
    targetTag,
    moderatorId,
    moderatorTag,
    reason,
    durationSeconds = null,
    expiresAt = null,
    correlationId = null
  }) {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const caseNumber = this.getNextCaseNumber(guildId);

      const info = this.db.prepare(`
        INSERT INTO moderation_cases (
          case_number, guild_id, action, target_id, target_tag,
          moderator_id, moderator_tag, reason, duration_seconds,
          expires_at, correlation_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
      `).run(
        caseNumber,
        String(guildId),
        String(action).toUpperCase(),
        String(targetId),
        targetTag || null,
        String(moderatorId),
        moderatorTag || null,
        String(reason),
        durationSeconds ? Number(durationSeconds) : null,
        expiresAt || null,
        correlationId || null
      );

      this.db.exec('COMMIT;');

      return {
        id: Number(info.lastInsertRowid),
        caseNumber,
        guildId,
        action,
        targetId,
        moderatorId,
        reason,
        expiresAt
      };
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  addWarning(guildId, targetId, moderatorId, reason, points = 1, caseId = null) {
    const info = this.db.prepare(`
      INSERT INTO warnings (guild_id, target_id, moderator_id, reason, points, case_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(
      String(guildId),
      String(targetId),
      String(moderatorId),
      String(reason),
      Number(points),
      caseId ? Number(caseId) : null
    );
    return Number(info.lastInsertRowid);
  }

  getActiveWarnings(guildId, targetId) {
    return this.db.prepare(`
      SELECT id, guild_id, target_id, moderator_id, reason, points, created_at, case_id
      FROM warnings
      WHERE guild_id = ? AND target_id = ? AND is_active = 1
      ORDER BY created_at DESC
    `).all(String(guildId), String(targetId));
  }

  getTotalWarningPoints(guildId, targetId) {
    const row = this.db.prepare(`
      SELECT COALESCE(SUM(points), 0) AS total_points
      FROM warnings
      WHERE guild_id = ? AND target_id = ? AND is_active = 1
    `).get(String(guildId), String(targetId));
    return row.total_points;
  }

  getCase(guildId, caseNumber) {
    return this.db.prepare(`
      SELECT * FROM moderation_cases
      WHERE guild_id = ? AND case_number = ?
    `).get(String(guildId), Number(caseNumber));
  }

  listCases(guildId, targetId = null, limit = 50, offset = 0) {
    if (targetId) {
      return this.db.prepare(`
        SELECT * FROM moderation_cases
        WHERE guild_id = ? AND target_id = ?
        ORDER BY case_number DESC
        LIMIT ? OFFSET ?
      `).all(String(guildId), String(targetId), Number(limit), Number(offset));
    }

    return this.db.prepare(`
      SELECT * FROM moderation_cases
      WHERE guild_id = ?
      ORDER BY case_number DESC
      LIMIT ? OFFSET ?
    `).all(String(guildId), Number(limit), Number(offset));
  }

  updateCaseStatus(guildId, caseNumber, status) {
    this.db.prepare(`
      UPDATE moderation_cases
      SET status = ?
      WHERE guild_id = ? AND case_number = ?
    `).run(String(status), String(guildId), Number(caseNumber));
    return true;
  }
}

module.exports = ModerationRepository;
