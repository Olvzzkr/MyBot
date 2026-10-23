/**
 * Comando ?quarentena - Aplicação e remoção de quarentena a membros
 */

const { EmbedBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const ModerationRepository = require('../../../database/repositories/moderationRepository');

module.exports = {
  name: 'quarentena',
  aliases: ['quarantine', 'isolar'],
  description: 'Coloca ou retira um membro de quarentena preventiva',
  usage: '?quarentena <@membro|ID> [motivo]',
  requiredPermission: PERMISSIONS.PROTECTION_QUARANTINE,

  async execute({ message, args, authService, db, auditRepo }) {
    const { guild, member, author } = message;
    const targetQuery = args[0];
    const reason = args.slice(1).join(' ').trim() || 'Quarentena preventiva manual';

    if (!targetQuery) {
      return message.reply('⚠️ Por favor, informe o membro. Uso: `?quarentena <@membro|ID> [motivo]`');
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

    // Verificar se existe cargo de quarentena configurado
    const settings = db.prepare('SELECT quarantine_role_id FROM guild_settings WHERE guild_id = ?').get(guild.id);
    const quarantineRoleId = settings?.quarantine_role_id;

    if (!quarantineRoleId) {
      // Fallback para timeout de 24 horas se não houver cargo específico de quarentena configurado
      try {
        await targetMember.timeout(24 * 3600 * 1000, `[Quarentena Preventiva] ${reason}`);
        
        const modRepo = new ModerationRepository(db);
        const modCase = modRepo.createCase({
          guildId: guild.id,
          action: 'QUARANTINE',
          targetId: targetMember.id,
          targetTag: targetMember.user.tag,
          moderatorId: author.id,
          moderatorTag: author.tag,
          reason,
          durationSeconds: 86400
        });

        auditRepo.logAudit({
          guildId: guild.id,
          actorId: author.id,
          actionType: 'MODERATION_ACTION',
          targetId: targetMember.id,
          reason,
          result: 'SUCCESS',
          metadata: { caseNumber: modCase.caseNumber, method: 'TIMEOUT_FALLBACK' }
        });

        return message.reply(`☣️ **Caso #${modCase.caseNumber}** | Membro **${targetMember.user.tag}** colocado em quarentena preventiva (timeout 24h).\n**Motivo:** ${reason}`);
      } catch (err) {
        return message.reply(`❌ Falha ao aplicar quarentena: ${err.message}`);
      }
    }

    const qRole = guild.roles.cache.get(quarantineRoleId);
    if (!qRole) {
      return message.reply('❌ O cargo de quarentena configurado no banco de dados não foi encontrado no Discord.');
    }

    try {
      if (targetMember.roles.cache.has(qRole.id)) {
        await targetMember.roles.remove(qRole, `Liberação de quarentena por ${author.tag}`);
        return message.reply(`🕊️ Membro **${targetMember.user.tag}** liberado da quarentena.`);
      } else {
        await targetMember.roles.add(qRole, `Quarentena aplicada por ${author.tag}`);
        return message.reply(`☣️ Membro **${targetMember.user.tag}** isolado com o cargo de quarentena.`);
      }
    } catch (err) {
      return message.reply(`❌ Erro ao alterar cargo de quarentena: ${err.message}`);
    }
  }
};
