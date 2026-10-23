/**
 * Comando ?permissoes - Consultar e gerenciar permissões da equipe
 */

const { EmbedBuilder } = require('discord.js');
const { PERMISSIONS, PERMISSION_DESCRIPTIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');

module.exports = {
  name: 'permissoes',
  aliases: ['permissions', 'perms'],
  description: 'Consulta permissões granulares de um membro ou cargo',
  usage: '?permissoes [@membro|@cargo]',
  requiredPermission: PERMISSIONS.ROLES_VIEW,

  async execute({ message, args, authService, permsRepo }) {
    const { guild, member } = message;
    const targetMember = message.mentions.members.first() || member;

    const isGlobalOwner = authService.isGlobalOwner(targetMember.id);
    const isGuildOwner = guild.ownerId === targetMember.id;
    const isDiscordAdmin = targetMember.permissions.has('Administrator');

    const effective = permsRepo.getUserEffectivePermissions(
      guild.id,
      targetMember.id,
      targetMember.roles.cache.map(r => r.id)
    );

    const embed = new EmbedBuilder()
      .setTitle(`🔐 Permissões de ${targetMember.user.tag}`)
      .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
      .addFields(
        { name: 'Proprietário Global', value: isGlobalOwner ? 'Sim' : 'Não', inline: true },
        { name: 'Proprietário do Servidor', value: isGuildOwner ? 'Sim' : 'Não', inline: true },
        { name: 'Administrador Discord', value: isDiscordAdmin ? 'Sim' : 'Não', inline: true },
        {
          name: 'Permissões da Staff via Cargos',
          value: effective.staffPermissions.length > 0
            ? effective.staffPermissions.map(p => `• \`${p}\``).join('\n')
            : 'Nenhuma permissão de staff configurada.'
        },
        {
          name: 'Overrides Individuais Permitidos',
          value: effective.userOverrides.allowed.length > 0
            ? effective.userOverrides.allowed.map(p => `• \`${p}\``).join('\n')
            : 'Nenhum'
        },
        {
          name: 'Overrides Individuais Negados',
          value: effective.userOverrides.denied.length > 0
            ? effective.userOverrides.denied.map(p => `• \`${p}\``).join('\n')
            : 'Nenhum'
        }
      )
      .setFooter({ text: 'Use o painel web ou ?equipe para gerenciar cargos da staff' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
