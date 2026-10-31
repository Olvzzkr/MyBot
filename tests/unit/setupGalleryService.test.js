const test = require('node:test');
const assert = require('node:assert/strict');
const SetupGalleryService = require('../../bot/services/setupGalleryService');

function createDatabase(configuredChannelId) {
  const updates = [];
  return {
    updates,
    prepare(sql) {
      if (sql.includes('SELECT setup_channel_id')) {
        return { get: () => ({ setup_channel_id: configuredChannelId }) };
      }
      if (sql.includes('INSERT INTO guild_settings')) {
        return { run: (...args) => updates.push(args) };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
}

function createMessage(channelId, channelName, channels) {
  const channel = {
    id: channelId,
    name: channelName,
    isTextBased: () => true
  };
  const guildChannels = new Map(channels.map(item => [item.id, item]));
  guildChannels.set(channel.id, channel);

  return {
    guild: {
      id: 'guild-id',
      channels: { cache: guildChannels }
    },
    channel
  };
}

test('uses the configured setup gallery channel ID', () => {
  const db = createDatabase('setup-channel');
  const service = new SetupGalleryService(db);
  const message = createMessage('setup-channel', '💻-setups', []);

  assert.equal(service.isSetupChannel(message), true);
  assert.deepEqual(db.updates, []);
});

test('recovers the unique setup channel when its configured ID was deleted', () => {
  const db = createDatabase('deleted-channel');
  const service = new SetupGalleryService(db);
  const message = createMessage('new-setup-channel', '💻-setups', []);

  assert.equal(service.isSetupChannel(message), true);
  assert.deepEqual(db.updates, [['guild-id', 'new-setup-channel']]);
});

test('does not auto-select a channel if the stale configured channel still exists', () => {
  const db = createDatabase('old-channel');
  const service = new SetupGalleryService(db);
  const message = createMessage('new-setup-channel', '💻-setups', [
    { id: 'old-channel', name: 'old-setups', isTextBased: () => true }
  ]);

  assert.equal(service.isSetupChannel(message), false);
  assert.deepEqual(db.updates, []);
});

test('does not auto-select when multiple setup channels exist', () => {
  const db = createDatabase('deleted-channel');
  const service = new SetupGalleryService(db);
  const message = createMessage('new-setup-channel', '💻-setups', [
    { id: 'another-setup', name: 'more-setups', isTextBased: () => true }
  ]);

  assert.equal(service.isSetupChannel(message), false);
  assert.deepEqual(db.updates, []);
});
