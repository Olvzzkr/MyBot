/**
 * Comando ?canal - Gerenciamento de canais com dupla confirmação em exclusões
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const ConfirmationsRepository = require('../../../database/repositories/confirmationsRepository');

module.exports = {
  name: 'canal',
  aliases: ['channel', 'canais'],
  description: 'Gerenciamento de canais de texto e voz no servidor',
  usage: '?canal <criar|editar|excluir> [argumentos]',
  requiredPermission: PERMISSIONS.CHANNELS_MANAGE,

  async execute({ message, args, authService, db, auditRepo }) {
    const { guild, member, author } = message;
    const subCommand = (args[0] || '').toLowerCase();

    // ==========================================
    // 1. ?canal criar <texto|voz> <nome>
    // ==========================================
    if (subCommand === 'criar') {
      const type = (args[1] || 'texto').toLowerCase();
      const name = args.slice(2).join('-').toLowerCase();

      if (!name) {
        return message.reply('⚠️ Uso correto: `?canal criar <texto|voz> <nome-do-canal>`');
      }

      if (!guild.members.me.permissions.has('ManageChannels')) {
        return message.reply('❌ O bot não possui permissão de `Gerenciar Canais` no servidor.');
      }

      try {
        const channelType = type === 'voz' ? ChannelType.GuildVoice : ChannelType.GuildText;
        const newChan = await guild.channels.create({
          name,
          type: channelType,
          reason: `Criado por ${author.tag} via ?canal criar`
        });

        auditRepo.logAudit({
          guildId: guild.id,
          actorId: author.id,
          actionType: 'CHANNEL_CREATE',
          targetId: newChan.id,
          reason: `Canal ${name} criado`,
          result: 'SUCCESS'
        });

        return message.reply(`✅ Canal ${newChan} criado com sucesso!`);
      } catch (err) {
        return message.reply(`❌ Falha ao criar canal: ${err.message}`);
      }
    }

    // ==========================================
    // 2. ?canal excluir <#canal|ID> (Dupla confirmação)
    // ==========================================
    if (subCommand === 'excluir' || subCommand === 'delete') {
      const targetChan = message.mentions.channels.first() || guild.channels.cache.get(args[1]) || message.channel;

      const confRepo = new ConfirmationsRepository(db);
      const conf = confRepo.createConfirmation({
        guildId: guild.id,
        userId: author.id,
        actionType: 'CHANNEL_DELETE',
        targetId: targetChan.id,
        payload: { channelName: targetChan.name },
        timeoutSeconds: 30
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_action:${conf.token}`)
          .setLabel(`Confirmar Exclusão de #${targetChan.name}`)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`cancel_action:${conf.token}`)
          .setLabel('Cancelar')
          .setStyle(ButtonStyle.Secondary)
      );

      const promptMsg = await message.reply({
        content: `⚠️ **Ação Irreversível:** Você tem certeza que deseja excluir permanentemente o canal ${targetChan}?`,
        components: [row]
      });

      const filter = (i) => i.user.id === author.id && (i.customId === `confirm_action:${conf.token}` || i.customId === `cancel_action:${conf.token}`);
      const collector = promptMsg.createMessageComponentCollector({ filter, time: 30000, max: 1 });

      collector.on('collect', async (interaction) => {
        if (interaction.customId === `cancel_action:${conf.token}`) {
          confRepo.consumeConfirmation(conf.token);
          return interaction.update({ content: '❌ Exclusão de canal cancelada.', components: [] });
        }

        confRepo.consumeConfirmation(conf.token);
        try {
          auditRepo.logAudit({
            guildId: guild.id,
            actorId: author.id,
            actionType: 'CHANNEL_DELETE',
            targetId: targetChan.id,
            reason: `Exclusão confirmada de #${targetChan.name}`,
            result: 'SUCCESS'
          });

          await targetChan.delete(`Excluído por ${author.tag} após dupla confirmação`);
          if (targetChan.id !== message.channel.id) {
            await interaction.update({ content: `🗑️ Canal **#${targetChan.name}** excluído com sucesso.`, components: [] });
          }
        } catch (err) {
          interaction.update({ content: `❌ Erro ao excluir canal: ${err.message}`, components: [] });
        }
      });

      return;
    }

    // ==========================================
    // 3. ?canal modlog <#canal>
    // ==========================================
    if (subCommand === 'modlog' || subCommand === 'logs') {
      const targetChan = message.mentions.channels.first() || guild.channels.cache.get(args[1]) || message.channel;

      db.prepare(`
        INSERT INTO guild_settings (guild_id, modlog_channel_id, auditlog_channel_id)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id) DO UPDATE SET
          modlog_channel_id = excluded.modlog_channel_id,
          auditlog_channel_id = excluded.auditlog_channel_id,
          updated_at = datetime('now', 'utc')
      `).run(guild.id, targetChan.id, targetChan.id);

      auditRepo.logAudit({
        guildId: guild.id,
        actorId: author.id,
        actionType: 'SETTINGS_UPDATE',
        reason: `Canal de logs configurado para #${targetChan.name}`,
        result: 'SUCCESS'
      });

      return message.reply(`✅ Canal de mod-logs e segurança configurado para ${targetChan}!`);
    }

    // ==========================================
    // 4. ?canal boasvindas <#canal>
    // ==========================================
    if (subCommand === 'boasvindas' || subCommand === 'welcome') {
      const targetChan = message.mentions.channels.first() || guild.channels.cache.get(args[1]) || message.channel;

      db.prepare(`
        INSERT INTO welcome_settings (guild_id, channel_id, is_enabled)
        VALUES (?, ?, 1)
        ON CONFLICT(guild_id) DO UPDATE SET
          channel_id = excluded.channel_id,
          is_enabled = 1,
          updated_at = datetime('now', 'utc')
      `).run(guild.id, targetChan.id);

      auditRepo.logAudit({
        guildId: guild.id,
        actorId: author.id,
        actionType: 'SETTINGS_UPDATE',
        reason: `Canal de boas-vindas configurado para #${targetChan.name}`,
        result: 'SUCCESS'
      });

      return message.reply(`✅ Canal de boas-vindas configurado para ${targetChan} e ativado!`);
    }

    // ==========================================
    // 5. ?canal status
    // ==========================================
    if (subCommand === 'status') {
      const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guild.id);
      const welcome = db.prepare('SELECT * FROM welcome_settings WHERE guild_id = ?').get(guild.id);

      const embed = new EmbedBuilder()
        .setTitle(`📌 Canais do Servidor - ${guild.name}`)
        .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
        .addFields(
          { name: '🛡️ Mod-Logs', value: settings?.modlog_channel_id ? `<#${settings.modlog_channel_id}>` : 'Não definido', inline: true },
          { name: '👋 Boas-Vindas', value: welcome?.channel_id ? `<#${welcome.channel_id}>` : 'Não definido', inline: true },
          { name: '💻 Galeria de Setups', value: settings?.setup_channel_id ? `<#${settings.setup_channel_id}>` : 'Não definido', inline: true }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ==========================================
    // 6. ?canal setup <#canal>
    // ==========================================
    if (subCommand === 'setup' || subCommand === 'setups') {
      const targetChan = message.mentions.channels.first() || guild.channels.cache.get(args[1]) || message.channel;

      db.prepare(`
        UPDATE guild_settings 
        SET setup_channel_id = ?, updated_at = datetime('now', 'utc')
        WHERE guild_id = ?
      `).run(targetChan.id, guild.id);

      auditRepo.logAudit({
        guildId: guild.id,
        actorId: author.id,
        actionType: 'SETTINGS_UPDATE',
        reason: `Canal de setups configurado para #${targetChan.name}`,
        result: 'SUCCESS'
      });

      return message.reply(`✅ Canal de fotos de setup configurado para ${targetChan}! Todas as fotos enviadas lá serão formatadas no estilo galeria com botões interativos e filtro de segurança.`);
    }

    // ==========================================
    // 7. ?canal testar
    // ==========================================
    if (subCommand === 'testar' || subCommand === 'test') {
      const ModLogService = require('../../services/modLogService');
      const settings = db.prepare('SELECT modlog_channel_id FROM guild_settings WHERE guild_id = ?').get(guild.id);
      if (!settings?.modlog_channel_id) {
        return message.reply('⚠️ Canal de logs ainda não configurado! Use `!canal modlog #mod-logs` primeiro.');
      }

      const logEmbed = new EmbedBuilder()
        .setTitle('🧪 Teste de Conexão: Canal de Logs')
        .setDescription(`O canal de logs está **100% ativo e funcional**!\nDisparado pelo operador **${author.tag}**.`)
        .setColor(SYSTEM_DEFAULTS.COLOR_SUCCESS)
        .addFields(
          { name: 'Servidor', value: guild.name, inline: true },
          { name: 'Canal', value: `<#${settings.modlog_channel_id}>`, inline: true }
        )
        .setTimestamp();

      await ModLogService.send(guild, db, logEmbed);
      return message.reply(`✅ Mensagem de teste enviada com sucesso no canal <#${settings.modlog_channel_id}>! Dá uma olhada lá.`);
    }

    return message.reply('⚠️ Subcomando não reconhecido. Use: `?canal <criar|excluir|modlog|boasvindas|setup|status|testar>`');
  }
};
