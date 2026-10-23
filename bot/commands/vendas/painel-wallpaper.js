/**
 * Comando ?painel-wallpaper - Envia o painel oficial de Wallpaper Engine PC Permanente
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-wallpaper',
  aliases: ['painelwallpaper', 'postar-wallpaper', 'wallpaper', 'wallpaper-engine'],
  description: 'Envia o painel oficial de Wallpaper Engine no canal atual',
  usage: '?painel-wallpaper',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];
    const logoPath = path.join(__dirname, '../../assets/blackshop-banner.jpg');
    if (fs.existsSync(logoPath)) {
      files.push(new AttachmentBuilder(logoPath, { name: 'shop_logo.jpg' }));
    }

    const bannerPath = path.join(__dirname, '../../assets/wallpaper-engine-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_wallpaper.png' }));
    }

    const embed = new EmbedBuilder()
      .setTitle('WALLPAPER ENGINE - PC PERMANENTE')
      .setColor(0x2B2D31)
      .setDescription(
        '⭐ WALLPAPER ENGINE\n' +
        '⭐ FUNCIONA EM QUALQUER PC\n' +
        '⭐ PARA POR WALLPAPER ANIMADO NO PC!\n\n' +
        '⚡ **Entrega Automática!**\n\n' +
        'Preço: **R$ 3,99**\n' +
        'Clique no botão **"Comprar"**'
      )
      .setFooter({ text: 'REAL BOOST • BlackShop' });

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_wallpaper.png');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_checkout:wallpaper_engine')
        .setLabel('Comprar')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Primary)
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
