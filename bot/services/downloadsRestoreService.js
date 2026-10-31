const { ChannelType, PermissionFlagsBits } = require('discord.js');

function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getDownloadsCategory(guild) {
  const categories = [...guild.channels.cache.values()].filter(channel =>
    channel.type === ChannelType.GuildCategory &&
    ['download', 'downloads'].includes(normalizeName(channel.name))
  );

  if (categories.length !== 1) {
    throw new Error(
      categories.length === 0
        ? 'Não encontrei a categoria Download(s) no servidor.'
        : 'Encontrei mais de uma categoria Download(s); nenhuma alteração foi feita.'
    );
  }

  return categories[0];
}

function getDownloadChannels(guild, category) {
  const channels = [...guild.channels.cache.values()]
    .filter(channel => channel.parentId === category.id)
    .sort((a, b) => a.rawPosition - b.rawPosition);

  const unsupported = channels.filter(channel => channel.type !== ChannelType.GuildText);
  if (unsupported.length > 0) {
    throw new Error(
      `A categoria contém canais que não são de texto e não podem ser copiados com segurança: ${unsupported.map(channel => channel.name).join(', ')}.`
    );
  }

  return channels;
}

function serializeOverwrites(channel) {
  return [...channel.permissionOverwrites.cache.values()].map(overwrite => ({
    id: overwrite.id,
    type: overwrite.type,
    allow: overwrite.allow.bitfield,
    deny: overwrite.deny.bitfield
  }));
}

async function fetchAllMessages(channel) {
  const messages = [];
  let before;

  while (true) {
    const page = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {})
    });

    if (page.size === 0) break;
    messages.push(...page.values());

    const oldestMessage = [...page.values()].reduce((oldest, message) =>
      !oldest || message.createdTimestamp < oldest.createdTimestamp ? message : oldest, null);
    before = oldestMessage.id;

    if (page.size < 100) break;
  }

  return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

async function inspectDownloads(guild) {
  const category = getDownloadsCategory(guild);
  const channels = getDownloadChannels(guild, category);
  const messageCounts = [];
  let messageCount = 0;
  let attachmentCount = 0;

  for (const channel of channels) {
    const messages = await fetchAllMessages(channel);
    messageCounts.push({ channelName: channel.name, count: messages.length });
    messageCount += messages.length;
    attachmentCount += messages.reduce((total, message) => total + message.attachments.size, 0);
  }

  return {
    categoryName: category.name,
    channelCount: channels.length,
    messageCount,
    attachmentCount,
    messageCounts
  };
}

function splitContent(content, maxLength) {
  const chunks = [];
  for (let offset = 0; offset < content.length; offset += maxLength) {
    chunks.push(content.slice(offset, offset + maxLength));
  }
  return chunks;
}

function buildMessagePayloads(message) {
  const attribution = `**Repostado de ${message.author.tag} · ${message.createdAt.toISOString()}**`;
  const bodyChunks = splitContent(message.content || '', 1800);
  const textChunks = bodyChunks.length > 0 ? bodyChunks : [''];
  const attachmentGroups = [];
  const attachments = [...message.attachments.values()];

  for (let index = 0; index < attachments.length; index += 10) {
    attachmentGroups.push(attachments.slice(index, index + 10));
  }
  if (attachmentGroups.length === 0) attachmentGroups.push([]);

  const count = Math.max(textChunks.length, attachmentGroups.length);
  return Array.from({ length: count }, (_, index) => {
    const contentParts = [];
    if (index === 0) contentParts.push(attribution);
    if (textChunks[index]) contentParts.push(textChunks[index]);
    if (index > 0 && !textChunks[index]) contentParts.push(`${attribution} (continuação)`);

    const payload = {
      content: contentParts.join('\n').slice(0, 2000),
      allowedMentions: { parse: [] }
    };
    const group = attachmentGroups[index] || [];
    if (group.length > 0) {
      payload.files = group.map(attachment => ({
        attachment: attachment.url,
        name: attachment.name
      }));
    }
    if (index === 0 && message.embeds.length > 0) {
      payload.embeds = message.embeds.map(embed => embed.toJSON());
    }
    return { payload, expectedAttachments: group.length };
  });
}

async function copyMessages(sourceMessages, destinationChannel) {
  let sentMessageCount = 0;
  let copiedAttachmentCount = 0;

  for (const sourceMessage of sourceMessages) {
    const payloads = buildMessagePayloads(sourceMessage);
    for (const { payload, expectedAttachments } of payloads) {
      const copiedMessage = await destinationChannel.send(payload);
      if (copiedMessage.attachments.size !== expectedAttachments) {
        throw new Error(
          `Nem todos os anexos da mensagem ${sourceMessage.id} foram copiados para #${destinationChannel.name}.`
        );
      }
      sentMessageCount += 1;
      copiedAttachmentCount += copiedMessage.attachments.size;
    }
  }

  return { sentMessageCount, copiedAttachmentCount };
}

async function removeCreatedChannels(channels, category) {
  const failures = [];
  for (const channel of channels.reverse()) {
    try {
      await channel.delete('Limpeza de cópia incompleta; categoria original preservada');
    } catch (error) {
      failures.push(`${channel.name}: ${error.message}`);
    }
  }
  if (category) {
    try {
      await category.delete('Limpeza de cópia incompleta; categoria original preservada');
    } catch (error) {
      failures.push(`${category.name}: ${error.message}`);
    }
  }
  return failures;
}

