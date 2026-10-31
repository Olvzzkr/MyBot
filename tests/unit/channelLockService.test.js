const test = require('node:test');
const assert = require('node:assert/strict');
const { lockGuildTextChannels } = require('../../bot/services/channelLockService');

function createChannel(name, {
  textBased = true,
  thread = false,
  canManage = true,
  fail = false,
  everyoneDenied = false
} = {}) {
  const channel = {
    name,
    isTextBased: () => textBased,
    isThread: () => thread,
    permissionOverwrites: {
      cache: new Map([['guild-id', { deny: { has: () => everyoneDenied } }]]),
      edit: async (...args) => {
        if (fail) throw new Error('API error');
        channel.editCalls ??= [];
        channel.editCalls.push(args);
      }
    }
  };

  return { channel, canManage };
}

test('locks writable text channels and leaves Geral, Mídias, and Setup untouched', async () => {
  const fixtures = [
    createChannel('💬geral'),
    createChannel('📸midia', { everyoneDenied: true }),
    createChannel('💻-setups', { everyoneDenied: true }),
    createChannel('anuncios'),
    createChannel('voz', { textBased: false }),
    createChannel('thread', { thread: true })
  ];
  const memberRole = { id: 'member-role', name: '👤 Membro' };
  const guild = {
    id: 'guild-id',
    channels: { cache: new Map(fixtures.map(({ channel }, index) => [index, channel])) },
    roles: { cache: [memberRole] }
  };
  const botMember = { permissionsIn: () => ({ has: () => true }) };

  const result = await lockGuildTextChannels(guild, botMember, 'moderador');

  assert.equal(result.lockedCount, 1);
  assert.equal(result.skippedExemptCount, 3);
  assert.deepEqual(result.failedChannels, []);
  assert.equal(fixtures[3].channel.editCalls[0][0], memberRole);
  assert.deepEqual(fixtures[3].channel.editCalls[0][1], {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: false,
    SendMessagesInThreads: false,
    SendVoiceMessages: false,
    SendPolls: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false
  });
  assert.equal(fixtures[3].channel.editCalls[1][0], 'guild-id');
  assert.deepEqual(fixtures[3].channel.editCalls[1][1], {
    SendMessages: false,
    SendMessagesInThreads: false,
    SendVoiceMessages: false,
    SendPolls: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false
  });
  assert.equal(fixtures[0].channel.editCalls, undefined);
  assert.deepEqual(fixtures[1].channel.editCalls[0][1], {
    SendMessages: null,
    SendMessagesInThreads: null,
    SendVoiceMessages: null,
    SendPolls: null,
    CreatePublicThreads: null,
    CreatePrivateThreads: null
  });
  assert.deepEqual(fixtures[2].channel.editCalls[0][1], {
    SendMessages: null,
    SendMessagesInThreads: null,
    SendVoiceMessages: null,
    SendPolls: null,
    CreatePublicThreads: null,
    CreatePrivateThreads: null
  });
});

test('reports channels the bot cannot manage or whose permission updates fail', async () => {
  const fixtures = [
    createChannel('sem-permissao', { canManage: false }),
    createChannel('erro-api', { fail: true })
  ];
  const memberRole = { id: 'member-role', name: '👤 Membro' };
  const guild = {
    id: 'guild-id',
    channels: { cache: new Map(fixtures.map(({ channel }, index) => [index, channel])) },
    roles: { cache: [memberRole] }
  };
  const botMember = {
    permissionsIn: channel => ({
      has: () => fixtures.find(({ channel: candidate }) => candidate === channel).canManage
    })
  };

  const result = await lockGuildTextChannels(guild, botMember, 'moderador');

  assert.equal(result.lockedCount, 0);
  assert.deepEqual(result.failedChannels, [
    { name: 'sem-permissao', reason: 'o bot não tem Gerenciar Canais neste canal' },
    { name: 'erro-api', reason: 'API error' }
  ]);
});
