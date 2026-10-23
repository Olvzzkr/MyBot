/**
 * Comando ?ajuda - Sistema de ajuda contextual e listagem de comandos
 */

const { EmbedBuilder } = require('discord.js');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');

module.exports = {
  name: 'ajuda',
  aliases: ['help', 'comandos'],
  description: 'Exibe a lista de comandos disponíveis e instruções de uso',
  usage: '?ajuda [comando]',

  async execute({ message, args, prefix, commandLoader }) {
    const query = (args[0] || '').toLowerCase();

    // Ajuda específica de um comando
    if (query) {
      const cmd = commandLoader.getCommand(query);
      if (!cmd) {
        return message.reply(`❌ O comando \`${query}\` não foi encontrado.`);
      }

      const embed = new EmbedBuilder()
        .setTitle(`📖 Ajuda do Comando: ${prefix}${cmd.name}`)
        .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
        .addFields(
          { name: 'Descrição', value: cmd.description || 'Sem descrição.' },
          { name: 'Uso', value: `\`${cmd.usage || `${prefix}${cmd.name}`}\`` },
          { name: 'Aliases', value: cmd.aliases?.length ? cmd.aliases.map(a => `\`${prefix}${a}\``).join(', ') : 'Nenhum' },
          { name: 'Permissão Requerida', value: `\`${cmd.requiredPermission || 'Nenhuma (Público)'}\`` }
        );

      return message.reply({ embeds: [embed] });
    }

    // Listagem geral agrupada por categoria
    const categories = {};
    for (const [name, cmd] of commandLoader.commands.entries()) {
      const cat = cmd.category || 'Outros';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(`\`${prefix}${name}\``);
    }

    const embed = new EmbedBuilder()
      .setTitle(`🤖 Painel de Comandos - ${SYSTEM_DEFAULTS.NAME}`)
      .setDescription(`Prefixo configurado neste servidor: \`${prefix}\`\nUse \`${prefix}ajuda <comando>\` para detalhes específicos.`)
      .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
      .setFooter({ text: 'Sistema de Bot Multifuncional' })
      .setTimestamp();

    for (const [cat, cmds] of Object.entries(categories)) {
      embed.addFields({
        name: `📁 ${cat.toUpperCase()}`,
        value: cmds.join(' ')
      });
    }

    return message.reply({ embeds: [embed] });
  }
};
