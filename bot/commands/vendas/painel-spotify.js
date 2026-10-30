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
    const bannerPath = path.join(__dirname, '../../assets/spotify-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_spotify.png' }));
    }

    const embed = new EmbedBuilder()
      .setColor(0x1DB954)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '### SPOTIFY PREMIUM\n' +
        'DETALHES DO PLANO\n' +
        '• Plano Premium Individual / Familiar\n' +
        '• Ouça músicas e podcasts sem nenhum anúncio\n' +
        '• Pule faixas ilimitadamente e escolha qualquer música\n' +
        '• Qualidade máxima de reprodução (320 kbps)\n' +
        '• Modo Offline: baixe suas playlists favoritas\n' +
        '• Pagamento seguro via PIX com entrega instantânea\n\n' +
        'BENEFÍCIOS EXCLUSIVOS\n' +
        '• Sem comerciais ou limitações de reprodução\n' +
        '• Compatível com Celular, PC, Smart TVs, Alexa e Som automotivo\n' +
        '• Opções em Link de Ativação direta ou Conta Pronta\n' +
        '• Suporte dedicado e garantia exclusiva\n\n' +
        '**A partir de** `R$ 5,50`\n' +
        'Selecione no menu abaixo o plano desejado para comprar:'
      )
      .setFooter({ text: 'RealShop • Entrega Rápida & Garantia' });

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_spotify.png');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_spotify')
      .setPlaceholder('🔽 Clique aqui para escolher seu plano...')
      .addOptions([
        { label: 'Spotify 1 Mês — Link Ativação', description: '💸 R$ 5,50 • Ativação direta na sua conta pessoal', value: 'spot_link_1m', emoji: '🎵' },
        { label: 'Spotify 3 Meses — Link Ativação', description: '💸 R$ 8,90 • Ativação direta na sua conta pessoal', value: 'spot_link_3m', emoji: '🎵' },
        { label: 'Conta Spotify 1 Mês — Privada', description: '💸 R$ 15,90 • Conta pronta exclusiva com Premium', value: 'spot_conta_1m', emoji: '🎧' },
        { label: 'Conta Spotify Anual (1 Ano)', description: '💸 R$ 39,90 • 12 meses de Premium garantido', value: 'spot_conta_1y', emoji: '👑' }
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
