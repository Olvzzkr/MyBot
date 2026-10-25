/**
 * Evento interactionCreate - Despacho de interações para o router
 */

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, { interactionRouter }) {
    try {
      await interactionRouter.handleInteraction(interaction);
    } catch (err) {
      if (err.code === 10062 || err.code === 40060) {
        // Interação expirada ou já respondida pelo Discord
        return;
      }
      console.error('[InteractionCreate] Erro no processamento:', err);
      if (interaction.isRepliable()) {
        const errorMsg = { content: '❌ Ocorreu um erro ao responder a esta interação.', ephemeral: true };
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(errorMsg).catch(() => {});
        } else {
          await interaction.reply(errorMsg).catch(() => {});
        }
      }
    }
  }
};
