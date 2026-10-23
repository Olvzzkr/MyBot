/**
 * Criação automatizada de cargos essenciais e úteis para o servidor
 */

require('dotenv').config();
const { getDatabase } = require('../database/connection');
const PermissionsRepository = require('../database/repositories/permissionsRepository');

const GUILD_ID = '1553633196296511498';
const TOKEN = process.env.DISCORD_BOT_TOKEN;

const USEFUL_ROLES = [
  // Staff & Moderação
  { name: '👑 Direção', color: 0xED4245, hoist: true, mentionable: true, isStaff: true, priority: 100, perms: ['*'] },
  { name: '⭐ Administrador', color: 0xE67E22, hoist: true, mentionable: true, isStaff: true, priority: 80, perms: ['roles.manage', 'moderation.ban', 'moderation.kick', 'moderation.timeout', 'protection.manage', 'settings.manage'] },
  { name: '🛡️ Moderador', color: 0x3498DB, hoist: true, mentionable: true, isStaff: true, priority: 60, perms: ['moderation.warn', 'moderation.timeout', 'moderation.kick', 'moderation.purge', 'tickets.close'] },
  { name: '🤝 Suporte', color: 0x2ECC71, hoist: true, mentionable: true, isStaff: true, priority: 40, perms: ['tickets.view', 'tickets.assign', 'tickets.close'] },

  // Comunidade & Especiais
  { name: '💎 VIP', color: 0xE91E63, hoist: true, mentionable: false },
  { name: '🏆 Membro Ativo', color: 0xF1C40F, hoist: true, mentionable: false },
  { name: '👤 Membro', color: 0x99AAB5, hoist: false, mentionable: false },
  { name: '🤖 Bots', color: 0x7289DA, hoist: true, mentionable: false },

  // Autorroles & Notificações
  { name: '📢 Anúncios', color: 0x5865F2, hoist: false, mentionable: true },
  { name: '🎉 Sorteios', color: 0x9B59B6, hoist: false, mentionable: true },
  { name: '🎮 Eventos', color: 0x1ABC9C, hoist: false, mentionable: true },

  // Segurança & Contenção
  { name: '☣️ Quarentena', color: 0x36393F, hoist: false, mentionable: false, isQuarantine: true }
];

async function run() {
  console.log(`[Cargos] Conectando à API do Discord para criar cargos na guilda ${GUILD_ID}...`);

  // 1. Listar cargos existentes
  const getRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
    headers: { Authorization: `Bot ${TOKEN}` }
  });

  if (!getRes.ok) {
    const err = await getRes.json();
    throw new Error(`Falha ao buscar cargos: ${JSON.stringify(err)}`);
  }

  const existingRoles = await getRes.json();
  const existingNames = new Set(existingRoles.map(r => r.name.toLowerCase()));
  console.log(`[Cargos] Cargos já existentes: ${existingRoles.map(r => r.name).join(', ')}`);

  const db = getDatabase();
  const permsRepo = new PermissionsRepository(db);

  const createdList = [];

  for (const roleDef of USEFUL_ROLES) {
    let roleId = null;

    if (existingNames.has(roleDef.name.toLowerCase())) {
      console.log(`[Cargos] Cargo "${roleDef.name}" já existe. Ignorando criação.`);
      const existing = existingRoles.find(r => r.name.toLowerCase() === roleDef.name.toLowerCase());
      roleId = existing.id;
    } else {
      console.log(`[Cargos] Criando "${roleDef.name}"...`);
      const postRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
        method: 'POST',
        headers: {
          Authorization: `Bot ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: roleDef.name,
          color: roleDef.color,
          hoist: Boolean(roleDef.hoist),
          mentionable: Boolean(roleDef.mentionable),
          reason: 'Criação automatizada de cargos úteis do servidor'
        })
      });

      if (!postRes.ok) {
        const err = await postRes.json();
        console.error(`[Cargos] Erro ao criar "${roleDef.name}":`, err);
        continue;
      }

      const created = await postRes.json();
      roleId = created.id;
      createdList.push({ name: created.name, id: created.id, hexColor: '#' + created.color.toString(16).padStart(6, '0') });
      console.log(`[Cargos] ✅ "${created.name}" criado com sucesso (ID: ${created.id})!`);
    }

    // 2. Se for cargo de Quarentena, vincular na guild_settings
    if (roleDef.isQuarantine && roleId) {
      db.prepare(`
        UPDATE guild_settings SET quarantine_role_id = ? WHERE guild_id = ?
      `).run(roleId, GUILD_ID);
      console.log(`[Cargos] ☣️ Cargo de Quarentena vinculado em guild_settings.`);
    }

    // 3. Se for cargo de Staff, cadastrar no staff_roles com permissões granulares
    if (roleDef.isStaff && roleId) {
      try {
        permsRepo.addStaffRole(GUILD_ID, roleId, roleDef.name, roleDef.priority, roleDef.perms);
        console.log(`[Cargos] 🛡️ Staff role "${roleDef.name}" registrada no banco com permissões: ${roleDef.perms.join(', ')}`);
      } catch (err) {
        // Se já existir no banco, atualiza permissões
        console.log(`[Cargos] Staff role já existente no banco.`);
      }
    }
  }

  console.log(`========================================`);
  console.log(`🎉 Processo finalizado com sucesso!`);
  console.log(`Cargos criados nesta execução: ${createdList.length}`);
}

run().catch(console.error);
