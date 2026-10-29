/**
 * Comando ?painel-crunchyroll - Envia o painel oficial de Crunchyroll da BlackShop exatamente igual ao modelo
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-crunchyroll',
  aliases: ['painelcrunchyroll', 'postar-crunchyroll', 'crunchyroll', 'cruncholl'],
  description: 'Envia o painel oficial de Crunchyroll no canal atual',
  usage: '?painel-crunchyroll',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];
    const bannerPath = path.join(__dirname, '../../assets/crunchyroll-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_crunchyroll.png' }));
    }

    const embed = new EmbedBuilder()
      .setColor(0xF47521)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '### CRUNCHYROLL MEGA FAN\n' +
        'DETALHES DO PLANO\n' +
        '• Plano Mega Fan (Sem Anúncios)\n' +
        '• Qualidade Full HD (1080p)\n' +
        '• Episódios logo após o lançamento no Japão\n' +
        '• Catálogo completo de animes, filmes e mangás\n' +
        '• Pagamento seguro via PIX\n' +
        '• Suporte e garantia exclusivos\n\n' +
        'BENEFÍCIOS EXCLUSIVOS\n' +
        '• Assista em qualquer dispositivo (TV, Celular, PC, Console)\n' +
        '• Download de episódios para assistir offline\n' +
        '• Sem propagandas ou limitações\n' +
        '• Entrega rápida e automática\n\n' +
        '**A partir de** `R$ 6,90`\n' +
        'Clique no botão **"Ver opções"** para ver as variações disponíveis'
      )
      .setFooter({ text: 'RealShop • Entrega Rápida & Garantia' });

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_crunchyroll.png');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_options_crunchyroll')
        .setLabel('Ver opções')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Secondary)
    );

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
