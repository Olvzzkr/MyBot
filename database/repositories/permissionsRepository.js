/**
 * Repositório para Gestão de Cargos da Staff e Permissões Granulares
 */

const { getDatabase } = require('../connection');

class PermissionsRepository {
  constructor(db) {
    this.db = db || getDatabase();
  }

  getStaffRoles(guildId) {
    const roles = this.db.prepare(`
      SELECT id, guild_id, role_id, role_name, priority, created_at
      FROM staff_roles
      WHERE guild_id = ?
      ORDER BY priority DESC, id ASC
    `).all(String(guildId));

    const result = [];
    for (const r of roles) {
      const perms = this.db.prepare(`
        SELECT permission_key FROM staff_permissions WHERE staff_role_id = ?
      `).all(r.id).map(p => p.permission_key);

      result.push({
        ...r,
        permissions: perms
      });
    }
    return result;
  }

  addStaffRole(guildId, roleId, roleName, priority = 0, permissions = []) {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const info = this.db.prepare(`
        INSERT INTO staff_roles (guild_id, role_id, role_name, priority)
        VALUES (?, ?, ?, ?)
      `).run(String(guildId), String(roleId), String(roleName), Number(priority));

      const staffRoleId = Number(info.lastInsertRowid);

      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO staff_permissions (staff_role_id, permission_key)
        VALUES (?, ?)
      `);

      for (const perm of permissions) {
        stmt.run(staffRoleId, String(perm).trim());
      }

      this.db.exec('COMMIT;');
      return staffRoleId;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  removeStaffRole(guildId, roleId) {
    const row = this.db.prepare(
      'SELECT id FROM staff_roles WHERE guild_id = ? AND role_id = ?'
    ).get(String(guildId), String(roleId));

    if (!row) return false;

    this.db.prepare('DELETE FROM staff_roles WHERE id = ?').run(row.id);
    return true;
  }

  setStaffRolePermissions(staffRoleId, permissions = []) {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.prepare('DELETE FROM staff_permissions WHERE staff_role_id = ?').run(Number(staffRoleId));
      const stmt = this.db.prepare(`
        INSERT INTO staff_permissions (staff_role_id, permission_key)
        VALUES (?, ?)
      `);
      for (const perm of permissions) {
        stmt.run(Number(staffRoleId), String(perm).trim());
      }
      this.db.exec('COMMIT;');
      return true;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  getUserOverrides(guildId, userId) {
    const rows = this.db.prepare(`
      SELECT permission_key, is_allowed, granted_by, created_at
      FROM user_overrides
      WHERE guild_id = ? AND user_id = ?
    `).all(String(guildId), String(userId));

    const allowed = [];
    const denied = [];

    for (const r of rows) {
      if (r.is_allowed === 1) {
        allowed.push(r.permission_key);
      } else {
        denied.push(r.permission_key);
      }
    }

    return { allowed, denied };
  }

  setUserOverride(guildId, userId, permissionKey, isAllowed, grantedBy) {
    this.db.prepare(`
      INSERT INTO user_overrides (guild_id, user_id, permission_key, is_allowed, granted_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id, permission_key) DO UPDATE SET
        is_allowed = excluded.is_allowed,
        granted_by = excluded.granted_by,
        created_at = datetime('now', 'utc')
    `).run(String(guildId), String(userId), String(permissionKey), isAllowed ? 1 : 0, String(grantedBy));
    return true;
  }

  removeUserOverride(guildId, userId, permissionKey) {
    this.db.prepare(`
      DELETE FROM user_overrides
      WHERE guild_id = ? AND user_id = ? AND permission_key = ?
    `).run(String(guildId), String(userId), String(permissionKey));
    return true;
  }

  getUserEffectivePermissions(guildId, userId, memberRoleIds = []) {
    const stringRoleIds = (memberRoleIds || []).map(String);
    let staffPerms = [];

    if (stringRoleIds.length > 0) {
      const placeholders = stringRoleIds.map(() => '?').join(',');
      const rows = this.db.prepare(`
        SELECT DISTINCT sp.permission_key
        FROM staff_permissions sp
        JOIN staff_roles sr ON sr.id = sp.staff_role_id
        WHERE sr.guild_id = ? AND sr.role_id IN (${placeholders})
      `).all(String(guildId), ...stringRoleIds);
      staffPerms = rows.map(r => r.permission_key);
    }

    const overrides = this.getUserOverrides(guildId, userId);

    return {
      staffPermissions: staffPerms,
      userOverrides: overrides
    };
  }
}

module.exports = PermissionsRepository;
