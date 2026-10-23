/**
 * Comando ?advertir - Aplicação de advertência com motivo obrigatório e soma de pontos
 */

const { EmbedBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const ModerationRepository = require('../../../database/repositories/moderationRepository');

module.exports = {
  name: 'advertir',
  aliases: ['warn', 'aviso'],
  description: 'Aplica uma advertência formal a um membro com motivo obrigatório',
  usage: '?advertir <@membro|ID> <motivo>',
  requiredPermission: PERMISSIONS.MODERATION_WARN,

  async execute({ message, args, authService, db, auditRepo }) {
    const { guild, member, author } = message;
    const targetQuery = args[0];
    const reason = args.slice(1).join(' ').trim();

    if (!targetQuery) {
      return message.reply('⚠️ Por favor, informe o membro. Uso: `?advertir <@membro|ID> <motivo>`');
    }

    if (!reason) {
      return message.reply('⚠️ **Motivo obrigatório.** É obrigatório fornecer uma justificativa para a advertência.');
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

    const modRepo = new ModerationRepository(db);

    // Criar caso
    const modCase = modRepo.createCase({
      guildId: guild.id,
      action: 'WARN',
      targetId: targetMember.id,
      targetTag: targetMember.user.tag,
      moderatorId: author.id,
      moderatorTag: author.tag,
      reason
    });

    // Adicionar advertência vinculada ao caso
    modRepo.addWarning(guild.id, targetMember.id, author.id, reason, 1, modCase.id);

    const totalPoints = modRepo.getTotalWarningPoints(guild.id, targetMember.id);

    auditRepo.logAudit({
      guildId: guild.id,
      actorId: author.id,
      actionType: 'MODERATION_ACTION',
      targetId: targetMember.id,
      reason,
      result: 'SUCCESS',
      metadata: { caseNumber: modCase.caseNumber, totalPoints }
    });

    let extraWarning = '';
    if (totalPoints >= SYSTEM_DEFAULTS.MAX_WARNINGS_BEFORE_AUTO_ACTION) {
      extraWarning = `\n⚠️ **Atenção:** Este membro acumulou **${totalPoints} advertências ativas**. Avalie a necessidade de timeout temporário ou expulsão.`;
    }

    // Enviar Embed para o Canal de Logs
    const ModLogService = require('../../services/modLogService');
    const logEmbed = new EmbedBuilder()
      .setTitle(`📋 Mod-Log: Advertência | Caso #${modCase.caseNumber}`)
      .setColor(SYSTEM_DEFAULTS.COLOR_WARNING)
      .addFields(
        { name: '👤 Usuário Advertido', value: `${targetMember.user.tag} (\`${targetMember.id}\`)`, inline: true },
        { name: '🛡️ Moderador', value: `${author.tag} (\`${author.id}\`)`, inline: true },
        { name: '🔢 Total de Advertências', value: `${totalPoints}`, inline: true },
        { name: '📄 Motivo', value: reason }
      )
      .setTimestamp();
    ModLogService.send(guild, db, logEmbed);

    return message.reply(`📋 **Caso #${modCase.caseNumber}** | Advertência aplicada a **${targetMember.user.tag}**.\n**Motivo:** ${reason}\n**Total de advertências ativas:** ${totalPoints}${extraWarning}`);
  }
};
