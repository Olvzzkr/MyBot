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

// 3. Carregar Comandos
const commandLoader = new CommandLoader();
const loadStats = commandLoader.loadAll(path.join(__dirname, 'commands'));
console.log(`[Bot] Carregados ${loadStats.commandCount} comandos com ${loadStats.aliasCount} aliases.`);

// 4. Instanciar Roteador de Interações
const interactionRouter = new InteractionRouter(db, authService);

// 6. Registrar Eventos
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

  cli.once(readyEvent.name, (...args) => readyEvent.execute(...args, {
    db,
    guildsRepo,
    commandLoader,
    storeAutomationService
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

// 7. Conexão ao Discord com Fallback Inteligente
const token = process.env.DISCORD_BOT_TOKEN;
if (!token || token === 'seu_token_do_bot_aqui') {
  console.log('[Bot] ⚠️ DISCORD_BOT_TOKEN não configurado no .env.');
} else {
  client.login(token).catch(async (err) => {
    if (err.message && err.message.includes('disallowed intents')) {
      console.warn('[Bot] ⚠️ Intents privilegiados desativados no portal. Conectando com intents padrão para manter o bot ONLINE...');
      try {
        client.destroy();
      } catch {}
      client = createClient(false);
      await client.login(token);
      console.log(`[Bot] ✅ ONLINE com intents padrão! (Para comandos de texto funcionarem, ative Message Content Intent no portal).`);
    } else {
      console.error('[Bot] Falha ao autenticar no Discord:', err.message);
    }
  });
}

module.exports = {
  client,
  getClient: () => client,
  commandLoader,
  authService
};
