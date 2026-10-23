/**
 * Comando /reestoque e !reestoque - Notifica reabastecimento de produtos com atalho de compra
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const { resolveProductChannel } = require('../../utils/channelResolver');

module.exports = {
  name: 'reestoque',
  aliases: ['restock', 'novoestoque', 'novidade', 'chegouestoque'],
  description: 'Anuncia o reabastecimento de estoque de um produto com botão direto para a loja',
  usage: '/reestoque produto:"Contas Antigas" detalhes:"Novo lote de 2016 a 2020 disponível!" [canal:#avisos-loja]',

  async execute({ message, interaction, db, args }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const member = isInteraction ? interaction.member : message.member;
    const guild = isInteraction ? interaction.guild : message.guild;

    const isGlobalOwner = author.id === '1517970601342664768';
    const isGuildOwner = guild.ownerId === author.id;
    const hasDirecao = member?.roles?.cache?.some(r => r.name.toLowerCase().includes('direção') || r.name.toLowerCase().includes('direcao'));
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner || isGuildOwner || hasDirecao;

    if (!isAdmin) {
      const err = '❌ Apenas a Direção ou Administradores podem emitir alertas de reestoque.';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    let productName = '';
    let details = 'Estoque novo acabou de ser reabastecido. Aproveite antes que acabe!';
    let targetChannel = null;

    if (isInteraction) {
      productName = interaction.options.getString('produto') || 'Produtos Diversos';
      details = interaction.options.getString('detalhes') || details;
      targetChannel = interaction.options.getChannel('canal');
    } else {
      if (!args || args.length === 0) {
        return message.reply('📖 **Como usar:** `!reestoque "Nome do Produto" "Detalhes adicionais"`\nEx: `!reestoque "Contas Antigas" "Lote novo 2016 e 2017 adicionado!"`');
      }

      productName = args[0].replace(/^["'“”]+|["'“”]+$/g, '');
      if (args.length > 1) {
        details = args.slice(1).join(' ').replace(/^["'“”]+|["'“”]+$/g, '');
      }
      targetChannel = message.mentions.channels.first();
    }

    if (!targetChannel) {
      targetChannel = guild.channels.cache.find(c => c.name.includes('avisos') && c.type === ChannelType.GuildText) ||
                      (isInteraction ? interaction.channel : message.channel);
    }

    // Achar cargo de notificação de reestoque se existir
    const reestoqueRole = guild.roles.cache.find(r => r.name.includes('Reestoque'));
    const mentionPing = reestoqueRole ? `<@&${reestoqueRole.id}>` : '@everyone';

    const embed = new EmbedBuilder()
      .setTitle(`📦 REESTOQUE LIBERADO! — ${productName.toUpperCase()}`)
      .setColor(0x2ECC71)
      .setDescription(
        `🚀 **O estoque de ${productName} acabou de ser renovado!**\n\n` +
        `📝 **Detalhes:**\n\`\`\`\n${details}\n\`\`\`\n` +
        `⚡ Garanta o seu produto agora mesmo antes que esgote novamente!\n` +
        `Clique no botão abaixo para ir direto ao canal do produto.`
      )
      .setFooter({ text: 'Real Shop • Entrega Imediata & Garantia' })
      .setTimestamp();

    const productUrl = resolveProductChannel(productName, guild);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Ir para o Produto')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Link)
        .setURL(productUrl)
    );

    await targetChannel.send({
      content: `${mentionPing} 🔥 **NOVO ESTOQUE DISPONÍVEL!**`,
      embeds: [embed],
      components: [row]
    });

    const reply = `✅ **Alerta de reestoque publicado com sucesso em <#${targetChannel.id}>!**`;
    if (isInteraction) return interaction.reply({ content: reply, ephemeral: true });
    return message.reply(reply);
  }
};
