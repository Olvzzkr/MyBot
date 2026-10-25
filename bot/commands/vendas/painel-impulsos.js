/**
 * Comando ?painel-impulsos - Envia o painel oficial de Impulsos de Servidor
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');
const CartService = require('../../services/cartService');

module.exports = {
  name: 'painel-impulsos',
  aliases: ['painelimpulsos', 'postar-impulsos', 'impulsos'],
  description: 'Envia o painel oficial de Impulsos para Servidor no canal atual',
  usage: '?painel-impulsos',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];

    // Thumbnail: Logo RealShop / BlackShop
    const realshopLogo = path.join(__dirname, '../../assets/realshop-banner.jpg');
    const blackshopLogo = path.join(__dirname, '../../assets/blackshop-banner.jpg');
    const logoPath = fs.existsSync(realshopLogo) ? realshopLogo : (fs.existsSync(blackshopLogo) ? blackshopLogo : null);

    if (logoPath) {
      files.push(new AttachmentBuilder(logoPath, { name: 'shop_logo.jpg' }));
    }

    // Banner Grande: Boosting
    const cleanBanner = path.join(__dirname, '../../assets/boosting-banner-clean.png');
    const rawBanner = path.join(__dirname, '../../assets/boosting-banner.png');
    const bannerPath = fs.existsSync(cleanBanner) ? cleanBanner : (fs.existsSync(rawBanner) ? rawBanner : null);

    if (bannerPath) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'boosting_banner.png' }));
    }

    const p2x = CartService.getProduct('boost_2x_30d')?.price || 7.99;
    const p4x = CartService.getProduct('boost_4x_30d')?.price || 13.90;
    const p6x = CartService.getProduct('boost_6x_30d')?.price || 16.90;
    const p8x = CartService.getProduct('boost_8x_30d')?.price || 18.90;
    const p14x = CartService.getProduct('boost_14x_30d')?.price || 24.90;

    const embed = new EmbedBuilder()
      .setTitle('📌 Informações Importantes – Impulsos')
      .setColor(0x5865F2)
      .setDescription(
        '• Impulsos disponíveis na modalidade Mensal (30 Dias).\n' +
        '• O servidor não pode possuir painel de escolha de cargos (Reaction Roles), pois isso pode causar a queima do token.\n' +
        '• O servidor não pode possuir Comunidade ativa.\n' +
        '• Caso o token seja queimado por escolha de cargos, não haverá reembolso.\n' +
        '• Caso o servidor esteja limitado e a key/token seja queimada, não haverá reembolso.\n' +
        '• Após a confirmação da compra, um carrinho (ticket) será aberto automaticamente. Envie o link do seu servidor dentro desse carrinho para iniciarmos o processo de impulsionamento.\n\n' +
        '⚠️ **Ao realizar a compra, você declara estar ciente e de acordo com todas as condições acima.**\n\n' +
        '⚡ **Entrega Automática!**\n\n' +
        `Preço: **A partir de R$ ${p2x.toFixed(2)}** *(Até R$ ${p14x.toFixed(2)})*`
      );

    if (logoPath) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (bannerPath) {
      embed.setImage('attachment://boosting_banner.png');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_boosting')
      .setPlaceholder('Selecione uma opção de impulso...')
      .addOptions([
        {
          label: '2x Impulsos mensais (30 Dias)',
          description: `💸 | Valor: R$ ${p2x.toFixed(2)} • 📦 | Estoque: Imediato`,
          value: 'boost_2x_30d',
          emoji: '🚀'
        },
        {
          label: '4x Impulsos mensais (30 Dias)',
          description: `💸 | Valor: R$ ${p4x.toFixed(2)} • 📦 | Estoque: Imediato`,
          value: 'boost_4x_30d',
          emoji: '🚀'
        },
        {
          label: '6x Impulsos mensais (30 Dias)',
          description: `💸 | Valor: R$ ${p6x.toFixed(2)} • 📦 | Estoque: Imediato`,
          value: 'boost_6x_30d',
          emoji: '🚀'
        },
        {
          label: '8x Impulsos mensais 30D (Nível 2)',
          description: `💸 | Valor: R$ ${p8x.toFixed(2)} • 📦 | Estoque: Imediato`,
          value: 'boost_8x_30d',
          emoji: '🚀'
        },
        {
          label: '14x Impulsos mensal 30D (Nível 3)',
          description: `💸 | Valor: R$ ${p14x.toFixed(2)} • 📦 | Estoque: Imediato`,
          value: 'boost_14x_30d',
          emoji: '🚀'
        }
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
