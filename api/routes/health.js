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
  const botWsStatus = botClient?.ws?.status;
  const botStatus = (botWsStatus === 0) ? 'online' : (botWsStatus !== undefined ? `status_${botWsStatus}` : 'not_initialized');

  return res.json({
    status: (dbStatus === 'healthy' && botStatus === 'online') ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    components: {
      api: 'healthy',
      database: dbStatus,
      bot: botStatus
    },
    botUser: botClient?.user?.tag || null,
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024)
    }
  });
});

module.exports = router;
