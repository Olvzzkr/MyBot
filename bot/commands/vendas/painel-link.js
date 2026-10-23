/**
 * Comando ?painel-link - Envia o painel oficial de Nitro Link da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-link',
  aliases: ['painellink', 'postar-link'],
  description: 'Envia o painel oficial de Nitro Link no canal atual',
  usage: '?painel-link',

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
      files.push(new AttachmentBuilder(logoPath, { name: 'blackshop.jpg' }));
    }

    // Banner Grande: Discord Nitro
    const bannerPath = path.join(__dirname, '../../assets/discord-nitro-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'nitro_banner.png' }));
    }

    const ativacaoChannelId = '1562242462230122558';

    const embed = new EmbedBuilder()
      .setTitle('NITRO LINK')
      .setColor(0x2B2D31)
      .setDescription(
        '🧚 É necessário ter uma conta Discord com mais de 15 dias de criação e que nunca tenha tido Nitro anteriormente. (Nitro obtido por Orbs é aceito.)\n\n' +
        `🧚 Será necessário possuir um cartão. Caso não tenha, adquira ativação conosco em: <#${ativacaoChannelId}>\n\n` +
        '🧚 A garantia do link é válida apenas no momento da compra. Recomendamos gravar todo o processo, pois sem gravação não realizamos trocas.\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **De R$ 8,90 a R$ 18,90**'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://blackshop.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://nitro_banner.png');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_nitrolink')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        {
          label: 'Nitro Link mensal (1mes)',
          description: '💸 | Valor: R$ 8,90 • 📦 | Estoque: Esgotado',
          value: 'link_1m',
          emoji: '💸'
        },
        {
          label: 'Nitro Link trimensal (3mes)',
          description: '💸 | Valor: R$ 18,90 • 📦 | Estoque: 12',
          value: 'link_3m',
          emoji: '💸'
        }
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
