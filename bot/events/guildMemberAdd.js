/**
 * Evento guildMemberAdd - Atribuição automática de cargos e boas-vindas
 */

const { EmbedBuilder } = require('discord.js');
const { SYSTEM_DEFAULTS } = require('../../shared/constants');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, { db }) {
    const { guild } = member;

    try {
      // 1. Atribuição Automática de Cargos (Auto-Role)
      if (member.user.bot) {
        const botRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('bot'));
        if (botRole && guild.members.me.roles.highest.position > botRole.position) {
          await member.roles.add(botRole, 'Auto-role para Bots').catch(() => {});
        }
      } else {
        const memberRole = guild.roles.cache.find(r => r.name.toLowerCase() === '👤 membro' || r.name.toLowerCase() === 'membro');
        if (memberRole && guild.members.me.roles.highest.position > memberRole.position) {
          await member.roles.add(memberRole, 'Auto-role para novos membros').catch(() => {});
        }
      }

      // 2. Verificar configurações de Boas-Vindas no banco
      const welcomeConfig = db.prepare('SELECT * FROM welcome_settings WHERE guild_id = ?').get(guild.id);
      let targetChannel = null;

      if (welcomeConfig?.is_enabled && welcomeConfig?.channel_id) {
        targetChannel = guild.channels.cache.get(welcomeConfig.channel_id);
      }

      // Se não houver canal configurado, tenta achar canal chamado "boas-vindas" ou "geral"
      if (!targetChannel) {
        targetChannel = guild.channels.cache.find(c => c.name.includes('boas-vindas') || c.name.includes('welcome') || c.name.includes('entrada'));
      }

      if (targetChannel && targetChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle(`🎉 Bem-vindo(a) ao ${guild.name}!`)
          .setDescription(`Olá, ${member}! Estamos felizes em ter você aqui.\n\n` +
            `• Você é o **#${guild.memberCount}º membro** a entrar.\n` +
            `• Leia as regras e divirta-se!\n` +
            `• Pegue seus cargos de notificação no canal dedicado.`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setColor(SYSTEM_DEFAULTS.COLOR_SUCCESS)
          .setFooter({ text: 'Sistema Automático de Boas-Vindas' })
          .setTimestamp();

        await targetChannel.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      console.error('[Auto-Welcome] Erro ao processar entrada de membro:', err);
    }
  }
};
