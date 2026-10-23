/**
 * Comando ?historico - Consulta o histórico de casos de moderação da guilda ou membro
 */

const { EmbedBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const ModerationRepository = require('../../../database/repositories/moderationRepository');

module.exports = {
  name: 'historico',
  aliases: ['history', 'casos'],
  description: 'Lista o histórico de ações de moderação da guilda ou de um membro específico',
  usage: '?historico [@membro|ID]',
  requiredPermission: PERMISSIONS.MODERATION_WARN,

  async execute({ message, args, db }) {
    const { guild } = message;
    const targetQuery = args[0];

    let targetId = null;
    let targetTag = null;

    if (targetQuery) {
      const targetMember = message.mentions.members.first() || await guild.members.fetch(targetQuery).catch(() => null);
      targetId = targetMember ? targetMember.id : targetQuery;
      targetTag = targetMember ? targetMember.user.tag : targetQuery;
    }

    const modRepo = new ModerationRepository(db);
    const cases = modRepo.listCases(guild.id, targetId, 15, 0);

    const title = targetTag
      ? `📋 Histórico de Moderação: ${targetTag}`
      : `📋 Histórico de Moderação: ${guild.name}`;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
      .setFooter({ text: 'Use ?caso <número> para consultar os detalhes de uma ocorrência.' });

    if (cases.length === 0) {
      embed.setDescription('Nenhum caso de moderação encontrado no histórico.');
    } else {
      const list = cases.map(c => {
        return `**#${c.case_number}** [\`${c.action}\`] - Alvo: \`${c.target_tag || c.target_id}\` | Mod: \`${c.moderator_tag || c.moderator_id}\`\nMotivo: *${c.reason.slice(0, 80)}* (${c.created_at})`;
      }).join('\n\n');
      embed.setDescription(list);
    }

    return message.reply({ embeds: [embed] });
  }
};
