/**
 * Comando ?equipe - Exibe cargos e integrantes da equipe administrativa
 */

const { EmbedBuilder } = require('discord.js');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const { PERMISSIONS } = require('../../../shared/permissions');

module.exports = {
  name: 'equipe',
  aliases: ['staff', 'team'],
  description: 'Exibe a estrutura de cargos e membros da equipe administrativa',
  usage: '?equipe',
  requiredPermission: PERMISSIONS.ROLES_VIEW,

  async execute({ message, permsRepo }) {
    const { guild } = message;
    const staffRoles = permsRepo.getStaffRoles(guild.id);

    if (staffRoles.length === 0) {
      return message.reply('ℹ️ Nenhum cargo interno da equipe foi configurado ainda. Use o painel web ou o comando de configuração para adicionar cargos de staff.');
    }

    const embed = new EmbedBuilder()
      .setTitle(`🛡️ Equipe Administrativa - ${guild.name}`)
      .setDescription('Hierarquia interna de cargos da equipe e permissões associadas:')
      .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY);

    for (const sr of staffRoles) {
      const discordRole = guild.roles.cache.get(sr.role_id);
      const memberCount = discordRole ? discordRole.members.size : 0;
      const permsSummary = sr.permissions.length > 0
        ? sr.permissions.map(p => `\`${p}\``).join(', ')
        : 'Sem permissões específicas';

      embed.addFields({
        name: `⭐ ${sr.role_name} (Prioridade: ${sr.priority})`,
        value: `**Cargo Discord:** ${discordRole ? discordRole.name : 'Não encontrado no servidor'}\n**Integrantes:** ${memberCount}\n**Permissões:** ${permsSummary}`
      });
    }

    return message.reply({ embeds: [embed] });
  }
};
