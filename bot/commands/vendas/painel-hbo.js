/**
 * Comando ?painel-hbo - Envia o painel oficial de HBO Max da BlackShop exatamente igual ao modelo
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-hbo',
  aliases: ['painelhbo', 'postar-hbo', 'hbo', 'hbo-max'],
  description: 'Envia o painel oficial de HBO Max no canal atual',
  usage: '?painel-hbo',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];
    const bannerPath = path.join(__dirname, '../../assets/hbo-max-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_hbo.png' }));
    }

    const embed = new EmbedBuilder()
      .setColor(0x5822B4)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '### MAX (HBO MAX)\n' +
        'DETALHES DO PLANO\n' +
        '• Plano Platinum (Qualidade 4K Ultra HD)\n' +
        '• Até 4 telas simultâneas\n' +
        '• Áudio Dolby Atmos e HDR10\n' +
        '• Catálogo completo (Warner, DC, HBO, Discovery e Champions League)\n' +
        '• Pagamento seguro via PIX\n' +
        '• Garantia de até 14 dias\n\n' +
        'BENEFÍCIOS EXCLUSIVOS\n' +
        '• Qualidade 4K Ultra HD sem travamentos\n' +
        '• Acesso aos maiores lançamentos do cinema\n' +
        '• Sem limitações de conteúdo\n' +
        '• Melhor desempenho em TVs, consoles, celulares e PC\n\n' +
        '**A partir de** `R$ 7,90`\n' +
        'Clique no botão **"Ver opções"** para ver as variações disponíveis'
      )
      .setFooter({ text: 'RealShop • Entrega Rápida & Garantia' });

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_hbo.png');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_options_hbo')
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
