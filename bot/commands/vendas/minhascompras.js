/**
 * Comando /minhascompras e !minhascompras - Exibe o histórico de compras do usuário
 */

const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'minhascompras',
  aliases: ['perfil', 'compras', 'meuspedidos', 'historico-compras'],
  description: 'Exibe o seu histórico de compras e valor total economizado na loja',
  usage: '/minhascompras',

  async execute({ message, interaction, db }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const guild = isInteraction ? interaction.guild : message.guild;

    const database = db || require('../../../database/connection').getDatabase();

    const orders = database.prepare(`
      SELECT * FROM cart_orders
      WHERE user_id = ? AND guild_id = ? AND status = 'DELIVERED'
      ORDER BY id DESC
      LIMIT 10
    `).all(author.id, guild.id);

    const totalSpentRow = database.prepare(`
      SELECT SUM(total_amount) as total FROM cart_orders
      WHERE user_id = ? AND guild_id = ? AND status = 'DELIVERED'
    `).get(author.id, guild.id);

    const totalSpent = totalSpentRow?.total || 0;
    const isVip = totalSpent >= 50 || orders.length >= 3;

    let ordersList = '*Nenhum pedido entregue encontrado nesta conta.*';
    if (orders.length > 0) {
      ordersList = orders.map((o, idx) => {
        let itemsStr = 'Produto';
        try {
          const parsed = JSON.parse(o.items_json);
          itemsStr = parsed.map(i => `${i.quantity}x ${i.name}`).join(' + ');
        } catch {}
        return `**${idx + 1}.** \`${o.cart_id}\` • **${itemsStr}**\n   ↳ Valor: \`R$ ${Number(o.total_amount).toFixed(2)}\` • Status: \`Entregue ✅\``;
      }).join('\n\n');
    }

    const embed = new EmbedBuilder()
      .setTitle(`🛍️ PERFIL DE COMPRAS — ${author.username.toUpperCase()}`)
      .setColor(isVip ? 0xE91E63 : 0x2B2D31)
      .setDescription(
        `👤 **Cliente:** <@${author.id}>\n` +
        `🏆 **Status de Fidelidade:** ${isVip ? '💎 **CLIENTE VIP REAL SHOP**' : '👤 **Cliente Padrão**'}\n` +
        `💰 **Total Investido:** \`R$ ${Number(totalSpent).toFixed(2)}\`\n` +
        `📦 **Total de Compras Entregues:** \`${orders.length}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📋 **ÚLTIMOS PEDIDOS ENTREGUES:**\n\n${ordersList}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setThumbnail(author.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Real Shop • Satisfação & Garantia' })
      .setTimestamp();

    if (isInteraction) return interaction.reply({ embeds: [embed], ephemeral: true });
    return message.reply({ embeds: [embed] });
  }
};
