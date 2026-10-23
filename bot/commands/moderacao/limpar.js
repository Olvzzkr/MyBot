/**
 * Comando ?limpar - Exclusão de mensagens em lote (purge) com validação e dupla confirmação
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const ConfirmationsRepository = require('../../../database/repositories/confirmationsRepository');

module.exports = {
  name: 'limpar',
  aliases: ['purge', 'clear'],
  description: 'Exclui mensagens em lote no canal de texto (limite: 1 a 100 mensagens)',
  usage: '?limpar <quantidade (1-100)> [motivo]',
  requiredPermission: PERMISSIONS.MODERATION_PURGE,

  async execute({ message, args, author, db, auditRepo }) {
    const { channel, guild } = message;
    const amount = parseInt(args[0], 10);
    const reason = args.slice(1).join(' ') || 'Limpeza de mensagens pelo moderador';

    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('⚠️ Por favor, informe uma quantidade válida de mensagens entre 1 e 100. Ex: `?limpar 25`');
    }

    if (!guild.members.me.permissionsIn(channel).has('ManageMessages')) {
      return message.reply('❌ O bot não possui permissão de `Gerenciar Mensagens` neste canal.');
    }

    // Se quantidade for >= 50, exige dupla confirmação por segurança
    if (amount >= 50) {
      const confRepo = new ConfirmationsRepository(db);
      const conf = confRepo.createConfirmation({
        guildId: guild.id,
        userId: message.author.id,
        actionType: 'PURGE',
        targetId: channel.id,
        payload: { amount, reason },
        timeoutSeconds: 30
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_action:${conf.token}`)
          .setLabel(`Confirmar Exclusão de ${amount} Mensagens`)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`cancel_action:${conf.token}`)
          .setLabel('Cancelar')
          .setStyle(ButtonStyle.Secondary)
      );

      const promptMsg = await message.reply({
        content: `⚠️ **Ação Crítica de Limpeza:** Você solicitou a exclusão de **${amount} mensagens** neste canal. Deseja prosseguir?`,
        components: [row]
      });

      const filter = (i) => i.user.id === message.author.id && (i.customId === `confirm_action:${conf.token}` || i.customId === `cancel_action:${conf.token}`);
      const collector = promptMsg.createMessageComponentCollector({ filter, time: 30000, max: 1 });

      collector.on('collect', async (interaction) => {
        if (interaction.customId === `cancel_action:${conf.token}`) {
          confRepo.consumeConfirmation(conf.token);
          return interaction.update({ content: '❌ Limpeza cancelada.', components: [] });
        }

        confRepo.consumeConfirmation(conf.token);
        try {
          // Deleta o prompt e executa a limpeza
          await promptMsg.delete().catch(() => {});
          const deleted = await channel.bulkDelete(amount, true);

          auditRepo.logAudit({
            guildId: guild.id,
            actorId: message.author.id,
            actionType: 'MODERATION_ACTION',
            targetId: channel.id,
            reason,
            result: 'SUCCESS',
            metadata: { action: 'PURGE', deletedCount: deleted.size }
          });

          const confirmationReply = await channel.send(`🧹 Limpeza concluída: **${deleted.size} mensagens** foram excluídas.`);
          setTimeout(() => confirmationReply.delete().catch(() => {}), 5000);
        } catch (err) {
          channel.send(`❌ Erro ao excluir mensagens: ${err.message} (mensagens com mais de 14 dias não podem ser excluídas em lote pelo Discord).`);
        }
      });

      return;
    }

    // Exclusão direta para quantidades menores (< 50)
    try {
      await message.delete().catch(() => {});
      const deleted = await channel.bulkDelete(amount, true);

      auditRepo.logAudit({
        guildId: guild.id,
        actorId: message.author.id,
        actionType: 'MODERATION_ACTION',
        targetId: channel.id,
        reason,
        result: 'SUCCESS',
        metadata: { action: 'PURGE', deletedCount: deleted.size }
      });

      const reply = await channel.send(`🧹 Limpeza concluída: **${deleted.size} mensagens** excluídas.`);
      setTimeout(() => reply.delete().catch(() => {}), 5000);
    } catch (err) {
      return channel.send(`❌ Erro ao excluir mensagens: ${err.message}`);
    }
  }
};
