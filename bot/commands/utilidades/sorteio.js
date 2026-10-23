/**
 * Comando /sorteio e !sorteio - Sistema de Sorteios Interativo com botão e contagem regressiva
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');

function parseDuration(input) {
  if (!input) return 24 * 60 * 60 * 1000;
  const text = String(input).toLowerCase().trim();
  const match = text.match(/^(\d+)\s*(m|min|h|hora|horas|d|dia|dias|s|sem)?$/);
  if (!match) return 24 * 60 * 60 * 1000;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'h')[0];

  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 's': return value * 7 * 24 * 60 * 60 * 1000;
    default: return value * 60 * 60 * 1000;
  }
}

module.exports = {
  name: 'sorteio',
  aliases: ['giveaway', 'sortear', 'novosorteio'],
  description: 'Inicia um sorteio oficial com botão interativo e contagem regressiva',
  usage: '/sorteio premio:"1x Tela HBO Max" duracao:"24h" [ganhadores:1] [canal:#sorteios]',

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
      const err = '❌ Apenas a Direção ou Administradores podem criar sorteios.';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    let prize = '';
    let durationStr = '24h';
    let winnersCount = 1;
    let targetChannel = null;

    if (isInteraction) {
      prize = interaction.options.getString('premio') || 'Prêmio Especial Real Shop';
      durationStr = interaction.options.getString('duracao') || '24h';
      winnersCount = interaction.options.getInteger('ganhadores') || 1;
      targetChannel = interaction.options.getChannel('canal');
    } else {
      if (!args || args.length === 0) {
        return message.reply('📖 **Como usar o comando:** `!sorteio "Nome do Prêmio" 24h [ganhadores] [#canal]`\nEx: `!sorteio "1x Ativação Nitro" 24h 1`');
      }
      prize = args[0].replace(/^["'“”]+|["'“”]+$/g, '');
      durationStr = args[1] || '24h';
      winnersCount = parseInt(args[2], 10) || 1;
      targetChannel = message.mentions.channels.first();
    }

    if (!targetChannel) {
      targetChannel = guild.channels.cache.find(c => c.name.includes('sorteio') && c.type === ChannelType.GuildText) ||
                      guild.channels.cache.find(c => c.name.includes('avisos') && c.type === ChannelType.GuildText) ||
                      (isInteraction ? interaction.channel : message.channel);
    }

    const durationMs = parseDuration(durationStr);
    const endsAtDate = new Date(Date.now() + durationMs);
    const endsAtTimestamp = Math.floor(endsAtDate.getTime() / 1000);
    const endsAtIso = endsAtDate.toISOString();

    const database = db || require('../../../database/connection').getDatabase();

    const embed = new EmbedBuilder()
      .setTitle(`🎉 NOVO SORTEIO — ${prize.toUpperCase()}`)
      .setColor(0x9B59B6)
      .setDescription(
        `Um novo sorteio oficial foi iniciado na **Real Shop**!\n\n` +
        `🎁 **Prêmio:** **${prize}**\n` +
        `👑 **Ganhadores:** \`${winnersCount}\`\n` +
        `⏱️ **Termina em:** <t:${endsAtTimestamp}:R> (<t:${endsAtTimestamp}:F>)\n` +
        `👤 **Patrocinado por:** <@${author.id}>\n\n` +
        `Clique no botão abaixo para garantir a sua participação!`
      )
      .setFooter({ text: 'Real Shop • Sistema de Sorteios' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_enter:0')
        .setLabel('Participar (0)')
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Success)
    );

    const giveawayMsg = await targetChannel.send({
      content: '🎉 **SORTEIO LIBERADO!** @everyone',
      embeds: [embed],
      components: [row]
    });

    // Salvar registro no SQLite
    const result = database.prepare(`
      INSERT INTO giveaways (message_id, channel_id, guild_id, prize, winners_count, ends_at, status, host_id)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
    `).run(giveawayMsg.id, targetChannel.id, guild.id, prize, winnersCount, endsAtIso, author.id);

    const giveawayId = result.lastInsertRowid;

    // Atualiza customId com o ID real do banco
    row.components[0].setCustomId(`giveaway_enter:${giveawayId}`);
    await giveawayMsg.edit({ components: [row] });

    const replyText = `✅ **Sorteio criado com sucesso!**\n• Prêmio: **${prize}**\n• Canal: <#${targetChannel.id}>\n• Término: <t:${endsAtTimestamp}:R>`;
    if (isInteraction) return interaction.reply({ content: replyText, ephemeral: true });
    return message.reply(replyText);
  }
};
