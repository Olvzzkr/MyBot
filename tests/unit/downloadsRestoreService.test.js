const test = require('node:test');
const assert = require('node:assert/strict');
const { ChannelType } = require('discord.js');
const {
  buildMessagePayloads,
  getDownloadsCategory,
  normalizeName,
  restoreDownloads
} = require('../../bot/services/downloadsRestoreService');

test('normalizes Download category names including accents and plural form', () => {
  assert.equal(normalizeName('📥 Downloads'), 'downloads');
  assert.equal(normalizeName('Download'), 'download');
});

test('finds the unique Download(s) category and refuses ambiguous matches', () => {
  const category = { name: 'Downloads', type: ChannelType.GuildCategory };
  const guild = { channels: { cache: [category] } };
  assert.equal(getDownloadsCategory(guild), category);

  assert.throws(
    () => getDownloadsCategory({ channels: { cache: [category, { ...category, name: 'Download' }] } }),
    /mais de uma categoria/
  );
  assert.throws(
    () => getDownloadsCategory({ channels: { cache: [] } }),
    /Não encontrei/
  );
});

test('builds safe attributed reposts and includes attachments', () => {
  const attachments = new Map([
    ['file-1', { url: 'https://cdn.discordapp.com/file.zip', name: 'file.zip' }]
  ]);
  const message = {
    author: { tag: 'Pessoa#1234' },
    createdAt: new Date('2026-10-31T00:00:00.000Z'),
    content: 'Veja este arquivo: @everyone',
    attachments,
    embeds: []
  };

  const [{ payload, expectedAttachments }] = buildMessagePayloads(message);

  assert.match(payload.content, /Repostado de Pessoa#1234/);
  assert.match(payload.content, /@everyone/);
  assert.deepEqual(payload.allowedMentions, { parse: [] });
  assert.deepEqual(payload.files, [{
    attachment: 'https://cdn.discordapp.com/file.zip',
    name: 'file.zip'
  }]);
  assert.equal(expectedAttachments, 1);
});

test('splits long messages and attachment batches without exceeding Discord limits', () => {
  const attachments = new Map(Array.from({ length: 11 }, (_, index) => [
    `file-${index}`,
    { url: `https://cdn.discordapp.com/${index}`, name: `${index}.zip` }
  ]));
  const message = {
    author: { tag: 'Pessoa#1234' },
    createdAt: new Date('2026-10-31T00:00:00.000Z'),
    content: 'x'.repeat(1900),
    attachments,
    embeds: []
  };

  const payloads = buildMessagePayloads(message);

  assert.equal(payloads.length, 2);
  assert.ok(payloads.every(({ payload }) => payload.content.length <= 2000));
  assert.equal(payloads[0].payload.files.length, 10);
  assert.equal(payloads[1].payload.files.length, 1);
});

function createRestoreFixture({ failCopy = false } = {}) {
  const events = [];
  const sourceMessage = {
    id: 'source-message',
    author: { tag: 'Pessoa#1234' },
    createdAt: new Date('2026-10-31T00:00:00.000Z'),
    createdTimestamp: Date.parse('2026-10-31T00:00:00.000Z'),
    content: 'Download post',
    attachments: new Map(),
    embeds: []
  };
  const sourceChannel = {
    id: 'source-channel',
    name: 'arquivo',
    type: ChannelType.GuildText,
    parentId: 'source-category',
    rawPosition: 0,
    topic: null,
    nsfw: false,
    rateLimitPerUser: 0,
    permissionOverwrites: { cache: new Map() },
    messages: { fetch: async () => new Map([[sourceMessage.id, sourceMessage]]) },
    delete: async () => events.push('delete-source-channel')
  };
  const sourceCategory = {
    id: 'source-category',
    name: 'Downloads',
    type: ChannelType.GuildCategory,
    rawPosition: 2,
    permissionOverwrites: { cache: new Map() },
    setName: async name => { sourceCategory.name = name; },
    delete: async () => events.push('delete-source-category')
  };
  const botMember = {
    permissions: { has: () => true },
    permissionsIn: () => ({ has: () => true })
  };
  const guild = { channelsCreateOptions: [] };
  guild.members = { me: botMember };
  guild.channels = {
    cache: new Map([
      [sourceCategory.id, sourceCategory],
      [sourceChannel.id, sourceChannel]
    ]),
    create: async options => {
      guild.channelsCreateOptions.push(options);
      if (options.type === ChannelType.GuildCategory) {
        const category = {
          id: 'replacement-category',
          name: options.name,
          permissionOverwrites: { cache: new Map() },
          setName: async name => { category.name = name; },
          delete: async () => events.push('delete-replacement-category')
        };
        return category;
      }

      const sent = [];
      return {
        id: 'replacement-channel',
        name: options.name,
        messages: {
          fetch: async () => new Map(sent.map((message, index) => [String(index), message]))
        },
        send: async payload => {
          events.push('copy-message');
          if (failCopy) throw new Error('upload failed');
          const copied = {
            createdTimestamp: Date.now(),
            attachments: new Map((payload.files || []).map((file, index) => [String(index), file]))
          };
          sent.push(copied);
          return copied;
        },
        delete: async () => events.push('delete-replacement-channel')
      };
    }
  };

  return { guild, events };
}

test('only deletes original Downloads after the replacement copy is verified', async () => {
  const { guild, events } = createRestoreFixture();

  const result = await restoreDownloads(guild, { actorTag: 'Admin' });

  assert.equal(result.channelCount, 1);
  assert.equal(result.copiedMessageCount, 1);
  assert.equal(events.indexOf('copy-message') < events.indexOf('delete-source-channel'), true);
  assert.equal(events.includes('delete-source-channel'), true);
  assert.equal(events.includes('delete-source-category'), true);
});

test('preserves the original Downloads category if copying fails', async () => {
  const { guild, events } = createRestoreFixture({ failCopy: true });

  await assert.rejects(restoreDownloads(guild, { actorTag: 'Admin' }), /originais foram mantidos/);

  assert.equal(events.includes('delete-source-channel'), false);
  assert.equal(events.includes('delete-source-category'), false);
  assert.equal(events.includes('delete-replacement-channel'), true);
  assert.equal(events.includes('delete-replacement-category'), true);
});
