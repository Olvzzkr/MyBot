/**
 * Comando ?ban - Banimento com motivo obrigatório, hierarquia e dupla confirmação opcional
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const ConfirmationsRepository = require('../../../database/repositories/confirmationsRepository');
const ModerationRepository = require('../../../database/repositories/moderationRepository');

module.exports = {
  name: 'ban',
  aliases: ['banir'],
  description: 'Bane um membro do servidor com motivo obrigatório e registro de caso',
  usage: '?ban <@membro|ID> <motivo>',
  requiredPermission: PERMISSIONS.MODERATION_BAN,

  async execute({ message, args, authService, db, auditRepo }) {
    const { guild, member, author } = message;
    const targetQuery = args[0];
    const reason = args.slice(1).join(' ').trim();

    if (!targetQuery) {
      return message.reply('⚠️ Por favor, informe o membro a ser banido. Uso: `?ban <@membro|ID> <motivo>`');
    }

    if (!reason) {
      return message.reply('⚠️ **Motivo obrigatório.** É obrigatório fornecer uma justificativa para a aplicação do banimento.');
    }

    const targetMember = message.mentions.members.first() || await guild.members.fetch(targetQuery).catch(() => null);

    if (targetMember) {
      // 1. Verificação de Hierarquia
      const hierarchyCheck = authService.evaluateHierarchy(
        { id: member.id, highestRolePosition: member.roles.highest.position, isGuildOwner: guild.ownerId === member.id },
        { id: targetMember.id, highestRolePosition: targetMember.roles.highest.position, isGuildOwner: guild.ownerId === targetMember.id },
        { highestRolePosition: guild.members.me.roles.highest.position }
      );

      if (!hierarchyCheck.allowed) {
        return message.reply(`🚫 **Operação não permitida:** ${hierarchyCheck.reason}`);
      }
    }

    if (!guild.members.me.permissions.has('BanMembers')) {
      return message.reply('❌ O bot não possui a permissão nativa `BanMembers` no servidor.');
    }

    // 2. Dupla Confirmação para Ação Crítica
    const confRepo = new ConfirmationsRepository(db);
    const conf = confRepo.createConfirmation({
      guildId: guild.id,
      userId: author.id,
      actionType: 'BAN',
      targetId: targetMember ? targetMember.id : targetQuery,
      payload: { reason, targetTag: targetMember ? targetMember.user.tag : targetQuery },
      timeoutSeconds: 60
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_action:${conf.token}`)
        .setLabel('Confirmar Banimento')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`cancel_action:${conf.token}`)
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Confirmação de Ação Crítica: Banimento')
      .setColor(SYSTEM_DEFAULTS.COLOR_DANGER)
      .setDescription(`Você tem certeza que deseja banir **${targetMember ? targetMember.user.tag : targetQuery}**?\n\n**Motivo:** ${reason}`)
      .setFooter({ text: 'Esta solicitação de confirmação expira em 60 segundos.' });

    const promptMessage = await message.reply({ embeds: [embed], components: [row] });

    // Coletor dedicado de confirmação local para resposta imediata
    const filter = (i) => i.user.id === author.id && (i.customId === `confirm_action:${conf.token}` || i.customId === `cancel_action:${conf.token}`);
    const collector = promptMessage.createMessageComponentCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === `cancel_action:${conf.token}`) {
        confRepo.consumeConfirmation(conf.token);
        return interaction.update({ content: '❌ Banimento cancelado.', embeds: [], components: [] });
      }

      // Validar e consumir
      const check = confRepo.getAndValidateConfirmation(conf.token, guild.id, author.id, 'BAN');
      if (!check.valid) {
        return interaction.update({ content: `🚫 Erro: ${check.error}`, embeds: [], components: [] });
      }
      confRepo.consumeConfirmation(conf.token);

      try {
        await guild.members.ban(targetMember ? targetMember.id : targetQuery, {
          reason: `${reason} | Moderador: ${author.tag}`
        });

        const modRepo = new ModerationRepository(db);
        const modCase = modRepo.createCase({
          guildId: guild.id,
          action: 'BAN',
          targetId: targetMember ? targetMember.id : targetQuery,
          targetTag: targetMember ? targetMember.user.tag : 'Desconhecido',
          moderatorId: author.id,
          moderatorTag: author.tag,
          reason
        });

        auditRepo.logAudit({
          guildId: guild.id,
          actorId: author.id,
          actionType: 'MODERATION_ACTION',
          targetId: targetMember ? targetMember.id : targetQuery,
          reason,
          result: 'SUCCESS',
          metadata: { caseNumber: modCase.caseNumber, action: 'BAN' }
        });

        // Enviar Embed para o Canal de Logs
        const ModLogService = require('../../services/modLogService');
        const logEmbed = new EmbedBuilder()
          .setTitle(`🔨 Mod-Log: Banimento | Caso #${modCase.caseNumber}`)
          .setColor(SYSTEM_DEFAULTS.COLOR_DANGER)
          .addFields(
            { name: '👤 Usuário Banido', value: `${targetMember ? targetMember.user.tag : targetQuery}`, inline: true },
            { name: '🛡️ Moderador', value: `${author.tag} (\`${author.id}\`)`, inline: true },
            { name: '📄 Motivo', value: reason }
          )
          .setTimestamp();
        ModLogService.send(guild, db, logEmbed);

        return interaction.update({
          content: `🔨 **Caso #${modCase.caseNumber}** | Usuário banido com sucesso.\n**Alvo:** ${targetMember ? targetMember.user.tag : targetQuery}\n**Motivo:** ${reason}`,
          embeds: [],
          components: []
        });
      } catch (err) {
        return interaction.update({
          content: `❌ Falha ao aplicar banimento: ${err.message}`,
          embeds: [],
          components: []
        });
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time' && collected.size === 0) {
        confRepo.consumeConfirmation(conf.token);
        promptMessage.edit({ content: '⏱️ O tempo para confirmar o banimento expirou.', embeds: [], components: [] }).catch(() => {});
      }
    });
  }
};
