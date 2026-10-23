const test = require('node:test');
const assert = require('node:assert');
const {
  isGlobalOwner,
  checkDiscordHierarchy,
  hasPermission,
  PERMISSIONS
} = require('../../shared/permissions');

test('isGlobalOwner: identifica corretamente o proprietário global', () => {
  assert.strictEqual(isGlobalOwner('123456789012345678', '123456789012345678'), true);
  assert.strictEqual(isGlobalOwner('999999999999999999', '123456789012345678'), false);
  assert.strictEqual(isGlobalOwner(null, '123456789012345678'), false);
  assert.strictEqual(isGlobalOwner('123456789012345678', undefined), false);
});

test('checkDiscordHierarchy: impede ações quando hierarquia for violada', () => {
  const mod = { id: 'mod1', highestRolePosition: 10, isGuildOwner: false };
  const targetSuperior = { id: 'user1', highestRolePosition: 15, isGuildOwner: false };
  const targetEqual = { id: 'user2', highestRolePosition: 10, isGuildOwner: false };
  const targetInferior = { id: 'user3', highestRolePosition: 5, isGuildOwner: false };
  const botSuperior = { highestRolePosition: 20 };
  const botInferior = { highestRolePosition: 8 };

  // Mod não pode punir cargo superior
  const res1 = checkDiscordHierarchy(mod, targetSuperior, botSuperior);
  assert.strictEqual(res1.allowed, false);

  // Mod não pode punir cargo igual
  const res2 = checkDiscordHierarchy(mod, targetEqual, botSuperior);
  assert.strictEqual(res2.allowed, false);

  // Mod não pode agir sobre si mesmo
  const resSelf = checkDiscordHierarchy(mod, { id: 'mod1', highestRolePosition: 10, isGuildOwner: false }, botSuperior);
  assert.strictEqual(resSelf.allowed, false);

  // Bot não pode agir se o alvo tiver cargo superior ou igual ao bot
  const targetAboveBot = { id: 'user4', highestRolePosition: 12, isGuildOwner: false };
  const resBot = checkDiscordHierarchy(mod, targetAboveBot, botInferior);
  assert.strictEqual(resBot.allowed, false);

  // Ação permitida quando moderador e bot são superiores ao alvo
  const resValid = checkDiscordHierarchy(mod, targetInferior, botSuperior);
  assert.strictEqual(resValid.allowed, true);
});

test('hasPermission: resolve permissões com precedência correta', () => {
  // Dono global
  assert.strictEqual(hasPermission(PERMISSIONS.ROLES_MANAGE, { isGlobalOwner: true }), true);

  // Dono do servidor
  assert.strictEqual(hasPermission(PERMISSIONS.MODERATION_BAN, { isGuildOwner: true }), true);

  // Sem permissão
  assert.strictEqual(hasPermission(PERMISSIONS.MODERATION_BAN, { staffPermissions: [] }), false);

  // Permissão concedida por cargo staff
  assert.strictEqual(hasPermission(PERMISSIONS.MODERATION_BAN, {
    staffPermissions: [PERMISSIONS.MODERATION_BAN]
  }), true);

  // Permissão negada explicitamente por override individual (mesmo tendo cargo staff)
  assert.strictEqual(hasPermission(PERMISSIONS.MODERATION_BAN, {
    staffPermissions: [PERMISSIONS.MODERATION_BAN],
    userOverrides: { allowed: [], denied: [PERMISSIONS.MODERATION_BAN] }
  }), false);

  // Permissão concedida explicitamente por override individual
  assert.strictEqual(hasPermission(PERMISSIONS.CHANNELS_MANAGE, {
    staffPermissions: [],
    userOverrides: { allowed: [PERMISSIONS.CHANNELS_MANAGE], denied: [] }
  }), true);
});
