/**
 * Comando ?kick - Expulsão de membros com motivo obrigatório e registro de caso
 */

const { EmbedBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const ModerationRepository = require('../../../database/repositories/moderationRepository');

module.exports = {
  name: 'kick',
  aliases: ['expulsar'],
  description: 'Expulsa um membro do servidor com motivo obrigatório',
  usage: '?kick <@membro|ID> <motivo>',
  requiredPermission: PERMISSIONS.MODERATION_KICK,

  async execute({ message, args, authService, db, auditRepo }) {
    const { guild, member, author } = message;
    const targetQuery = args[0];
    const reason = args.slice(1).join(' ').trim();

    if (!targetQuery) {
      return message.reply('⚠️ Por favor, informe o membro a ser expulso. Uso: `?kick <@membro|ID> <motivo>`');
    }

    if (!reason) {
      return message.reply('⚠️ **Motivo obrigatório.** É obrigatório fornecer uma justificativa para a expulsão.');
    }

    const targetMember = message.mentions.members.first() || await guild.members.fetch(targetQuery).catch(() => null);
    if (!targetMember) {
      return message.reply('❌ Membro não encontrado no servidor.');
    }

    // Validação de hierarquia
    const hierarchyCheck = authService.evaluateHierarchy(
      { id: member.id, highestRolePosition: member.roles.highest.position, isGuildOwner: guild.ownerId === member.id },
      { id: targetMember.id, highestRolePosition: targetMember.roles.highest.position, isGuildOwner: guild.ownerId === targetMember.id },
      { highestRolePosition: guild.members.me.roles.highest.position }
    );

    if (!hierarchyCheck.allowed) {
      return message.reply(`🚫 **Operação não permitida:** ${hierarchyCheck.reason}`);
    }

    if (!guild.members.me.permissions.has('KickMembers')) {
      return message.reply('❌ O bot não possui a permissão nativa `KickMembers` no servidor.');
    }

    try {
      await targetMember.kick(`${reason} | Moderador: ${author.tag}`);

      const modRepo = new ModerationRepository(db);
      const modCase = modRepo.createCase({
        guildId: guild.id,
        action: 'KICK',
        targetId: targetMember.id,
        targetTag: targetMember.user.tag,
        moderatorId: author.id,
        moderatorTag: author.tag,
        reason
      });

      auditRepo.logAudit({
        guildId: guild.id,
        actorId: author.id,
        actionType: 'MODERATION_ACTION',
        targetId: targetMember.id,
        reason,
        result: 'SUCCESS',
        metadata: { caseNumber: modCase.caseNumber, action: 'KICK' }
      });

      return message.reply(`👢 **Caso #${modCase.caseNumber}** | Membro **${targetMember.user.tag}** expulso com sucesso.\n**Motivo:** ${reason}`);
    } catch (err) {
      return message.reply(`❌ Falha ao expulsar membro: ${err.message}`);
    }
  }
};
