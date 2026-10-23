/**
 * Controller de Administração do Proprietário Global
 */

const { getDatabase } = require('../../database/connection');
const GuildsRepository = require('../../database/repositories/guildsRepository');
const BackupsRepository = require('../../database/repositories/backupsRepository');
const AuditRepository = require('../../database/repositories/auditRepository');
const { isValidSnowflake } = require('../../shared/validation');

class AdminController {
  static listAuthorizedGuilds(req, res) {
    if (!req.user.isGlobalOwner) {
      return res.status(403).json({ error: 'Acesso restrito ao proprietário global.' });
    }

    const db = getDatabase();
    const guildsRepo = new GuildsRepository(db);
    const list = guildsRepo.listAuthorizedGuilds();
    return res.json({ guilds: list });
  }

  static authorizeGuild(req, res) {
    if (!req.user.isGlobalOwner) {
      return res.status(403).json({ error: 'Acesso restrito ao proprietário global.' });
    }

    const { guildId, reason } = req.body;
    if (!guildId || !isValidSnowflake(guildId)) {
      return res.status(400).json({ error: 'ID de servidor (guild_id) inválido.' });
    }

    const db = getDatabase();
    const guildsRepo = new GuildsRepository(db);
    guildsRepo.authorizeGuild(guildId, req.user.id, reason || 'Autorizado pelo proprietário global');

    const auditRepo = new AuditRepository(db);
    auditRepo.logAudit({
      guildId,
      actorId: req.user.id,
      actionType: 'GUILD_AUTHORIZE',
      targetId: guildId,
      reason: reason || 'Autorização global',
      result: 'SUCCESS'
    });

    return res.json({
      success: true,
      message: `Servidor ${guildId} autorizado com sucesso.`
    });
  }

  static revokeGuild(req, res) {
    if (!req.user.isGlobalOwner) {
      return res.status(403).json({ error: 'Acesso restrito ao proprietário global.' });
    }

    const { guildId } = req.params;
    const { reason } = req.body;

    if (!guildId || !isValidSnowflake(guildId)) {
      return res.status(400).json({ error: 'ID de servidor inválido.' });
    }

    const db = getDatabase();
    const guildsRepo = new GuildsRepository(db);
    guildsRepo.revokeGuild(guildId, req.user.id, reason || 'Revogado pelo proprietário global');

    const auditRepo = new AuditRepository(db);
    auditRepo.logAudit({
      guildId,
      actorId: req.user.id,
      actionType: 'GUILD_REVOKE',
      targetId: guildId,
      reason: reason || 'Revogação global',
      result: 'SUCCESS'
    });

    return res.json({
      success: true,
      message: `Autorização do servidor ${guildId} revogada com sucesso.`
    });
  }

  static getSystemEvents(req, res) {
    if (!req.user.isGlobalOwner) {
      return res.status(403).json({ error: 'Acesso restrito ao proprietário global.' });
    }

    const db = getDatabase();
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const events = db.prepare(`
      SELECT * FROM system_events
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    return res.json({ events });
  }

  static listBackups(req, res) {
    if (!req.user.isGlobalOwner) {
      return res.status(403).json({ error: 'Acesso restrito ao proprietário global.' });
    }

    const db = getDatabase();
    const backupsRepo = new BackupsRepository(db);
    const backups = backupsRepo.listBackups();
    return res.json({ backups });
  }
}

module.exports = AdminController;
