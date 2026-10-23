/**
 * Comando ?painel-impulsos - Envia o painel oficial de Impulsos de Servidor da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

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

    // Thumbnail: Logo BlackShop
    const logoPath = path.join(__dirname, '../../assets/blackshop-banner.jpg');
    if (fs.existsSync(logoPath)) {
      files.push(new AttachmentBuilder(logoPath, { name: 'blackshop.jpg' }));
    }

    // Banner Grande: Boosting
    const cleanBanner = path.join(__dirname, '../../assets/boosting-banner-clean.png');
    const rawBanner = path.join(__dirname, '../../assets/boosting-banner.png');
    const bannerPath = fs.existsSync(cleanBanner) ? cleanBanner : (fs.existsSync(rawBanner) ? rawBanner : null);

    if (bannerPath) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'boosting_banner.png' }));
    }

    const embed = new EmbedBuilder()
      .setTitle('IMPULSOS PARA SERVIDOR')
      .setColor(0x2B2D31)
      .setDescription(
        '🚀 **Precisa somente do link do servidor**\n' +
        '🚀 **Impulso aplicados no servidor escolhido pelo cliente.**\n' +
        '🚀 **Entrega imediata.**\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **De R$ 6,90 a R$ 179,90**'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://blackshop.jpg');
    }

    if (bannerPath) {
      embed.setImage('attachment://boosting_banner.png');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_boosting')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        {
          label: '2x Impulsos (Nível 1 - 30 Dias)',
          description: '💸 | Valor: R$ 6,90 • 📦 | Estoque: 20',
          value: 'boost_2x_30d',
          emoji: '💸'
        },
        {
          label: '7x Impulsos (Nível 2 - 30 Dias)',
          description: '💸 | Valor: R$ 21,90 • 📦 | Estoque: 15',
          value: 'boost_7x_30d',
          emoji: '💸'
        },
        {
          label: '14x Impulsos (Nível 3 - 30 Dias)',
          description: '💸 | Valor: R$ 42,90 • 📦 | Estoque: 10',
          value: 'boost_14x_30d',
          emoji: '💸'
        },
        {
          label: '14x Impulsos (Nível 3 - 3 Meses)',
          description: '💸 | Valor: R$ 99,90 • 📦 | Estoque: 5',
          value: 'boost_14x_3m',
          emoji: '💸'
        },
        {
          label: '14x Impulsos (Nível 3 - 1 Ano)',
          description: '💸 | Valor: R$ 179,90 • 📦 | Estoque: 3',
          value: 'boost_14x_1y',
          emoji: '💸'
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
