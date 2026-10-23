/**
 * Comando /sugestao e !sugestao - Envia sugestões de produtos com botões interativos de votação
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');

module.exports = {
  name: 'sugestao',
  aliases: ['sugerir', 'feedback-produto', 'idea', 'ideia'],
  description: 'Envia uma sugestão para a loja com sistema de votação da comunidade',
  usage: '/sugestao ideia:"Adicionar contas de GTA V"',

  async execute({ message, interaction, db, args }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const guild = isInteraction ? interaction.guild : message.guild;

    let content = '';
    if (isInteraction) {
      content = interaction.options.getString('ideia') || '';
    } else {
      if (!args || args.length === 0) {
        return message.reply('📖 **Como usar:** `!sugestao <sua ideia ou produto>`\nEx: `!sugestao Adicionar contas de GTA V com dinheiro`');
      }
      content = args.join(' ');
    }

    if (!content.trim()) {
      const err = '❌ Você precisa descrever a sua sugestão!';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    // Achar canal #💡・sugestões
    const sugestoesChan = guild.channels.cache.find(c => c.name.includes('sugestões') && c.type === ChannelType.GuildText);
    if (!sugestoesChan) {
      const err = '❌ O canal de sugestões não foi encontrado no servidor.';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    const database = db || require('../../../database/connection').getDatabase();

    const embed = new EmbedBuilder()
      .setTitle('💡 NOVA SUGESTÃO DA COMUNIDADE')
      .setColor(0xF1C40F)
      .setDescription(
        `👤 **Autor:** <@${author.id}> (\`${author.tag}\`)\n\n` +
        `📝 **Sugestão:**\n\`\`\`\n${content}\n\`\`\`\n` +
        `Vote nos botões abaixo para apoiar esta ideia!`
      )
      .setThumbnail(author.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Real Shop • Sistema de Sugestões' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('sugg_up:0')
        .setLabel('Apoio (0)')
        .setEmoji('👍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('sugg_down:0')
        .setLabel('Não Apoio (0)')
        .setEmoji('👎')
        .setStyle(ButtonStyle.Danger)
    );

    const postMsg = await sugestoesChan.send({ embeds: [embed], components: [row] });

    // Salvar no SQLite
    const res = database.prepare(`
      INSERT INTO suggestions (message_id, channel_id, guild_id, user_id, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(postMsg.id, sugestoesChan.id, guild.id, author.id, content);

    const suggId = res.lastInsertRowid;

    // Atualiza os customId com o ID real
    row.components[0].setCustomId(`sugg_up:${suggId}`);
    row.components[1].setCustomId(`sugg_down:${suggId}`);
    await postMsg.edit({ components: [row] });

    const reply = `✅ Sua sugestão foi enviada com sucesso para <#${sugestoesChan.id}>!`;
    if (isInteraction) return interaction.reply({ content: reply, ephemeral: true });
    return message.reply(reply);
  }
};
