/**
 * Comando ?boasvindas - Configuração de mensagens de entrada/saída e autorroles
 */

const { EmbedBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');

module.exports = {
  name: 'boasvindas',
  aliases: ['welcome', 'boas-vindas'],
  description: 'Configura o canal e a mensagem de boas-vindas do servidor',
  usage: '?boasvindas <status|canal|mensagem|autorole> [argumentos]',
  requiredPermission: PERMISSIONS.WELCOME_MANAGE,

  async execute({ message, args, db, authService, member }) {
    const { guild } = message;
    const subCommand = (args[0] || 'status').toLowerCase();

    // ==========================================
    // 1. ?boasvindas status
    // ==========================================
    if (subCommand === 'status') {
      const config = db.prepare('SELECT * FROM welcome_settings WHERE guild_id = ?').get(guild.id);

      const embed = new EmbedBuilder()
        .setTitle(`👋 Configurações de Boas-Vindas: ${guild.name}`)
        .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
        .addFields(
          { name: 'Status', value: config?.is_enabled ? '🟢 Ativado' : '🔴 Desativado', inline: true },
          { name: 'Canal', value: config?.channel_id ? `<#${config.channel_id}>` : 'Não configurado', inline: true },
          { name: 'Mensagem', value: config?.message_text || 'Padrão: Boas-vindas ao {server}, {user}!', inline: false },
          { name: 'Autorroles', value: config?.autorole_ids_json || '[]', inline: false }
        );

      return message.reply({ embeds: [embed] });
    }

    // ==========================================
    // 2. ?boasvindas canal <#canal>
    // ==========================================
    if (subCommand === 'canal') {
      const targetChannel = message.mentions.channels.first() || guild.channels.cache.get(args[1]);
      if (!targetChannel) {
        return message.reply('⚠️ Por favor, mencione um canal válido. Ex: `?boasvindas canal #boas-vindas`');
      }

      db.prepare(`
        INSERT INTO welcome_settings (guild_id, channel_id, is_enabled)
        VALUES (?, ?, 1)
        ON CONFLICT(guild_id) DO UPDATE SET
          channel_id = excluded.channel_id,
          is_enabled = 1,
          updated_at = datetime('now', 'utc')
      `).run(guild.id, targetChannel.id);

      return message.reply(`✅ Canal de boas-vindas configurado para ${targetChannel} e ativado!`);
    }

    // ==========================================
    // 3. ?boasvindas mensagem <texto>
    // ==========================================
    if (subCommand === 'mensagem') {
      const text = args.slice(1).join(' ').trim();
      if (!text) {
        return message.reply('⚠️ Informe a mensagem desejada. Variáveis suportadas: `{user}`, `{server}`, `{members}`.');
      }

      db.prepare(`
        INSERT INTO welcome_settings (guild_id, message_text, is_enabled)
        VALUES (?, ?, 1)
        ON CONFLICT(guild_id) DO UPDATE SET
          message_text = excluded.message_text,
          updated_at = datetime('now', 'utc')
      `).run(guild.id, text);

      return message.reply('✅ Mensagem de boas-vindas salva com sucesso!');
    }

    // ==========================================
    // 4. ?boasvindas autorole <@cargo>
    // ==========================================
    if (subCommand === 'autorole') {
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[1]);
      if (!role) {
        return message.reply('⚠️ Mencione o cargo a ser atribuído automaticamente. Ex: `?boasvindas autorole @Membro`');
      }

      const botHighest = guild.members.me.roles.highest.position;
      if (role.position >= botHighest) {
        return message.reply('❌ O cargo informado é superior ou igual ao cargo do bot e não pode ser concedido automaticamente.');
      }

      const current = db.prepare('SELECT autorole_ids_json FROM welcome_settings WHERE guild_id = ?').get(guild.id);
      let list = [];
      try {
        if (current?.autorole_ids_json) list = JSON.parse(current.autorole_ids_json);
      } catch {}

      if (!list.includes(role.id)) {
        list.push(role.id);
      }

      db.prepare(`
        INSERT INTO welcome_settings (guild_id, autorole_ids_json, is_enabled)
        VALUES (?, ?, 1)
        ON CONFLICT(guild_id) DO UPDATE SET
          autorole_ids_json = excluded.autorole_ids_json,
          updated_at = datetime('now', 'utc')
      `).run(guild.id, JSON.stringify(list));

      return message.reply(`✅ Cargo **${role.name}** adicionado à lista de autorroles.`);
    }

    return message.reply('⚠️ Subcomando não reconhecido. Use: `?boasvindas <status|canal|mensagem|autorole>`');
  }
};
