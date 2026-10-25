/**
 * Ponto de entrada unificado para Produção e Render
 * Executa a API Backend e o Bot Discord no mesmo processo Node.js
 */

require('dotenv').config();
const { getDatabase } = require('./database/connection');
const { runMigrations } = require('./database/migrate');

console.log('====================================================');
console.log('🚀 INICIALIZANDO SERVIÇO UNIFICADO (BOT + API WEB)');
console.log('====================================================');

// 1. Migrações do Banco de Dados
try {
  const db = getDatabase();
  const migResult = runMigrations(db);
  console.log(`[Banco de Dados] ✅ SQLite pronto. Migrações: ${migResult.total} aplicadas.`);
  
  // Inicializar e carregar preços do catálogo de produtos
  const CartService = require('./bot/services/cartService');
  CartService.initPrices(db);
  console.log('[CartService] ✅ Preços de produtos carregados e sincronizados com SQLite.');
} catch (err) {
  console.error('[Banco de Dados] ❌ Falha crítica nas migrações:', err.message);
}

// 2. Iniciar API Backend (Express + Dashboard Web)
try {
  const { startServer } = require('./api/index');
  startServer();
} catch (apiErr) {
  console.error('[API Backend] Erro ao iniciar:', apiErr);
}

// 3. Iniciar Bot Discord (Discord.js Client)
try {
  require('./bot/index');
} catch (botErr) {
  console.error('[Bot Discord] Erro ao iniciar:', botErr);
}
