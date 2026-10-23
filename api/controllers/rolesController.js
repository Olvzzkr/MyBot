/**
 * Controller para Gestão de Cargos da Staff via API
 */

const { getDatabase } = require('../../database/connection');
const PermissionsRepository = require('../../database/repositories/permissionsRepository');
const AuditRepository = require('../../database/repositories/auditRepository');
const { isValidSnowflake } = require('../../shared/validation');

class RolesController {
  static listStaffRoles(req, res) {
    const { guildId } = req.params;
    const db = getDatabase();
    const permsRepo = new PermissionsRepository(db);
    const roles = permsRepo.getStaffRoles(guildId);
    return res.json({ staffRoles: roles });
  }

  static createStaffRole(req, res) {
    const { guildId } = req.params;
    const { roleId, roleName, priority, permissions } = req.body;

    if (!roleId || !isValidSnowflake(roleId)) {
      return res.status(400).json({ error: 'ID do cargo do Discord inválido.' });
    }

    if (!roleName || typeof roleName !== 'string') {
      return res.status(400).json({ error: 'Nome do cargo é obrigatório.' });
    }

    const db = getDatabase();
    const permsRepo = new PermissionsRepository(db);
    const auditRepo = new AuditRepository(db);

    try {
      const id = permsRepo.addStaffRole(
        guildId,
        roleId,
        roleName.trim(),
        Number(priority) || 0,
        Array.isArray(permissions) ? permissions : []
      );

      auditRepo.logAudit({
        guildId,
        actorId: req.user.id,
        actionType: 'ROLE_CREATE',
        targetId: roleId,
        reason: 'Cargo de staff configurado pelo painel web',
        result: 'SUCCESS'
      });

      return res.status(201).json({
        success: true,
        message: 'Cargo da equipe configurado com sucesso.',
        staffRoleId: id
      });
    } catch (err) {
      return res.status(400).json({ error: `Erro ao adicionar cargo da equipe: ${err.message}` });
    }
  }

  static updateRolePermissions(req, res) {
    const { guildId, staffRoleId } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Lista de permissões deve ser um array.' });
    }

    const db = getDatabase();
    const permsRepo = new PermissionsRepository(db);
    const auditRepo = new AuditRepository(db);

    try {
      permsRepo.setStaffRolePermissions(staffRoleId, permissions);

      auditRepo.logAudit({
        guildId,
        actorId: req.user.id,
        actionType: 'ROLE_UPDATE',
        targetId: String(staffRoleId),
        reason: 'Permissões do cargo de staff atualizadas pelo painel',
        result: 'SUCCESS',
        metadata: { permissions }
      });

      return res.json({ success: true, message: 'Permissões atualizadas com sucesso.' });
    } catch (err) {
      return res.status(500).json({ error: `Erro ao atualizar permissões: ${err.message}` });
    }
  }

  static deleteStaffRole(req, res) {
    const { guildId, roleId } = req.params;
    const db = getDatabase();
    const permsRepo = new PermissionsRepository(db);
    const auditRepo = new AuditRepository(db);

    const removed = permsRepo.removeStaffRole(guildId, roleId);
    if (!removed) {
      return res.status(404).json({ error: 'Cargo de staff não encontrado para remoção.' });
    }

    auditRepo.logAudit({
      guildId,
      actorId: req.user.id,
      actionType: 'ROLE_DELETE',
      targetId: roleId,
      reason: 'Cargo de staff removido pelo painel web',
      result: 'SUCCESS'
    });

    return res.json({ success: true, message: 'Cargo de staff removido com sucesso.' });
  }
}

module.exports = RolesController;
