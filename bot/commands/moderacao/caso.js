/**
 * Comando ?caso - Consulta detalhes de um caso específico de moderação
 */

const { EmbedBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const ModerationRepository = require('../../../database/repositories/moderationRepository');

module.exports = {
  name: 'caso',
  aliases: ['case'],
  description: 'Consulta os detalhes completos de um caso de moderação',
  usage: '?caso <número_do_caso>',
  requiredPermission: PERMISSIONS.MODERATION_WARN,

  async execute({ message, args, db }) {
    const { guild } = message;
    const caseNumber = parseInt(args[0], 10);

    if (isNaN(caseNumber) || caseNumber <= 0) {
      return message.reply('⚠️ Por favor, informe um número de caso válido. Ex: `?caso 12`');
    }

    const modRepo = new ModerationRepository(db);
    const modCase = modRepo.getCase(guild.id, caseNumber);

    if (!modCase) {
      return message.reply(`❌ Caso **#${caseNumber}** não encontrado neste servidor.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Detalhes do Caso #${modCase.case_number}`)
      .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
      .addFields(
        { name: 'Ação', value: `\`${modCase.action}\``, inline: true },
        { name: 'Status', value: `\`${modCase.status}\``, inline: true },
        { name: 'Data (UTC)', value: `${modCase.created_at}`, inline: true },
        { name: 'Alvo', value: `${modCase.target_tag || 'Desconhecido'} (\`${modCase.target_id}\`)`, inline: false },
        { name: 'Moderador Responsável', value: `${modCase.moderator_tag || 'Desconhecido'} (\`${modCase.moderator_id}\`)`, inline: false },
        { name: 'Motivo', value: modCase.reason || 'Sem motivo registrado', inline: false }
      )
      .setTimestamp();

    if (modCase.duration_seconds) {
      embed.addFields(
        { name: 'Duração', value: `${modCase.duration_seconds} segundos`, inline: true },
        { name: 'Expiração', value: modCase.expires_at || 'N/A', inline: true }
      );
    }

    return message.reply({ embeds: [embed] });
  }
};
