/**
 * Comando ?timeout - Silenciamento temporário com duração e motivo
 */

const { EmbedBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const ModerationRepository = require('../../../database/repositories/moderationRepository');

function parseDurationToSeconds(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return null;
  }
}

module.exports = {
  name: 'timeout',
  aliases: ['silenciar', 'mute'],
  description: 'Silencia temporariamente um membro no servidor',
  usage: '?timeout <@membro|ID> <duração (ex: 10m, 1h, 1d)> <motivo>',
  requiredPermission: PERMISSIONS.MODERATION_TIMEOUT,

  async execute({ message, args, authService, db, auditRepo }) {
    const { guild, member, author } = message;
    const targetQuery = args[0];
    const durationInput = args[1];
    const reason = args.slice(2).join(' ').trim();

    if (!targetQuery || !durationInput) {
      return message.reply('⚠️ Uso correto: `?timeout <@membro|ID> <duração: 10m, 1h, 1d> <motivo>`');
    }

    if (!reason) {
      return message.reply('⚠️ **Motivo obrigatório.** É obrigatório fornecer uma justificativa para o timeout.');
    }

    const durationSeconds = parseDurationToSeconds(durationInput);
    if (!durationSeconds || durationSeconds <= 0 || durationSeconds > 28 * 86400) {
      return message.reply('❌ Duração inválida. Limites do Discord: de 1 segundo até no máximo 28 dias (`28d`). Ex: `10m`, `2h`, `1d`.');
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

    if (!guild.members.me.permissions.has('ModerateMembers')) {
      return message.reply('❌ O bot não possui a permissão nativa `ModerateMembers` no servidor.');
    }

    try {
      const durationMs = durationSeconds * 1000;
      await targetMember.timeout(durationMs, `${reason} | Moderador: ${author.tag}`);

      const expiresAt = new Date(Date.now() + durationMs).toISOString();
      const modRepo = new ModerationRepository(db);
      const modCase = modRepo.createCase({
        guildId: guild.id,
        action: 'TIMEOUT',
        targetId: targetMember.id,
        targetTag: targetMember.user.tag,
        moderatorId: author.id,
        moderatorTag: author.tag,
        reason,
        durationSeconds,
        expiresAt
      });

      auditRepo.logAudit({
        guildId: guild.id,
        actorId: author.id,
        actionType: 'MODERATION_ACTION',
        targetId: targetMember.id,
        reason,
        result: 'SUCCESS',
        metadata: { caseNumber: modCase.caseNumber, durationSeconds, expiresAt }
      });

      // Enviar Embed para o Canal de Logs
      const ModLogService = require('../../services/modLogService');
      const logEmbed = new EmbedBuilder()
        .setTitle(`⏳ Mod-Log: Castigo (Timeout) | Caso #${modCase.caseNumber}`)
        .setColor(SYSTEM_DEFAULTS.COLOR_WARNING)
        .addFields(
          { name: '👤 Usuário Castigado', value: `${targetMember.user.tag} (\`${targetMember.id}\`)`, inline: true },
          { name: '🛡️ Moderador', value: `${author.tag} (\`${author.id}\`)`, inline: true },
          { name: '⏱️ Duração', value: durationInput, inline: true },
          { name: '📄 Motivo', value: reason }
        )
        .setTimestamp();
      ModLogService.send(guild, db, logEmbed);

      return message.reply(`⏳ **Caso #${modCase.caseNumber}** | Membro **${targetMember.user.tag}** colocado em timeout por **${durationInput}**.\n**Motivo:** ${reason}`);
    } catch (err) {
      return message.reply(`❌ Falha ao aplicar timeout: ${err.message}`);
    }
  }
};
