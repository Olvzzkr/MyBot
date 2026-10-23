/**
 * Comando !aviso e /aviso - Publica avisos e comunicados no canal de avisos com menção @everyone
 */

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  name: 'aviso',
  aliases: ['avisar', 'avisoloja'],
  description: 'Publica um aviso estilizado no canal de avisos mencionando todos (@everyone)',
  usage: '!aviso <sua mensagem aqui> ou /aviso mensagem:"texto"',

  async execute({ message, interaction, db, args }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const member = isInteraction ? interaction.member : message.member;
    const guild = isInteraction ? interaction.guild : message.guild;

    // 1. Verificação de Permissão (Direção / Administrador / Global Owner)
    const isGlobalOwner = author.id === '1517970601342664768';
    const isGuildOwner = guild.ownerId === author.id;
    const hasStaffRole = member?.roles?.cache?.some(r => {
      const name = r.name.toLowerCase();
      return name.includes('direção') || name.includes('direcao') || name.includes('staff') || name.includes('admin');
    });
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) ||
                    member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) ||
                    member?.permissions?.has?.(PermissionFlagsBits.ManageMessages) ||
                    isGlobalOwner || isGuildOwner || hasStaffRole;

    if (!isAdmin) {
      const err = '❌ Apenas a **Direção** e **Administradores** podem publicar avisos oficiais.';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    // 2. Extração da mensagem
    let text = '';
    if (isInteraction) {
      text = interaction.options.getString('mensagem') || '';
    } else {
      if (!args || args.length === 0) {
        return message.reply('⚠️ **Como usar:** `!aviso <texto do aviso aqui>`\n*Exemplo:* `!aviso Hoje teremos reabastecimento geral de Nitros e Ativações às 20h!`');
      }
      text = args.join(' ').trim();
    }

    if (!text) {
      const err = '⚠️ O texto do aviso não pode ser vazio!';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    // 3. Localizar o canal de avisos (# 📢・avisos-loja ou similar)
    const targetChannel = guild.channels.cache.find(c => 
      c.type === ChannelType.GuildText && (
        c.name.includes('avisos-loja') || 
        c.name.includes('avisos') ||
        c.id === '1562242414717046894'
      )
    ) || (isInteraction ? interaction.channel : message.channel);

    // 4. Montar o Painel Estilizado
    const avisoEmbed = new EmbedBuilder()
      .setTitle('📢 REAL SHOP')
      .setColor(0xFEE75C) // Amarelo/Dourado chamativo e profissional
      .setDescription(text)
      .addFields(
        { name: '🛡️ Publicado por', value: `<@${author.id}>`, inline: true },
        { name: '⏰ Horário', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setFooter({ 
        text: 'Real Shop • Fique atento a todos os comunicados oficiais',
        iconURL: guild.iconURL({ dynamic: true }) || undefined
      })
      .setTimestamp();

    // 5. Apagar mensagem original do comando se for por prefixo
    if (!isInteraction && message.deletable) {
      await message.delete().catch(() => {});
    }

    // 6. Enviar no canal de avisos com @everyone
    try {
      await targetChannel.send({
        content: '@everyone',
        embeds: [avisoEmbed]
      });
    } catch (sendErr) {
      console.error('[Comando Aviso] Erro ao enviar mensagem:', sendErr);
      const failMsg = `❌ Falha ao enviar aviso no canal <#${targetChannel.id}>: ${sendErr.message}`;
      if (isInteraction) return interaction.reply({ content: failMsg, ephemeral: true });
      return message.channel.send(failMsg);
    }

    // 7. Confirmação
    const successMsg = `✅ **Aviso publicado com sucesso em <#${targetChannel.id}>!**`;
    if (isInteraction) {
      return interaction.reply({ content: successMsg, ephemeral: true });
    } else {
      const conf = await message.channel.send(successMsg);
      setTimeout(() => conf.delete().catch(() => {}), 5000);
    }
  }
};