async function restoreDownloads(guild, { actorTag, onProgress = () => {} } = {}) {
  const category = getDownloadsCategory(guild);
  const sourceChannels = getDownloadChannels(guild, category);
  const botMember = guild.members.me;

  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error('O bot precisa de Gerenciar Canais no servidor.');
  }

  for (const channel of sourceChannels) {
    const permissions = botMember.permissionsIn(channel);
    if (!permissions.has(PermissionFlagsBits.ViewChannel) ||
        !permissions.has(PermissionFlagsBits.ReadMessageHistory) ||
        !permissions.has(PermissionFlagsBits.SendMessages) ||
        !permissions.has(PermissionFlagsBits.AttachFiles)) {
      throw new Error(`O bot não tem as permissões necessárias para copiar #${channel.name}. Nenhum canal foi alterado.`);
    }
  }

  const snapshots = [];
  let expectedMessageCount = 0;
  let expectedAttachmentCount = 0;
  for (const channel of sourceChannels) {
    const messages = await fetchAllMessages(channel);
    snapshots.push({ channel, messages });
    expectedMessageCount += messages.length;
    expectedAttachmentCount += messages.reduce((count, message) => count + message.attachments.size, 0);
  }

  const suffix = Date.now().toString(36);
  const temporaryCategoryName = `${category.name.slice(0, 75)} (copia ${suffix})`;
  let replacementCategory;
  const replacementChannels = [];
  let verified = false;

  try {
    replacementCategory = await guild.channels.create({
      name: temporaryCategoryName,
      type: ChannelType.GuildCategory,
      permissionOverwrites: serializeOverwrites(category),
      position: category.rawPosition,
      reason: `Cópia de segurança temporária antes de recriar Downloads por ${actorTag}`
    });

    let completedChannels = 0;
    let copiedMessageCount = 0;
    let copiedAttachmentCount = 0;

    for (const { channel, messages } of snapshots) {
      const replacement = await guild.channels.create({
        name: channel.name,
        type: ChannelType.GuildText,
        parent: replacementCategory.id,
        topic: channel.topic || undefined,
        nsfw: channel.nsfw,
        rateLimitPerUser: channel.rateLimitPerUser,
        permissionOverwrites: serializeOverwrites(channel),
        reason: `Cópia de segurança temporária da categoria ${category.name}`
      });
      replacementChannels.push(replacement);

      const copied = await copyMessages(messages, replacement);
      const actualMessages = await fetchAllMessages(replacement);
      const actualAttachments = actualMessages.reduce((count, message) => count + message.attachments.size, 0);
      if (actualMessages.length !== copied.sentMessageCount ||
          actualAttachments !== copied.copiedAttachmentCount) {
        throw new Error(`A verificação de mensagens/anexos falhou em #${channel.name}.`);
      }

      copiedMessageCount += copied.sentMessageCount;
      copiedAttachmentCount += copied.copiedAttachmentCount;
      completedChannels += 1;
      await onProgress(`Cópia verificada: ${completedChannels}/${sourceChannels.length} canais.`);
    }

    if (copiedMessageCount < expectedMessageCount || copiedAttachmentCount !== expectedAttachmentCount) {
      throw new Error(
        `A cópia não corresponde à origem (${copiedMessageCount}/${expectedMessageCount} mensagens e ${copiedAttachmentCount}/${expectedAttachmentCount} anexos).`
      );
    }

    verified = true;
    await onProgress('Cópia verificada. Substituindo a categoria antiga.');

    const backupName = `${category.name.slice(0, 70)} (backup ${suffix})`;
    await category.setName(backupName, `Cópia verificada; substituindo Downloads por ${actorTag}`);
    try {
      await replacementCategory.setName(category.name, `Cópia verificada; categoria Downloads recriada por ${actorTag}`);
    } catch (error) {
      await category.setName(category.name, 'Falha ao renomear cópia; categoria original restaurada').catch(rollbackError => {
        console.error('[Downloads Restore] Falha ao restaurar nome da categoria original:', rollbackError);
      });
      throw error;
    }

    const deletionFailures = [];
    for (const channel of sourceChannels) {
      try {
        await channel.delete(`Cópia da categoria Downloads verificada por ${actorTag}`);
      } catch (error) {
        deletionFailures.push(`${channel.name}: ${error.message}`);
      }
    }

    if (deletionFailures.length === 0) {
      try {
        await category.delete(`Cópia da categoria Downloads verificada por ${actorTag}`);
      } catch (error) {
        deletionFailures.push(`${category.name}: ${error.message}`);
      }
    }

    return {
      channelCount: sourceChannels.length,
      messageCount: expectedMessageCount,
      attachmentCount: expectedAttachmentCount,
      copiedMessageCount,
      copiedAttachmentCount,
      deletionFailures,
      backupCategoryName: deletionFailures.length > 0 ? backupName : null
    };
  } catch (error) {
    if (!verified) {
      const cleanupFailures = await removeCreatedChannels(replacementChannels, replacementCategory);
      const cleanupMessage = cleanupFailures.length > 0
        ? ` Não foi possível limpar todas as cópias temporárias: ${cleanupFailures.join('; ')}.`
        : ' A categoria e os canais originais foram mantidos.';
      throw new Error(`${error.message}${cleanupMessage}`);
    }

    throw error;
  }
}

module.exports = {
  buildMessagePayloads,
  getDownloadsCategory,
  inspectDownloads,
  normalizeName,
  restoreDownloads
};
