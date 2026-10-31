const { PermissionFlagsBits } = require('discord.js');

const EXEMPT_CHANNEL_NAMES = new Set(['geral', 'midia', 'midias', 'setup', 'setups']);
const DENIED_SEND_PERMISSIONS = {
  SendMessages: false,
  SendMessagesInThreads: false,
  SendVoiceMessages: false,
  SendPolls: false,
  CreatePublicThreads: false,
  CreatePrivateThreads: false
};

const MEMBER_READ_ONLY_PERMISSIONS = {
  ViewChannel: true,
  ReadMessageHistory: true,
  ...DENIED_SEND_PERMISSIONS
};

function normalizeChannelName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]/g, '');
}

async function lockGuildTextChannels(guild, botMember, actorTag) {
  const memberRole = guild.roles.cache.find(role => normalizeChannelName(role.name) === 'membro');
  if (!memberRole) {
    throw new Error('O cargo "Membro" não foi encontrado neste servidor.');
  }

  const textChannels = [...guild.channels.cache.values()].filter(channel =>
    channel.isTextBased() &&
    !channel.isThread()
  );
  const failedChannels = [];
  let lockedCount = 0;

  for (const channel of textChannels) {
    const everyoneOverwrite = channel.permissionOverwrites.cache.get(guild.id);
    if (EXEMPT_CHANNEL_NAMES.has(normalizeChannelName(channel.name))) {
      const permissionsToRestore = Object.fromEntries(
        Object.keys(DENIED_SEND_PERMISSIONS)
          .filter(permission => everyoneOverwrite?.deny.has(PermissionFlagsBits[permission]))
          .map(permission => [permission, null])
      );

      if (Object.keys(permissionsToRestore).length === 0) continue;

      if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
        failedChannels.push({ name: channel.name, reason: 'o bot não tem Gerenciar Canais neste canal' });
        continue;
      }

      try {
        await channel.permissionOverwrites.edit(
          guild.id,
          permissionsToRestore,
          'Canal preservado da tranca de canais'
        );
      } catch (error) {
        failedChannels.push({ name: channel.name, reason: error.message });
      }
      continue;
    }

    if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
      failedChannels.push({ name: channel.name, reason: 'o bot não tem Gerenciar Canais neste canal' });
      continue;
    }

    try {
      await channel.permissionOverwrites.edit(
        memberRole,
        MEMBER_READ_ONLY_PERMISSIONS,
        `Leitura liberada e envio bloqueado para o cargo Membro por ${actorTag}`
      );
      await channel.permissionOverwrites.edit(
        guild.id,
        DENIED_SEND_PERMISSIONS,
        `Canais trancados por ${actorTag}`
      );
      lockedCount += 1;
    } catch (error) {
      failedChannels.push({ name: channel.name, reason: error.message });
    }
  }

  return {
    lockedCount,
    skippedExemptCount: textChannels.filter(channel =>
      EXEMPT_CHANNEL_NAMES.has(normalizeChannelName(channel.name))
    ).length,
    failedChannels
  };
}

module.exports = { lockGuildTextChannels };
