const TIME_ZONE = 'America/Sao_Paulo';

function getLocalDateTime(date, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour)
  };
}

function isDueNow(date, sendHour, timeZone = TIME_ZONE) {
  return getLocalDateTime(date, timeZone).hour >= sendHour;
}

class ScheduledMessagesService {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    this.interval = null;
    this.runningGuilds = new Set();
  }

  start() {
    if (this.interval) return;
    console.log('[Mensagens Automáticas] Agendador iniciado.');
    this.runDueMessages().catch(error => {
      console.error('[Mensagens Automáticas] Falha ao verificar agendamentos:', error);
    });
    this.interval = setInterval(() => {
      this.runDueMessages().catch(error => {
        console.error('[Mensagens Automáticas] Falha ao verificar agendamentos:', error);
      });
    }, 30000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async runDueMessages(now = new Date()) {
    const settings = this.db.prepare(`
      SELECT guild_id, send_hour, timezone
      FROM message_automation_settings
      WHERE enabled = 1
    `).all();

    for (const setting of settings) {
      if (this.runningGuilds.has(setting.guild_id)) continue;
      const localTime = getLocalDateTime(now, setting.timezone || TIME_ZONE);
      if (localTime.hour < setting.send_hour) continue;

      this.runningGuilds.add(setting.guild_id);
      try {
        await this.sendDueMessages(setting.guild_id, localTime.date);
      } catch (error) {
        console.error(`[Mensagens Automáticas] Falha na guilda ${setting.guild_id}:`, error);
      } finally {
        this.runningGuilds.delete(setting.guild_id);
      }
    }
  }

  async sendDueMessages(guildId, scheduledDate) {
    const messages = this.db.prepare(`
      SELECT m.id, m.channel_id, m.content
      FROM scheduled_messages m
      LEFT JOIN scheduled_message_deliveries d
        ON d.message_id = m.id AND d.scheduled_date = ?
      WHERE m.guild_id = ? AND (d.status IS NULL OR d.status = 'FAILED')
      ORDER BY m.id
    `).all(scheduledDate, guildId);
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      throw new Error(`O servidor ${guildId} não está conectado.`);
    }

    for (const message of messages) {
      try {
        const channel = guild.channels.cache.get(message.channel_id)
          || await guild.channels.fetch(message.channel_id);
        if (!channel?.isTextBased() || channel.isThread()) {
          throw new Error(`Canal ${message.channel_id} não existe ou não aceita mensagens.`);
        }

        await channel.send({
          content: message.content,
          allowedMentions: { parse: [] }
        });
        this.db.prepare(`
          INSERT INTO scheduled_message_deliveries (message_id, scheduled_date, status, sent_at, error)
          VALUES (?, ?, 'SENT', datetime('now', 'utc'), NULL)
          ON CONFLICT(message_id, scheduled_date) DO UPDATE SET
            status = 'SENT',
            sent_at = datetime('now', 'utc'),
            error = NULL
        `).run(message.id, scheduledDate);
      } catch (error) {
        this.db.prepare(`
          INSERT INTO scheduled_message_deliveries (message_id, scheduled_date, status, sent_at, error)
          VALUES (?, ?, 'FAILED', NULL, ?)
          ON CONFLICT(message_id, scheduled_date) DO UPDATE SET
            status = 'FAILED',
            error = excluded.error
        `).run(message.id, scheduledDate, error.message);
        console.error(`[Mensagens Automáticas] Falha ao enviar mensagem ${message.id}:`, error);
      }
    }
  }
}

module.exports = {
  ScheduledMessagesService,
  TIME_ZONE,
  getLocalDateTime,
  isDueNow
};
