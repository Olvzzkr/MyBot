/**
 * Comando ?avisos - Consulta advertências ativas de um membro
 */

const { EmbedBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const ModerationRepository = require('../../../database/repositories/moderationRepository');

module.exports = {
  name: 'avisos',
  aliases: ['warnings'],
  description: 'Consulta o histórico de advertências ativas de um membro',
  usage: '?avisos <@membro|ID>',
  requiredPermission: PERMISSIONS.MODERATION_WARN,

  async execute({ message, args, db }) {
    const { guild } = message;
    const targetQuery = args[0];

    if (!targetQuery) {
      return message.reply('⚠️ Por favor, informe o membro a ser consultado. Uso: `?avisos <@membro|ID>`');
    }

    const targetMember = message.mentions.members.first() || await guild.members.fetch(targetQuery).catch(() => null);
    const targetId = targetMember ? targetMember.id : targetQuery;
    const targetTag = targetMember ? targetMember.user.tag : targetQuery;

    const modRepo = new ModerationRepository(db);
    const warnings = modRepo.getActiveWarnings(guild.id, targetId);
    const totalPoints = modRepo.getTotalWarningPoints(guild.id, targetId);

    const embed = new EmbedBuilder()
      .setTitle(`⚠️ Advertências de ${targetTag}`)
      .setColor(totalPoints > 0 ? SYSTEM_DEFAULTS.COLOR_WARNING : SYSTEM_DEFAULTS.COLOR_SUCCESS)
      .setDescription(`Total de avisos ativos: **${warnings.length}** (Pontos acumulados: **${totalPoints}**)`);

    if (warnings.length > 0) {
      for (const w of warnings.slice(0, 10)) {
        embed.addFields({
          name: `Aviso ID #${w.id} (Caso #${w.case_id || 'N/A'}) - ${w.created_at}`,
          value: `**Motivo:** ${w.reason}\n**Moderador ID:** \`${w.moderator_id}\` | **Pontos:** ${w.points}`
        });
      }
    } else {
      embed.setDescription('Este usuário não possui nenhuma advertência ativa.');
    }

    return message.reply({ embeds: [embed] });
  }
};
