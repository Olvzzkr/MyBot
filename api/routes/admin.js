const express = require('express');
const router = express.Router();

const AdminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/authorized-guilds', AdminController.listAuthorizedGuilds);
router.post('/authorized-guilds', AdminController.authorizeGuild);
router.delete('/authorized-guilds/:guildId', AdminController.revokeGuild);
router.get('/system-events', AdminController.getSystemEvents);
router.get('/backups', AdminController.listBackups);

module.exports = router;
