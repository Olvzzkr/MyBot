/**
 * Comando ?painel-capcut - Envia o painel oficial de CapCut Pro Permanente
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

module.exports = {
  name: 'painel-capcut',
  aliases: ['painelcapcut', 'postar-capcut', 'capcut', 'capcut-pro'],
  description: 'Envia o painel oficial de CapCut Pro no canal atual',
  usage: '?painel-capcut',

  async execute({ message }) {
    const author = message.author;
    const member = message.member;
    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem postar o painel de vendas.');
    }

    const files = [];
    const logoPath = path.join(__dirname, '../../assets/blackshop-banner.jpg');
    if (fs.existsSync(logoPath)) {
      files.push(new AttachmentBuilder(logoPath, { name: 'shop_logo.jpg' }));
    }

    const bannerPath = path.join(__dirname, '../../assets/capcut-banner.png');
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_capcut.png' }));
    }

    const embed = new EmbedBuilder()
      .setTitle('CAPCUT PRO PERMANENTE')
      .setColor(0x2B2D31)
      .setDescription(
        '🎞️ Entrega automática\n' +
        '🎞️ 100% Ativado\n' +
        '🎞️ Sem virus\n' +
        '🎞️ todas funções liberadas\n' +
        '🎞️ Ativado automaticamente\n' +
        '🎞️ Simples de instalar\n' +
        '🎞️ Android e pc!\n\n' +
        '🎧 Por se tratar de um produto com valor muito abaixo do mercado, não disponibilizamos suporte para este item.\n\n' +
        '⚡ **Entrega Automática!**\n\n' +
        'Preço: **De R$ 4,99 a R$ 5,99**'
      )
      .setFooter({ text: 'REAL BOOST • BlackShop' });

    if (fs.existsSync(logoPath)) {
      embed.setThumbnail('attachment://shop_logo.jpg');
    }

    if (fs.existsSync(bannerPath)) {
      embed.setImage('attachment://banner_capcut.png');
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop_select_capcut')
      .setPlaceholder('Selecione uma opção...')
      .addOptions([
        { label: 'CapCut Pro - PC Permanente', description: '💸 | Valor: R$ 5,99 • 📦 | Estoque: ∞', value: 'capcut_pc', emoji: '💸' },
        { label: 'CapCut Pro - Android Permanente', description: '💸 | Valor: R$ 4,99 • 📦 | Estoque: ∞', value: 'capcut_android', emoji: '💸' },
        { label: 'CapCut Pro - PC + Android (Combo)', description: '💸 | Valor: R$ 8,99 • 📦 | Estoque: ∞', value: 'capcut_combo', emoji: '💸' }
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
