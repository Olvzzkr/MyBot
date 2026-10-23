/**
 * Comando ?painel-minecraft - Envia o painel oficial de Minecraft Java + Bedrock da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-minecraft',
  aliases: ['painelminecraft', 'postar-minecraft', 'minecraft', 'mc'],
  description: 'Envia o painel oficial de Minecraft no canal atual',
  usage: '?painel-minecraft',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];

    // Thumbnail: Logo BlackShop
    const logoPath = path.join(__dirname, '../../assets/blackshop-banner.jpg');
    if (fs.existsSync(logoPath)) {
      files.push(new AttachmentBuilder(logoPath, { name: 'shop_logo.jpg' }));
    }

    // Banner: Minecraft
    const bannerPath = path.join(__dirname, '../../assets/minecraft-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_minecraft.png' }));
    }

    const embed = new EmbedBuilder()
      .setTitle('MINECRAFT ORIGINAL JAVA + BEDROCK (NFA)')
      .setColor(0x2B2D31)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        'Minecraft Original + Java + Bedrock conta completa nfa, estabilidade e suporte garantido!\n\n' +
        '💼 **Valor à vista:** `R$ 22,90` | **Restam:** `∞`\n' +
        'Clique no botão "Comprar" abaixo para iniciar seu pedido.'
      )
      .setFooter({ text: 'REAL BOOST • BlackShop' });

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_minecraft.png');
    }

    const buyButton = new ButtonBuilder()
      .setCustomId('shop_buy_minecraft')
      .setLabel('Comprar')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(buyButton);

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
