/**
 * Comando ?painel-contas-virgens - Envia o painel oficial de Contas Virgens Discord
 * Exatamente no modelo profissional com entrega automática e checkout instantâneo.
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  PermissionFlagsBits
} = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');
const CartService = require('../../services/cartService');

module.exports = {
  name: 'painel-contas-virgens',
  aliases: ['painel-virgem', 'contas-virgens', 'contavirgem', 'virgens', 'virgem', 'painelvirgem'],
  description: 'Envia o painel oficial de Contas Virgens do Discord no canal atual',
  usage: '?painel-contas-virgens',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];

    // Thumbnail / Logo
    const logoPath = path.join(__dirname, '../../assets/blackshop-banner.jpg');
    if (fs.existsSync(logoPath)) {
      files.push(new AttachmentBuilder(logoPath, { name: 'blackshop.jpg' }));
    }

    const pSingle = CartService.getProduct('conta_virgem')?.price || 1.50;
    const p5x = CartService.getProduct('conta_virgem_5x')?.price || 6.90;

    const embed = new EmbedBuilder()
      .setTitle('📦 Informações das Contas Virgens')
      .setColor(0x2B2D31)
      .setDescription(
        'Segue a descrição oficial e especificações para compra:\n\n' +
        '• 🔓 Contas **Full Acesso**.\n' +
        '• 🎁 Todas as contas possuem **Nitro resgatável**.\n' +
        '• ⏰ Garantia de **24 horas**.\n' +
        '• ❌ Nenhuma conta acompanha Nitro ativado.\n' +
        '• ✉️ Após a compra, **migre a conta para um e-mail pessoal**.\n' +
        '• 👤 Todas as contas são **humanizadas**, contendo foto de perfil.\n\n' +
        '• 🗓️ Conta criada pode ter **entre 1 dia até 90 dias**.\n\n' +
        '⚡ **Entrega Automática e Imediata!**\n\n' +
        `💳 **Valor unitário:** \`R$ ${pSingle.toFixed(2)}\` | **Estoque:** \`Disponível\`\n` +
        'Clique no botão **"Comprar"** abaixo para adquirir a sua!'
      )
      .setFooter({ text: 'Nexora Store • Contas Virgens 100% Seguras' })
      .setTimestamp();

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://blackshop.jpg');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_buy_conta_virgem')
        .setLabel('Comprar 1x Conta Virgem')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_buy_conta_virgem_5x')
        .setLabel(`Combo 5x Contas (R$ ${p5x.toFixed(2)})`)
        .setEmoji('📦')
        .setStyle(ButtonStyle.Primary)
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
