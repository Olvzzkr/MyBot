/**
 * Comando ?painel-packdesigner - Envia o painel oficial de Pack Designer
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-packdesigner',
  aliases: ['painelpackdesigner', 'postar-packdesigner', 'packdesigner', 'pack-design'],
  description: 'Envia o painel oficial de Pack Designer no canal atual',
  usage: '?painel-packdesigner',

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

    const bannerPath = path.join(__dirname, '../../assets/pack-designer-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_packdesigner.png' }));
    }

    const embed = new EmbedBuilder()
      .setTitle('PACK DESIGNER')
      .setColor(0x2B2D31)
      .setDescription(
        '🎨 Mais de 50 mil arquivos PSD disponíveis.\n' +
        '🎨 O pacote mais completo de todo o Discord.\n' +
        '🎨 Programas premium para celular e computadores.\n' +
        '🎨 Mais de 100 mil modelos, ideias e utilidades diversas.\n' +
        '🎨 A soma de todos os links de download ultrapassa 40 GB de conteúdo.\n\n' +
        '⚡ **Entrega Automática!**\n\n' +
        'Preço: **R$ 2,99**\n' +
        '📦 Estoque: **46**'
      )
      .setFooter({ text: 'REAL BOOST • BlackShop' });

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_packdesigner.png');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_checkout:pack_designer')
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
