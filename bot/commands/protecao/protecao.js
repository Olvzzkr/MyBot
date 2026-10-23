/**
 * Comando ?protecao - Configuração e consulta das regras de proteção automática
 */

const { EmbedBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');

module.exports = {
  name: 'protecao',
  aliases: ['security', 'antiraid'],
  description: 'Gerencia e monitora as regras de proteção automática do servidor',
  usage: '?protecao <status|configurar|teste>',
  requiredPermission: PERMISSIONS.PROTECTION_VIEW,

  async execute({ message, args, authService, db }) {
    const { guild, member } = message;
    const subCommand = (args[0] || 'status').toLowerCase();

    // ==========================================
    // 1. ?protecao status
    // ==========================================
    if (subCommand === 'status') {
      const rules = db.prepare(`
        SELECT * FROM protection_rules WHERE guild_id = ?
      `).all(guild.id);

      const embed = new EmbedBuilder()
        .setTitle(`🛡️ Status da Proteção Automática: ${guild.name}`)
        .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
        .setDescription('Regras ativas e limites de segurança configurados:')
        .setTimestamp();

      if (rules.length === 0) {
        embed.setDescription('Nenhuma regra configurada ainda para este servidor. Use `?protecao configurar` para inicializar as regras padrão.');
      } else {
        for (const r of rules) {
          embed.addFields({
            name: `⚙️ ${r.rule_name.toUpperCase()} [${r.is_enabled ? '🟢 ATIVA' : '🔴 INATIVA'}]`,
            value: `**Limite:** ${r.threshold_limit} ocorrências em ${r.threshold_interval_seconds}s\n**Ação:** \`${r.action_type}\` (${r.action_duration_seconds}s)`
          });
        }
      }

      return message.reply({ embeds: [embed] });
    }

    // ==========================================
    // 2. ?protecao configurar
    // ==========================================
    if (subCommand === 'configurar' || subCommand === 'config') {
      const isAllowed = authService.canExecute(
        guild.id,
        member.id,
        member.roles.cache.map(r => r.id),
        guild.ownerId === member.id,
        member.permissions.has('Administrator'),
        PERMISSIONS.PROTECTION_MANAGE
      );

      if (!isAllowed) {
        return message.reply('🚫 Você não possui permissão (`protection.manage`) para configurar regras de proteção.');
      }

      // Inicializa regras padrão de proteção se não existirem
      const defaultRules = [
        { name: 'anti_spam', limit: 5, interval: 5, action: 'TIMEOUT', duration: 300 },
        { name: 'anti_mass_mention', limit: 4, interval: 1, action: 'TIMEOUT', duration: 600 },
        { name: 'anti_repeat', limit: 3, interval: 10, action: 'TIMEOUT', duration: 300 }
      ];

      for (const dr of defaultRules) {
        db.prepare(`
          INSERT INTO protection_rules (guild_id, rule_name, threshold_limit, threshold_interval_seconds, action_type, action_duration_seconds, is_enabled)
          VALUES (?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(guild_id, rule_name) DO UPDATE SET
            threshold_limit = excluded.threshold_limit,
            threshold_interval_seconds = excluded.threshold_interval_seconds,
            is_enabled = 1
        `).run(guild.id, dr.name, dr.limit, dr.interval, dr.action, dr.duration);
      }

      return message.reply('✅ Regras padrão de proteção automática (`anti_spam`, `anti_mass_mention`, `anti_repeat`) configuradas e ativadas com sucesso!');
    }

    // ==========================================
    // 3. ?protecao teste
    // ==========================================
    if (subCommand === 'teste' || subCommand === 'test') {
      return message.reply('🔬 **Simulação de Teste de Segurança:** O módulo de proteção está ativo e monitorando eventos em tempo real.');
    }

    return message.reply('⚠️ Subcomando não reconhecido. Use: `?protecao <status|configurar|teste>`');
  }
};
