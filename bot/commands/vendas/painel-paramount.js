/**
 * Comando ?painel-paramount - Envia o painel oficial de Paramount da BlackShop exatamente igual ao modelo
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-paramount',
  aliases: ['painelparamount', 'postar-paramount', 'paramount', 'paramount-plus'],
  description: 'Envia o painel oficial de Paramount no canal atual',
  usage: '?painel-paramount',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];
    const bannerPath = path.join(__dirname, '../../assets/paramount-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_paramount.png' }));
    }

    const embed = new EmbedBuilder()
      .setColor(0x0064FF)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '### PARAMOUNT+ PREMIUM\n' +
        'DETALHES DO PLANO\n' +
        '• Plano Premium (Qualidade Full HD & 4K)\n' +
        '• Até 4 telas simultâneas\n' +
        '• Catálogo completo: Paramount Originals, SHOWTIME e filmes clássicos\n' +
        '• Transmissões esportivas ao vivo (Libertadores & Sul-Americana)\n' +
        '• Pagamento seguro via PIX com aprovação imediata\n' +
        '• Suporte e garantia dedicados\n\n' +
        'BENEFÍCIOS EXCLUSIVOS\n' +
        '• Streaming de alta qualidade e sem anúncios\n' +
        '• Acesso às produções de sucesso e estreias imperdíveis\n' +
        '• Sem limitações de catálogo\n' +
        '• Melhor desempenho em Smart TVs, consoles, celulares e PC\n\n' +
        '**A partir de** `R$ 7,90`\n' +
        'Clique no botão **"Ver opções"** para ver as variações disponíveis'
      )
      .setFooter({ text: 'RealShop • Entrega Rápida & Garantia' });

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_paramount.png');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_options_paramount')
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
