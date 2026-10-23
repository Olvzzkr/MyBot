/**
 * Comando ?painel-xit - Envia o painel oficial de Xit Free Fire 100% HS da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-xit',
  aliases: ['painelxit', 'postar-xit', 'xit', 'xit-ff'],
  description: 'Envia o painel oficial de Xit Free Fire no canal atual',
  usage: '?painel-xit',

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

    // Banner Opcional (se fornecido futuramente)
    const bannerPath = path.join(__dirname, '../../assets/xit-banner.png');
    const bannerJpg = path.join(__dirname, '../../assets/xit-banner.jpg');
    let hasBanner = false;
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_xit.png' }));
      hasBanner = true;
    } else if (fs.existsSync(bannerJpg)) {
      files.push(new AttachmentBuilder(bannerJpg, { name: 'banner_xit.jpg' }));
      hasBanner = true;
    }

    const embed = new EmbedBuilder()
      .setTitle('PAINEL XIT FREE FIRE • 100% HS (PERMANENTE)')
      .setColor(0x2B2D31)
      .setDescription(
        '⭕ **FUNÇÕES DO XIT:**\n\n' +
        '• **Aimbot Smooth:** Puxada natural na cabeça.\n\n' +
        '• **ESP Lines:** Veja inimigos através de paredes.\n\n' +
        '• **Regedit VIP:** Estabilidade total na mira.\n\n' +
        '• **No Recoil:** Zero espalhamento de bala.\n\n' +
        'Podendo funcionar em android e IOS!\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **R$ 14,90**\n' +
        '📦 **Estoque:** `7 unidades`'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (hasBanner) {
      embed.setImage(fs.existsSync(bannerPath) ? 'attachment://banner_xit.png' : 'attachment://banner_xit.jpg');
    }

    const buyButton = new ButtonBuilder()
      .setCustomId('shop_buy_xit_ff')
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
