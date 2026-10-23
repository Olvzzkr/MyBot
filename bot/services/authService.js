/**
 * Serviço Unificado de Autorização e Hierarquia
 * Compartilhado entre Bot do Discord e API Backend
 */

const { isGlobalOwner, checkDiscordHierarchy, hasPermission } = require('../../shared/permissions');
const GuildsRepository = require('../../database/repositories/guildsRepository');
const PermissionsRepository = require('../../database/repositories/permissionsRepository');

class AuthService {
  constructor(db) {
    this.guildsRepo = new GuildsRepository(db);
    this.permsRepo = new PermissionsRepository(db);
    this.globalOwnerId = process.env.GLOBAL_OWNER_ID || '';
  }

  /**
   * Verifica se o servidor tem permissão para utilizar as funcionalidades do bot
   * @param {string} guildId
   * @returns {boolean}
   */
  isGuildAuthorized(guildId) {
    return this.guildsRepo.isGuildAuthorized(guildId);
  }

  /**
   * Verifica se o usuário é o proprietário global
   * @param {string} userId
   * @returns {boolean}
   */
  isGlobalOwner(userId) {
    return isGlobalOwner(userId, this.globalOwnerId);
  }

  /**
   * Valida permissão granular de um membro em um servidor
   * @param {string} guildId
   * @param {string} userId
   * @param {string[]} roleIds - IDs dos cargos do usuário no Discord
   * @param {boolean} isGuildOwner - Se o usuário é o dono do servidor
   * @param {boolean} isDiscordAdmin - Se o usuário tem permissão de Administrador nativo
   * @param {string} requiredPermission - Permissão a ser validada
   * @returns {boolean}
   */
  canExecute(guildId, userId, roleIds, isGuildOwner, isDiscordAdmin, requiredPermission) {
    // 1. Dono Global tem acesso absoluto
    if (this.isGlobalOwner(userId)) return true;

    // 2. Servidor precisa estar autorizado
    if (!this.isGuildAuthorized(guildId)) return false;

    // 3. Dono do Servidor tem acesso total no seu servidor
    if (isGuildOwner) return true;

    // 4. Buscar permissões e overrides do usuário
    const effective = this.permsRepo.getUserEffectivePermissions(guildId, userId, roleIds);

    return hasPermission(requiredPermission, {
      isGlobalOwner: false,
      isGuildOwner,
      isDiscordAdmin,
      staffPermissions: effective.staffPermissions,
      userOverrides: effective.userOverrides
    });
  }

  /**
   * Avalia conformidade com a hierarquia de cargos do Discord
   * @param {object} actor - { id, highestRolePosition, isGuildOwner }
   * @param {object} target - { id, highestRolePosition, isGuildOwner }
   * @param {object} botMember - { highestRolePosition }
   * @returns {{ allowed: boolean, reason?: string }}
   */
  evaluateHierarchy(actor, target, botMember) {
    return checkDiscordHierarchy(actor, target, botMember);
  }
}

module.exports = AuthService;
