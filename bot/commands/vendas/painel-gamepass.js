/**
 * Comando ?painel-gamepass - Envia o painel oficial de Xbox Game Pass Ultimate da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-gamepass',
  aliases: ['painelgamepass', 'postar-gamepass', 'gamepass', 'xbox'],
  description: 'Envia o painel oficial de Xbox Game Pass no canal atual',
  usage: '?painel-gamepass',

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
    const bannerPath = path.join(__dirname, '../../assets/gamepass-banner.png');
    const bannerJpg = path.join(__dirname, '../../assets/gamepass-banner.jpg');
    let hasBanner = false;
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_gamepass.png' }));
      hasBanner = true;
    } else if (fs.existsSync(bannerJpg)) {
      files.push(new AttachmentBuilder(bannerJpg, { name: 'banner_gamepass.jpg' }));
      hasBanner = true;
    }

    const embed = new EmbedBuilder()
      .setTitle('XBOX GAME PASS ULTIMATE 90 DIAS')
      .setColor(0x2B2D31)
      .setDescription(
        '🟢 **Qualidade INSANA pagando MUITO barato!**\n' +
        '🛒 **Entrega automática após a compra via chat** 🛒\n' +
        '🎮 **XBOX GAME PASS ULTIMATE (PC / CONSOLE / TV / XCLOUD)**\n\n' +
        '⏩ **ESCOLHA SUA OPÇÃO E APROVEITE:**\n\n' +
        '🟢 **XBOX GAME PASS ULTIMATE – O MAIS VENDIDO**\n' +
        '⏩ Compatível com PC / Console / TV / XCloud\n' +
        '⏩ Jogue online normalmente (Xbox Live incluído)\n' +
        '⏩ Acesso ao EA Play + diversos jogos\n' +
        '⏩ Centenas de jogos disponíveis\n' +
        '⏩ Acesso garantido por 30 dias (com possibilidade de renovação)\n\n' +
        '⭐ **COMO FUNCIONA:**\n' +
        '• Conta compartilhada (funciona junto com sua conta principal pra jogar online)\n' +
        '• Pode jogar online sem problemas\n' +
        '• Dados enviados automaticamente após a compra\n\n' +
        '🧐 **OBSERVAÇÕES IMPORTANTES:**\n' +
        '• A conta é compartilhada e pode ser usada junto com sua conta principal,\n' +
        '• Você pode jogar jogos pela sua conta principal!\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **R$ 19,90**'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (hasBanner) {
      embed.setImage(fs.existsSync(bannerPath) ? 'attachment://banner_gamepass.png' : 'attachment://banner_gamepass.jpg');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_gamepass')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: 'XBOX GAME PASS ULTIMATE 90 DIAS', description: '💸 | Valor: R$ 19,90 • 📦 | Estoque: 5', value: 'gamepass_90d', emoji: '💸' },
        { label: 'XBOX GAME PASS ULTIMATE (CONSOLE) 90 DIAS', description: '💸 | Valor: R$ 19,90 • 📦 | Estoque: 11', value: 'gamepass_console_90d', emoji: '💸' },
        { label: 'XBOX GAME PASS ULTIMATE (PC) 90 DIAS', description: '💸 | Valor: R$ 19,90 • 📦 | Estoque: 6', value: 'gamepass_pc_90d', emoji: '💸' }
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
