/**
 * Comando ?painel-disney - Envia o painel oficial de Disney Plus da BlackShop exatamente igual ao modelo
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-disney',
  aliases: ['paineldisney', 'postar-disney', 'disney', 'disney-plus'],
  description: 'Envia o painel oficial de Disney Plus no canal atual',
  usage: '?painel-disney',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];
    const bannerPath = path.join(__dirname, '../../assets/disney-plus-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_disney.png' }));
    }

    const embed = new EmbedBuilder()
      .setColor(0x113CCF)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '### DISNEY+ PREMIUM\n' +
        'DETALHES DO PLANO\n' +
        '• Plano Premium (Qualidade 4K Ultra HD + HDR)\n' +
        '• Até 4 telas simultâneas\n' +
        '• Catálogo completo: Disney, Pixar, Marvel, Star Wars, NatGeo & ESPN\n' +
        '• Possibilidade de assistir offline (download liberado)\n' +
        '• Pagamento seguro via PIX\n' +
        '• Suporte e garantia exclusivos\n\n' +
        'BENEFÍCIOS EXCLUSIVOS\n' +
        '• Qualidade 4K Ultra HD e som imersivo\n' +
        '• Acesso aos maiores sucessos e originais exclusivos\n' +
        '• Sem anúncios e sem limitações\n' +
        '• Melhor desempenho em Smart TVs, consoles, celulares e PC\n\n' +
        '**A partir de** `R$ 12,90`\n' +
        'Clique no botão **"Ver opções"** para ver as variações disponíveis'
      )
      .setFooter({ text: 'RealShop • Entrega Rápida & Garantia' });

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_disney.png');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_options_disney')
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
