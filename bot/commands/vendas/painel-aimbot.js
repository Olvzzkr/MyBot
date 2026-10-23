/**
 * Comando ?painel-aimbot - Envia o painel oficial de Aimbot iOS e Android da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-aimbot',
  aliases: ['painelaimbot', 'postar-aimbot', 'aimbot', 'aimbot-mobile'],
  description: 'Envia o painel oficial de Aimbot iOS e Android no canal atual',
  usage: '?painel-aimbot',

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
    const bannerPath = path.join(__dirname, '../../assets/aimbot-mobile-banner.png');
    const bannerJpg = path.join(__dirname, '../../assets/aimbot-mobile-banner.jpg');
    let hasBanner = false;
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_aimbot.png' }));
      hasBanner = true;
    } else if (fs.existsSync(bannerJpg)) {
      files.push(new AttachmentBuilder(bannerJpg, { name: 'banner_aimbot.jpg' }));
      hasBanner = true;
    }

    const embed = new EmbedBuilder()
      .setTitle('PAINEL AIM BOT IOS E ANDROID PERMANENTE')
      .setColor(0x2B2D31)
      .setDescription(
        '⭕ | **FF PAINEL NETFLIX HEADTRICK VIP**\n' +
        '⭕ | **ENTREGA NA HORA DO PAGAMENTO**\n' +
        '⭕ | **Melhor Painel e Métodos do Cenário!**\n' +
        '⭕ | **ACOMPANHA TUTORIAL**\n' +
        '⭕ | **Android e iOS**\n\n' +
        '🎧 *Por se tratar de um produto com valor muito abaixo do mercado, não disponibilizamos suporte para este item.*\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **R$ 18,90**\n' +
        '📦 **Estoque:** `22 unidades`'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (hasBanner) {
      embed.setImage(fs.existsSync(bannerPath) ? 'attachment://banner_aimbot.png' : 'attachment://banner_aimbot.jpg');
    }

    const buyButton = new ButtonBuilder()
      .setCustomId('shop_buy_aimbot')
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
