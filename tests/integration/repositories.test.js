const test = require('node:test');
const assert = require('node:assert');
const { getDatabase } = require('../../database/connection');
const { runMigrations } = require('../../database/migrate');

const GuildsRepository = require('../../database/repositories/guildsRepository');
const PermissionsRepository = require('../../database/repositories/permissionsRepository');
const ModerationRepository = require('../../database/repositories/moderationRepository');
const AuditRepository = require('../../database/repositories/auditRepository');
const ConfirmationsRepository = require('../../database/repositories/confirmationsRepository');

test('Repositórios: fluxo integrado de persistência e regras de negócio', () => {
  const db = getDatabase(':memory:');
  runMigrations(db);

  const guildsRepo = new GuildsRepository(db);
  const permsRepo = new PermissionsRepository(db);
  const modRepo = new ModerationRepository(db);
  const auditRepo = new AuditRepository(db);
  const confRepo = new ConfirmationsRepository(db);

  const guildId = '111222333444555666';
  const ownerId = '999888777666555444';
  const modId = '555444333222111000';
  const targetId = '123123123123123123';

  // 1. Autorização de Guilda
  assert.strictEqual(guildsRepo.isGuildAuthorized(guildId), false);
  guildsRepo.authorizeGuild(guildId, ownerId, 'Servidor oficial');
  assert.strictEqual(guildsRepo.isGuildAuthorized(guildId), true);

  // Configuração e prefixo da guilda
  assert.strictEqual(guildsRepo.getGuildSettings(guildId).prefix, '?');
  guildsRepo.updateGuildPrefix(guildId, '!');
  assert.strictEqual(guildsRepo.getGuildSettings(guildId).prefix, '!');

  // 2. Cargos da Staff e Permissões
  const roleId = '777888999000111222';
  const staffRoleId = permsRepo.addStaffRole(guildId, roleId, 'Moderador Chefe', 10, ['moderation.ban', 'moderation.warn']);
  assert.ok(staffRoleId > 0);

  const staffRoles = permsRepo.getStaffRoles(guildId);
  assert.strictEqual(staffRoles.length, 1);
  assert.strictEqual(staffRoles[0].role_name, 'Moderador Chefe');
  assert.strictEqual(staffRoles[0].permissions.includes('moderation.ban'), true);

  // Overrides de usuário
  permsRepo.setUserOverride(guildId, targetId, 'channels.manage', true, modId);
  const overrides = permsRepo.getUserOverrides(guildId, targetId);
  assert.strictEqual(overrides.allowed.includes('channels.manage'), true);

  // Permissões efetivas
  const effective = permsRepo.getUserEffectivePermissions(guildId, modId, [roleId]);
  assert.strictEqual(effective.staffPermissions.includes('moderation.ban'), true);

  // 3. Moderação: Casos sequenciais e Advertências
  const case1 = modRepo.createCase({
    guildId,
    action: 'WARN',
    targetId,
    targetTag: 'usuario#0001',
    moderatorId: modId,
    moderatorTag: 'mod#0001',
    reason: 'Comportamento inadequado'
  });
  assert.strictEqual(case1.caseNumber, 1);

  const case2 = modRepo.createCase({
    guildId,
    action: 'TIMEOUT',
    targetId,
    targetTag: 'usuario#0001',
    moderatorId: modId,
    moderatorTag: 'mod#0001',
    reason: 'Spam no canal geral',
    durationSeconds: 300
  });
  assert.strictEqual(case2.caseNumber, 2);

  // Advertências
  modRepo.addWarning(guildId, targetId, modId, 'Aviso 1', 1, case1.id);
  modRepo.addWarning(guildId, targetId, modId, 'Aviso 2', 2);
  const activeWarnings = modRepo.getActiveWarnings(guildId, targetId);
  assert.strictEqual(activeWarnings.length, 2);
  assert.strictEqual(modRepo.getTotalWarningPoints(guildId, targetId), 3);

  // 4. Auditoria e Retenção
  const auditId = auditRepo.logAudit({
    guildId,
    actorId: modId,
    actionType: 'MODERATION_ACTION',
    targetId,
    reason: 'Aplicação de aviso',
    result: 'SUCCESS',
    metadata: { caseNumber: 1 }
  });
  assert.ok(auditId > 0);

  const logs = auditRepo.listAuditLogs(guildId);
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].metadata.caseNumber, 1);

  // Purga de logs mais antigos que 90 dias (o registro acabou de ser criado, não deve ser deletado)
  const purged = auditRepo.purgeOldLogs(90);
  assert.strictEqual(purged, 0);

  // 5. Dupla Confirmação (Two-Step Confirmations)
  const conf = confRepo.createConfirmation({
    guildId,
    userId: modId,
    actionType: 'BAN_PURGE',
    targetId,
    payload: { days: 7 },
    timeoutSeconds: 60
  });
  assert.ok(conf.token);

  // Validação correta
  const validCheck = confRepo.getAndValidateConfirmation(conf.token, guildId, modId, 'BAN_PURGE');
  assert.strictEqual(validCheck.valid, true);
  assert.strictEqual(validCheck.confirmation.payload.days, 7);

  // Consumir confirmação
  confRepo.consumeConfirmation(conf.token);

  // Tentativa de reuso (deve falhar)
  const reuseCheck = confRepo.getAndValidateConfirmation(conf.token, guildId, modId, 'BAN_PURGE');
  assert.strictEqual(reuseCheck.valid, false);
  assert.match(reuseCheck.error, /já foi utilizada/);

  // Tentativa com usuário diferente (deve falhar)
  const conf2 = confRepo.createConfirmation({
    guildId,
    userId: modId,
    actionType: 'BAN_PURGE',
    targetId,
    timeoutSeconds: 60
  });
  const wrongUserCheck = confRepo.getAndValidateConfirmation(conf2.token, guildId, 'outroUsuario', 'BAN_PURGE');
  assert.strictEqual(wrongUserCheck.valid, false);

  db.close();
});
