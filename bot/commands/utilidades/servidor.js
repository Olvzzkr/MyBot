/**
 * Comando ?servidor - Informações detalhadas do servidor atual
 */

const { EmbedBuilder } = require('discord.js');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');

module.exports = {
  name: 'servidor',
  aliases: ['server', 'serverinfo'],
  description: 'Exibe informações e estatísticas do servidor atual',
  usage: '?servidor',

  async execute({ message }) {
    const { guild } = message;

    const embed = new EmbedBuilder()
      .setTitle(`🏰 Informações do Servidor: ${guild.name}`)
      .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
      .setThumbnail(guild.iconURL({ dynamic: true }) || null)
      .addFields(
        { name: 'ID do Servidor', value: `\`${guild.id}\``, inline: true },
        { name: 'Dono (Owner)', value: `<@${guild.ownerId}> (\`${guild.ownerId}\`)`, inline: true },
        { name: 'Criado em', value: guild.createdAt.toLocaleDateString('pt-BR'), inline: true },
        { name: 'Membros Totais', value: `${guild.memberCount}`, inline: true },
        { name: 'Canais', value: `${guild.channels.cache.size}`, inline: true },
        { name: 'Cargos', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Nível de Verificação', value: `${guild.verificationLevel}`, inline: true }
      )
      .setFooter({ text: 'Informações do Servidor' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
