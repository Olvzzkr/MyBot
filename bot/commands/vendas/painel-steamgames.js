/**
 * Comando ?painel-steamgames - Envia o painel oficial de Contas com Jogos Steam da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-steamgames',
  aliases: ['painelsteamgames', 'postar-steamgames', 'steamgames', 'contas-steam'],
  description: 'Envia o painel oficial de Contas Steam no canal atual',
  usage: '?painel-steamgames',

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

    // Banner: Jogos Steam
    const bannerPath = path.join(__dirname, '../../assets/steam-games-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_steamgames.png' }));
    }

    const embed = new EmbedBuilder()
      .setTitle('CONTAS COM JOGOS STEAM')
      .setColor(0x2B2D31)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '🪙 **Produtos por apenas R$ 9,90**\n' +
        '💰 Explore uma seleção exclusiva de produtos disponíveis por apenas um real, cuidadosamente organizados para tornar sua escolha e compra mais práticas, rápidas e seguras. São produtos oferecidos por terceiros por valores superiores a R$ 100,00, mas que aqui você encontra por apenas R$ 9,90.\n\n' +
        '**A partir de:** `R$ 9,90`\n' +
        'Selecione uma opção no menu abaixo para ver os jogos disponíveis.'
      )
      .setFooter({ text: 'REAL BOOST • BlackShop' });

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_steamgames.png');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_steam_games')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: 'CONTA STEAM COM OS 2 GTA 5 ( 100% ONLINE )', description: '💸 | Valor: R$ 9,90 • 📦 | Estoque: ∞', value: 'steam_gta5', emoji: '💸' },
        { label: 'CONTA COM RED DEAD 2 ( 100% ONLINE )', description: '💸 | Valor: R$ 9,90 • 📦 | Estoque: ∞', value: 'steam_rdr2', emoji: '💸' },
        { label: 'CONTA COM STEAM COM EA SPORTS FC 26 ( 100% ON...', description: '💸 | Valor: R$ 9,90 • 📦 | Estoque: ∞', value: 'steam_fc26', emoji: '💸' },
        { label: 'CONTA COM GOD OF WAR RAGNAROK ( 100% ONLINE )', description: '💸 | Valor: R$ 9,90 • 📦 | Estoque: ∞', value: 'steam_gow', emoji: '💸' },
        { label: 'CONTA COM FORZA HORIZON 6 ( 100% ONLINE )', description: '💸 | Valor: R$ 9,90 • 📦 | Estoque: ∞', value: 'steam_forza', emoji: '💸' }
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
