/**
 * Comando ?painel-spotify - Envia o painel oficial de Spotify Premium da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-spotify',
  aliases: ['painelspotify', 'postar-spotify', 'spotify'],
  description: 'Envia o painel oficial de Spotify Premium no canal atual',
  usage: '?painel-spotify',

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
    const bannerPath = path.join(__dirname, '../../assets/spotify-banner.png');
    const bannerJpg = path.join(__dirname, '../../assets/spotify-banner.jpg');
    let hasBanner = false;
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_spotify.png' }));
      hasBanner = true;
    } else if (fs.existsSync(bannerJpg)) {
      files.push(new AttachmentBuilder(bannerJpg, { name: 'banner_spotify.jpg' }));
      hasBanner = true;
    }

    const embed = new EmbedBuilder()
      .setTitle('Spotify Premium')
      .setColor(0x2B2D31)
      .setDescription(
        '**Spotify – Plano de 1 Mês**\n\n' +
        '• Acesso à conta mediante fornecimento de e-mail e senha para login.\n' +
        '• Conta disponibilizada com o plano Premium devidamente ativado. A conta será exclusiva para seu uso.\n\n' +
        '**Spotify – Link de 1/3 Mês**\n\n' +
        'Você receberá um link para ativação diretamente em sua conta. Importante: a conta não pode ter utilizado o plano Premium anteriormente.\n\n' +
        '**Spotify – Plano de 1 Ano**\n\n' +
        '• Você receberá uma conta com plano Premium de 1 ano, incluindo garantia de 30 dias. Após a entrega, enviaremos todo o passo a passo necessário para utilização do produto.\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **De R$ 5,50 a R$ 39,90**'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (hasBanner) {
      embed.setImage(fs.existsSync(bannerPath) ? 'attachment://banner_spotify.png' : 'attachment://banner_spotify.jpg');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_spotify')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: 'Spotify 1 mes – LINK', description: '💸 | Valor: R$ 5,50 • 📦 | Estoque: 25', value: 'spot_link_1m', emoji: '💸' },
        { label: 'Spotify 3 mes – LINK', description: '💸 | Valor: R$ 8,90 • 📦 | Estoque: 45', value: 'spot_link_3m', emoji: '💸' },
        { label: 'Conta Spotify 1 mes', description: '💸 | Valor: R$ 15,90 • 📦 | Estoque: 1', value: 'spot_conta_1m', emoji: '💸' },
        { label: 'Conta Spotify 3 mes', description: '💸 | Valor: R$ 8,99 • 📦 | Estoque: Esgotado', value: 'spot_conta_3m', emoji: '💸' },
        { label: 'Conta Spotify anual (1 ano)', description: '💸 | Valor: R$ 39,90 • 📦 | Estoque: 2', value: 'spot_conta_1y', emoji: '💸' }
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
