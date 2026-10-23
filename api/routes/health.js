const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../database/connection');

router.get('/', (req, res) => {
  let dbStatus = 'healthy';
  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
  } catch (err) {
    dbStatus = `unhealthy: ${err.message}`;
  }

  const memory = process.memoryUsage();

  return res.json({
    status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    components: {
      api: 'healthy',
      database: dbStatus
    },
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024)
    }
  });
});

module.exports = router;
