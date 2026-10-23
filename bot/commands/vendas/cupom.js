/**
 * Comando /cupom e !cupom
 * Cria cupons de desconto automáticos com validade e publica o painel explicativo no canal escolhido
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');

function parseDuration(input) {
  if (!input) return 24 * 60 * 60 * 1000; // 24 horas padrão
  const text = String(input).toLowerCase().trim();
  if (['nunca', 'never', '0', 'infinito', 'permanente'].includes(text)) {
    return null;
  }

  const match = text.match(/^(\d+)\s*(m|min|h|hora|horas|d|dia|dias|s|sem|semana|semanas)?$/);
  if (!match) return 24 * 60 * 60 * 1000;

  const value = parseInt(match[1], 10);
  const unit = (match[2] || 'h')[0];

  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 's': return value * 7 * 24 * 60 * 60 * 1000;
    default: return value * 60 * 60 * 1000;
  }
}

module.exports = {
  name: 'cupom',
  aliases: ['criarcupom', 'promocao', 'desconto', 'coupon', 'addcupom'],
  description: 'Cria cupons de desconto automáticos e envia o painel promocional no canal selecionado',
  usage: '/cupom porcentagem:15 expira:24h canal:#avisos-loja [codigo:PROMO15]',

  async execute({ message, interaction, db, args }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const member = isInteraction ? interaction.member : message.member;
    const guild = isInteraction ? interaction.guild : message.guild;

    // 1. Verificação de Permissão (Direção, Admins ou Owner)
    const isGlobalOwner = author.id === '1517970601342664768';
    const isGuildOwner = guild.ownerId === author.id;
    const hasDirecao = member?.roles?.cache?.some(r => r.name.toLowerCase().includes('direção') || r.name.toLowerCase().includes('direcao'));
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner || isGuildOwner || hasDirecao;

    if (!isAdmin) {
      const errText = '❌ Apenas a Direção e Administradores podem criar cupons de desconto.';
      if (isInteraction) return interaction.reply({ content: errText, ephemeral: true });
      return message.reply(errText);
    }

    let percent = 0;
    let durationStr = '24h';
    let targetChannel = null;
    let customCode = '';

    if (isInteraction) {
      percent = interaction.options.getInteger('porcentagem') || interaction.options.getNumber('porcentagem') || 0;
      durationStr = interaction.options.getString('expira') || '24h';
      targetChannel = interaction.options.getChannel('canal');
      customCode = (interaction.options.getString('codigo') || '').toUpperCase().trim();
    } else {
      // Formato prefixo: !cupom <porcentagem> [expira] [#canal] [codigo]
      // Ex: !cupom 15 24h #avisos-loja
      if (!args || args.length === 0) {
        return message.reply(
          '📖 **Como usar o comando de cupom:**\n' +
          '`!cupom <porcentagem> [expira] [#canal] [codigo_opcional]`\n\n' +
          '**Exemplos:**\n' +
          '• `!cupom 15 24h #📢・avisos-loja` (15% OFF válido por 24 horas)\n' +
          '• `!cupom 20 3d` (20% OFF válido por 3 dias no canal atual)\n' +
          '• `!cupom 10 nunca #avisos PROMO10` (10% OFF permanente com código personalizado)'
        );
      }

      // 1º arg: porcentagem (ex: 15 ou 15%)
      percent = parseFloat(String(args[0]).replace('%', ''));

      // 2º arg: expira (ex: 24h, 3d, 1h, nunca)
      if (args[1]) {
        durationStr = args[1];
      }

      // Procurar menção de canal nos args
      const channelMention = message.mentions.channels.first();
      if (channelMention) {
        targetChannel = channelMention;
      }

      // 3º ou 4º arg: código customizado se houver
      const nonChannelArgs = args.slice(1).filter(a => !a.startsWith('<#'));
      if (nonChannelArgs.length >= 2 && !nonChannelArgs[1].match(/^\d+[mhds]/i)) {
        customCode = nonChannelArgs[1].toUpperCase().trim();
      }
    }

    if (isNaN(percent) || percent <= 0 || percent > 90) {
      const err = '❌ Porcentagem inválida! Informe um valor entre 1% e 90%.';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    // Se canal não foi informado, tenta achar #avisos-loja ou usa o canal atual
    if (!targetChannel) {
      targetChannel = guild.channels.cache.find(c => c.name.includes('avisos') && c.type === ChannelType.GuildText) || 
                      (isInteraction ? interaction.channel : message.channel);
    }

    // 2. Calcular tempo de expiração
    const durationMs = parseDuration(durationStr);
    let expiresAtIso = null;
    let expiresTimestampSec = null;
    let expiresDisplay = 'Sem expiração (Permanente)';

    if (durationMs) {
      const expDate = new Date(Date.now() + durationMs);
      expiresAtIso = expDate.toISOString();
      expiresTimestampSec = Math.floor(expDate.getTime() / 1000);
      expiresDisplay = `<t:${expiresTimestampSec}:R> (<t:${expiresTimestampSec}:F>)`;
    }

    // 3. Gerar código do cupom automaticamente se não informado
    let finalCode = customCode;
    const database = db || require('../../../database/connection').getDatabase();

    if (!finalCode) {
      const baseCode = `REAL${Math.round(percent)}`;
      const existing = database.prepare('SELECT code FROM coupons WHERE code = ?').get(baseCode);
      if (!existing) {
        finalCode = baseCode;
      } else {
        const randSuf = Math.random().toString(36).substring(2, 6).toUpperCase();
        finalCode = `${baseCode}-${randSuf}`;
      }
    }

    // 4. Salvar no Banco de Dados SQLite
    database.prepare(`
      INSERT INTO coupons (code, discount_percent, discount_fixed, max_uses, current_uses, is_active, expires_at)
      VALUES (?, ?, 0, 9999, 0, 1, ?)
      ON CONFLICT(code) DO UPDATE SET
        discount_percent = excluded.discount_percent,
        expires_at = excluded.expires_at,
        is_active = 1,
        max_uses = 9999
    `).run(finalCode, percent, expiresAtIso);

    // 5. Criar Embed Promocional para o canal de destino
    const promoEmbed = new EmbedBuilder()
      .setTitle('🎟️ NOVO CUPOM DE DESCONTO LIBERADO! — REAL SHOP')
      .setColor(0xF1C40F)
      .setDescription(
        `🔥 **OPORTUNIDADE ESPECIAL DE DESCONTO!**\n\n` +
        `Aproveite agora mesmo para economizar em qualquer produto da nossa loja!\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏷️ **CÓDIGO DO CUPOM:**\n\`\`\`\n${finalCode}\n\`\`\`\n` +
        `*(Dê dois toques no código acima para copiar facilmente)*\n\n` +
        `💰 **Desconto:** **\`${percent}% OFF\`** em todo o catálogo\n` +
        `⏳ **Validade:** ${expiresDisplay}\n` +
        `👥 **Disponibilidade:** Todos os clientes da loja\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📖 **COMO UTILIZAR O SEU CUPOM:**\n` +
        `1. Acesse os canais de produtos da loja ou o canal <#1562242410317218062>;\n` +
        `2. Clique em **Comprar** no produto desejado para abrir seu carrinho privado;\n` +
        `3. No carrinho, clique no botão **\`🎟️ Cupom\`**;\n` +
        `4. Cole o código **\`${finalCode}\`** e confirme;\n` +
        `5. O desconto de **\`${percent}%\`** será deduzido na hora no valor do PIX!`
      )
      .setFooter({ text: 'Real Shop • Economia e Entrega Garantida' })
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Como Comprar')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/1562242410317218062`),
      new ButtonBuilder()
        .setLabel('Feedbacks')
        .setEmoji('🏆')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/1562634794263777280`)
    );

    // Enviar no canal de destino
    try {
      await targetChannel.send({
        embeds: [promoEmbed],
        components: [actionRow]
      });
    } catch (sendErr) {
      const errMsg = `❌ Não foi possível postar no canal <#${targetChannel.id}>: ${sendErr.message}`;
      if (isInteraction) return interaction.reply({ content: errMsg, ephemeral: true });
      return message.reply(errMsg);
    }

    // Feedback para quem executou o comando
    const confirmText = `✅ **Cupom Criado e Publicado com Sucesso!**\n` +
      `• **Código:** \`${finalCode}\`\n` +
      `• **Desconto:** \`${percent}% OFF\`\n` +
      `• **Validade:** ${expiresDisplay}\n` +
      `• **Canal:** <#${targetChannel.id}>`;

    if (isInteraction) {
      return interaction.reply({ content: confirmText, ephemeral: true });
    } else {
      return message.reply(confirmText);
    }
  }
};
