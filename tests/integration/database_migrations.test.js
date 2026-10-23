const test = require('node:test');
const assert = require('node:assert');
const { getDatabase } = require('../../database/connection');
const { runMigrations } = require('../../database/migrate');

test('Banco de Dados: executa migrações completas em memória com idempotência', () => {
  const db = getDatabase(':memory:');

  // 1ª execução
  const res1 = runMigrations(db);
  assert.strictEqual(res1.applied.length, 1);
  assert.strictEqual(res1.total, 1);

  // 2ª execução (deve ser idempotente)
  const res2 = runMigrations(db);
  assert.strictEqual(res2.applied.length, 0);
  assert.strictEqual(res2.total, 1);

  // Verificar existência das 21 tabelas essenciais
  const expectedTables = [
    'global_owners',
    'authorized_guilds',
    'oauth_sessions',
    'guild_settings',
    'module_settings',
    'staff_roles',
    'staff_permissions',
    'user_overrides',
    'moderation_cases',
    'warnings',
    'audit_logs',
    'security_events',
    'protection_actions',
    'tickets',
    'ticket_messages',
    'welcome_settings',
    'role_panels',
    'protection_rules',
    'pending_confirmations',
    'backup_records',
    'system_events'
  ];

  const tableRows = db.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `).all();

  const createdTables = new Set(tableRows.map(r => r.name));

  for (const table of expectedTables) {
    assert.strictEqual(createdTables.has(table), true, `Tabela "${table}" deve existir no banco.`);
  }

  db.close();
});
