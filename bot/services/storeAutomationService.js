/**
 * Serviço de Automação da Loja:
 * - Resolução e sorteio automático de Giveaways expirados
 * - Atualização periódica dos contadores de estatísticas (Membros e Vendas)
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class StoreAutomationService {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    this.interval = null;
  }

  start() {
    console.log('[Automação Loja] Serviço iniciado com sucesso.');
    // Executa uma vez no início
    this.runChecks();
    // Executa a cada 30 segundos
    this.interval = setInterval(() => this.runChecks(), 30000);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async runChecks() {
    await this.checkGiveaways();
    await this.updateCounters();
  }

  async checkGiveaways() {
    try {
      const activeGiveaways = this.db.prepare(`
        SELECT * FROM giveaways
        WHERE status = 'ACTIVE' AND datetime(ends_at) <= datetime('now')
      `).all();

      for (const g of activeGiveaways) {
        const guild = this.client.guilds.cache.get(g.guild_id);
        if (!guild) continue;

        const channel = guild.channels.cache.get(g.channel_id);
        if (!channel) continue;

        const entries = this.db.prepare('SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?').all(g.id);
        let winners = [];

        if (entries.length > 0) {
          // Embaralhar participantes
          const shuffled = entries.map(e => e.user_id).sort(() => Math.random() - 0.5);
          winners = shuffled.slice(0, g.winners_count);
        }

        // Marcar como finalizado no banco
        this.db.prepare("UPDATE giveaways SET status = 'ENDED' WHERE id = ?").run(g.id);

        try {
          const msg = await channel.messages.fetch(g.message_id).catch(() => null);
          if (msg) {
            const winnersText = winners.length > 0 
              ? winners.map(w => `<@${w}>`).join(', ') 
              : 'Nenhum participante válido.';

            const endedEmbed = new EmbedBuilder()
              .setTitle(`🎉 SORTEIO ENCERRADO — ${g.prize.toUpperCase()}`)
              .setColor(0xED4245)
              .setDescription(
                `🎁 **Prêmio:** **${g.prize}**\n` +
                `🏆 **Ganhador(es):** ${winnersText}\n` +
                `👥 **Total de Participantes:** \`${entries.length}\`\n` +
                `👤 **Sorteado por:** <@${g.host_id}>\n\n` +
                `*Parabéns aos vencedores! Abram um ticket para resgatar o prêmio.*`
              )
              .setFooter({ text: 'Real Shop • Sorteio Concluído' })
              .setTimestamp();

            const endedRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`giveaway_enter:${g.id}`)
                .setLabel(`Encerrado (${entries.length})`)
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );

            await msg.edit({ embeds: [endedEmbed], components: [endedRow] });

            if (winners.length > 0) {
              await channel.send({
                content: `🎊 **PARABÉNS** ${winners.map(w => `<@${w}>`).join(' ')}! Você(s) ganhou(ram) **${g.prize}** no sorteio da Real Shop!`
              });
            } else {
              await channel.send({
                content: `⚠️ O sorteio de **${g.prize}** foi encerrado sem participantes suficientes.`
              });
            }
          }
        } catch (err) {
          console.warn(`[Giveaway] Erro ao atualizar mensagem ${g.message_id}:`, err.message);
        }
      }
    } catch (err) {
      console.error('[Automação Loja] Erro na checagem de sorteios:', err);
    }
  }

  async updateCounters() {
    try {
      const records = this.db.prepare('SELECT * FROM store_feature_channels').all();
      for (const rec of records) {
        const guild = this.client.guilds.cache.get(rec.guild_id);
        if (!guild) continue;

        // Atualizar canal de membros
        if (rec.member_counter_channel_id) {
          const chan = guild.channels.cache.get(rec.member_counter_channel_id);
          if (chan) {
            const expectedName = `👥・Membros: ${guild.memberCount}`;
            if (chan.name !== expectedName) {
              await chan.setName(expectedName).catch(() => {});
            }
          }
        }

        // Atualizar canal de entregas
        if (rec.sales_counter_channel_id) {
          const chan = guild.channels.cache.get(rec.sales_counter_channel_id);
          if (chan) {
            const row = this.db.prepare("SELECT COUNT(*) as count FROM cart_orders WHERE guild_id = ? AND status = 'DELIVERED'").get(guild.id);
            const total = (row?.count || 0) + 12;
            const expectedName = `📦・Entregas: ${total}`;
            if (chan.name !== expectedName) {
              await chan.setName(expectedName).catch(() => {});
            }
          }
        }
      }
    } catch {}
  }
}

module.exports = StoreAutomationService;
