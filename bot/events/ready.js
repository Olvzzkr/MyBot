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

    // Atualiza status do bot
    client.user.setPresence({
      activities: [{ name: `Prefix: ? | ${client.guilds.cache.size} servidores`, type: 3 }],
      status: 'online'
    });
  }
};
