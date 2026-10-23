/**
 * Script de Inicialização do Ambiente Local Completo
 */

require('dotenv').config();
const { spawn } = require('node:child_process');
const path = require('node:path');
const { getDatabase } = require('../database/connection');
const { runMigrations } = require('../database/migrate');

console.log('====================================================');
console.log('🚀 INICIALIZANDO ECOSSISTEMA DO BOT DISCORD');
console.log('====================================================');

// 1. Verificar e migrar banco SQLite
try {
  const db = getDatabase();
  const migResult = runMigrations(db);
  console.log(`[Banco de Dados] ✅ SQLite pronto. Migrações aplicadas: ${migResult.applied.length}. Total: ${migResult.total}.`);
} catch (err) {
  console.error('[Banco de Dados] ❌ Falha crítica nas migrações:', err.message);
  process.exit(1);
}

// 2. Iniciar API Backend
console.log('[API Backend] Iniciando serviço Express...');
const apiProcess = spawn(process.execPath, ['--experimental-sqlite', path.join(__dirname, '../api/index.js')], {
  stdio: 'inherit'
});

// 3. Iniciar Bot Discord
console.log('[Bot Discord] Iniciando cliente Discord.js...');
const botProcess = spawn(process.execPath, ['--experimental-sqlite', path.join(__dirname, '../bot/index.js')], {
  stdio: 'inherit'
});

// 4. Tratamento de Encerramento Gracioso
function shutdown() {
  console.log('\n[Sistema] Encerrando processos com segurança...');
  apiProcess.kill();
  botProcess.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
