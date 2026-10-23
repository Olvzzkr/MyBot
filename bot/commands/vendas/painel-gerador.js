/**
 * Comando ?painel-gerador - Envia o painel oficial de Gerador de Assinaturas da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-gerador',
  aliases: ['painelgerador', 'postar-gerador', 'gerador', 'gerador-assinaturas'],
  description: 'Envia o painel oficial de Gerador de Assinaturas no canal atual',
  usage: '?painel-gerador',

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
    const bannerPath = path.join(__dirname, '../../assets/gerador-banner.png');
    const bannerJpg = path.join(__dirname, '../../assets/gerador-banner.jpg');
    let hasBanner = false;
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_gerador.png' }));
      hasBanner = true;
    } else if (fs.existsSync(bannerJpg)) {
      files.push(new AttachmentBuilder(bannerJpg, { name: 'banner_gerador.jpg' }));
      hasBanner = true;
    }

    const embed = new EmbedBuilder()
      .setTitle('Gerador de assinaturas')
      .setColor(0x2B2D31)
      .setDescription(
        '⭕ **Gerador compatível com Android e PC**\n' +
        '⭕ **100% funcional**\n' +
        '⭕ **Simples e fácil de usar**\n' +
        '⭕ **Entrega automática e instantânea!**\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **De R$ 16,90 a R$ 32,90**'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (hasBanner) {
      embed.setImage(fs.existsSync(bannerPath) ? 'attachment://banner_gerador.png' : 'attachment://banner_gerador.jpg');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_gerador')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: 'Gerador Netflix/HBO/Disney/Prime Video', description: '💸 | Valor: R$ 21,90 • 📦 | Estoque: 9', value: 'gen_streaming', emoji: '💸' },
        { label: 'Gerador de youtube premium', description: '💸 | Valor: R$ 16,90 • 📦 | Estoque: 8', value: 'gen_yt', emoji: '💸' },
        { label: 'Gerador de spotify premium', description: '💸 | Valor: R$ 16,90 • 📦 | Estoque: 5', value: 'gen_spot', emoji: '💸' },
        { label: 'TODOS GERADOR A CIMA!', description: '💸 | Valor: R$ 32,90 • 📦 | Estoque: 6', value: 'gen_all', emoji: '💸' }
      ]);

    const row = new ActionRowBuilder().addComponents(select);

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
