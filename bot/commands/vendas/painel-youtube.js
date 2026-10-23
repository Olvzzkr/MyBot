/**
 * Comando ?painel-youtube - Envia o painel oficial de YouTube Premium da BlackShop exatamente igual ao modelo
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-youtube',
  aliases: ['painelyoutube', 'postar-youtube', 'youtube', 'yt-premium'],
  description: 'Envia o painel oficial de YouTube Premium no canal atual',
  usage: '?painel-youtube',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];
    const bannerPath = path.join(__dirname, '../../assets/youtube-streaming-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_youtube.png' }));
    }

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '### YOUTUB3 PR3M1UM\n' +
        'Sem anúncios (adeus interrupções)\n' +
        'Vídeos rodando em segundo plano\n' +
        'Download pra assistir offline\n' +
        'Acesso completo ao YouTube Music\n\n' +
        '**A partir de** `R$ 8,90`\n' +
        'Clique no botão **"Ver opções"** para ver as variações disponíveis'
      )
      .setFooter({ text: 'REAL BOOST • BlackShop' });

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_youtube.png');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_options_youtube')
        .setLabel('Ver opções')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Secondary)
    );

    const sendOptions = {
      embeds: [embed],
      components: [row]
    };

    if (files.length > 0) {
      sendOptions.files = files;
    }

    await message.channel.send(sendOptions);
    try {
      await message.delete();
    } catch {}
  }
};
