/**
 * Comando ?avatar - Exibe foto de perfil em alta qualidade
 */

const { EmbedBuilder } = require('discord.js');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');

module.exports = {
  name: 'avatar',
  aliases: ['foto', 'pfp'],
  description: 'Exibe a foto de perfil em alta qualidade de um membro',
  usage: '?avatar [@membro|ID]',

  async execute({ message, args }) {
    const { guild, author } = message;
    const target = message.mentions.users.first() || (args[0] ? await guild.client.users.fetch(args[0]).catch(() => null) : author);

    if (!target) {
      return message.reply('❌ Usuário não encontrado.');
    }

    const avatarUrl = target.displayAvatarURL({ dynamic: true, size: 4096 });

    const embed = new EmbedBuilder()
      .setTitle(`🖼️ Avatar de ${target.tag}`)
      .setDescription(`[Clique aqui para abrir em tamanho original](${avatarUrl})`)
      .setImage(avatarUrl)
      .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
      .setFooter({ text: `Solicitado por ${author.tag}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
