/**
 * Evento Ready - Inicialização e verificação de saúde do Bot
 */

module.exports = {
  name: 'ready',
  once: true,
  execute(client, { db, guildsRepo, commandLoader, storeAutomationService }) {
    console.log(`========================================`);
    console.log(`🤖 Bot conectado como: ${client.user.tag}`);
    console.log(`📡 Servidores conectados: ${client.guilds.cache.size}`);
    console.log(`⚡ Comandos carregados: ${commandLoader.commands.size}`);
    console.log(`========================================`);

    if (storeAutomationService) {
      try {
        storeAutomationService.start();
      } catch (err) {
        console.error('[Bot Ready] Falha ao iniciar StoreAutomationService:', err);
      }
    }

    // Auto-autorizar servidores conectados e garantir proprietário global
    try {
      db.prepare(`
        INSERT OR IGNORE INTO global_owners (user_id, added_by, notes)
        VALUES ('1517970601342664768', 'SYSTEM', 'Proprietário Global Oficial')
      `).run();

      for (const [guildId, guild] of client.guilds.cache) {
        guildsRepo.authorizeGuild(guildId, '1517970601342664768', `Auto-autorizado na inicialização: ${guild.name}`);
      }
      console.log('[Bot Ready] Servidores conectados auto-autorizados com sucesso!');
    } catch (authErr) {
      console.error('[Bot Ready] Erro ao autorizar servidores:', authErr.message);
    }

    // Atualiza status do bot
    client.user.setPresence({
      activities: [{ name: `Prefix: ? | ${client.guilds.cache.size} servidores`, type: 3 }],
      status: 'online'
    });
  }
};
