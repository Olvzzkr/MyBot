const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { runMigrations } = require('../../database/migrate');
const {
  ScheduledMessagesService,
  getLocalDateTime,
  isDueNow
} = require('../../bot/services/scheduledMessagesService');

test('calculates schedule time in Brasilia, including midnight', () => {
  assert.deepEqual(getLocalDateTime(new Date('2025-01-15T09:00:00.000Z')), {
    date: '2025-01-15',
    hour: 6
  });
  assert.equal(isDueNow(new Date('2025-01-15T08:59:00.000Z'), 6), false);
  assert.equal(isDueNow(new Date('2025-01-15T09:00:00.000Z'), 6), true);
  assert.equal(isDueNow(new Date('2025-01-15T03:00:00.000Z'), 0), true);
});

test('sends every configured message once per local date', async () => {
  const db = new DatabaseSync(':memory:');
  runMigrations(db);
  db.prepare(`
    INSERT INTO message_automation_settings (guild_id, enabled, send_hour)
    VALUES ('guild-1', 1, 6)
  `).run();
  db.prepare(`
    INSERT INTO scheduled_messages (guild_id, channel_id, content, created_by)
    VALUES ('guild-1', 'channel-1', 'Primeira', 'owner'),
           ('guild-1', 'channel-2', 'Segunda', 'owner')
  `).run();

  const sent = [];
  const guild = {
    channels: {
      cache: new Map([
        ['channel-1', { isTextBased: () => true, isThread: () => false, send: async payload => sent.push(payload.content) }],
        ['channel-2', { isTextBased: () => true, isThread: () => false, send: async payload => sent.push(payload.content) }]
      ]),
      fetch: async () => null
    }
  };
  const service = new ScheduledMessagesService({ guilds: { cache: new Map([['guild-1', guild]]) } }, db);
  const now = new Date('2025-01-15T09:01:00.000Z');

  await service.runDueMessages(now);
  await service.runDueMessages(now);

  assert.deepEqual(sent, ['Primeira', 'Segunda']);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM scheduled_message_deliveries WHERE status = 'SENT'").get().count, 2);
  db.close();
});
