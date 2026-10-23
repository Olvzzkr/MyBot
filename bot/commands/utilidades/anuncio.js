/**
 * Comando /anuncio e !anuncio - Criação de comunicados e anúncios profissionais
 */

const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  name: 'anuncio',
  aliases: ['comunicado', 'aviso', 'broadcast', 'notificar'],
  description: 'Publica um comunicado estilizado no canal selecionado com menção configurável',
  usage: '/anuncio titulo:"Título" mensagem:"Texto do anúncio" [canal:#canal] [mencao:everyone|here|nenhuma]',

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
      const err = '❌ Apenas a Direção ou Administradores podem publicar anúncios oficiais.';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    let title = '';
    let content = '';
    let targetChannel = null;
    let mentionType = 'everyone';

    if (isInteraction) {
      title = interaction.options.getString('titulo') || 'COMUNICADO OFICIAL';
      content = interaction.options.getString('mensagem') || '';
      targetChannel = interaction.options.getChannel('canal');
      mentionType = interaction.options.getString('mencao') || 'everyone';
    } else {
      if (!args || args.length === 0) {
        return message.reply('📖 **Como usar:** `!anuncio "Título" "Mensagem do anúncio" [#canal]`');
      }

      if (args[0].startsWith('"') || args[0].startsWith('“')) {
        const match = message.content.match(/^(\S+)\s+["“]([^"”]+)["”]\s+["“]([^"”]+)["”]/);
        if (match) {
          title = match[2];
          content = match[3];
        } else {
          title = args[0].replace(/^["'“”]+|["'“”]+$/g, '');
          content = args.slice(1).join(' ').replace(/^["'“”]+|["'“”]+$/g, '');
        }
      } else {
        title = 'COMUNICADO OFICIAL';
        content = args.join(' ');
      }
      targetChannel = message.mentions.channels.first();
    }

    if (!targetChannel) {
      targetChannel = guild.channels.cache.find(c => c.name.includes('avisos') && c.type === ChannelType.GuildText) ||
                      (isInteraction ? interaction.channel : message.channel);
    }

    let mentionText = '';
    if (mentionType === 'everyone') mentionText = '@everyone';
    else if (mentionType === 'here') mentionText = '@here';

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title.toUpperCase()} — REAL SHOP`)
      .setColor(0xED4245)
      .setDescription(content)
      .setFooter({ text: `Publicado por ${author.tag} • Real Shop Oficial` })
      .setTimestamp();

    await targetChannel.send({
      content: mentionText || undefined,
      embeds: [embed]
    });

    const reply = `✅ **Anúncio publicado com sucesso em <#${targetChannel.id}>!**`;
    if (isInteraction) return interaction.reply({ content: reply, ephemeral: true });
    return message.reply(reply);
  }
};
