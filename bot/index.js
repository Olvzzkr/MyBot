
/**
 * Ponto de entrada do Bot Discord
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const path = require('node:path');

const { getDatabase } = require('../database/connection');
const { runMigrations } = require('../database/migrate');
const GuildsRepository = require('../database/repositories/guildsRepository');
const PermissionsRepository = require('../database/repositories/permissionsRepository');
const AuditRepository = require('../database/repositories/auditRepository');
const AuthService = require('./services/authService');
const CommandLoader = require('./commands/loader');
const InteractionRouter = require('./interactions/router');

// 1. Inicializar e migrar banco de dados
const db = getDatabase();
runMigrations(db);

// 2. Instanciar Repositórios e Serviços
const guildsRepo = new GuildsRepository(db);
const permsRepo = new PermissionsRepository(db);
const auditRepo = new AuditRepository(db);
const authService = new AuthService(db);
const ProtectionService = require('./services/protectionService');
const protectionService = new ProtectionService(db);
const SetupGalleryService = require('./services/setupGalleryService');
const setupGalleryService = new SetupGalleryService(db);
const StoreAutomationService = require('./services/storeAutomationService');
const { ScheduledMessagesService } = require('./services/scheduledMessagesService');

// 3. Carregar Comandos
const commandLoader = new CommandLoader();
const loadStats = commandLoader.loadAll(path.join(__dirname, 'commands'));
console.log(`[Bot] Carregados ${loadStats.commandCount} comandos com ${loadStats.aliasCount} aliases.`);

// 4. Instanciar Roteador de Interações
const interactionRouter = new InteractionRouter(db, authService);

// 5. Registrar Eventos
const readyEvent = require('./events/ready');
const messageCreateEvent = require('./events/messageCreate');
const interactionCreateEvent = require('./events/interactionCreate');
const guildMemberAddEvent = require('./events/guildMemberAdd');
const guildMemberRemoveEvent = require('./events/guildMemberRemove');

function createClient(privileged = true) {
  const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages
  ];

  if (privileged) {
    intents.push(GatewayIntentBits.GuildMembers);
    intents.push(GatewayIntentBits.MessageContent);
  }

  const cli = new Client({
    intents,
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
  });

  const storeAutomationService = new StoreAutomationService(cli, db);
  const scheduledMessagesService = new ScheduledMessagesService(cli, db);

  cli.once(readyEvent.name, (...args) => readyEvent.execute(...args, {
    db,
    guildsRepo,
    commandLoader,
    storeAutomationService,
    scheduledMessagesService
  }));

  cli.on(messageCreateEvent.name, (message) => messageCreateEvent.execute(message, {
    db,
    guildsRepo,
    permsRepo,
    auditRepo,
    authService,
    commandLoader,
    protectionService,
    setupGalleryService
  }));

  cli.on(interactionCreateEvent.name, (interaction) => interactionCreateEvent.execute(interaction, {
    interactionRouter
  }));

  cli.on(guildMemberAddEvent.name, (member) => guildMemberAddEvent.execute(member, { db }));
  cli.on(guildMemberRemoveEvent.name, (member) => guildMemberRemoveEvent.execute(member, { db }));

  return cli;
}

let client = createClient(true);

// 6. Tratamento de Falhas e Resiliência
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Bot Resiliência] Rejeição não tratada:', reason);

  try {
    db.prepare(`
      INSERT INTO system_events (component, event_level, message, error_stack)
      VALUES ('BOT', 'CRITICAL', 'Unhandled Promise Rejection', ?)
    `).run(String(reason));
  } catch {}
});

process.on('uncaughtException', (err) => {
  console.error('[Bot Resiliência] Exceção não tratada:', err);

  try {
    db.prepare(`
      INSERT INTO system_events (component, event_level, message, error_stack)
      VALUES ('BOT', 'CRITICAL', ?, ?)
    `).run(err.message, err.stack);
  } catch {}
});

// 7. Conexão ao Discord com diagnóstico e fallback
const token = process.env.DISCORD_BOT_TOKEN;

if (!token || token === 'seu_token_do_bot_aqui') {
  console.error('[Bot] ❌ DISCORD_BOT_TOKEN não configurado.');
} else {
  console.log('[Bot] 🔄 Iniciando autenticação com o Discord...');

  client.on('error', (err) => {
    console.error('[Bot] Erro no cliente Discord:', err);
  });

  client.on('shardError', (err) => {
    console.error('[Bot] Erro no Gateway:', err);
  });

  client.on('shardDisconnect', (event, shardId) => {
    console.error(`[Bot] Gateway desconectado. Shard: ${shardId}. Código: ${event.code}`);
  });

  client.on('shardReconnecting', (shardId) => {
    console.warn(`[Bot] Reconectando ao Discord. Shard: ${shardId}`);
  });

  client.login(token)
    .then(() => {
      console.log('[Bot] ✅ Autenticação iniciada com sucesso.');
    })
    .catch(async (err) => {
      console.error('[Bot] ❌ Falha ao autenticar:', err);

      if (err.message?.includes('disallowed intents')) {
        console.warn('[Bot] Tentando conexão com intents padrão...');

        try {
          client.destroy();
        } catch {}

        client = createClient(false);

        client.on('error', (fallbackError) => {
          console.error('[Bot] Erro no cliente Discord (fallback):', fallbackError);
        });

        try {
          await client.login(token);
          console.log('[Bot] ✅ Autenticação iniciada com intents padrão.');
        } catch (fallbackError) {
          console.error('[Bot] ❌ Falha no fallback:', fallbackError);
        }
      }
    });
}

module.exports = {
  client,
  getClient: () => client,
  commandLoader,
  authService
};
                      
