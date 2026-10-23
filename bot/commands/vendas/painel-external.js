/**
 * Comando ?painel-external - Envia o painel oficial de Painel Emulador External da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-external',
  aliases: ['painelexternal', 'postar-external', 'external'],
  description: 'Envia o painel oficial de Painel Emulador External no canal atual',
  usage: '?painel-external',

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

    // Banner Opcional se existir
    const bannerPath = path.join(__dirname, '../../assets/painel-external-banner.png');
    const bannerJpg = path.join(__dirname, '../../assets/painel-external-banner.jpg');
    let hasBanner = false;
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_external.png' }));
      hasBanner = true;
    } else if (fs.existsSync(bannerJpg)) {
      files.push(new AttachmentBuilder(bannerJpg, { name: 'banner_external.jpg' }));
      hasBanner = true;
    }

    const embed = new EmbedBuilder()
      .setTitle('PAINEL EMULADOR EXTERNAL')
      .setColor(0x2B2D31)
      .setDescription(
        'Adquira o seu Painel **100% ANTI BAN** com excelente custo-benefício, garantindo alto desempenho, total eficiência e segurança no uso.\n\n' +
        '┃  🛡️ **Funções disponível:**\n\n' +
        '• Aimbot Novo (com tecla de ativação configurável)\n' +
        '• Aimbot Pescoço(com tecla de ativação configurável)\n' +
        '• Aimbot Legit (com tecla de ativação configurável)\n' +
        '• Aimbot para mira 2x\n' +
        '• Aimbot para mira 4x\n' +
        '• Instalação de Certificado P64\n' +
        '• Chams na cor vermelha\n' +
        '• Chams na cor verde\n' +
        '• Chams via menu\n' +
        '• Modo Stream\n\n' +
        '┃  🥷 **Por que utilizar?**\n' +
        'O Painel BlackShop oferece maior segurança ao usuário, além de proporcionar vantagens competitivas de forma prática, eficiente e confiável.\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **De R$ 11,90 a R$ 119,90**'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (hasBanner) {
      embed.setImage(fs.existsSync(bannerPath) ? 'attachment://banner_external.png' : 'attachment://banner_external.jpg');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_external')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: 'Painel External (1 dia)', description: '💸 | Valor: R$ 11,90 • 📦 | Estoque: 1', value: 'external_1d', emoji: '💸' },
        { label: 'Painel External (7 dia)', description: '💸 | Valor: R$ 29,90 • 📦 | Estoque: 13', value: 'external_7d', emoji: '💸' },
        { label: 'Painel External (30 dia)', description: '💸 | Valor: R$ 59,90 • 📦 | Estoque: 14', value: 'external_30d', emoji: '💸' },
        { label: 'Painel External (Permanente)', description: '💸 | Valor: R$ 119,90 • 📦 | Estoque: 2', value: 'external_perm', emoji: '💸' }
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
