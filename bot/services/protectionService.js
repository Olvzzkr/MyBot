/**
 * Serviço de Proteção Automática contra Spam, Raid e Abuso
 */

const crypto = require('node:crypto');
const { EmbedBuilder } = require('discord.js');
const { SYSTEM_DEFAULTS } = require('../../shared/constants');

class ProtectionService {
  constructor(db) {
    this.db = db;
    // Janelas de tempo deslizantes em memória: guildId:userId -> array de timestamps
    this.messageHistory = new Map();
    this.textHistory = new Map();
  }

  getHistoryKey(guildId, userId) {
    return `${guildId}:${userId}`;
  }

  /**
   * Avalia uma mensagem em tempo real para verificar se viola regras de segurança
   * @param {import('discord.js').Message} message
   * @returns {Promise<{ violated: boolean, rule?: string, actionApplied?: string }>}
   */
  async evaluateMessage(message) {
    if (message.author.bot || !message.guild) {
      return { violated: false };
    }

    const { guild, member, author, channel } = message;
    const now = Date.now();
    const key = this.getHistoryKey(guild.id, author.id);

    // Buscar regras da guilda
    const rules = this.db.prepare(`
      SELECT * FROM protection_rules WHERE guild_id = ? AND is_enabled = 1
    `).all(guild.id);

    if (rules.length === 0) {
      return { violated: false };
    }

    for (const rule of rules) {
      // 1. Validação de Whitelist (Cargos e Canais)
      let whitelistRoles = [];
      let whitelistChannels = [];
      try {
        whitelistRoles = JSON.parse(rule.whitelist_roles_json || '[]');
        whitelistChannels = JSON.parse(rule.whitelist_channels_json || '[]');
      } catch {}

      if (whitelistChannels.includes(channel.id)) continue;
      if (member.roles.cache.some(r => whitelistRoles.includes(r.id))) continue;

      // 2. Regra Anti-Spam (Frequência de mensagens)
      if (rule.rule_name === 'anti_spam') {
        const history = this.messageHistory.get(key) || [];
        const intervalMs = rule.threshold_interval_seconds * 1000;
        const validRecent = history.filter(ts => (now - ts) <= intervalMs);
        validRecent.push(now);
        this.messageHistory.set(key, validRecent);

        if (validRecent.length >= rule.threshold_limit) {
          return this.applyContainment(message, rule, 'SPAM', `Envio abusivo de ${validRecent.length} mensagens em ${rule.threshold_interval_seconds}s`);
        }
      }

      // 3. Regra Anti-Mass Mention (Menções excessivas em mensagem única)
      if (rule.rule_name === 'anti_mass_mention') {
        const mentionCount = message.mentions.users.size + message.mentions.roles.size;
        if (mentionCount >= rule.threshold_limit) {
          return this.applyContainment(message, rule, 'MASS_MENTION', `Menção a ${mentionCount} usuários/cargos em mensagem única`);
        }
      }

      // 4. Regra Anti-Repetição (Repetição consecutiva do mesmo conteúdo)
      if (rule.rule_name === 'anti_repeat') {
        const contentHash = crypto.createHash('md5').update(message.content.trim().toLowerCase()).digest('hex');
        const textLogs = this.textHistory.get(key) || [];
        const recentTexts = textLogs.filter(entry => (now - entry.timestamp) <= (rule.threshold_interval_seconds * 1000));
        recentTexts.push({ hash: contentHash, timestamp: now });
        this.textHistory.set(key, recentTexts);

        const repeatedCount = recentTexts.filter(e => e.hash === contentHash).length;
        if (repeatedCount >= rule.threshold_limit) {
          return this.applyContainment(message, rule, 'REPEATED_TEXT', `Repetição da mesma mensagem ${repeatedCount} vezes`);
        }
      }
    }

    return { violated: false };
  }

  async applyContainment(message, rule, eventType, reason) {
    const { guild, member, author, channel } = message;
    const durationSeconds = rule.action_duration_seconds || 300;
    const expiresAt = new Date(Date.now() + (durationSeconds * 1000)).toISOString();

    // 1. Registrar Evento de Segurança
    this.db.prepare(`
      INSERT INTO security_events (guild_id, user_id, event_type, severity, details_json)
      VALUES (?, ?, ?, 'HIGH', ?)
    `).run(guild.id, author.id, eventType, JSON.stringify({ reason, channelId: channel.id }));

    // 2. Registrar Ação de Proteção
    this.db.prepare(`
      INSERT INTO protection_actions (guild_id, user_id, action_type, reason, duration_seconds, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(guild.id, author.id, rule.action_type, reason, durationSeconds, expiresAt);

    // 3. Executar Contenção Reversível (Timeout)
    let applied = false;
    try {
      if (guild.members.me.permissions.has('ModerateMembers')) {
        await member.timeout(durationSeconds * 1000, `[Proteção Automática] ${reason}`);
        applied = true;
      }
    } catch (err) {
      console.warn(`[Proteção] Não foi possível aplicar timeout em ${author.tag}: ${err.message}`);
    }

    // 4. Excluir mensagem infratora
    try {
      await message.delete();
    } catch {}

    // 5. Alertar no canal de modlog / auditlog
    const settings = this.db.prepare('SELECT modlog_channel_id FROM guild_settings WHERE guild_id = ?').get(guild.id);
    const modlogChannelId = settings?.modlog_channel_id;
    if (modlogChannelId) {
      const logChan = guild.channels.cache.get(modlogChannelId);
      if (logChan) {
        const embed = new EmbedBuilder()
          .setTitle(`🚨 Alerta de Segurança: Contenção Automática`)
          .setColor(SYSTEM_DEFAULTS.COLOR_DANGER)
          .addFields(
            { name: 'Infrator', value: `${author.tag} (\`${author.id}\`)`, inline: true },
            { name: 'Regra Violada', value: `\`${rule.rule_name}\``, inline: true },
            { name: 'Ação Aplicada', value: `${rule.action_type} (${durationSeconds}s)`, inline: true },
            { name: 'Motivo', value: reason }
          )
          .setFooter({ text: 'Revisão humana recomendada caso haja divergência.' })
          .setTimestamp();

        logChan.send({ embeds: [embed] }).catch(() => {});
      }
    }

    return { violated: true, rule: rule.rule_name, actionApplied: rule.action_type };
  }
}

module.exports = ProtectionService;
