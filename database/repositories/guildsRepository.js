/**
 * Repositório para Gestão de Servidores e Autorizações
 */

const { getDatabase } = require('../connection');

class GuildsRepository {
  constructor(db) {
    this.db = db || getDatabase();
  }

  isGuildAuthorized(guildId) {
    if (!guildId) return false;
    const row = this.db.prepare(
      'SELECT is_authorized FROM authorized_guilds WHERE guild_id = ?'
    ).get(String(guildId));
    return Boolean(row && row.is_authorized === 1);
  }

  authorizeGuild(guildId, authorizedBy, reason = 'Autorizado pelo proprietário global') {
    const existing = this.db.prepare(
      'SELECT guild_id FROM authorized_guilds WHERE guild_id = ?'
    ).get(String(guildId));

    if (existing) {
      this.db.prepare(`
        UPDATE authorized_guilds 
        SET is_authorized = 1, authorized_by = ?, authorized_at = datetime('now', 'utc'), revoked_by = NULL, revoked_at = NULL, reason = ?
        WHERE guild_id = ?
      `).run(String(authorizedBy), reason, String(guildId));
    } else {
      this.db.prepare(`
        INSERT INTO authorized_guilds (guild_id, authorized_by, reason, is_authorized)
        VALUES (?, ?, ?, 1)
      `).run(String(guildId), String(authorizedBy), reason);
    }

    // Garante que haja configurações iniciais da guilda
    this.ensureGuildSettings(guildId);
    return true;
  }

  revokeGuild(guildId, revokedBy, reason = 'Revogado pelo proprietário global') {
    this.db.prepare(`
      UPDATE authorized_guilds 
      SET is_authorized = 0, revoked_by = ?, revoked_at = datetime('now', 'utc'), reason = ?
      WHERE guild_id = ?
    `).run(String(revokedBy), reason, String(guildId));
    return true;
  }

  listAuthorizedGuilds() {
    return this.db.prepare(`
      SELECT guild_id, authorized_by, authorized_at, is_authorized, revoked_by, revoked_at, reason
      FROM authorized_guilds
      ORDER BY authorized_at DESC
    `).all();
  }

  ensureGuildSettings(guildId) {
    const row = this.db.prepare(
      'SELECT guild_id FROM guild_settings WHERE guild_id = ?'
    ).get(String(guildId));

    if (!row) {
      this.db.prepare(`
        INSERT INTO guild_settings (guild_id, prefix, language)
        VALUES (?, '?', 'pt-BR')
      `).run(String(guildId));
    }
  }

  getGuildSettings(guildId) {
    this.ensureGuildSettings(guildId);
    return this.db.prepare(
      'SELECT * FROM guild_settings WHERE guild_id = ?'
    ).get(String(guildId));
  }

  updateGuildPrefix(guildId, prefix) {
    this.ensureGuildSettings(guildId);
    this.db.prepare(`
      UPDATE guild_settings 
      SET prefix = ?, updated_at = datetime('now', 'utc')
      WHERE guild_id = ?
    `).run(String(prefix).trim(), String(guildId));
    return true;
  }

  updateGuildSettings(guildId, fields = {}) {
    this.ensureGuildSettings(guildId);
    const allowed = ['prefix', 'language', 'modlog_channel_id', 'auditlog_channel_id', 'quarantine_role_id'];
    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) return false;

    updates.push("updated_at = datetime('now', 'utc')");
    values.push(String(guildId));

    this.db.prepare(`
      UPDATE guild_settings
      SET ${updates.join(', ')}
      WHERE guild_id = ?
    `).run(...values);

    return true;
  }
}

module.exports = GuildsRepository;
