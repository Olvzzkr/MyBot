/**
 * Comando ?painel-cs2 - Envia o painel oficial de CS2 External da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-cs2',
  aliases: ['painelcs2', 'postar-cs2', 'cs2', 'cs2-external'],
  description: 'Envia o painel oficial de CS2 External no canal atual',
  usage: '?painel-cs2',

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

    // Banner: CS2 External
    const bannerPath = path.join(__dirname, '../../assets/cs2-external-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_cs2.png' }));
    }

    const embed = new EmbedBuilder()
      .setTitle('CS2 3XT3RN4L | CODEINWRE')
      .setColor(0x2B2D31)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '⭐ **CS2 EXTERNAL | SECURE** ⭐\n\n' +
        '⭐ 100% Indetectável e Seguro ( Sem Risco de VAC )\n' +
        '⭐ ESP - A1MBOT - TR1GG3R - SK1N CH4NG3R e MUITO MAIS...\n' +
        '⭐ Painel Otimizado e Seguro para Você Usar sem riscos.\n' +
        '⭐ Sempre Atualizado e com constantes atualizações.\n\n' +
        '**A partir de:** `R$ 24,90`\n' +
        'Selecione uma opção no menu abaixo para adquirir seu acesso.'
      )
      .setFooter({ text: 'REAL BOOST • BlackShop' });

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_cs2.png');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_cs2_ext')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: 'Diário', description: '💸 | Valor: R$ 24,90 • 📦 | Estoque: ∞', value: 'cs2_diario', emoji: '💸' },
        { label: 'Semanal', description: '💸 | Valor: R$ 64,90 • 📦 | Estoque: ∞', value: 'cs2_semanal', emoji: '💸' },
        { label: 'Mensal', description: '💸 | Valor: R$ 109,90 • 📦 | Estoque: ∞', value: 'cs2_mensal', emoji: '💸' },
        { label: '180 Dias', description: '💸 | Valor: R$ 389,00 • 📦 | Estoque: ∞', value: 'cs2_180dias', emoji: '💸' }
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
