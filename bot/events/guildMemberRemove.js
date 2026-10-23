/**
 * Evento guildMemberRemove - Registro e mensagem de saída automática
 */

const { EmbedBuilder } = require('discord.js');
const { SYSTEM_DEFAULTS } = require('../../shared/constants');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(member, { db }) {
    const { guild } = member;

    try {
      const targetChannel = guild.channels.cache.find(c => 
        c.name.includes('saida') || 
        c.name.includes('adeus') || 
        c.name.includes('logs') || 
        c.name.includes('boas-vindas')
      );

      if (targetChannel && targetChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle(`👋 Membro Saiu`)
          .setDescription(`**${member.user.tag}** (\`${member.id}\`) deixou o servidor.\nAgora somos **${guild.memberCount} membros**.`)
          .setColor(SYSTEM_DEFAULTS.COLOR_WARNING)
          .setTimestamp();

        await targetChannel.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      console.error('[Auto-Farewell] Erro ao registrar saída:', err);
    }
  }
};
