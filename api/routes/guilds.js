const express = require('express');
const router = express.Router();

const GuildsController = require('../controllers/guildsController');
const RolesController = require('../controllers/rolesController');
const { requireAuth } = require('../middleware/auth');
const { requireGuildPermission } = require('../middleware/guildAuth');
const { PERMISSIONS } = require('../../shared/permissions');

// Todas as rotas de servidor requerem sessão autenticada
router.use(requireAuth);

// Detalhes da guilda e configurações
router.get('/:guildId', GuildsController.getGuild);
router.patch('/:guildId/settings', requireGuildPermission(PERMISSIONS.SETTINGS_MANAGE), GuildsController.updateSettings);

// Logs de auditoria da guilda
router.get('/:guildId/audit', requireGuildPermission(PERMISSIONS.AUDIT_VIEW), GuildsController.getAuditLogs);

// Regras de proteção automática
router.get('/:guildId/protection', requireGuildPermission(PERMISSIONS.PROTECTION_VIEW), GuildsController.getProtectionRules);
router.put('/:guildId/protection', requireGuildPermission(PERMISSIONS.PROTECTION_MANAGE), GuildsController.updateProtectionRule);

// Cargos e permissões da staff na guilda
router.get('/:guildId/roles', requireGuildPermission(PERMISSIONS.ROLES_VIEW), RolesController.listStaffRoles);
router.post('/:guildId/staff-roles', requireGuildPermission(PERMISSIONS.ROLES_MANAGE), RolesController.createStaffRole);
router.put('/:guildId/staff-roles/:staffRoleId/permissions', requireGuildPermission(PERMISSIONS.ROLES_MANAGE), RolesController.updateRolePermissions);
router.delete('/:guildId/staff-roles/:roleId', requireGuildPermission(PERMISSIONS.ROLES_MANAGE), RolesController.deleteStaffRole);

module.exports = router;
