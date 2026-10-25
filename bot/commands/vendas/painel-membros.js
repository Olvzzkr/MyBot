/**
 * Comando ?painel-membros - Envia o painel oficial de Membros Reais da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-membros',
  aliases: ['painelmembros', 'postar-membros', 'membros'],
  description: 'Envia o painel oficial de Membros Reais no canal atual',
  usage: '?painel-membros',

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

    // Banner Grande: Membros Reais
    const bannerPath = path.join(__dirname, '../../assets/membros-reais-banner.jpg');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_membros.jpg' }));
    }

    const CartService = require('../../services/cartService');
    const p100 = CartService.getProduct('membros_100')?.price || 4.90;
    const p300 = CartService.getProduct('membros_300')?.price || 11.90;
    const p500 = CartService.getProduct('membros_500')?.price || 17.90;
    const p1000 = CartService.getProduct('membros_1000')?.price || 29.90;

    const embed = new EmbedBuilder()
      .setTitle('Membros reais')
      .setColor(0x2B2D31)
      .setDescription(
        '👥 **Usuários reais, ativos e com presença constante**\n' +
        '👥 **Aumenta a atividade e interação no servidor**\n' +
        '👥 **todos os membros são 100% reais.**\n' +
        '👥 **não há qualquer risco de entrada de membros bots.**\n' +
        '👥 **membros ativos e que interagem no servidor.**\n' +
        '👥 **ajudam a aumentar a credibilidade e movimentação do servidor.**\n' +
        '👥 **entrega imediata.**\n\n' +
        '👥 **dúvidas? abra um <#1562242410317218062> que iremos explicar tudo para você!**\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        `Preço: **A partir de R$ ${p100.toFixed(2)}** *(Até R$ ${p1000.toFixed(2)})*`
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_membros.jpg');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_membros')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: '100 - Membros reais', description: `💸 | Valor: R$ ${p100.toFixed(2)} • 📦 | Estoque: Imediato`, value: 'membros_100', emoji: '💸' },
        { label: '300 - Membros reais', description: `💸 | Valor: R$ ${p300.toFixed(2)} • 📦 | Estoque: Imediato`, value: 'membros_300', emoji: '💸' },
        { label: '500 - Membros reais', description: `💸 | Valor: R$ ${p500.toFixed(2)} • 📦 | Estoque: Imediato`, value: 'membros_500', emoji: '💸' },
        { label: '1000 - Membros reais', description: `💸 | Valor: R$ ${p1000.toFixed(2)} • 📦 | Estoque: 8 Disponíveis`, value: 'membros_1000', emoji: '💸' }
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
