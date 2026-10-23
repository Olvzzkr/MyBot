const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { getDatabase } = require('../../database/connection');
const { runMigrations } = require('../../database/migrate');
const GuildsRepository = require('../../database/repositories/guildsRepository');
const PermissionsRepository = require('../../database/repositories/permissionsRepository');
const AuditRepository = require('../../database/repositories/auditRepository');
const AuthService = require('../../bot/services/authService');
const CommandLoader = require('../../bot/commands/loader');
const messageCreateEvent = require('../../bot/events/messageCreate');

test('Bot: fluxo de despacho de mensagem, autorização de guilda e permissões', async () => {
  const db = getDatabase(':memory:');
  runMigrations(db);

  const guildsRepo = new GuildsRepository(db);
  const permsRepo = new PermissionsRepository(db);
  const auditRepo = new AuditRepository(db);
  const authService = new AuthService(db);

  const commandLoader = new CommandLoader();
  commandLoader.loadAll(path.join(__dirname, '../../bot/commands'));

  const guildId = '987654321098765432';
  const ownerId = '111111111111111111';
  const normalUserId = '222222222222222222';

  // 1. Servidor NÃO autorizado tentando executar comando administrativo
  let replyContent = '';
  const mockMessage1 = {
    content: '?cargo listar',
    author: { bot: false, id: normalUserId, tag: 'user#0001' },
    guild: { id: guildId, ownerId },
    member: {
      id: normalUserId,
      roles: { cache: new Map() },
      permissions: { has: () => false }
    },
    reply: (msg) => {
      replyContent = typeof msg === 'string' ? msg : (msg.content || '');
      return Promise.resolve();
    }
  };

  await messageCreateEvent.execute(mockMessage1, {
    db,
    guildsRepo,
    permsRepo,
    auditRepo,
    authService,
    commandLoader
  });

  assert.match(replyContent, /Servidor não autorizado/);

  // 2. Servidor é AUTORIZADO pelo proprietário global
  guildsRepo.authorizeGuild(guildId, ownerId, 'Autorizado para testes');

  // 3. Usuário sem permissão tenta executar comando restrito (?cargo criar)
  replyContent = '';
  const mockMessage2 = {
    content: '?cargo criar CargoTeste',
    author: { bot: false, id: normalUserId, tag: 'user#0001' },
    guild: { id: guildId, ownerId },
    member: {
      id: normalUserId,
      roles: { cache: new Map() },
      permissions: { has: () => false }
    },
    reply: (msg) => {
      replyContent = typeof msg === 'string' ? msg : (msg.content || '');
      return Promise.resolve();
    }
  };

  await messageCreateEvent.execute(mockMessage2, {
    db,
    guildsRepo,
    permsRepo,
    auditRepo,
    authService,
    commandLoader
  });

  assert.match(replyContent, /Acesso Negado/);

  // 4. Alteração de prefixo para "!" e verificação de reconhecimento
  guildsRepo.updateGuildPrefix(guildId, '!');
  replyContent = '';

  // Mensagem com prefixo antigo "?" não deve disparar o bot
  const mockMessageOldPrefix = {
    content: '?cargo listar',
    author: { bot: false, id: normalUserId, tag: 'user#0001' },
    guild: { id: guildId, ownerId },
    member: {
      id: normalUserId,
      roles: { cache: new Map() },
      permissions: { has: () => false }
    },
    reply: (msg) => {
      replyContent = typeof msg === 'string' ? msg : (msg.content || '');
      return Promise.resolve();
    }
  };

  await messageCreateEvent.execute(mockMessageOldPrefix, {
    db,
    guildsRepo,
    permsRepo,
    auditRepo,
    authService,
    commandLoader
  });

  assert.strictEqual(replyContent, ''); // Não respondeu pois o prefixo agora é "!"

  db.close();
});
