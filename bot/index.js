
/**
 * Ponto de entrada do Bot Discord
 */

require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const path = require('node:path');
const https = require('node:https');

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

// 2. Instanciar repositórios e serviços
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

// 3. Carregar comandos
const commandLoader = new CommandLoader();

const loadStats = commandLoader.loadAll(
  path.join(__dirname, 'commands')
);

console.log(
  `[Bot] Carregados ${loadStats.commandCount} comandos com ${loadStats.aliasCount} aliases.`
);

// 4. Instanciar roteador de interações
const interactionRouter = new InteractionRouter(db, authService);

// 5. Registrar eventos
const readyEvent = require('./events/ready');
const messageCreateEvent = require('./events/messageCreate');
const interactionCreateEvent = require('./events/interactionCreate');
const guildMemberAddEvent = require('./events/guildMemberAdd');
const guildMemberRemoveEvent = require('./events/guildMemberRemove');

function probeDiscordConnectivity(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    };

    const request = https.get('https://discord.com/api/v10/gateway', response => {
      response.resume();
      if (response.statusCode === 200) {
        finish();
      } else {
        finish(new Error(`Discord Gateway respondeu HTTP ${response.statusCode}.`));
      }
    });
    timeout = setTimeout(() => {
      request.destroy(new Error(`Tempo limite de ${timeoutMs}ms ao acessar Discord Gateway.`));
    }, timeoutMs);

    request.once('error', finish);
  });
}

// 6. Criar cliente Discord
function createClient() {
  const cli = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
      Partials.GuildMember
    ]
  });

  const storeAutomationService = new StoreAutomationService(cli, db);
  const scheduledMessagesService = new ScheduledMessagesService(cli, db);

  // Evento de inicialização
  cli.once(readyEvent.name, (...args) => {
    console.log('[Bot Diagnóstico] Evento clientReady recebido.');

    try {
      readyEvent.execute(...args, {
        db,
        guildsRepo,
        commandLoader,
        storeAutomationService,
        scheduledMessagesService
      });
    } catch (error) {
      console.error('[Bot Ready] Erro durante a inicialização:', error);
    }
  });

  // Mensagens
  cli.on(messageCreateEvent.name, (message) => {
    try {
      Promise.resolve(
        messageCreateEvent.execute(message, {
          db,
          guildsRepo,
          permsRepo,
          auditRepo,
          authService,
          commandLoader,
          protectionService,
          setupGalleryService
        })
      ).catch(error => {
        console.error('[Bot] Erro no evento messageCreate:', error);
      });
    } catch (error) {
      console.error('[Bot] Erro ao processar messageCreate:', error);
    }
  });

  // Interações
  cli.on(interactionCreateEvent.name, (interaction) => {
    try {
      Promise.resolve(
        interactionCreateEvent.execute(interaction, {
          interactionRouter
        })
      ).catch(error => {
        console.error('[Bot] Erro no evento interactionCreate:', error);
      });
    } catch (error) {
      console.error('[Bot] Erro ao processar interactionCreate:', error);
    }
  });

  // Entrada de membros
  cli.on(guildMemberAddEvent.name, (member) => {
    try {
      Promise.resolve(
        guildMemberAddEvent.execute(member, { db })
      ).catch(error => {
        console.error('[Bot] Erro no evento guildMemberAdd:', error);
      });
    } catch (error) {
      console.error('[Bot] Erro ao processar guildMemberAdd:', error);
    }
  });

  // Saída de membros
  cli.on(guildMemberRemoveEvent.name, (member) => {
    try {
      Promise.resolve(
        guildMemberRemoveEvent.execute(member, { db })
      ).catch(error => {
        console.error('[Bot] Erro no evento guildMemberRemove:', error);
      });
    } catch (error) {
      console.error('[Bot] Erro ao processar guildMemberRemove:', error);
    }
  });

  // Diagnóstico do cliente
  cli.on('error', (error) => {
    console.error('[Bot Diagnóstico] Erro no cliente Discord:', error);
  });

  cli.on('shardError', (error, shardId) => {
    console.error(
      `[Bot Diagnóstico] Erro no Gateway. Shard ${shardId}:`,
      error
    );
  });

  cli.on('shardDisconnect', (event, shardId) => {
    console.error(
      `[Bot Diagnóstico] Gateway desconectado. Shard ${shardId}. Código: ${event.code}. Motivo: ${event.reason || 'Não informado'}`
    );
  });

  cli.on('shardReconnecting', (shardId) => {
    console.warn(
      `[Bot Diagnóstico] Tentando reconectar. Shard: ${shardId}`
    );
  });

  cli.on('shardReady', (shardId) => {
    console.log(
      `[Bot Diagnóstico] Gateway conectado. Shard: ${shardId}`
    );
  });

  cli.on('debug', (info) => {
    if (
      info.includes('Heartbeat') ||
      info.includes('WebSocket')
    ) {
      console.log(`[Bot Gateway] ${info}`);
    }
  });

  return cli;
}

