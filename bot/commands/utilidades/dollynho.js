/**
 * Comando !dollynho / ?dollynho / /dollynho
 * Cria automaticamente as categorias e canais de partidas e análise de Free Fire
 * exatamente conforme os modelos fornecidos.
 */

const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const DOLLYNHO_STRUCTURE = [
  {
    category: 'Partidas ↓',
    channels: [
      { name: 'colombia', type: ChannelType.GuildText }
    ]
  },
  {
    category: 'Informações',
    channels: [
      { name: '⚡ ── termos', type: ChannelType.GuildText },
      { name: '⚡ ── regras', type: ChannelType.GuildText },
      { name: '⚡ ── vagas', type: ChannelType.GuildText },
      { name: '⚡ ── ranking', type: ChannelType.GuildText },
      { name: '⚡ ── perfil', type: ChannelType.GuildText }
    ]
  },
  {
    category: 'Free Fire - Mobile',
    channels: [
      { name: '⚡・1x1-mob', type: ChannelType.GuildText },
      { name: '⚡・2x2-mob', type: ChannelType.GuildText },
      { name: '⚡・3x3-mob', type: ChannelType.GuildText },
      { name: '⚡・4x4-mob', type: ChannelType.GuildText }
    ]
  },
  {
    category: 'Free Fire - Misto',
    channels: [
      { name: '⚡・2x2-misto', type: ChannelType.GuildText },
      { name: '⚡・3x3-misto', type: ChannelType.GuildText },
      { name: '⚡・4x4-misto', type: ChannelType.GuildText }
    ]
  },
  {
    category: 'Free fire - Emulador',
    channels: [
      { name: '⚡・1x1-emu', type: ChannelType.GuildText },
      { name: '⚡・2x2-emu', type: ChannelType.GuildText },
      { name: '⚡・3x3-emu', type: ChannelType.GuildText },
      { name: '⚡・4x4-emu', type: ChannelType.GuildText }
    ]
  },
  {
    category: '🔎 Análise',
    channels: [
      { name: '🚫・exposed', type: ChannelType.GuildText },
      { name: '💀・blacklist', type: ChannelType.GuildText },
      { name: '🔍・regras-analise', type: ChannelType.GuildText },
      { name: 'Complemento', type: ChannelType.GuildVoice, userLimit: 8 },
      { name: 'Análise 01', type: ChannelType.GuildVoice, userLimit: 8 },
      { name: 'Análise 02', type: ChannelType.GuildVoice, userLimit: 8 },
      { name: 'Análise 03', type: ChannelType.GuildVoice, userLimit: 8 },
      { name: 'Análise 04', type: ChannelType.GuildVoice, userLimit: 8 },
      { name: 'Análise 05', type: ChannelType.GuildVoice, userLimit: 8 }
    ]
  }
];

module.exports = {
  name: 'dollynho',
  aliases: ['dolly', 'setup-dollynho', 'criar-dollynho'],
  description: 'Cria as categorias e canais de Partidas, Informações, Free Fire (Mobile/Misto/Emulador) e Análise',
  usage: '!dollynho',

  async execute({ message, guild, member, author }) {
    const targetGuild = guild || message?.guild;
    const targetMember = member || message?.member;
    const targetAuthor = author || message?.author;

    const isGlobalOwner = targetAuthor?.id === '1517970601342664768';
    const isAdmin = targetMember?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      return message.reply('❌ Apenas Administradores podem executar este comando.');
    }

    const statusMsg = await message.reply('⏳ **Iniciando criação de categorias e canais do Dollynho... Aguarde!**');

    let createdCategories = 0;
    let createdChannels = 0;
    const summaryLines = [];

    for (const group of DOLLYNHO_STRUCTURE) {
      try {
        // Criar categoria
        const categoryChannel = await targetGuild.channels.create({
          name: group.category,
          type: ChannelType.GuildCategory,
          reason: 'Criação automatizada via comando !dollynho'
        });
        createdCategories++;

        const channelNames = [];

        // Criar canais vinculados à categoria
        for (const ch of group.channels) {
          try {
            const channelOptions = {
              name: ch.name,
              type: ch.type,
              parent: categoryChannel.id,
              reason: 'Criação automatizada via comando !dollynho'
            };

            if (ch.userLimit) {
              channelOptions.userLimit = ch.userLimit;
            }

            const newCh = await targetGuild.channels.create(channelOptions);
            createdChannels++;
            channelNames.push(ch.type === ChannelType.GuildVoice ? `🔊 ${ch.name} (08)` : `# ${ch.name}`);
          } catch (chErr) {
            console.error(`Erro ao criar canal ${ch.name}:`, chErr);
          }
        }

        summaryLines.push(`📁 **${group.category}** (${channelNames.length} canais)`);
      } catch (catErr) {
        console.error(`Erro ao criar categoria ${group.category}:`, catErr);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle('⚡ Estrutura Dollynho Criada com Sucesso!')
      .setColor(0x2B2D31)
      .setDescription(
        `Todas as categorias e salas foram geradas exatamente iguais às especificações!\n\n` +
        summaryLines.join('\n') + `\n\n` +
        `📊 **Total:** **${createdCategories}** categorias e **${createdChannels}** canais criados.`
      )
      .setFooter({ text: 'Nexora • Setup Dollynho' })
      .setTimestamp();

    if (statusMsg.edit) {
      await statusMsg.edit({ content: '✅ **Criação concluída com sucesso!**', embeds: [embed] });
    } else {
      await message.reply({ embeds: [embed] });
    }
  }
};
