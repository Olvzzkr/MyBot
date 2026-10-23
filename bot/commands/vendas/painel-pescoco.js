/**
 * Comando ?painel-pescoco - Envia o painel oficial de HS Pescoço da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-pescoco',
  aliases: ['painelpescoco', 'postar-pescoco', 'pescoco'],
  description: 'Envia o painel oficial de HS Pescoço no canal atual',
  usage: '?painel-pescoco',

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

    // Banner Opcional
    const bannerPath = path.join(__dirname, '../../assets/hs-pescoco-banner.png');
    const bannerJpg = path.join(__dirname, '../../assets/hs-pescoco-banner.jpg');
    let hasBanner = false;
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_pescoco.png' }));
      hasBanner = true;
    } else if (fs.existsSync(bannerJpg)) {
      files.push(new AttachmentBuilder(bannerJpg, { name: 'banner_pescoco.jpg' }));
      hasBanner = true;
    }

    const embed = new EmbedBuilder()
      .setTitle('HS PESCOÇO PERMANENTE')
      .setColor(0x2B2D31)
      .setDescription(
        '⭕ **100% Confiável**\n' +
        '⭕ **0% Risco de ban ou black**\n' +
        '⭕ **Ideal para CS e Ranqueadas e Sala Resenha com seus amigos ou streamers**\n' +
        '⭕ **Ajuda a evoluir seu nível de jogo**\n\n' +
        '🎧 *Por se tratar de um produto com valor muito abaixo do mercado, não disponibilizamos suporte para este item.*\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **R$ 11,90**\n' +
        '📦 **Estoque:** `44 unidades`'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (hasBanner) {
      embed.setImage(fs.existsSync(bannerPath) ? 'attachment://banner_pescoco.png' : 'attachment://banner_pescoco.jpg');
    }

    const buyButton = new ButtonBuilder()
      .setCustomId('shop_buy_pescoco')
      .setLabel('Comprar')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Primary);

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
