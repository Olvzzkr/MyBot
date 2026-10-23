/**
 * Comando ?painel-ativacao - Envia o painel oficial de Ativação Nitro Link da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-ativacao',
  aliases: ['painelativacao', 'postar-ativacao', 'ativacao'],
  description: 'Envia o painel oficial de Ativação Nitro Link no canal atual',
  usage: '?painel-ativacao',

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

    // Banner Grande: Ativação Nitro Link
    const bannerPath = path.join(__dirname, '../../assets/ativacao-nitro-banner.jpg');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_ativacao.jpg' }));
    }

    const embed = new EmbedBuilder()
      .setTitle('Ativação NITRO LINK')
      .setColor(0x2B2D31)
      .setDescription(
        '📓 Este item é destinado para usuários que não possuem cartão para ativar o Nitro mensal ou trimestral.\n' +
        '📓 É necessário ter o <#1562242446971371550> comprado!\n' +
        '📓 Após a compra, nossa equipe realizará a ativação do Nitro diretamente na sua conta.\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **R$ 16,90**\n' +
        '📦 **Estoque:** `15 unidades`'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_ativacao.jpg');
    }

    const buyButton = new ButtonBuilder()
      .setCustomId('shop_buy_ativacao')
      .setLabel('Comprar')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Success);

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
