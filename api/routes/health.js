const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');

let botClient = null;
try {
  botClient = require('../../bot/index').client;
} catch {}

router.get('/', (req, res) => {
  let dbStatus = 'healthy';
  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
  } catch (err) {
    dbStatus = `unhealthy: ${err.message}`;
  }

  const memory = process.memoryUsage();
  const botModule = require('../../bot/index');
  const activeClient = botModule.getClient ? botModule.getClient() : botModule.client;
  const botWsStatus = activeClient?.ws?.status;
  const botStatus = (botWsStatus === 0) ? 'online' : (botWsStatus !== undefined ? `status_${botWsStatus}` : 'not_initialized');

  let recentEvents = [];
  try {
    const db = getDatabase();
    recentEvents = db.prepare('SELECT event_level, message, error_stack, created_at FROM system_events ORDER BY id DESC LIMIT 3').all();
  } catch {}

  return res.json({
    status: (dbStatus === 'healthy' && botStatus === 'online') ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    tokenConfigured: !!process.env.DISCORD_BOT_TOKEN,
    tokenLength: process.env.DISCORD_BOT_TOKEN ? process.env.DISCORD_BOT_TOKEN.length : 0,
    components: {
      api: 'healthy',
      database: dbStatus,
      bot: botStatus
    },
    botUser: activeClient?.user?.tag || null,
    recentEvents,
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024)
    }
  });
});

module.exports = router;
