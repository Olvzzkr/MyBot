/**
 * Comando ?painel-netflix - Envia o painel oficial de Netflix da BlackShop exatamente igual ao modelo
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-netflix',
  aliases: ['painelnetflix', 'postar-netflix', 'netflix', 'net-flix'],
  description: 'Envia o painel oficial de Netflix no canal atual',
  usage: '?painel-netflix',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];
    const bannerPath = path.join(__dirname, '../../assets/netflix-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_netflix.png' }));
    }

    const embed = new EmbedBuilder()
      .setColor(0xE50914)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '### NETFLIX PREMIUM\n' +
        'DETALHES DO PLANO\n' +
        '• Plano Premium (Qualidade Ultra HD 4K + HDR)\n' +
        '• Áudio Espacial e até 4 telas simultâneas\n' +
        '• Catálogo completo (filmes, séries, doramas e lançamentos)\n' +
        '• Sem interrupções de comerciais\n' +
        '• Pagamento seguro via PIX com aprovação imediata\n' +
        '• Suporte e garantia dedicados\n\n' +
        'BENEFÍCIOS EXCLUSIVOS\n' +
        '• Qualidade máxima 4K Ultra HD\n' +
        '• Acesso a todos os conteúdos originais e sucessos mundiais\n' +
        '• Sem limitações de catálogo\n' +
        '• Melhor desempenho em Smart TVs, consoles, celulares e PC\n\n' +
        '**A partir de** `R$ 8,90`\n' +
        'Clique no botão **"Ver opções"** para ver as variações disponíveis'
      )
      .setFooter({ text: 'RealShop • Entrega Rápida & Garantia' });

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_netflix.png');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_options_netflix')
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
