/**
 * Serviço de Envio de Logs de Moderação
 */

class ModLogService {
  static async send(guild, db, embed) {
    if (!guild || !db || !embed) return;
    try {
      const settings = db.prepare('SELECT modlog_channel_id FROM guild_settings WHERE guild_id = ?').get(guild.id);
      const channelId = settings?.modlog_channel_id;
      if (!channelId) return;

      const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      console.warn(`[ModLog] Erro ao enviar log: ${err.message}`);
    }
  }
}

module.exports = ModLogService;
