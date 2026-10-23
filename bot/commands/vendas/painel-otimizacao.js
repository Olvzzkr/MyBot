/**
 * Comando ?painel-otimizacao - Envia o painel oficial de Pack de Otimização da BlackShop
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-otimizacao',
  aliases: ['painelotimizacao', 'postar-otimizacao', 'otimizacao', 'pack-otimizacao'],
  description: 'Envia o painel oficial de Pack de Otimização no canal atual',
  usage: '?painel-otimizacao',

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
    const bannerPath = path.join(__dirname, '../../assets/pack-otimizacao-banner.png');
    const bannerJpg = path.join(__dirname, '../../assets/pack-otimizacao-banner.jpg');
    let hasBanner = false;
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_otimizacao.png' }));
      hasBanner = true;
    } else if (fs.existsSync(bannerJpg)) {
      files.push(new AttachmentBuilder(bannerJpg, { name: 'banner_otimizacao.jpg' }));
      hasBanner = true;
    }

    const embed = new EmbedBuilder()
      .setTitle('PACK DE OTIMIZAÇÃO VIP')
      .setColor(0x2B2D31)
      .setDescription(
        '⭐ **Conteúdo sem compactação, organizado de forma direta.**\n' +
        '⭐ **Acompanhado de arquivo .txt com instruções passo a passo.**\n' +
        '⭐ **Explicações detalhadas em todas as pastas.**\n' +
        '⭐ **Entrega automática do material.**\n' +
        '⭐ **Conteúdo 100% ativado.**\n' +
        '⭐ **Arquivos verificados e livres de vírus.**\n' +
        '⭐ **Ativação realizada de forma automática.**\n\n' +
        '👤 *Não oferecemos suporte, pois o procedimento é muito fácil de realizar.*\n\n\n' +
        '⚡ **Entrega Automática!**\n\n\n' +
        'Preço: **De R$ 11,90 a R$ 11,90**'
      );

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (hasBanner) {
      embed.setImage(fs.existsSync(bannerPath) ? 'attachment://banner_otimizacao.png' : 'attachment://banner_otimizacao.jpg');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_otimizacao')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: 'Pack de Otimização (Básico Windows)', description: '💸 | Valor: R$ 11,90 • 📦 | Estoque: 15', value: 'otim_basico', emoji: '💸' },
        { label: 'Pack de Otimização VIP (Completo PC & Jogos)', description: '💸 | Valor: R$ 11,90 • 📦 | Estoque: 20', value: 'otim_vip', emoji: '💸' }
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
