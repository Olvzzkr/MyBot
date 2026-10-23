/**
 * Middleware de Validação de Guilda e Permissões Administrativas
 */

const { getDatabase } = require('../../database/connection');
const GuildsRepository = require('../../database/repositories/guildsRepository');
const PermissionsRepository = require('../../database/repositories/permissionsRepository');
const { hasPermission } = require('../../shared/permissions');

function requireGuildPermission(permissionKey) {
  return (req, res, next) => {
    const { guildId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    // Proprietário global tem acesso a qualquer servidor
    if (user.isGlobalOwner) {
      return next();
    }

    const db = getDatabase();
    const guildsRepo = new GuildsRepository(db);

    // Servidor precisa estar autorizado
    if (!guildsRepo.isGuildAuthorized(guildId)) {
      return res.status(403).json({ error: 'Este servidor não está autorizado a utilizar o bot.' });
    }

    const permsRepo = new PermissionsRepository(db);

    // Em produção com o bot ativo, podemos consultar os cargos do membro no cache da guilda
    // Como middleware flexível, consultamos os overrides do usuário e permissões concedidas
    const overrides = permsRepo.getUserOverrides(guildId, user.id);
    const effective = permsRepo.getUserEffectivePermissions(guildId, user.id, []);

    const allowed = hasPermission(permissionKey, {
      isGlobalOwner: false,
      isGuildOwner: false, // Pode ser inferido via Discord API ou cache
      isDiscordAdmin: false,
      staffPermissions: effective.staffPermissions,
      userOverrides: overrides
    });

    if (!allowed) {
      return res.status(403).json({
        error: `Permissão insuficiente. Requer: "${permissionKey}".`,
        requiredPermission: permissionKey
      });
    }

    next();
  };
}

module.exports = {
  requireGuildPermission
};
