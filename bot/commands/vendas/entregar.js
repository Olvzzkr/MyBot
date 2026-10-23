/**
 * Comando /entregar e ?entregar - Entrega produtos, gera recibo digital e publica em #entregas-realizadas e na DM do cliente
 */

const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ReceiptService = require('../../services/receiptService');
const { resolveProductChannel } = require('../../utils/channelResolver');

module.exports = {
  name: 'entregar',
  aliases: ['delivery', 'entregaproduto', 'recibo'],
  description: 'Gera o recibo oficial de entrega, envia na DM do comprador e registra no canal de entregas',
  usage: '/entregar ou ?entregar @usuario "Nome do Produto" "R$ 13,90" "Chave/Login"',

  async execute({ message, interaction, args }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const member = isInteraction ? interaction.member : message.member;
    const guild = isInteraction ? interaction.guild : message.guild;

    const isGlobalOwner = author.id === '1517970601342664768';
    const isGuildOwner = guild.ownerId === author.id;
    const hasDirecao = member?.roles?.cache?.some(r => r.name.toLowerCase().includes('direção') || r.name.toLowerCase().includes('direcao'));
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner || isGuildOwner || hasDirecao;

    if (!isAdmin) {
      const errText = '❌ Apenas a Direção ou Administradores podem registrar entregas.';
      if (isInteraction) return interaction.editReply({ content: errText });
      return message.reply(errText);
    }

    const channel = isInteraction ? interaction.channel : message.channel;
    const database = require('../../../database/connection').getDatabase();

    // 0. Verificar se estamos executando dentro de um canal de carrinho
    let cart = null;
    try {
      cart = database.prepare('SELECT * FROM cart_orders WHERE channel_id = ? AND status != ?').get(channel.id, 'DELIVERED');
    } catch {}

    let targetUser = null;
    let productName = '';
    let price = '';
    let conteudo = '';

    if (isInteraction) {
      // 1. Parâmetros diretos via Slash Command
      targetUser = interaction.options.getUser('usuario');
      productName = (interaction.options.getString('produto') || '').replace(/^["'“”]+|["'“”]+$/g, '').trim();
      price = (interaction.options.getString('valor') || '').replace(/^["'“”]+|["'“”]+$/g, '').trim();
      conteudo = (interaction.options.getString('conteudo') || '').replace(/^["'“”]+|["'“”]+$/g, '').trim();

      if (!targetUser && cart) {
        try {
          targetUser = await guild.client.users.fetch(cart.user_id);
        } catch {}
      }
    } else {
      // 2. Parâmetros via comando de prefixo (?entregar ou !entregar)
      targetUser = message.mentions.users.first();
      let rawContent = message.content.replace(/^(\S+)\s*/, '').trim();

      if (targetUser) {
        rawContent = rawContent.replace(/<@!?\d+>\s*/, '').trim();
      } else if (cart) {
        // Se estamos dentro do carrinho e não mencionou ninguém, autodetecta o comprador
        try {
          targetUser = await guild.client.users.fetch(cart.user_id);
        } catch {}
      }

      if (!targetUser) {
        return message.reply('❌ Você precisa mencionar o cliente ou usar este comando dentro do canal de um carrinho! Exemplo:\n`/entregar` ou `?entregar @usuario "1x Discord Nitro" "R$ 13,90" "Link de ativação..."`');
      }

      // Suporte a separação por barra vertical | ou aspas
      if (rawContent.includes('|')) {
        const parts = rawContent.split('|').map(p => p.trim().replace(/^["'“”]+|["'“”]+$/g, ''));
        productName = parts[0] || '';
        price = parts[1] || '';
        conteudo = parts.slice(2).join(' | ') || '';
      } else {
        const regex = /["“]([^"”]+)["”]|['‘]([^'’]+)['’]|(\S+)/g;
        const parsed = [];
        let match;
        while ((match = regex.exec(rawContent)) !== null) {
          const val = (match[1] || match[2] || match[3] || '').replace(/^["'“”]+|["'“”]+$/g, '').trim();
          if (val) parsed.push(val);
        }

        // Tentar identificar qual argumento é o preço (ex: R$ 13,90 ou 13,90)
        let priceIndex = parsed.findIndex(p => /^(R\$|\$)?\s*\d+([.,]\d{2})?$/i.test(p.trim()));
        if (priceIndex > 0) {
          productName = parsed.slice(0, priceIndex).join(' ');
          price = parsed[priceIndex];
          conteudo = parsed.slice(priceIndex + 1).join(' ');
        } else if (cart && parsed.length > 0) {
          conteudo = rawContent.replace(/^["'“”]+|["'“”]+$/g, '').trim();
        } else if (parsed.length >= 3) {
          productName = parsed[0] || '';
          price = parsed[1] || '';
          conteudo = parsed.slice(2).join(' ') || '';
        } else {
          conteudo = rawContent || 'Acesso liberado com sucesso. Aproveite!';
        }
      }
    }

    // Autocompletar com dados do carrinho se estiver dentro de um carrinho
    if (cart) {
      if (!productName && cart.items_json) {
        try {
          const items = JSON.parse(cart.items_json);
          productName = items.map(i => `${i.quantity}x ${i.name}`).join(' + ');
        } catch {}
      }
      if (!price && cart.total_amount) {
        price = `R$ ${Number(cart.total_amount).toFixed(2)}`;
      }
    }

    if (!targetUser) {
      return message ? message.reply('❌ Cliente não identificado.') : interaction.editReply({ content: '❌ Cliente não identificado.' });
    }

    // Normalizar preço
    if (!price.toUpperCase().startsWith('R$') && !price.startsWith('$')) {
      price = `R$ ${price}`;
    }
    if (!productName) productName = 'Produto BlackShop';
    if (!conteudo) conteudo = 'Acesso liberado com sucesso. Aproveite!';

    // Feedback de carregamento
    let loadingMsg = null;
    if (!isInteraction) {
      loadingMsg = await message.reply('⏳ Gerando recibo digital e processando entrega...');
    }

    try {
      const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
      const receiptBuffer = await ReceiptService.generateReceipt({
        avatarUrl,
        displayName: targetUser.globalName || targetUser.username,
        username: targetUser.username,
        productName,
        price,
        date: new Date(),
        brandName: 'REAL BOOST'
      });

      const receiptAttachmentPublic = new AttachmentBuilder(receiptBuffer, { name: 'recibo_entrega.png' });
      const receiptAttachmentDM = new AttachmentBuilder(receiptBuffer, { name: 'recibo_entrega.png' });

      // 1. Enviar no canal público de entregas (#🚚・entr3gas-realizadas)
      const entregasChannel = guild.channels.cache.get('1562634795781988404') || 
                              guild.channels.cache.find(c => c.name.includes('entr3gas') || c.name.includes('entregas'));

      const publicButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Comprar')
          .setEmoji('🛒')
          .setStyle(ButtonStyle.Link)
          .setURL(resolveProductChannel(productName, guild)),
        new ButtonBuilder()
          .setLabel('Feedbacks')
          .setEmoji('🏆')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guild.id}/1562634794263777280`)
      );

      if (entregasChannel) {
        // Envio limpo: apenas a imagem do recibo e os botões
        await entregasChannel.send({
          files: [receiptAttachmentPublic],
          components: [publicButtons]
        });
      }

      // 2. Enviar na DM privada do comprador
      let dmSent = false;
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('🎉 Seu Pedido foi Entregue! — BlackShop')
          .setColor(0x2B2D31)
          .setDescription(
            `Olá <@${targetUser.id}>, seu pagamento foi confirmado e seu pedido foi entregue com sucesso!\n\n` +
            `📦 **Produto:** **${productName}**\n` +
            `💰 **Valor:** \`${price}\`\n\n` +
            `🔑 **Conteúdo Entregue / Credenciais:**\n\`\`\`\n${conteudo}\n\`\`\`\n` +
            `🛡️ Guarde suas credenciais em segurança.\n` +
            `⭐ Ficou satisfeito com o atendimento? Deixe sua avaliação em <#1562634794263777280>!`
          )
          .setImage('attachment://recibo_entrega.png')
          .setFooter({ text: 'REAL BOOST • BlackShop' })
          .setTimestamp();

        await targetUser.send({
          embeds: [dmEmbed],
          files: [receiptAttachmentDM]
        });
        dmSent = true;
      } catch (dmErr) {
        console.warn(`Não foi possível enviar DM para ${targetUser.tag}: ${dmErr.message}`);
      }

      const responseText = `✅ **Entrega Registrada com Sucesso!**\n` +
        `• Comprovante postado em: <#1562634795781988404>\n` +
        `• Envio na DM do cliente: ${dmSent ? '✅ Entregue' : '⚠️ DM do cliente estava bloqueada/fechada'}\n` +
        `• Cliente: <@${targetUser.id}>\n` +
        `• Produto: **${productName}** (${price})`;

      if (isInteraction) {
        await interaction.editReply({ content: responseText });
      } else if (loadingMsg) {
        await loadingMsg.edit({ content: responseText });
      }

      // 3. Atualizar status do carrinho e fechar o canal após a entrega
      if (!cart && targetUser) {
        try {
          cart = database.prepare('SELECT * FROM cart_orders WHERE user_id = ? AND guild_id = ? AND status != ? ORDER BY id DESC LIMIT 1').get(targetUser.id, guild.id, 'DELIVERED');
        } catch {}
      }

      if (cart) {
        try {
          database.prepare('UPDATE cart_orders SET status = ?, updated_at = datetime(\'now\', \'utc\') WHERE cart_id = ?').run('DELIVERED', cart.cart_id);
        } catch {}

        const cartChannel = guild.channels.cache.get(cart.channel_id);
        if (cartChannel) {
          await cartChannel.send({
            content: `🎉 **Pedido entregue com sucesso!** O link/acesso foi enviado na DM privada de <@${targetUser.id}> e o comprovante publicado em <#1562634795781988404>.\n⏳ *Este canal de carrinho será excluído automaticamente em 15 segundos.*`
          }).catch(() => {});

          setTimeout(() => {
            cartChannel.delete('Pedido entregue com sucesso via /entregar').catch(() => {});
          }, 15000);
        }
      }

    } catch (err) {
      console.error('Erro ao gerar recibo de entrega:', err);
      const errMsg = `❌ Ocorreu um erro ao processar a entrega: ${err.message}`;
      if (isInteraction) {
        await interaction.editReply({ content: errMsg });
      } else if (loadingMsg) {
        await loadingMsg.edit({ content: errMsg });
      }
    }
  }
};
