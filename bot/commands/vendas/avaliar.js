/**
 * Comando /avaliar e !avaliar - Envia avaliações com estrelas no canal de feedbacks
 */

const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  name: 'avaliar',
  aliases: ['feedback', 'recomendar', 'depoimento'],
  description: 'Avalia o atendimento e a compra na loja com estrelas e comentário em #feedbacks',
  usage: '/avaliar estrelas:5 comentario:"Atendimento excelente e produto entregue rápido!"',

  async execute({ message, interaction, db, args }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const guild = isInteraction ? interaction.guild : message.guild;

    let stars = 5;
    let comment = 'Compra realizada com sucesso e ótimo atendimento!';

    if (isInteraction) {
      stars = interaction.options.getInteger('estrelas') || 5;
      comment = interaction.options.getString('comentario') || comment;
    } else {
      if (!args || args.length === 0) {
        return message.reply('📖 **Como usar:** `!avaliar <1-5> "Seu comentário aqui"`\nEx: `!avaliar 5 "Entrega em 2 minutos, recomendo demais!"`');
      }

      stars = parseInt(args[0], 10);
      if (isNaN(stars) || stars < 1 || stars > 5) {
        stars = 5;
        comment = args.join(' ');
      } else {
        comment = args.slice(1).join(' ') || comment;
      }
    }

    stars = Math.max(1, Math.min(5, stars));
    const starStr = '⭐'.repeat(stars);

    // Localizar canal de feedbacks (#🏆・feedbacks)
    const feedbacksChan = guild.channels.cache.get('1562634794263777280') ||
                          guild.channels.cache.find(c => c.name.includes('feedback') && c.type === ChannelType.GuildText);

    if (!feedbacksChan) {
      const err = '❌ Canal de feedbacks não encontrado.';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    const database = db || require('../../../database/connection').getDatabase();

    // Salvar no SQLite
    database.prepare(`
      INSERT INTO customer_feedbacks (user_id, guild_id, stars, comment)
      VALUES (?, ?, ?, ?)
    `).run(author.id, guild.id, stars, comment);

    const embed = new EmbedBuilder()
      .setTitle(`🏆 NOVA AVALIAÇÃO DE CLIENTE — REAL SHOP`)
      .setColor(0xF1C40F)
      .setDescription(
        `👤 **Cliente:** <@${author.id}> (\`${author.tag}\`)\n` +
        `🌟 **Nota:** **${starStr}** (\`${stars}/5 Estrelas\`)\n\n` +
        `💬 **Comentário do Cliente:**\n\`\`\`\n${comment}\n\`\`\`\n` +
        `✅ **Cliente Verificado Real Shop**`
      )
      .setThumbnail(author.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Real Shop • Avaliação Oficial de Compra' })
      .setTimestamp();

    await feedbacksChan.send({ embeds: [embed] });

    const reply = `🎉 **Muito obrigado pela sua avaliação!** Seu feedback foi postado com sucesso em <#${feedbacksChan.id}>!`;
    if (isInteraction) return interaction.reply({ content: reply, ephemeral: true });
    return message.reply(reply);
  }
};
