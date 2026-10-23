/**
 * Controller de Servidores (Guilds) e Configurações
 */

const { getDatabase } = require('../../database/connection');
const GuildsRepository = require('../../database/repositories/guildsRepository');
const AuditRepository = require('../../database/repositories/auditRepository');
const { isValidPrefix, isValidSnowflake } = require('../../shared/validation');

class GuildsController {
  static getGuild(req, res) {
    const { guildId } = req.params;
    const db = getDatabase();
    const guildsRepo = new GuildsRepository(db);

    const isAuthorized = guildsRepo.isGuildAuthorized(guildId);
    const settings = guildsRepo.getGuildSettings(guildId);

    return res.json({
      guildId,
      isAuthorized,
      settings: settings || { prefix: '?', language: 'pt-BR' }
    });
  }

  static updateSettings(req, res) {
    const { guildId } = req.params;
    const { prefix, modlog_channel_id, auditlog_channel_id } = req.body;

    const updates = {};
    if (prefix !== undefined) {
      if (!isValidPrefix(prefix)) {
        return res.status(400).json({ error: 'Prefixo inválido. Deve ter entre 1 e 5 caracteres sem espaços.' });
      }
      updates.prefix = prefix.trim();
    }

    if (modlog_channel_id !== undefined && modlog_channel_id !== null && modlog_channel_id !== '') {
      if (!isValidSnowflake(modlog_channel_id)) {
        return res.status(400).json({ error: 'ID do canal de modlog inválido.' });
      }
      updates.modlog_channel_id = modlog_channel_id;
    }

    if (auditlog_channel_id !== undefined && auditlog_channel_id !== null && auditlog_channel_id !== '') {
      if (!isValidSnowflake(auditlog_channel_id)) {
        return res.status(400).json({ error: 'ID do canal de auditoria inválido.' });
      }
      updates.auditlog_channel_id = auditlog_channel_id;
    }

    const db = getDatabase();
    const guildsRepo = new GuildsRepository(db);
    guildsRepo.updateGuildSettings(guildId, updates);

    const auditRepo = new AuditRepository(db);
    auditRepo.logAudit({
      guildId,
      actorId: req.user.id,
      actionType: 'SETTINGS_UPDATE',
      reason: 'Atualização de configurações pelo painel web',
      result: 'SUCCESS',
      metadata: updates
    });

    return res.json({
      success: true,
      message: 'Configurações atualizadas com sucesso.',
      settings: guildsRepo.getGuildSettings(guildId)
    });
  }

  static getAuditLogs(req, res) {
    const { guildId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;

    const db = getDatabase();
    const auditRepo = new AuditRepository(db);
    const logs = auditRepo.listAuditLogs(guildId, limit, offset);

    return res.json({ logs, limit, offset });
  }

  static getProtectionRules(req, res) {
    const { guildId } = req.params;
    const db = getDatabase();
    const rules = db.prepare('SELECT * FROM protection_rules WHERE guild_id = ?').all(guildId);
    return res.json({ rules });
  }

  static updateProtectionRule(req, res) {
    const { guildId } = req.params;
    const { rule_name, is_enabled, threshold_limit, threshold_interval_seconds, action_type, action_duration_seconds } = req.body;

    const db = getDatabase();
    db.prepare(`
      INSERT INTO protection_rules (guild_id, rule_name, is_enabled, threshold_limit, threshold_interval_seconds, action_type, action_duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, rule_name) DO UPDATE SET
        is_enabled = excluded.is_enabled,
        threshold_limit = excluded.threshold_limit,
        threshold_interval_seconds = excluded.threshold_interval_seconds,
        action_type = excluded.action_type,
        action_duration_seconds = excluded.action_duration_seconds,
        updated_at = datetime('now', 'utc')
    `).run(
      guildId,
      rule_name,
      is_enabled ? 1 : 0,
      Number(threshold_limit) || 5,
      Number(threshold_interval_seconds) || 5,
      action_type || 'TIMEOUT',
      Number(action_duration_seconds) || 300
    );

    const auditRepo = new AuditRepository(db);
    auditRepo.logAudit({
      guildId,
      actorId: req.user.id,
      actionType: 'SETTINGS_UPDATE',
      reason: `Regra de proteção ${rule_name} atualizada pelo painel`,
      result: 'SUCCESS',
      metadata: req.body
    });

    return res.json({ success: true, message: `Regra ${rule_name} atualizada com sucesso.` });
  }
}

module.exports = GuildsController;
