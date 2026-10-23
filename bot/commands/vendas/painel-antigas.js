/**
 * Comando ?painel-antigas - Envia o painel oficial de Contas Antigas Premium da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-antigas',
  aliases: ['painelantigas', 'postar-antigas', 'antigas'],
  description: 'Envia o painel oficial de Contas Antigas no canal atual',
  usage: '?painel-antigas',

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

    // Banner Grande: Contas Antigas
    const bannerPath = path.join(__dirname, '../../assets/contas-antigas-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_antigas.png' }));
    }

    const embed = new EmbedBuilder()
      .setTitle('Contas Antiga Premium!')
      .setColor(0x2B2D31)
      .setDescription(
        '🧢 **Entrega 100% Automática e Instantânea!**\n' +
        '🧢 **Perfeitas para maior confiança e estabilidade.**\n' +
        '🧢 **E-mail e senha totalmente editáveis.**\n' +
        '🧢 **Após a compra, recomendamos alterar e-mail e senha para maior segurança**\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **De R$ 3,99 a R$ 499,00**'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_antigas.png');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_antigas')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: 'Conta 2026', description: '💸 | Valor: R$ 3,99 • 📦 | Estoque: Esgotado', value: 'conta_2026', emoji: '💸' },
        { label: 'Conta 2025', description: '💸 | Valor: R$ 11,90 • 📦 | Estoque: 11', value: 'conta_2025', emoji: '💸' },
        { label: 'Conta 2024', description: '💸 | Valor: R$ 22,90 • 📦 | Estoque: 14', value: 'conta_2024', emoji: '💸' },
        { label: 'Conta 2023', description: '💸 | Valor: R$ 16,90 • 📦 | Estoque: 4', value: 'conta_2023', emoji: '💸' },
        { label: 'Conta 2022', description: '💸 | Valor: R$ 22,90 • 📦 | Estoque: 7', value: 'conta_2022', emoji: '💸' },
        { label: 'Conta 2021', description: '💸 | Valor: R$ 79,90 • 📦 | Estoque: 5', value: 'conta_2021', emoji: '💸' },
        { label: 'Conta 2020', description: '💸 | Valor: R$ 79,90 • 📦 | Estoque: 3', value: 'conta_2020', emoji: '💸' },
        { label: 'Conta 2019', description: '💸 | Valor: R$ 79,90 • 📦 | Estoque: 2', value: 'conta_2019', emoji: '💸' },
        { label: 'Conta 2018', description: '💸 | Valor: R$ 119,90 • 📦 | Estoque: 2', value: 'conta_2018', emoji: '💸' },
        { label: 'Conta 2017', description: '💸 | Valor: R$ 179,90 • 📦 | Estoque: 1', value: 'conta_2017', emoji: '💸' },
        { label: 'Conta 2016', description: '💸 | Valor: R$ 289,90 • 📦 | Estoque: 1', value: 'conta_2016', emoji: '💸' },
        { label: 'Conta 2015', description: '💸 | Valor: R$ 499,00 • 📦 | Estoque: 1', value: 'conta_2015', emoji: '💸' }
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
