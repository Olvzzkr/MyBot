/**
 * Repositório para Ações Críticas com Dupla Confirmação
 */

const crypto = require('node:crypto');
const { getDatabase } = require('../connection');

class ConfirmationsRepository {
  constructor(db) {
    this.db = db || getDatabase();
  }

  createConfirmation({
    guildId,
    userId,
    actionType,
    targetId = null,
    payload = {},
    timeoutSeconds = 60
  }) {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + (timeoutSeconds * 1000)).toISOString();
    const payloadJson = JSON.stringify(payload);

    this.db.prepare(`
      INSERT INTO pending_confirmations (
        token, guild_id, user_id, action_type, target_id, payload_json, expires_at, is_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      token,
      String(guildId),
      String(userId),
      String(actionType),
      targetId ? String(targetId) : null,
      payloadJson,
      expiresAt
    );

    return {
      token,
      expiresAt,
      timeoutSeconds
    };
  }

  getAndValidateConfirmation(token, guildId, userId, actionType) {
    const row = this.db.prepare(`
      SELECT * FROM pending_confirmations
      WHERE token = ?
    `).get(String(token));

    if (!row) {
      return { valid: false, error: 'Token de confirmação inexistente ou inválido.' };
    }

    if (row.is_used === 1) {
      return { valid: false, error: 'Esta confirmação já foi utilizada.' };
    }

    if (row.guild_id !== String(guildId)) {
      return { valid: false, error: 'Confirmação inválida para este servidor.' };
    }

    if (row.user_id !== String(userId)) {
      return { valid: false, error: 'Apenas o autor original pode executar esta confirmação.' };
    }

    if (row.action_type !== String(actionType)) {
      return { valid: false, error: 'Ação incompatível com este token de confirmação.' };
    }

    const now = new Date().toISOString();
    if (row.expires_at < now) {
      return { valid: false, error: 'O tempo limite para esta confirmação expirou.' };
    }

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(row.payload_json);
    } catch {
      // payload vazio
    }

    return {
      valid: true,
      confirmation: {
        token: row.token,
        guildId: row.guild_id,
        userId: row.user_id,
        actionType: row.action_type,
        targetId: row.target_id,
        payload: parsedPayload
      }
    };
  }

  consumeConfirmation(token) {
    this.db.prepare(`
      UPDATE pending_confirmations
      SET is_used = 1
      WHERE token = ?
    `).run(String(token));
    return true;
  }
}

module.exports = ConfirmationsRepository;
