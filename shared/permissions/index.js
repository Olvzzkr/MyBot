/**
 * Sistema de Permissões Granulares e Verificação de Hierarquia
 */

const PERMISSIONS = {
  // Cargos
  ROLES_VIEW: 'roles.view',
  ROLES_ASSIGN: 'roles.assign',
  ROLES_MANAGE: 'roles.manage',

  // Moderação
  MODERATION_WARN: 'moderation.warn',
  MODERATION_TIMEOUT: 'moderation.timeout',
  MODERATION_KICK: 'moderation.kick',
  MODERATION_BAN: 'moderation.ban',
  MODERATION_PURGE: 'moderation.purge',

  // Proteção
  PROTECTION_VIEW: 'protection.view',
  PROTECTION_MANAGE: 'protection.manage',
  PROTECTION_QUARANTINE: 'protection.quarantine',

  // Tickets
  TICKETS_VIEW: 'tickets.view',
  TICKETS_ASSIGN: 'tickets.assign',
  TICKETS_CLOSE: 'tickets.close',
  TICKETS_TRANSCRIPT: 'tickets.transcript',

  // Auditoria
  AUDIT_VIEW: 'audit.view',
  AUDIT_EXPORT: 'audit.export',

  // Configurações & Canais
  SETTINGS_MANAGE: 'settings.manage',
  CHANNELS_MANAGE: 'channels.manage',
  WELCOME_MANAGE: 'welcome.manage'
};

const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.ROLES_VIEW]: 'Visualizar cargos e membros atribuídos',
  [PERMISSIONS.ROLES_ASSIGN]: 'Adicionar ou remover cargos permitidos de membros',
  [PERMISSIONS.ROLES_MANAGE]: 'Criar, editar e excluir cargos no servidor',
  [PERMISSIONS.MODERATION_WARN]: 'Aplicar e consultar advertências a membros',
  [PERMISSIONS.MODERATION_TIMEOUT]: 'Aplicar e remover silenciamento temporário (timeout)',
  [PERMISSIONS.MODERATION_KICK]: 'Expulsar membros do servidor',
  [PERMISSIONS.MODERATION_BAN]: 'Banir e desbanir usuários do servidor',
  [PERMISSIONS.MODERATION_PURGE]: 'Excluir mensagens em lote nos canais',
  [PERMISSIONS.PROTECTION_VIEW]: 'Consultar regras de proteção e logs de segurança',
  [PERMISSIONS.PROTECTION_MANAGE]: 'Configurar limites e regras de proteção automática',
  [PERMISSIONS.PROTECTION_QUARANTINE]: 'Colocar ou retirar membros de quarentena',
  [PERMISSIONS.TICKETS_VIEW]: 'Visualizar tickets de suporte ativos e histórico',
  [PERMISSIONS.TICKETS_ASSIGN]: 'Atribuir atendentes a tickets de suporte',
  [PERMISSIONS.TICKETS_CLOSE]: 'Fechar e reabrir tickets de suporte',
  [PERMISSIONS.TICKETS_TRANSCRIPT]: 'Gerar e baixar transcrições de tickets',
  [PERMISSIONS.AUDIT_VIEW]: 'Visualizar histórico de auditoria e ações administrativas',
  [PERMISSIONS.AUDIT_EXPORT]: 'Exportar relatórios de auditoria',
  [PERMISSIONS.SETTINGS_MANAGE]: 'Alterar configurações gerais e prefixo do bot',
  [PERMISSIONS.CHANNELS_MANAGE]: 'Criar, editar e excluir canais e modelos',
  [PERMISSIONS.WELCOME_MANAGE]: 'Configurar mensagens de boas-vindas e autorroles'
};

/**
 * Validador se um usuário é o Proprietário Global do Bot
 * @param {string} userId - ID Discord do usuário
 * @param {string} configuredGlobalOwnerId - ID configurado via variável de ambiente
 * @returns {boolean}
 */
function isGlobalOwner(userId, configuredGlobalOwnerId) {
  if (!userId || !configuredGlobalOwnerId) return false;
  return String(userId).trim() === String(configuredGlobalOwnerId).trim();
}

/**
 * Avalia se o ator pode agir sobre um alvo com base na hierarquia de cargos do Discord
 * @param {object} actor - Objeto com { id, highestRolePosition, isGuildOwner, isGlobalOwner }
 * @param {object} target - Objeto com { id, highestRolePosition, isGuildOwner }
 * @param {object} botMember - Objeto com { highestRolePosition }
 * @returns {{ allowed: boolean, reason?: string }}
 */
function checkDiscordHierarchy(actor, target, botMember) {
  // Dono do servidor sempre tem prioridade máxima
  if (actor.isGuildOwner) {
    if (botMember && target.highestRolePosition >= botMember.highestRolePosition) {
      return {
        allowed: false,
        reason: 'O cargo do alvo é superior ou igual ao cargo do bot na hierarquia do servidor.'
      };
    }
    return { allowed: true };
  }

  // Não pode agir sobre si mesmo em ações punitivas
  if (actor.id === target.id) {
    return {
      allowed: false,
      reason: 'Você não pode executar esta ação punitiva ou de cargo sobre si mesmo.'
    };
  }

  // Não pode agir sobre o dono do servidor
  if (target.isGuildOwner) {
    return {
      allowed: false,
      reason: 'Não é possível executar ações administrativas sobre o proprietário do servidor.'
    };
  }

  // O cargo do ator deve ser superior ao do alvo
  if (actor.highestRolePosition <= target.highestRolePosition) {
    return {
      allowed: false,
      reason: 'O seu cargo é inferior ou igual ao cargo do alvo na hierarquia.'
    };
  }

  // O cargo do bot deve ser superior ao do alvo
  if (botMember && botMember.highestRolePosition <= target.highestRolePosition) {
    return {
      allowed: false,
      reason: 'O cargo do bot é inferior ou igual ao cargo do alvo na hierarquia.'
    };
  }

  return { allowed: true };
}

/**
 * Avalia permissão granular combinando permissões de cargos e overrides individuais
 * @param {string} permissionKey - Permissão requerida
 * @param {object} context - { isGlobalOwner, isGuildOwner, isDiscordAdmin, staffPermissions: string[], userOverrides: { allowed: string[], denied: string[] } }
 * @returns {boolean}
 */
function hasPermission(permissionKey, context = {}) {
  // Dono global tem acesso total
  if (context.isGlobalOwner) return true;

  // Dono da guilda tem acesso total no seu servidor
  if (context.isGuildOwner) return true;

  // Administrador do Discord tem acesso amplo como fallback
  if (context.isDiscordAdmin) return true;

  const overrides = context.userOverrides || { allowed: [], denied: [] };

  // Negação explícita individual tem precedência absoluta
  if (Array.isArray(overrides.denied) && overrides.denied.includes(permissionKey)) {
    return false;
  }

  // Permissão explícita individual
  if (Array.isArray(overrides.allowed) && overrides.allowed.includes(permissionKey)) {
    return true;
  }

  // Permissão concedida via cargos da staff
  const staffPermissions = Array.isArray(context.staffPermissions) ? context.staffPermissions : [];
  if (staffPermissions.includes(permissionKey) || staffPermissions.includes('*')) {
    return true;
  }

  return false;
}

module.exports = {
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  isGlobalOwner,
  checkDiscordHierarchy,
  hasPermission
};
