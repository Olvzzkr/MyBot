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
      .setColor(0x2B2D31)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '### D1SN3Y PLUS\n' +
        'DETALHES DO PLANO\n' +
        '• Plano Premium\n' +
        '• Até 4 telas simultâneas\n' +
        '• Qualidade Ultra HD (4K) + HDR\n' +
        '• Catálogo completo (filmes, séries, jogos e lançamentos)\n' +
        '• Pagamento seguro\n' +
        '• Garantia de até 14 dias\n\n' +
        'BENEFÍCIOS EXCLUSIVOS\n' +
        '• Qualidade 4K Ultra HD\n' +
        '• Acesso aos principais lançamentos\n' +
        '• Sem limitações de conteúdo\n' +
        '• Melhor desempenho em TVs, consoles e PC\n\n' +
        '**A partir de** `R$ 12,90`\n' +
        'Clique no botão **"Ver opções"** para ver as variações disponíveis'
      )
      .setFooter({ text: 'REAL BOOST • BlackShop' });

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