// 7. Criar cliente
const client = createClient();

// 8. Registrar falhas do processo
process.on('unhandledRejection', (reason) => {
  console.error(
    '[Bot Resiliência] Rejeição não tratada:',
    reason
  );

  try {
    db.prepare(`
      INSERT INTO system_events
      (component, event_level, message, error_stack)
      VALUES ('BOT', 'CRITICAL', 'Unhandled Promise Rejection', ?)
    `).run(
      reason?.stack || String(reason)
    );
  } catch (dbError) {
    console.error(
      '[Bot Resiliência] Falha ao registrar erro no banco:',
      dbError
    );
  }
});

process.on('uncaughtException', (error) => {
  console.error(
    '[Bot Resiliência] Exceção não tratada:',
    error
  );

  try {
    db.prepare(`
      INSERT INTO system_events
      (component, event_level, message, error_stack)
      VALUES ('BOT', 'CRITICAL', ?, ?)
    `).run(
      error.message,
      error.stack
    );
  } catch (dbError) {
    console.error(
      '[Bot Resiliência] Falha ao registrar erro no banco:',
      dbError
    );
  }

  process.exit(1);
});

// 9. Autenticar no Discord
async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token || token === 'seu_token_do_bot_aqui') {
    console.error(
      '[Bot] ❌ DISCORD_BOT_TOKEN não configurado no ambiente.'
    );
    return;
  }

  console.log('[Bot] 🔄 Iniciando autenticação com o Discord...');
  console.log('[Bot] Verificando conexão com o Gateway...');

  try {
    await probeDiscordConnectivity();
    console.log('[Bot Diagnóstico] HTTPS para discord.com/api/v10/gateway respondeu normalmente.');
  } catch (error) {
    console.error('[Bot Diagnóstico] Falha no teste HTTPS do Discord:', error.message);
  }

  const loginStartedAt = Date.now();
  const loginDiagnosticTimer = setTimeout(() => {
    console.error(
      `[Bot Diagnóstico] client.login continua pendente após ${Math.round((Date.now() - loginStartedAt) / 1000)}s. ` +
      `Estado WebSocket: ${client.ws.status}.`
    );
  }, 30000);

  try {
    await client.login(token);

    console.log(
      '[Bot] ✅ Solicitação de autenticação concluída. Aguardando clientReady...'
    );
  } catch (error) {
    console.error('[Bot] ❌ Falha na autenticação:', error);
    console.error('[Bot] Código:', error.code || 'Não informado');
    console.error('[Bot] Mensagem:', error.message);

    try {
      db.prepare(`
        INSERT INTO system_events
        (component, event_level, message, error_stack)
        VALUES ('BOT', 'CRITICAL', ?, ?)
      `).run(
        `Falha na autenticação Discord: ${error.message}`,
        error.stack || String(error)
      );
    } catch (dbError) {
      console.error(
        '[Bot] Não foi possível registrar a falha no banco:',
        dbError
      );
    }
  } finally {
    clearTimeout(loginDiagnosticTimer);
  }
}

// 10. Iniciar bot
startBot();

// 11. Exportar referências
module.exports = {
  client,
  getClient: () => client,
  commandLoader,
  authService
};
    
