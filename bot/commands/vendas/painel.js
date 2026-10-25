/**
 * Comando ?painel-nitro - Envia o painel de Contas Nitradas estilizado da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-nitro',
  aliases: ['painelnitro', 'postar-nitro'],
  description: 'Envia o painel oficial de Contas Nitradas da BlackShop no canal atual',
  usage: '?painel-nitro',

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

    // Banner Grande: Contas Nitrada
    const bannerPath = path.join(__dirname, '../../assets/contas-nitrada-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner.png' }));
    }

    const CartService = require('../../services/cartService');
    const p1m = CartService.getProduct('nitro_1m')?.price || 4.90;
    const p3m = CartService.getProduct('nitro_3m')?.price || 6.90;
    const p1y = CartService.getProduct('nitro_1y')?.price || 8.99;

    const embed = new EmbedBuilder()
      .setTitle('Contas Nitrada')
      .setColor(0x2B2D31)
      .setDescription(
        '🌪️ Contas **FA (Full Acesso)**.\n' +
        '🌪️ Contas **100% seguras**.\n' +
        '🌪️ Nitro **Mensal, Trimestral ou Anual** ativado no momento da entrega.\n' +
        '🌪️ Contas pronta para uso imediato\n' +
        '🌪️ Recomendamos alterar os dados da conta assim que realizar o login\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        `Preço: **A partir de R$ ${p1m.toFixed(2)}** *(Até R$ ${p1y.toFixed(2)})*`
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://blackshop.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner.png');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_nitro')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        {
          label: 'Conta com 1 Mês de nitro ativado / 2X IMPULSOS',
          description: `💸 | Valor: R$ ${p1m.toFixed(2)} • 📦 | Estoque: Imediato`,
          value: 'nitro_1m',
          emoji: '💸'
        },
        {
          label: 'Conta com 3 Mês de nitro (3 Mês)',
          description: `💸 | Valor: R$ ${p3m.toFixed(2)} • 📦 | Estoque: Disponível`,
          value: 'nitro_3m',
          emoji: '💸'
        },
        {
          label: 'Conta Com 1 Ano de nitro (12 Mês) / 2X IMPULSOS',
          description: `💸 | Valor: R$ ${p1y.toFixed(2)} • 📦 | Estoque: Disponível`,
          value: 'nitro_1y',
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
