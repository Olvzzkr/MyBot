/**
 * Comando ?painel-steamhours - Envia o painel oficial de Steam Hours Boost da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-steamhours',
  aliases: ['painelsteamhours', 'postar-steamhours', 'steamhours', 'hours-boost'],
  description: 'Envia o painel oficial de Steam Hours no canal atual',
  usage: '?painel-steamhours',

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

    // Banner: Steam Hours
    const bannerPath = path.join(__dirname, '../../assets/steam-hours-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_steamhours.png' }));
    }

    const embed = new EmbedBuilder()
      .setTitle('ST3AM HOURS')
      .setColor(0x2B2D31)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        'O **Codeinware Boost** é um serviço que aumenta as horas da conta de sua escolha da Steam de forma automatizada. (Pode farmar horas na sua conta principal)\n\n' +
        '┃ As horas são farmadas na conta de sua preferência, de maneira ilimitada, sem a necessidade de manter os jogos abertos ou o computador ligado.\n\n' +
        '**A partir de:** `R$ 9,90`\n' +
        'Selecione uma opção no menu abaixo para iniciar o boost de horas.'
      )
      .setFooter({ text: 'REAL BOOST • BlackShop' });

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_steamhours.png');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_steam_hours')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: '500 Horas + 100 Bônus', description: '💸 | Valor: R$ 9,90 • 📦 | Estoque: ∞', value: 'hours_500', emoji: '💸' },
        { label: '1000 Horas + 200 Bônus', description: '💸 | Valor: R$ 19,90 • 📦 | Estoque: ∞', value: 'hours_1000', emoji: '💸' },
        { label: '2000 Horas + 500 Bônus', description: '💸 | Valor: R$ 39,90 • 📦 | Estoque: ∞', value: 'hours_2000', emoji: '💸' },
        { label: '4000 Horas + 1000 Bônus', description: '💸 | Valor: R$ 89,90 • 📦 | Estoque: ∞', value: 'hours_4000', emoji: '💸' },
        { label: 'Vitalicio', description: '💸 | Valor: R$ 249,00 • 📦 | Estoque: ∞', value: 'hours_vitalicio', emoji: '💸' }
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
