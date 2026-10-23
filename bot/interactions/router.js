/**
 * Roteador de Interações e Componentes Interativos (Select Menus, Botões e Modais)
 */

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  StringSelectMenuBuilder,
  PermissionFlagsBits 
} = require('discord.js');
const ConfirmationsRepository = require('../../database/repositories/confirmationsRepository');
const CartService = require('../services/cartService');

class InteractionRouter {
  constructor(db, authService) {
    this.db = db;
    this.authService = authService;
    this.confirmationsRepo = new ConfirmationsRepository(db);
  }

  async handleInteraction(interaction) {
    // 0. Slash Commands (Comandos de Barra '/')
    if (interaction.isChatInputCommand()) {
      return this.handleSlashCommand(interaction);
    }

    // 0.1 Modais Interativos (Ex: Cupons do Carrinho)
    if (interaction.isModalSubmit()) {
      return this.handleModalSubmit(interaction);
    }

    if (!interaction.isStringSelectMenu() && !interaction.isButton()) {
      return;
    }

    const { customId, guild, member } = interaction;

    // 1. Painel de Seleção de Cargos Autoatribuíveis
    if (customId === 'role_panel_select') {
      return this.handleRolePanelSelect(interaction);
    }

    // 2. Abertura Automática de Ticket via Botão
    if (customId === 'ticket_create_open') {
      return this.handleTicketCreate(interaction);
    }

    // 3. Fechamento de Ticket via Botão
    if (customId === 'ticket_close_btn') {
      return this.handleTicketCloseBtn(interaction);
    }

    // 4. Confirmação de Ações Críticas
    if (customId.startsWith('confirm_action:') || customId.startsWith('cancel_action:')) {
      return this.handleConfirmationButton(interaction);
    }

    // 5. Curtida em Post de Setup
    if (customId.startsWith('setup_like:')) {
      return this.handleSetupLike(interaction);
    }

    // 6. Tópico/Comentários em Post de Setup
    if (customId.startsWith('setup_thread:')) {
      return this.handleSetupThread(interaction);
    }

    // 7. Exclusão de Post de Setup
    if (customId.startsWith('setup_delete:')) {
      return this.handleSetupDelete(interaction);
    }

    // 8. Seleções nos Painéis de Vendas -> Abre/Adiciona ao Carrinho Privado (carrinho-usuario-nomedoproduto)
    if (customId.startsWith('shop_select_')) {
      const selected = interaction.values[0];
      if (selected === 'nitro_3m' || selected === 'link_1m' || selected === 'conta_2026') {
        return interaction.reply({
          content: '❌ **Produto Esgotado!** No momento este item não possui estoque disponível.',
          ephemeral: true
        });
      }
      return CartService.handleProductSelect(interaction, selected, this.db);
    }

    // 8.1 Compras Diretas por Botão nos Painéis
    if (customId === 'shop_buy_ativacao') {
      return CartService.handleProductSelect(interaction, 'ativacao_nitro', this.db);
    }
    if (customId === 'shop_buy_xit_ff') {
      return CartService.handleProductSelect(interaction, 'xit_ff', this.db);
    }
    if (customId === 'shop_buy_pescoco') {
      return CartService.handleProductSelect(interaction, 'hs_pescoco', this.db);
    }
    if (customId === 'shop_buy_holograma') {
      return CartService.handleProductSelect(interaction, 'holograma', this.db);
    }
    if (customId === 'shop_buy_aimbot') {
      return CartService.handleProductSelect(interaction, 'aimbot_mobile', this.db);
    }
    if (customId === 'shop_buy_minecraft') {
      return CartService.handleProductSelect(interaction, 'minecraft_nfa', this.db);
    }

    // 8.2 Botões "Ver opções" dos novos Painéis de Streaming
    if (customId.startsWith('shop_options_')) {
      return this.handleShopStreamingOptions(interaction);
    }

    // 9. Interações do Carrinho de Compras e Checkout PIX
    if (customId.startsWith('cart_qty_plus:')) {
      const cartId = customId.split(':')[1];
      await CartService.changeItemQuantity(cartId, 1, this.db);
      const cart = CartService.getCart(cartId, this.db);
      const { embeds, components } = CartService.renderCartPayload(cart, interaction.user);
      return interaction.update({ embeds, components });
    }

    if (customId.startsWith('cart_qty_minus:')) {
      const cartId = customId.split(':')[1];
      await CartService.changeItemQuantity(cartId, -1, this.db);
      const cart = CartService.getCart(cartId, this.db);
      const { embeds, components } = CartService.renderCartPayload(cart, interaction.user);
      return interaction.update({ embeds, components });
    }

    if (customId.startsWith('cart_coupon_btn:')) {
      const cartId = customId.split(':')[1];
      const modal = new ModalBuilder()
        .setCustomId(`cart_coupon_modal:${cartId}`)
        .setTitle('🎟️ Inserir Cupom de Desconto');

      const couponInput = new TextInputBuilder()
        .setCustomId('coupon_input')
        .setLabel('Digite o Código do Cupom')
        .setPlaceholder('Ex: BLACK10, PRIMEIRACOMPRA, ATLAS')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(couponInput));
      return interaction.showModal(modal);
    }

    if (customId.startsWith('cart_add_item:')) {
      const cartId = customId.split(':')[1];
      const catalog = CartService.getCatalog();
      const select = new StringSelectMenuBuilder()
        .setCustomId(`cart_add_select:${cartId}`)
        .setPlaceholder('Selecione mais um produto para adicionar...')
        .addOptions(
          Object.values(catalog).slice(0, 25).map(p => ({
            label: p.name.slice(0, 50),
            description: `Valor: R$ ${p.price.toFixed(2)} • Categoria: ${p.category}`,
            value: p.id,
            emoji: '📦'
          }))
        );

      const row = new ActionRowBuilder().addComponents(select);
      return interaction.reply({
        content: '🛍️ **Escolha outro produto para adicionar ao seu carrinho:**',
        components: [row],
        ephemeral: true
      });
    }

    if (customId.startsWith('cart_add_select:')) {
      const cartId = customId.split(':')[1];
      const prodId = interaction.values[0];
      const prod = CartService.getProduct(prodId);
      if (prod) {
        await CartService.addItemToCart(cartId, prod, this.db);
        const cart = CartService.getCart(cartId, this.db);
        await CartService.updateCartMessage(interaction.channel, cart, interaction.guild);
        return interaction.reply({
          content: `✅ **${prod.name}** adicionado ao seu carrinho!`,
          ephemeral: true
        });
      }
    }

    if (customId.startsWith('cart_checkout_btn:')) {
      const cartId = customId.split(':')[1];
      return CartService.renderPixCheckout(interaction, cartId, this.db);
    }

    if (customId.startsWith('cart_back_btn:')) {
      const cartId = customId.split(':')[1];
      const cart = CartService.getCart(cartId, this.db);
      const { embeds, components } = CartService.renderCartPayload(cart, interaction.user);
      return interaction.update({ embeds, components, files: [] });
    }

    if (customId.startsWith('cart_paid_notify:')) {
      const cartId = customId.split(':')[1];
      const adminRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`cart_admin_deliver:${cartId}`)
          .setLabel('Entregar Produto (Manual)')
          .setEmoji('📦')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`cart_keep_ticket:${cartId}`)
          .setLabel('Manter em Atendimento / Ticket')
          .setEmoji('🎫')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        content: `🔔 <@${interaction.user.id}> informou que efetuou o pagamento via PIX!\n🛡️ **Staff / Administradores:** Verifiquem o comprovante e escolham uma ação abaixo:`,
        components: [adminRow]
      });
      return;
    }

    if (customId.startsWith('cart_admin_deliver:')) {
      const cartId = customId.split(':')[1];
      const isGlobalOwner = interaction.user.id === '1517970601342664768';
      const isAdmin = interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;
      if (!isAdmin) {
        return interaction.reply({ content: '❌ Apenas Administradores podem registrar a entrega de produtos.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`cart_delivery_modal:${cartId}`)
        .setTitle(`Entrega do Pedido #${cartId.slice(0, 8)}`);

      const deliveryInput = new TextInputBuilder()
        .setCustomId('delivery_content')
        .setLabel('Link, Conta ou Instruções de Entrega')
        .setPlaceholder('Cole aqui o link do convite, login/senha, chave de ativação ou instruções de entrega...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(deliveryInput));
      return interaction.showModal(modal);
    }

    if (customId.startsWith('cart_keep_ticket:')) {
      const cartId = customId.split(':')[1];
      const isGlobalOwner = interaction.user.id === '1517970601342664768';
      const isAdmin = interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;
      if (!isAdmin) {
        return interaction.reply({ content: '❌ Apenas Administradores podem gerenciar o atendimento.', ephemeral: true });
      }

      const cart = CartService.getCart(cartId, this.db);
      const customerPing = cart ? `<@${cart.user_id}>` : 'Cliente';

      const staffActionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`cart_admin_deliver:${cartId}`)
          .setLabel('Entregar Produto Agora')
          .setEmoji('📦')
          .setStyle(ButtonStyle.Success)
      );

      return interaction.reply({
        content: `🎫 **Atendimento em Andamento!**\nOlá ${customerPing}, a equipe da BlackShop já confirmou o seu pagamento e está preparando o seu pedido diretamente com o fornecedor!\nVocê pode conversar com nossa equipe por este canal. Assim que estiver pronto, entregaremos imediatamente.`,
        components: [staffActionRow]
      });
    }

    if (customId.startsWith('cart_admin_approve:')) {
      const cartId = customId.split(':')[1];
      const isGlobalOwner = interaction.user.id === '1517970601342664768';
      const isAdmin = interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;
      if (!isAdmin) {
        return interaction.reply({ content: '❌ Apenas Administradores podem aprovar e entregar pedidos.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`cart_delivery_modal:${cartId}`)
        .setTitle(`Entrega do Pedido #${cartId.slice(0, 8)}`);

      const deliveryInput = new TextInputBuilder()
        .setCustomId('delivery_content')
        .setLabel('Link, Conta ou Instruções de Entrega')
        .setPlaceholder('Cole aqui o link do convite, login/senha, chave de ativação ou instruções de entrega...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(deliveryInput));
      return interaction.showModal(modal);
    }

    if (customId.startsWith('cart_cancel_btn:')) {
      const cartId = customId.split(':')[1];
      const cart = CartService.getCart(cartId, this.db);

      const isGlobalOwner = interaction.user.id === '1517970601342664768';
      const isGuildOwner = interaction.guild?.ownerId === interaction.user.id;
      const hasDirecao = interaction.member?.roles?.cache?.some(r => r.name.toLowerCase().includes('direção') || r.name.toLowerCase().includes('direcao'));
      const isAdmin = interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner || isGuildOwner || hasDirecao;
      const isCartOwner = cart ? interaction.user.id === cart.user_id : true;

      // Permite o cancelamento se for o próprio cliente ou se for da equipe/Direção
      if (!isCartOwner && !isAdmin) {
        return interaction.reply({
          content: '❌ **Apenas o dono deste carrinho ou a Direção pode cancelá-lo.**',
          ephemeral: true
        });
      }

      if (cartId) {
        try {
          this.db.prepare("UPDATE cart_orders SET status = 'CANCELLED', updated_at = datetime('now', 'utc') WHERE cart_id = ?").run(cartId);
        } catch {}
      }

      const who = (cart && interaction.user.id === cart.user_id) ? 'pelo cliente' : 'pela Direção';
      await interaction.reply(`🗑️ **Carrinho cancelado ${who}!** Este canal será excluído em 5 segundos...`);
      setTimeout(() => {
        interaction.channel.delete(`Carrinho cancelado ${who}`).catch(() => {});
      }, 5000);
      return;
    }

    // 10. Checkout Legado / Cancelamento
    if (customId.startsWith('shop_checkout:')) {
      const selected = customId.split(':')[1];
      return CartService.handleProductSelect(interaction, selected, this.db);
    }

    // 10. Cancelar Checkout
    if (customId === 'shop_cancel_checkout') {
      return interaction.update({ content: '❌ Compra cancelada.', embeds: [], components: [] });
    }

    // 11. Sorteios - Participar / Sair
    if (customId.startsWith('giveaway_enter:')) {
      const giveawayId = parseInt(customId.split(':')[1], 10);
      const giveaway = this.db.prepare('SELECT * FROM giveaways WHERE id = ?').get(giveawayId);
      if (!giveaway || giveaway.status !== 'ACTIVE') {
        return interaction.reply({ content: '❌ Este sorteio já foi encerrado!', ephemeral: true });
      }

      const exists = this.db.prepare('SELECT 1 FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?').get(giveawayId, interaction.user.id);
      if (exists) {
        this.db.prepare('DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?').run(giveawayId, interaction.user.id);
        const countRow = this.db.prepare('SELECT COUNT(*) as c FROM giveaway_entries WHERE giveaway_id = ?').get(giveawayId);

        const updatedRow = ActionRowBuilder.from(interaction.message.components[0]);
        updatedRow.components[0].setLabel(`Participar (${countRow.c})`);
        await interaction.message.edit({ components: [updatedRow] }).catch(() => {});

        return interaction.reply({ content: '❌ Você removeu sua participação do sorteio.', ephemeral: true });
      } else {
        this.db.prepare('INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)').run(giveawayId, interaction.user.id);
        const countRow = this.db.prepare('SELECT COUNT(*) as c FROM giveaway_entries WHERE giveaway_id = ?').get(giveawayId);

        const updatedRow = ActionRowBuilder.from(interaction.message.components[0]);
        updatedRow.components[0].setLabel(`Participar (${countRow.c})`);
        await interaction.message.edit({ components: [updatedRow] }).catch(() => {});

        return interaction.reply({ content: '🎉 **Você entrou no sorteio com sucesso!** Boa sorte!', ephemeral: true });
      }
    }

    // 12. Sugestões - Votação
    if (customId.startsWith('sugg_up:') || customId.startsWith('sugg_down:')) {
      const isUp = customId.startsWith('sugg_up:');
      const suggId = parseInt(customId.split(':')[1], 10);
      const voteType = isUp ? 1 : -1;

      this.db.prepare(`
        INSERT INTO suggestion_votes (suggestion_id, user_id, vote_type)
        VALUES (?, ?, ?)
        ON CONFLICT(suggestion_id, user_id) DO UPDATE SET vote_type = excluded.vote_type
      `).run(suggId, interaction.user.id, voteType);

      const upVotes = this.db.prepare('SELECT COUNT(*) as c FROM suggestion_votes WHERE suggestion_id = ? AND vote_type = 1').get(suggId)?.c || 0;
      const downVotes = this.db.prepare('SELECT COUNT(*) as c FROM suggestion_votes WHERE suggestion_id = ? AND vote_type = -1').get(suggId)?.c || 0;

      const updatedRow = ActionRowBuilder.from(interaction.message.components[0]);
      updatedRow.components[0].setLabel(`Apoio (${upVotes})`);
      updatedRow.components[1].setLabel(`Não Apoio (${downVotes})`);
      await interaction.message.edit({ components: [updatedRow] }).catch(() => {});

      return interaction.reply({ content: `✅ Voto registrado: **${isUp ? 'Apoio' : 'Não Apoio'}**!`, ephemeral: true });
    }

    // 13. Painel de Notificações - Alternar Cargos
    if (customId.startsWith('toggle_role:')) {
      const roleId = customId.split(':')[1];
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        return interaction.reply({ content: '❌ Cargo não encontrado no servidor.', ephemeral: true });
      }

      if (interaction.member.roles.cache.has(roleId)) {
        await interaction.member.roles.remove(role, 'Notificação desativada pelo usuário').catch(() => {});
        return interaction.reply({ content: `🔕 Notificação desativada! O cargo **${role.name}** foi removido.`, ephemeral: true });
      } else {
        await interaction.member.roles.add(role, 'Notificação ativada pelo usuário').catch(() => {});
        return interaction.reply({ content: `🔔 Notificação ativada com sucesso! Você recebeu o cargo **${role.name}**.`, ephemeral: true });
      }
    }
  }

  async handleModalSubmit(interaction) {
    const { customId, fields } = interaction;
    if (customId.startsWith('cart_coupon_modal:')) {
      const cartId = customId.split(':')[1];
      const couponCode = fields.getTextInputValue('coupon_input');
      const result = CartService.applyCoupon(cartId, couponCode, this.db);
      
      const cart = CartService.getCart(cartId, this.db);
      if (cart) {
        await CartService.updateCartMessage(interaction.channel, cart, interaction.guild);
      }
      return interaction.reply({ content: result.message, ephemeral: true });
    }

    if (customId.startsWith('cart_delivery_modal:')) {
      const cartId = customId.split(':')[1];
      const deliveryContent = fields.getTextInputValue('delivery_content');

      await interaction.reply({
        content: '⏳ **Processando entrega, enviando na DM do cliente e registrando no canal de entregas...**',
        ephemeral: true
      });

      try {
        await CartService.completeOrderAndDeliver(cartId, interaction.client, this.db, interaction.user, deliveryContent);
        return interaction.editReply({
          content: '✅ **Produto entregue com sucesso!** O cliente recebeu os dados no privado e o comprovante foi publicado em <#1562634795781988404>.'
        });
      } catch (err) {
        console.error('Erro na entrega manual:', err);
        return interaction.editReply({
          content: `❌ **Erro ao processar entrega:** ${err.message}`
        });
      }
    }
  }

  async handleTicketCreate(interaction) {
    const { guild, user } = interaction;
    await interaction.deferReply({ ephemeral: true });

    // Verificar se usuário já possui ticket aberto
    const existing = this.db.prepare(`
      SELECT channel_id FROM tickets WHERE guild_id = ? AND creator_id = ? AND status != 'CLOSED'
    `).get(guild.id, user.id);

    if (existing && guild.channels.cache.has(existing.channel_id)) {
      return interaction.editReply({
        content: `⚠️ Você já possui um atendimento em aberto em <#${existing.channel_id}>!`
      });
    }

    try {
      const nextNumRow = this.db.prepare('SELECT COALESCE(MAX(ticket_number), 0) + 1 AS next_num FROM tickets WHERE guild_id = ?').get(guild.id);
      const ticketNum = nextNumRow.next_num;

      // Localizar categoria de suporte
      const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const cat = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes('SUPORTE'));

      // Criar canal privado
      const ticketChannel = await guild.channels.create({
        name: `ticket-${String(ticketNum).padStart(4, '0')}`,
        type: ChannelType.GuildText,
        parent: cat ? cat.id : null,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
          },
          {
            id: guild.members.me.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
          }
        ]
      });

      // Se houver cargo de Direção, Moderador ou Staff, permite visualizar
      const direcaoRole = guild.roles.cache.find(r => r.name.toLowerCase().includes('direção') || r.name.toLowerCase().includes('direcao'));
      const staffRole = guild.roles.cache.find(r => r.name.includes('Moderador') || r.name.includes('Suporte') || r.name.includes('Administrador'));

      if (direcaoRole) {
        await ticketChannel.permissionOverwrites.create(direcaoRole.id, {
          ViewChannel: true,
          SendMessages: true,
          AttachFiles: true,
          ReadMessageHistory: true
        });
      }

      if (staffRole) {
        await ticketChannel.permissionOverwrites.create(staffRole.id, {
          ViewChannel: true,
          SendMessages: true,
          AttachFiles: true,
          ReadMessageHistory: true
        });
      }

      // Salva no SQLite
      this.db.prepare(`
        INSERT INTO tickets (ticket_number, guild_id, channel_id, creator_id, status)
        VALUES (?, ?, ?, ?, 'OPEN')
      `).run(ticketNum, guild.id, ticketChannel.id, user.id);

      // Envia embed inicial com botão de encerrar
      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close_btn')
          .setLabel('Encerrar Atendimento')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      const welcomeEmbed = new EmbedBuilder()
        .setTitle(`🎫 Ticket #${String(ticketNum).padStart(4, '0')}`)
        .setDescription(`Olá, ${user}! A equipe de suporte foi notificada e em breve irá atendê-lo(a).\nPor favor, descreva detalhadamente sua dúvida ou solicitação.\n\nPara encerrar este atendimento, clique no botão vermelho abaixo.`)
        .setColor(0x5865F2)
        .setTimestamp();

      await ticketChannel.send({ content: `${user} | <@&${staffRole ? staffRole.id : ''}>`, embeds: [welcomeEmbed], components: [closeRow] });

      return interaction.editReply({
        content: `✅ Seu ticket foi aberto com sucesso em ${ticketChannel}!`
      });
    } catch (err) {
      console.error('[Ticket Create] Erro ao criar canal de ticket:', err);
      return interaction.editReply({
        content: `❌ Ocorreu um erro ao abrir seu ticket: ${err.message}`
      });
    }
  }

  async handleTicketCloseBtn(interaction) {
    const { channel, user, guild } = interaction;
    await interaction.reply({ content: '🔒 **Encerrando ticket em 5 segundos...**' });

    this.db.prepare(`
      UPDATE tickets
      SET status = 'CLOSED', closed_by = ?, closed_at = datetime('now', 'utc'), updated_at = datetime('now', 'utc')
      WHERE channel_id = ?
    `).run(user.id, channel.id);

    setTimeout(() => {
      channel.delete('Ticket encerrado pelo usuário via botão').catch(() => {});
    }, 5000);
  }

  async handleSlashCommand(interaction) {
    const { commandName, options, guild, member, user } = interaction;
    const { EmbedBuilder } = require('discord.js');

    // /avatar
    if (commandName === 'avatar') {
      const targetUser = options.getUser('usuario') || user;
      const avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 4096 });
      const embed = new EmbedBuilder()
        .setTitle(`🖼️ Avatar de ${targetUser.tag}`)
        .setDescription(`[Clique aqui para abrir em tamanho original](${avatarUrl})`)
        .setImage(avatarUrl)
        .setColor(0x5865F2)
        .setFooter({ text: `Solicitado por ${user.tag}` })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // /servidor
    if (commandName === 'servidor') {
      const embed = new EmbedBuilder()
        .setTitle(`🏰 Informações do Servidor: ${guild.name}`)
        .setColor(0x5865F2)
        .setThumbnail(guild.iconURL({ dynamic: true }) || null)
        .addFields(
          { name: 'ID do Servidor', value: `\`${guild.id}\``, inline: true },
          { name: 'Dono (Owner)', value: `<@${guild.ownerId}> (\`${guild.ownerId}\`)`, inline: true },
          { name: 'Membros Totais', value: `${guild.memberCount}`, inline: true },
          { name: 'Canais', value: `${guild.channels.cache.size}`, inline: true },
          { name: 'Cargos', value: `${guild.roles.cache.size}`, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // /ajuda
    if (commandName === 'ajuda') {
      const embed = new EmbedBuilder()
        .setTitle('🤖 Nexora Bot - Comandos e Funcionalidades')
        .setDescription('Você pode executar comandos usando **/** (Slash Commands), com o prefixo **?** ou me mencionando **@Nexora**!')
        .setColor(0x5865F2)
        .addFields(
          { name: '🛠️ Moderação', value: '`/ban`, `/kick`, `/timeout`, `/advertir`, `/avisos`, `/limpar`, `/quarentena`' },
          { name: '👑 Cargos & Setup', value: '`/cargo listar`, `/cargo setup`, `/autoserver`' },
          { name: 'ℹ️ Informações', value: '`/servidor`, `/avatar`, `/ajuda`' },
          { name: '💻 Painel Web', value: '[Acessar Painel de Controle](http://localhost:5173)' }
        )
        .setFooter({ text: 'Bot Multifuncional Avançado' });
      return interaction.reply({ embeds: [embed] });
    }

    // /autoserver
    if (commandName === 'autoserver') {
      await interaction.deferReply();
      // Chama o executor do autoserver simulando mensagem ou executando direto
      const autoserverCmd = require('../commands/utilidades/autoserver');
      const fakeMsg = {
        guild,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts)
      };
      return autoserverCmd.execute({
        message: fakeMsg,
        authService: this.authService,
        db: this.db,
        auditRepo: new (require('../../database/repositories/auditRepository'))(this.db)
      });
    }

    // /cargo
    if (commandName === 'cargo') {
      const sub = options.getSubcommand();
      if (sub === 'listar') {
        const roles = guild.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position);
        const list = roles.map(r => `${r.name} (\`${r.id}\`)`).slice(0, 25).join('\n');
        const embed = new EmbedBuilder()
          .setTitle(`🛡️ Cargos do Servidor: ${guild.name}`)
          .setDescription(list || 'Nenhum cargo encontrado.')
          .setColor(0x5865F2);
        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'setup') {
        await interaction.deferReply();
        const fakeMsg = { guild, member, author: user, reply: (opts) => interaction.editReply(opts) };
        const cargoCmd = require('../commands/cargos/cargo');
        return cargoCmd.execute({
          message: fakeMsg,
          args: ['setup'],
          authService: this.authService,
          db: this.db,
          auditRepo: new (require('../../database/repositories/auditRepository'))(this.db)
        });
      }

      if (sub === 'todos' || sub === 'mass') {
        const cargoTodosCmd = require('../commands/cargos/cargotodos');
        const roleOpt = options.getRole('cargo');
        const args = roleOpt ? [roleOpt.id] : [];
        return cargoTodosCmd.execute({
          interaction,
          args,
          authService: this.authService,
          db: this.db,
          auditRepo: new (require('../../database/repositories/auditRepository'))(this.db)
        });
      }
    }

    // /cargotodos
    if (commandName === 'cargotodos' || commandName === 'membros') {
      const cargoTodosCmd = require('../commands/cargos/cargotodos');
      const roleOpt = options.getRole('cargo');
      const args = roleOpt ? [roleOpt.id] : [];
      return cargoTodosCmd.execute({
        interaction,
        args,
        authService: this.authService,
        db: this.db,
        auditRepo: new (require('../../database/repositories/auditRepository'))(this.db)
      });
    }

    // /cupom
    if (commandName === 'cupom') {
      const cupomCmd = require('../commands/vendas/cupom');
      return cupomCmd.execute({
        interaction,
        db: this.db
      });
    }

    // /sorteio
    if (commandName === 'sorteio') {
      const sorteioCmd = require('../commands/utilidades/sorteio');
      return sorteioCmd.execute({ interaction, db: this.db });
    }

    // /anuncio
    if (commandName === 'anuncio') {
      const anuncioCmd = require('../commands/utilidades/anuncio');
      return anuncioCmd.execute({ interaction, db: this.db });
    }

    // /aviso
    if (commandName === 'aviso') {
      const avisoCmd = require('../commands/utilidades/aviso');
      return avisoCmd.execute({ interaction, db: this.db });
    }

    // /reestoque
    if (commandName === 'reestoque') {
      const reestoqueCmd = require('../commands/vendas/reestoque');
      return reestoqueCmd.execute({ interaction, db: this.db });
    }

    // /sugestao
    if (commandName === 'sugestao') {
      const sugestaoCmd = require('../commands/utilidades/sugestao');
      return sugestaoCmd.execute({ interaction, db: this.db });
    }

    // /avaliar
    if (commandName === 'avaliar') {
      const avaliarCmd = require('../commands/vendas/avaliar');
      return avaliarCmd.execute({ interaction, db: this.db });
    }

    // /minhascompras
    if (commandName === 'minhascompras') {
      const comprasCmd = require('../commands/vendas/minhascompras');
      return comprasCmd.execute({ interaction, db: this.db });
    }

    // /protecao
    if (commandName === 'protecao') {
      const sub = options.getSubcommand();
      const rules = this.db.prepare('SELECT * FROM protection_rules WHERE guild_id = ?').all(guild.id);

      if (sub === 'status') {
        const embed = new EmbedBuilder()
          .setTitle(`🛡️ Status da Proteção Automática - ${guild.name}`)
          .setColor(0x5865F2)
          .setDescription('Regras ativas contra spam, flood e ataques:')
          .setTimestamp();

        if (rules.length === 0) {
          embed.setDescription('Nenhuma regra configurada ainda. Use `/protecao configurar` para ativar o pacote recomendado!');
        } else {
          rules.forEach(r => {
            embed.addFields({
              name: `⚙️ ${r.rule_name.toUpperCase()} [${r.is_enabled ? '🟢 ATIVA' : '🔴 INATIVA'}]`,
              value: `• **Limite:** ${r.threshold_limit} vezes em ${r.threshold_interval_seconds}s\n• **Castigo:** \`${r.action_type}\` (${r.action_duration_seconds} segundos)`
            });
          });
        }

        return interaction.reply({ embeds: [embed] });
      }

      if (sub === 'configurar') {
        const defaultRules = [
          { name: 'anti_spam', limit: 5, interval: 4, action: 'TIMEOUT', duration: 300 },
          { name: 'anti_mass_mention', limit: 4, interval: 1, action: 'TIMEOUT', duration: 600 },
          { name: 'anti_repeat', limit: 3, interval: 8, action: 'TIMEOUT', duration: 300 }
        ];

        for (const dr of defaultRules) {
          this.db.prepare(`
            INSERT INTO protection_rules (guild_id, rule_name, threshold_limit, threshold_interval_seconds, action_type, action_duration_seconds, is_enabled)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(guild_id, rule_name) DO UPDATE SET is_enabled = 1
          `).run(guild.id, dr.name, dr.limit, dr.interval, dr.action, dr.duration);
        }

        return interaction.reply({
          content: '✅ **Regras de Proteção Ativadas!** O bot agora aplicará castigo automático para flood, repetições abusivas e menções em massa.',
          ephemeral: true
        });
      }
    }

    // /limpar
    if (commandName === 'limpar') {
      const amount = options.getInteger('quantidade');
      await interaction.deferReply({ ephemeral: true });
      try {
        const deleted = await interaction.channel.bulkDelete(amount, true);
        return interaction.editReply({ content: `🧹 Foram excluídas **${deleted.size} mensagens** com sucesso!` });
      } catch (err) {
        return interaction.editReply({ content: `❌ Erro ao apagar mensagens: ${err.message}` });
      }
    }

    // /autoloja
    if (commandName === 'autoloja') {
      await interaction.deferReply();
      const autolojaCmd = require('../commands/vendas/autoloja');
      const fakeMessage = {
        guild,
        member,
        author: user,
        client: interaction.client,
        reply: (opts) => interaction.editReply(opts)
      };
      return autolojaCmd.execute({
        message: fakeMessage,
        guild,
        member,
        author: user
      });
    }

    // /painel-nitro
    if (commandName === 'painel-nitro') {
      await interaction.deferReply({ ephemeral: true });
      const painelCmd = require('../commands/vendas/painel');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Contas Nitrada postado com sucesso neste canal!' });
    }

    // /painel-link
    if (commandName === 'painel-link') {
      await interaction.deferReply({ ephemeral: true });
      const painelLinkCmd = require('../commands/vendas/painel-link');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelLinkCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Nitro Link postado com sucesso neste canal!' });
    }

    // /painel-impulsos
    if (commandName === 'painel-impulsos') {
      await interaction.deferReply({ ephemeral: true });
      const painelImpulsosCmd = require('../commands/vendas/painel-impulsos');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelImpulsosCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Impulsos postado com sucesso neste canal!' });
    }

    // /painel-antigas
    if (commandName === 'painel-antigas') {
      await interaction.deferReply({ ephemeral: true });
      const painelAntigasCmd = require('../commands/vendas/painel-antigas');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelAntigasCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Contas Antigas postado com sucesso neste canal!' });
    }

    // /painel-membros
    if (commandName === 'painel-membros') {
      await interaction.deferReply({ ephemeral: true });
      const painelMembrosCmd = require('../commands/vendas/painel-membros');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelMembrosCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Membros Reais postado com sucesso neste canal!' });
    }

    // /painel-ativacao
    if (commandName === 'painel-ativacao') {
      await interaction.deferReply({ ephemeral: true });
      const painelAtivacaoCmd = require('../commands/vendas/painel-ativacao');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelAtivacaoCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Ativação Nitro Link postado com sucesso neste canal!' });
    }

    // /painel-external
    if (commandName === 'painel-external') {
      await interaction.deferReply({ ephemeral: true });
      const painelExternalCmd = require('../commands/vendas/painel-external');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelExternalCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Emulador External postado com sucesso neste canal!' });
    }

    // /painel-xit
    if (commandName === 'painel-xit') {
      await interaction.deferReply({ ephemeral: true });
      const painelXitCmd = require('../commands/vendas/painel-xit');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelXitCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Xit Free Fire postado com sucesso neste canal!' });
    }

    // /painel-pescoco
    if (commandName === 'painel-pescoco') {
      await interaction.deferReply({ ephemeral: true });
      const painelPescocoCmd = require('../commands/vendas/painel-pescoco');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelPescocoCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de HS Pescoço postado com sucesso neste canal!' });
    }

    // /painel-holograma
    if (commandName === 'painel-holograma') {
      await interaction.deferReply({ ephemeral: true });
      const painelHologramaCmd = require('../commands/vendas/painel-holograma');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelHologramaCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Holograma + Auxílio postado com sucesso neste canal!' });
    }

    // /painel-aimbot
    if (commandName === 'painel-aimbot') {
      await interaction.deferReply({ ephemeral: true });
      const painelAimbotCmd = require('../commands/vendas/painel-aimbot');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelAimbotCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Aimbot Mobile postado com sucesso neste canal!' });
    }

    // /painel-otimizacao
    if (commandName === 'painel-otimizacao') {
      await interaction.deferReply({ ephemeral: true });
      const painelOtimCmd = require('../commands/vendas/painel-otimizacao');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelOtimCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Pack de Otimização postado com sucesso neste canal!' });
    }

    // /painel-youtube
    if (commandName === 'painel-youtube') {
      await interaction.deferReply({ ephemeral: true });
      const painelYtCmd = require('../commands/vendas/painel-youtube');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelYtCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de YouTube Premium postado com sucesso neste canal!' });
    }

    // /painel-spotify
    if (commandName === 'painel-spotify') {
      await interaction.deferReply({ ephemeral: true });
      const painelSpotCmd = require('../commands/vendas/painel-spotify');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelSpotCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Spotify Premium postado com sucesso neste canal!' });
    }

    // /painel-gerador
    if (commandName === 'painel-gerador') {
      await interaction.deferReply({ ephemeral: true });
      const painelGenCmd = require('../commands/vendas/painel-gerador');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelGenCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Gerador de Assinaturas postado com sucesso neste canal!' });
    }

    // /painel-gamepass
    if (commandName === 'painel-gamepass') {
      await interaction.deferReply({ ephemeral: true });
      const painelGpCmd = require('../commands/vendas/painel-gamepass');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelGpCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Xbox Game Pass postado com sucesso neste canal!' });
    }

    // /painel-minecraft
    if (commandName === 'painel-minecraft') {
      await interaction.deferReply({ ephemeral: true });
      const painelMcCmd = require('../commands/vendas/painel-minecraft');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelMcCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Minecraft postado com sucesso neste canal!' });
    }

    // /painel-steamgames
    if (commandName === 'painel-steamgames') {
      await interaction.deferReply({ ephemeral: true });
      const painelSgCmd = require('../commands/vendas/painel-steamgames');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelSgCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Contas Steam postado com sucesso neste canal!' });
    }

    // /painel-cs2
    if (commandName === 'painel-cs2') {
      await interaction.deferReply({ ephemeral: true });
      const painelCsCmd = require('../commands/vendas/painel-cs2');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelCsCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de CS2 External postado com sucesso neste canal!' });
    }

    // /painel-steamhours
    if (commandName === 'painel-steamhours') {
      await interaction.deferReply({ ephemeral: true });
      const painelShCmd = require('../commands/vendas/painel-steamhours');
      const fakeMessage = {
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts),
        delete: async () => {}
      };
      await painelShCmd.execute({ message: fakeMessage });
      return interaction.editReply({ content: '✅ Painel de Steam Hours postado com sucesso neste canal!' });
    }

    // /entregar
    if (commandName === 'entregar') {
      await interaction.deferReply({ ephemeral: true });
      const entregarCmd = require('../commands/vendas/entregar');
      return entregarCmd.execute({ interaction });
    }

    // /dollynho
    if (commandName === 'dollynho') {
      await interaction.deferReply();
      const dollynhoCmd = require('../commands/utilidades/dollynho');
      const fakeMessage = {
        guild,
        channel: interaction.channel,
        member,
        author: user,
        reply: (opts) => interaction.editReply(opts)
      };
      return dollynhoCmd.execute({ message: fakeMessage, guild, member, author: user });
    }

    // /config-pix
    if (commandName === 'config-pix') {
      const configPixCmd = require('../commands/utilidades/config-pix');
      return configPixCmd.execute({ interaction, db: this.db });
    }

    // Default fallback
    return interaction.reply({
      content: `⚡ Comando de barra \`/${commandName}\` recebido e processado com sucesso!`,
      ephemeral: true
    });
  }

  async handleRolePanelSelect(interaction) {
    const { guild, member, values } = interaction;
    await interaction.deferReply({ ephemeral: true });

    const botMember = guild.members.me;
    const addedRoles = [];
    const removedRoles = [];
    const errors = [];

    // Buscar painel no banco para validar se os cargos pertencem a esta configuração
    const panel = this.db.prepare(
      'SELECT roles_json FROM role_panels WHERE message_id = ?'
    ).get(interaction.message.id);

    const allowedRoleIds = new Set();
    if (panel) {
      try {
        const parsed = JSON.parse(panel.roles_json);
        parsed.forEach(r => allowedRoleIds.add(r.role_id));
      } catch {
        // fallback
      }
    }

    for (const roleId of values) {
      if (allowedRoleIds.size > 0 && !allowedRoleIds.has(roleId)) {
        continue;
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) continue;

      if (role.position >= botMember.roles.highest.position) {
        errors.push(`O cargo ${role.name} é superior ao cargo do bot e não pode ser gerenciado.`);
        continue;
      }

      try {
        if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role, 'Auto-remoção via painel interativo');
          removedRoles.push(role.name);
        } else {
          await member.roles.add(role, 'Auto-atribuição via painel interativo');
          addedRoles.push(role.name);
        }
      } catch (err) {
        errors.push(`Erro ao alterar o cargo ${role.name}: ${err.message}`);
      }
    }

    const messages = [];
    if (addedRoles.length > 0) messages.push(`✅ **Cargos adicionados:** ${addedRoles.join(', ')}`);
    if (removedRoles.length > 0) messages.push(`🗑️ **Cargos removidos:** ${removedRoles.join(', ')}`);
    if (errors.length > 0) messages.push(`⚠️ **Avisos:**\n${errors.join('\n')}`);

    if (messages.length === 0) {
      messages.push('Nenhuma alteração foi realizada.');
    }

    return interaction.editReply({ content: messages.join('\n') });
  }

  async handleConfirmationButton(interaction) {
    const [actionPrefix, token] = interaction.customId.split(':');
    const { guild, user } = interaction;

    if (actionPrefix === 'cancel_action') {
      this.confirmationsRepo.consumeConfirmation(token);
      return interaction.update({
        content: '❌ **Operação cancelada** pelo usuário.',
        components: []
      });
    }

    if (actionPrefix === 'confirm_action') {
      const validation = this.confirmationsRepo.getAndValidateConfirmation(
        token,
        guild.id,
        user.id,
        interaction.message.flags?.actionType || 'GENERIC'
      );

      if (!validation.valid) {
        return interaction.reply({
          content: `🚫 Não foi possível executar a confirmação: ${validation.error}`,
          ephemeral: true
        });
      }

      // Marcar como consumida
      this.confirmationsRepo.consumeConfirmation(token);

      return interaction.update({
        content: '✅ **Ação crítica confirmada com sucesso!** Executando operação...',
        components: []
      });
    }
  }

  // ==========================================
  // Interações do Canal de Setups
  // ==========================================

  async handleSetupLike(interaction) {
    const { customId, user } = interaction;
    const messageId = customId.split(':')[1];

    const post = this.db.prepare('SELECT * FROM setup_posts WHERE message_id = ?').get(messageId);
    if (!post) {
      return interaction.reply({ content: '⚠️ Publicação não encontrada nos registros.', ephemeral: true });
    }

    let likesUsers = [];
    try {
      likesUsers = JSON.parse(post.likes_users_json || '[]');
    } catch {}

    const hasLiked = likesUsers.includes(user.id);
    if (hasLiked) {
      likesUsers = likesUsers.filter(id => id !== user.id);
    } else {
      likesUsers.push(user.id);
    }

    const newLikesCount = likesUsers.length;
    this.db.prepare(`
      UPDATE setup_posts 
      SET likes_count = ?, likes_users_json = ? 
      WHERE message_id = ?
    `).run(newLikesCount, JSON.stringify(likesUsers), messageId);

    // Atualizar os botões da mensagem
    const originalRow = interaction.message.components[0];
    if (originalRow) {
      const updatedComponents = originalRow.components.map(comp => {
        const btn = ButtonBuilder.from(comp);
        if (comp.customId?.startsWith('setup_like:')) {
          btn.setLabel(`${hasLiked ? '🤍' : '❤️'} ${newLikesCount}`);
        }
        return btn;
      });

      await interaction.update({ components: [new ActionRowBuilder().addComponents(updatedComponents)] });
      return interaction.followUp({
        content: hasLiked ? '💔 Você removeu sua curtida deste setup.' : '❤️ Você curtiu este setup!',
        ephemeral: true
      });
    }

    return interaction.reply({
      content: hasLiked ? '💔 Você removeu sua curtida deste setup.' : '❤️ Você curtiu este setup!',
      ephemeral: true
    });
  }

  async handleSetupThread(interaction) {
    const { message, user } = interaction;

    try {
      let thread = message.thread;
      if (!thread) {
        // Obter nome do autor no post
        const post = this.db.prepare('SELECT author_tag FROM setup_posts WHERE message_id = ?').get(message.id);
        const nameAuthor = post?.author_tag?.split('#')[0] || 'membro';

        thread = await message.startThread({
          name: `💬 Setup de ${nameAuthor}`,
          autoArchiveDuration: 1440,
          reason: `Criado por ${user.tag} para comentar o setup`
        });

        await thread.send(`👋 Sejam bem-vindos! Usem este tópico para conversar, tirar dúvidas sobre as peças e elogiar o setup.`);
      }

      return interaction.reply({
        content: `💬 O tópico para conversar sobre este setup está disponível em: <#${thread.id}>`,
        ephemeral: true
      });
    } catch (err) {
      return interaction.reply({
        content: `❌ Não foi possível abrir o tópico: ${err.message}`,
        ephemeral: true
      });
    }
  }

  async handleSetupDelete(interaction) {
    const { customId, user, member, message } = interaction;
    const parts = customId.split(':');
    const messageId = parts[1];
    const authorId = parts[2];

    const isAuthor = user.id === authorId;
    const isStaff = member.permissions.has('Administrator') || member.permissions.has('ManageMessages') || this.authService.isGlobalOwner(user.id);

    if (!isAuthor && !isStaff) {
      return interaction.reply({
        content: '🚫 Apenas o autor desta publicação ou moderadores do servidor podem excluí-la.',
        ephemeral: true
      });
    }

    try {
      this.db.prepare('DELETE FROM setup_posts WHERE message_id = ?').run(messageId);
      await message.delete();
      return interaction.reply({
        content: '🗑️ Publicação do setup excluída com sucesso.',
        ephemeral: true
      });
    } catch (err) {
      return interaction.reply({
        content: `❌ Falha ao excluir setup: ${err.message}`,
        ephemeral: true
      });
    }
  }

  // ==========================================
  // Interações de Vendas da Loja
  // ==========================================

  async handleShopSelectNitro(interaction) {
    const selected = interaction.values[0];

    if (selected === 'nitro_3m') {
      return interaction.reply({
        content: '❌ **Produto Esgotado!** No momento não temos estoque para **Conta com 3 Mês de nitro**. Ative as notificações para ser avisado quando houver reposição!',
        ephemeral: true
      });
    }

    const products = {
      nitro_1m: { name: 'Conta com 1 Mês de nitro ativado / 2X IMPULSOS', price: 'R$ 5,99', stock: 7 },
      nitro_1y: { name: 'Conta Com 1 Ano de nitro (12 Mês) / 2X IMPULSOS', price: 'R$ 13,99', stock: 4 }
    };

    const prod = products[selected];
    if (!prod) {
      return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0xFEE75C)
      .setDescription(
        `Você selecionou:\n### 📦 **${prod.name}**\n\n` +
        `💰 **Valor Unitário:** \`${prod.price}\`\n` +
        `📦 **Estoque Disponível:** \`${prod.stock} unidades\`\n` +
        `⚡ **Entrega:** Automática no privado (DM) ou canal do pedido após a confirmação\n` +
        `🛡️ **Garantia:** 100% Full Acesso com Suporte`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_checkout:${selected}`)
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopSelectNitroLink(interaction) {
    const selected = interaction.values[0];

    if (selected === 'link_1m') {
      return interaction.reply({
        content: '❌ **Produto Esgotado!** No momento não temos links mensais em estoque. Acompanhe as reposições no canal de avisos!',
        ephemeral: true
      });
    }

    const products = {
      link_3m: { name: 'Nitro Link trimensal (3mes)', price: 'R$ 8,99', stock: 12 }
    };

    const prod = products[selected];
    if (!prod) {
      return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x57F287)
      .setDescription(
        `Você selecionou:\n### 🔗 **${prod.name}**\n\n` +
        `💰 **Valor Unitário:** \`${prod.price}\`\n` +
        `📦 **Estoque Disponível:** \`${prod.stock} unidades\`\n` +
        `⚡ **Entrega:** Automática no privado (DM) ou canal do pedido após a confirmação\n` +
        `🛡️ **Garantia:** Válida no momento da compra (Grave a tela!)`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_checkout:${selected}`)
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopSelectBoosting(interaction) {
    const selected = interaction.values[0];

    const products = {
      boost_2x_30d: { name: '2x Impulsos (Nível 1 - 30 Dias)', price: 'R$ 2,99', stock: 20 },
      boost_7x_30d: { name: '7x Impulsos (Nível 2 - 30 Dias)', price: 'R$ 9,99', stock: 15 },
      boost_14x_30d: { name: '14x Impulsos (Nível 3 - 30 Dias)', price: 'R$ 19,99', stock: 10 },
      boost_14x_3m: { name: '14x Impulsos (Nível 3 - 3 Meses)', price: 'R$ 49,99', stock: 5 },
      boost_14x_1y: { name: '14x Impulsos (Nível 3 - 1 Ano)', price: 'R$ 88,99', stock: 3 }
    };

    const prod = products[selected];
    if (!prod) {
      return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0xEB459E)
      .setDescription(
        `Você selecionou:\n### 🚀 **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** Automática no seu servidor!\n` +
        `🔗 **Requisito:** Apenas envie o link de convite do servidor após o pagamento.`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_checkout:${selected}`)
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopSelectAntigas(interaction) {
    const selected = interaction.values[0];

    if (selected === 'conta_2026') {
      return interaction.reply({
        content: '❌ **Produto Esgotado!** No momento as contas de 2026 estão esgotadas. Acompanhe as reposições no canal de anúncios!',
        ephemeral: true
      });
    }

    const products = {
      conta_2025: { name: 'Conta 2025', price: 'R$ 4,99', stock: 11 },
      conta_2024: { name: 'Conta 2024', price: 'R$ 5,99', stock: 14 },
      conta_2023: { name: 'Conta 2023', price: 'R$ 7,99', stock: 4 },
      conta_2022: { name: 'Conta 2022', price: 'R$ 10,99', stock: 7 },
      conta_2021: { name: 'Conta 2021', price: 'R$ 14,99', stock: 5 },
      conta_2020: { name: 'Conta 2020', price: 'R$ 24,99', stock: 3 },
      conta_2019: { name: 'Conta 2019', price: 'R$ 39,99', stock: 2 },
      conta_2018: { name: 'Conta 2018', price: 'R$ 59,99', stock: 2 },
      conta_2017: { name: 'Conta 2017', price: 'R$ 89,99', stock: 1 },
      conta_2016: { name: 'Conta 2016', price: 'R$ 149,99', stock: 1 },
      conta_2015: { name: 'Conta 2015', price: 'R$ 369,00', stock: 1 }
    };

    const prod = products[selected];
    if (!prod) {
      return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x5865F2)
      .setDescription(
        `Você selecionou:\n### 🧢 **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** 100% Automática e Instantânea via DM\n` +
        `🔒 **Acesso:** Full Acesso (E-mail e senha totalmente editáveis)`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_checkout:${selected}`)
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopSelectMembros(interaction) {
    const selected = interaction.values[0];

    const products = {
      membros_100: { name: '100 - Membros reais', price: 'R$ 4,99', stock: 6 },
      membros_300: { name: '300 - Membros reais', price: 'R$ 13,99', stock: 7 },
      membros_500: { name: '500 - Membros reais', price: 'R$ 20,99', stock: 12 },
      membros_1000: { name: '1000 - Membros reais', price: 'R$ 39,99', stock: 3 }
    };

    const prod = products[selected];
    if (!prod) {
      return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### 👥 **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} pacotes\`\n` +
        `⚡ **Entrega:** Automática e imediata no seu servidor!\n` +
        `🛡️ **Garantia:** Usuários 100% reais, sem risco de ban ou queda`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_checkout:${selected}`)
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopBuyAtivacao(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        'Você selecionou:\n### ⚡ **Ativação NITRO LINK**\n\n' +
        '💰 **Valor:** `R$ 7,99`\n' +
        '📦 **Estoque:** `15 unidades`\n' +
        '⚡ **Entrega:** Nossa equipe realiza a ativação direta na sua conta!\n' +
        '🛡️ **Requisito:** É necessário possuir o Nitro Link comprado (<#1562242446971371550>)'
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_checkout:ativacao_nitro')
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopSelectExternal(interaction) {
    const selected = interaction.values[0];

    const products = {
      external_1d: { name: 'Painel External (1 dia)', price: 'R$ 4,99', stock: 1 },
      external_7d: { name: 'Painel External (7 dia)', price: 'R$ 14,99', stock: 13 },
      external_30d: { name: 'Painel External (30 dia)', price: 'R$ 29,99', stock: 14 },
      external_perm: { name: 'Painel External (Permanente)', price: 'R$ 59,99', stock: 2 }
    };

    const prod = products[selected];
    if (!prod) {
      return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### 🖥️ **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} chaves disponíveis\`\n` +
        `⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n` +
        `🛡️ **Segurança:** 100% Anti-Ban com suporte e atualizações inclusas`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_checkout:${selected}`)
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopBuyXitFF(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        'Você selecionou:\n### 🎯 **PAINEL XIT FREE FIRE • 100% HS (PERMANENTE)**\n\n' +
        '💰 **Valor:** `R$ 5,99`\n' +
        '📦 **Estoque:** `7 unidades disponíveis`\n' +
        '⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n' +
        '📱 **Compatibilidade:** Funciona em Android e iOS\n' +
        '🛡️ **Funções:** Aimbot Smooth, ESP Lines, Regedit VIP, No Recoil'
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_checkout:xit_ff')
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopBuyPescoco(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        'Você selecionou:\n### 🎯 **HS PESCOÇO PERMANENTE**\n\n' +
        '💰 **Valor:** `R$ 4,99`\n' +
        '📦 **Estoque:** `44 unidades disponíveis`\n' +
        '⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n' +
        '🛡️ **Vantagens:** 100% Confiável • 0% Risco de ban ou black'
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_checkout:hs_pescoco')
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopBuyHolograma(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        'Você selecionou:\n### 🔮 **HOLOGRAMA + AUXILIO PERMANENTE**\n\n' +
        '💰 **Valor:** `R$ 6,99`\n' +
        '📦 **Estoque:** `37 unidades disponíveis`\n' +
        '⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n' +
        '🛡️ **Vantagens:** 100% Confiável • 0% Risco de ban ou black'
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_checkout:holograma')
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopBuyAimbot(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        'Você selecionou:\n### 📱 **PAINEL AIM BOT IOS E ANDROID PERMANENTE**\n\n' +
        '💰 **Valor:** `R$ 8,49`\n' +
        '📦 **Estoque:** `22 unidades disponíveis`\n' +
        '⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n' +
        '📖 **Incluso:** Tutorial completo de instalação e uso'
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_checkout:aimbot_mobile')
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopSelectOtimizacao(interaction) {
    const selected = interaction.values[0];

    const products = {
      otim_basico: { name: 'Pack de Otimização (Básico Windows)', price: 'R$ 3,99', stock: 15 },
      otim_vip: { name: 'Pack de Otimização VIP (Completo PC & Jogos)', price: 'R$ 4,99', stock: 20 }
    };

    const prod = products[selected];
    if (!prod) {
      return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### ⚙️ **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n` +
        `📖 **Incluso:** Arquivo .txt com passo a passo e ativação automática`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_checkout:${selected}`)
        .setLabel('💳 Continuar para Pagamento')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('shop_cancel_checkout')
        .setLabel('Cancelar')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }

  async handleShopSelectYouTube(interaction) {
    const selected = interaction.values[0];
    const products = {
      yt_link_1m: { name: 'Youtube premium link – 1 mes', price: 'R$ 2,00', stock: 33 },
      yt_conta_1m: { name: 'Youtube premium na sua conta – 1 mes', price: 'R$ 6,99', stock: 4 }
    };
    const prod = products[selected];
    if (!prod) return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### 📺 **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** Automática e instantânea via DM após o pagamento!`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shop_checkout:${selected}`).setLabel('💳 Continuar para Pagamento').setEmoji('⚡').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_cancel_checkout').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleShopSelectSpotify(interaction) {
    const selected = interaction.values[0];
    if (selected === 'spot_conta_3m') {
      return interaction.reply({ content: '❌ **Produto Esgotado!** No momento a Conta Spotify 3 meses está sem estoque.', ephemeral: true });
    }
    const products = {
      spot_link_1m: { name: 'Spotify 1 mes – LINK', price: 'R$ 1,99', stock: 25 },
      spot_link_3m: { name: 'Spotify 3 mes – LINK', price: 'R$ 3,99', stock: 45 },
      spot_conta_1m: { name: 'Conta Spotify 1 mes', price: 'R$ 7,49', stock: 1 },
      spot_conta_1y: { name: 'Conta Spotify anual (1 ano)', price: 'R$ 19,99', stock: 2 }
    };
    const prod = products[selected];
    if (!prod) return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### 🎶 **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** Automática e instantânea via DM após o pagamento!`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shop_checkout:${selected}`).setLabel('💳 Continuar para Pagamento').setEmoji('⚡').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_cancel_checkout').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleShopSelectGerador(interaction) {
    const selected = interaction.values[0];
    const products = {
      gen_streaming: { name: 'Gerador Netflix/HBO/Disney/Prime Video', price: 'R$ 9,99', stock: 9 },
      gen_yt: { name: 'Gerador de youtube premium', price: 'R$ 7,99', stock: 8 },
      gen_spot: { name: 'Gerador de spotify premium', price: 'R$ 7,99', stock: 5 },
      gen_all: { name: 'TODOS GERADOR A CIMA!', price: 'R$ 14,99', stock: 6 }
    };
    const prod = products[selected];
    if (!prod) return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### 📺 **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** Automática e instantânea via DM após o pagamento!`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shop_checkout:${selected}`).setLabel('💳 Continuar para Pagamento').setEmoji('⚡').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_cancel_checkout').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleShopSelectGamePass(interaction) {
    const selected = interaction.values[0];
    const products = {
      gamepass_90d: { name: 'XBOX GAME PASS ULTIMATE 90 DIAS', price: 'R$ 8,99', stock: 5 },
      gamepass_console_90d: { name: 'XBOX GAME PASS ULTIMATE (CONSOLE) 90 DIAS', price: 'R$ 8,99', stock: 11 },
      gamepass_pc_90d: { name: 'XBOX GAME PASS ULTIMATE (PC) 90 DIAS', price: 'R$ 8,99', stock: 6 }
    };
    const prod = products[selected];
    if (!prod) return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### 🎮 **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n` +
        `🎮 **Compatível:** PC / Console / TV / XCloud`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shop_checkout:${selected}`).setLabel('💳 Continuar para Pagamento').setEmoji('⚡').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_cancel_checkout').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleShopBuyMinecraft(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        'Você selecionou:\n### ⛏️ **MINECRAFT ORIGINAL JAVA + BEDROCK (NFA)**\n\n' +
        '💰 **Valor:** `R$ 9,90`\n' +
        '📦 **Estoque:** `Disponível Ilimitado (∞)`\n' +
        '⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n' +
        '🛡️ **Garantia:** Conta completa nfa com estabilidade e suporte garantido!'
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop_checkout:minecraft_nfa').setLabel('💳 Continuar para Pagamento').setEmoji('⚡').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_cancel_checkout').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleShopSelectSteamGames(interaction) {
    const selected = interaction.values[0];
    const products = {
      steam_gta5: { name: 'CONTA STEAM COM OS 2 GTA 5 ( 100% ONLINE )', price: 'R$ 9,90', stock: '∞' },
      steam_rdr2: { name: 'CONTA COM RED DEAD 2 ( 100% ONLINE )', price: 'R$ 9,90', stock: '∞' },
      steam_fc26: { name: 'CONTA COM STEAM COM EA SPORTS FC 26 ( 100% ONLINE )', price: 'R$ 9,90', stock: '∞' },
      steam_gow: { name: 'CONTA COM GOD OF WAR RAGNAROK ( 100% ONLINE )', price: 'R$ 9,90', stock: '∞' },
      steam_forza: { name: 'CONTA COM FORZA HORIZON 6 ( 100% ONLINE )', price: 'R$ 9,90', stock: '∞' }
    };
    const prod = products[selected];
    if (!prod) return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### 🎮 **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n` +
        `🛡️ **Segurança:** Acesso exclusivo e verificado`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shop_checkout:${selected}`).setLabel('💳 Continuar para Pagamento').setEmoji('⚡').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_cancel_checkout').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleShopSelectCS2Ext(interaction) {
    const selected = interaction.values[0];
    const products = {
      cs2_diario: { name: 'CS2 External (Diário)', price: 'R$ 24,90', stock: '∞' },
      cs2_semanal: { name: 'CS2 External (Semanal)', price: 'R$ 64,90', stock: '∞' },
      cs2_mensal: { name: 'CS2 External (Mensal)', price: 'R$ 109,90', stock: '∞' },
      cs2_180dias: { name: 'CS2 External (180 Dias)', price: 'R$ 389,00', stock: '∞' }
    };
    const prod = products[selected];
    if (!prod) return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### 🔫 **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n` +
        `🛡️ **Segurança:** 100% Indetectável e Seguro (Sem Risco de VAC)`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shop_checkout:${selected}`).setLabel('💳 Continuar para Pagamento').setEmoji('⚡').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_cancel_checkout').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleShopSelectSteamHours(interaction) {
    const selected = interaction.values[0];
    const products = {
      hours_500: { name: 'Steam Hours Boost (500 Horas + 100 Bônus)', price: 'R$ 9,90', stock: '∞' },
      hours_1000: { name: 'Steam Hours Boost (1000 Horas + 200 Bônus)', price: 'R$ 19,90', stock: '∞' },
      hours_2000: { name: 'Steam Hours Boost (2000 Horas + 500 Bônus)', price: 'R$ 39,90', stock: '∞' },
      hours_4000: { name: 'Steam Hours Boost (4000 Horas + 1000 Bônus)', price: 'R$ 89,90', stock: '∞' },
      hours_vitalicio: { name: 'Steam Hours Boost Vitalício', price: 'R$ 249,00', stock: '∞' }
    };
    const prod = products[selected];
    if (!prod) return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### ⏱️ **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n` +
        `🌐 **Funcionamento:** Não precisa deixar PC ligado nem jogo aberto!`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shop_checkout:${selected}`).setLabel('💳 Continuar para Pagamento').setEmoji('⚡').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_cancel_checkout').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleShopStreamingOptions(interaction) {
    const customId = interaction.customId;
    let title = '';
    let selectCustomId = 'shop_select_streaming';
    let options = [];

    if (customId === 'shop_options_youtube') {
      title = 'YOUTUB3 PR3M1UM';
      options = [
        { label: 'YOUTUBE PREMIUM - CONVITE', description: '💸 | Valor: R$ 8,90 • 📦 | Estoque: ∞', value: 'yt_convite', emoji: '💸' },
        { label: 'YOUTUBE PREMIUM ( ADM FAMILIA )', description: '💸 | Valor: R$ 22,90 • 📦 | Estoque: ∞', value: 'yt_adm_familia', emoji: '💸' }
      ];
    } else if (customId === 'shop_options_prime') {
      title = 'PR1ME V1DE0';
      options = [
        { label: 'PRIME VIDEO PREMIUM - 7 DIAS', description: '💸 | Valor: R$ 7,90 • 📦 | Estoque: ∞', value: 'prime_7d', emoji: '💸' },
        { label: 'PRIME VIDEO PREMIUM - 30 DIAS', description: '💸 | Valor: R$ 13,90 • 📦 | Estoque: ∞', value: 'prime_30d', emoji: '💸' },
        { label: 'PRIME VIDEO PREMIUM + NBA LEAGUE PASS - 30 DIAS', description: '💸 | Valor: R$ 24,90 • 📦 | Estoque: ∞', value: 'prime_nba_30d', emoji: '💸' }
      ];
    } else if (customId === 'shop_options_paramount') {
      title = 'P4R4M0NT';
      options = [
        { label: 'PARAMOUNT PREMIUM - 7 DIAS', description: '💸 | Valor: R$ 7,90 • 📦 | Estoque: ∞', value: 'paramount_7d', emoji: '💸' },
        { label: 'PARAMOUNT PREMIUM - 30 DIAS', description: '💸 | Valor: R$ 12,90 • 📦 | Estoque: ∞', value: 'paramount_30d', emoji: '💸' }
      ];
    } else if (customId === 'shop_options_disney') {
      title = 'D1SN3Y PLUS';
      options = [
        { label: 'DISNEY PREMIUM - 7 DIAS', description: '💸 | Valor: R$ 12,90 • 📦 | Estoque: ∞', value: 'disney_7d', emoji: '💸' },
        { label: 'DISNEY PREMIUM - 30 DIAS', description: '💸 | Valor: R$ 19,90 • 📦 | Estoque: ∞', value: 'disney_30d', emoji: '💸' }
      ];
    } else if (customId === 'shop_options_hbo') {
      title = 'HB0 M4X';
      options = [
        { label: 'HBOMAX PLATINUM - 7 DIAS', description: '💸 | Valor: R$ 7,90 • 📦 | Estoque: ∞', value: 'hbo_7d', emoji: '💸' },
        { label: 'HBOMAX PLATINUM - 30 DIAS', description: '💸 | Valor: R$ 14,90 • 📦 | Estoque: ∞', value: 'hbo_30d', emoji: '💸' }
      ];
    } else if (customId === 'shop_options_netflix') {
      title = 'N3TFL1X';
      options = [
        { label: 'NETFLIX PREMIUM - 7 DIAS', description: '💸 | Valor: R$ 8,90 • 📦 | Estoque: ∞', value: 'netflix_7d', emoji: '💸' },
        { label: 'NETFLIX PREMIUM - 30 DIAS', description: '💸 | Valor: R$ 14,90 • 📦 | Estoque: ∞', value: 'netflix_30d', emoji: '💸' }
      ];
    } else if (customId === 'shop_options_crunchyroll') {
      title = 'CRUNCHOLL';
      options = [
        { label: 'CRUNCHYROLL MEGA FAN - 7 DIAS', description: '💸 | Valor: R$ 6,90 • 📦 | Estoque: ∞', value: 'crunchyroll_7d', emoji: '💸' },
        { label: 'CRUNCHYROLL MEGA FAN - 30 DIAS', description: '💸 | Valor: R$ 12,90 • 📦 | Estoque: ∞', value: 'crunchyroll_30d', emoji: '💸' }
      ];
    }

    const embed = new EmbedBuilder()
      .setTitle(`🛒 Seleção de Opções — ${title}`)
      .setColor(0x2B2D31)
      .setDescription('Selecione abaixo o plano que deseja adquirir para continuar:')
      .setFooter({ text: 'REAL BOOST • BlackShop' });

    const select = new StringSelectMenuBuilder()
      .setCustomId(selectCustomId)
      .setPlaceholder('Escolha seu plano...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleShopSelectStreaming(interaction) {
    const selected = interaction.values[0];
    return CartService.handleProductSelect(interaction, selected, this.db);
  }

  async handleShopSelectCapcut(interaction) {
    const selected = interaction.values[0];
    const products = {
      capcut_pc: { name: 'CapCut Pro - PC Permanente', price: 'R$ 5,99', stock: '∞' },
      capcut_android: { name: 'CapCut Pro - Android Permanente', price: 'R$ 4,99', stock: '∞' },
      capcut_combo: { name: 'CapCut Pro - PC + Android (Combo)', price: 'R$ 8,99', stock: '∞' }
    };
    const prod = products[selected];
    if (!prod) return interaction.reply({ content: '⚠️ Opção inválida.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🛒 Carrinho de Compras - BlackShop')
      .setColor(0x2B2D31)
      .setDescription(
        `Você selecionou:\n### 🎞️ **${prod.name}**\n\n` +
        `💰 **Valor:** \`${prod.price}\`\n` +
        `📦 **Estoque:** \`${prod.stock} disponíveis\`\n` +
        `⚡ **Entrega:** Automática e instantânea via DM após o pagamento!\n` +
        `🛡️ **Ativação:** 100% Permanente e simples de instalar`
      )
      .setFooter({ text: 'Clique no botão abaixo para prosseguir com a compra.' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`shop_checkout:${selected}`).setLabel('💳 Continuar para Pagamento').setEmoji('⚡').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('shop_cancel_checkout').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  async handleShopCheckout(interaction) {
    const selected = interaction.customId.split(':')[1];
    const products = {
      capcut_pc: { name: 'CapCut Pro - PC Permanente', price: 'R$ 5,99' },
      capcut_android: { name: 'CapCut Pro - Android Permanente', price: 'R$ 4,99' },
      capcut_combo: { name: 'CapCut Pro - PC + Android (Combo)', price: 'R$ 8,99' },
      wallpaper_engine: { name: 'WALLPAPER ENGINE - PC PERMANENTE', price: 'R$ 3,99' },
      pack_designer: { name: 'PACK DESIGNER (Mais de 50 mil PSDs)', price: 'R$ 2,99' },
      nitro_1m: { name: 'Conta com 1 Mês de nitro ativado / 2X IMPULSOS', price: 'R$ 13,90' },
      nitro_1y: { name: 'Conta Com 1 Ano de nitro (12 Mês) / 2X IMPULSOS', price: 'R$ 29,90' },
      link_1m: { name: 'Nitro Link mensal (1mes)', price: 'R$ 8,90' },
      link_3m: { name: 'Nitro Link trimensal (3mes)', price: 'R$ 18,90' },
      boost_2x_30d: { name: '2x Impulsos (Nível 1 - 30 Dias)', price: 'R$ 6,90' },
      boost_7x_30d: { name: '7x Impulsos (Nível 2 - 30 Dias)', price: 'R$ 21,90' },
      boost_14x_30d: { name: '14x Impulsos (Nível 3 - 30 Dias)', price: 'R$ 42,90' },
      boost_14x_3m: { name: '14x Impulsos (Nível 3 - 3 Meses)', price: 'R$ 99,90' },
      boost_14x_1y: { name: '14x Impulsos (Nível 3 - 1 Ano)', price: 'R$ 179,90' },
      conta_2025: { name: 'Conta 2025', price: 'R$ 11,90' },
      conta_2024: { name: 'Conta 2024', price: 'R$ 13,90' },
      conta_2023: { name: 'Conta 2023', price: 'R$ 16,90' },
      conta_2022: { name: 'Conta 2022', price: 'R$ 22,90' },
      conta_2021: { name: 'Conta 2021', price: 'R$ 31,90' },
      conta_2020: { name: 'Conta 2020', price: 'R$ 49,90' },
      conta_2019: { name: 'Conta 2019', price: 'R$ 79,90' },
      conta_2018: { name: 'Conta 2018', price: 'R$ 119,90' },
      conta_2017: { name: 'Conta 2017', price: 'R$ 179,90' },
      conta_2016: { name: 'Conta 2016', price: 'R$ 289,90' },
      conta_2015: { name: 'Conta 2015', price: 'R$ 499,00' },
      membros_100: { name: '100 - Membros reais', price: 'R$ 11,90' },
      membros_300: { name: '300 - Membros reais', price: 'R$ 29,90' },
      membros_500: { name: '500 - Membros reais', price: 'R$ 44,90' },
      membros_1000: { name: '1000 - Membros reais', price: 'R$ 79,90' },
      ativacao_nitro: { name: 'Ativação NITRO LINK', price: 'R$ 16,90' },
      external_1d: { name: 'Painel External (1 dia)', price: 'R$ 11,90' },
      external_7d: { name: 'Painel External (7 dia)', price: 'R$ 29,90' },
      external_30d: { name: 'Painel External (30 dia)', price: 'R$ 59,90' },
      external_perm: { name: 'Painel External (Permanente)', price: 'R$ 119,90' },
      xit_ff: { name: 'Painel Xit Free Fire • 100% HS (Permanente)', price: 'R$ 14,90' },
      hs_pescoco: { name: 'HS Pescoço Permanente', price: 'R$ 11,90' },
      holograma: { name: 'Holograma + Auxílio Permanente', price: 'R$ 15,90' },
      aimbot_mobile: { name: 'Painel Aim Bot iOS e Android Permanente', price: 'R$ 18,90' },
      otim_basico: { name: 'Pack de Otimização (Básico Windows)', price: 'R$ 8,90' },
      otim_vip: { name: 'Pack de Otimização VIP (Completo PC & Jogos)', price: 'R$ 11,90' },
      yt_link_1m: { name: 'YouTube Premium Link (1 Mês)', price: 'R$ 5,34' },
      yt_conta_1m: { name: 'YouTube Premium na sua Conta (1 Mês)', price: 'R$ 14,90' },
      prime_1tela: { name: 'Prime Video (30 Dias - 1 Tela Privada)', price: 'R$ 4,55' },
      prime_completa: { name: 'Prime Video (30 Dias - Conta Completa 4 Telas)', price: 'R$ 12,90' },
      paramount_1tela: { name: 'Paramount+ (30 Dias - 1 Tela Privada)', price: 'R$ 4,60' },
      paramount_completa: { name: 'Paramount+ (30 Dias - Conta Completa)', price: 'R$ 12,90' },
      disney_1tela: { name: 'Disney+ Premium (30 Dias - 1 Tela Privada)', price: 'R$ 8,02' },
      disney_completa: { name: 'Disney+ Premium (30 Dias - Conta Completa)', price: 'R$ 18,90' },
      hbo_1tela: { name: 'HBO Max Standard (30 Dias - 1 Tela Privada)', price: 'R$ 4,81' },
      hbo_completa: { name: 'HBO Max Platinum (30 Dias - Conta Completa 4K)', price: 'R$ 14,90' },
      netflix_1tela: { name: 'Netflix Premium (30 Dias - 1 Tela Privada)', price: 'R$ 5,19' },
      netflix_completa: { name: 'Netflix Premium (30 Dias - Conta Completa 4K)', price: 'R$ 16,90' },
      crunchyroll_1tela: { name: 'Crunchyroll Fan (30 Dias - 1 Tela Privada)', price: 'R$ 3,69' },
      crunchyroll_completa: { name: 'Crunchyroll Mega Fan (30 Dias - 4 Telas)', price: 'R$ 9,90' },
      spot_link_1m: { name: 'Spotify 1 mes – LINK', price: 'R$ 5,50' },
      spot_link_3m: { name: 'Spotify 3 mes – LINK', price: 'R$ 8,90' },
      spot_conta_1m: { name: 'Conta Spotify 1 mes', price: 'R$ 15,90' },
      spot_conta_1y: { name: 'Conta Spotify anual (1 ano)', price: 'R$ 39,90' },
      gen_streaming: { name: 'Gerador Netflix/HBO/Disney/Prime Video', price: 'R$ 21,90' },
      gen_yt: { name: 'Gerador de youtube premium', price: 'R$ 16,90' },
      gen_spot: { name: 'Gerador de spotify premium', price: 'R$ 16,90' },
      gen_all: { name: 'TODOS GERADOR A CIMA!', price: 'R$ 32,90' },
      gamepass_90d: { name: 'XBOX GAME PASS ULTIMATE 90 DIAS', price: 'R$ 19,90' },
      gamepass_console_90d: { name: 'XBOX GAME PASS ULTIMATE (CONSOLE) 90 DIAS', price: 'R$ 19,90' },
      gamepass_pc_90d: { name: 'XBOX GAME PASS ULTIMATE (PC) 90 DIAS', price: 'R$ 19,90' },
      minecraft_nfa: { name: 'Minecraft Original Java + Bedrock (NFA)', price: 'R$ 22,90' },
      steam_gta5: { name: 'CONTA STEAM COM OS 2 GTA 5 ( 100% ONLINE )', price: 'R$ 9,90' },
      steam_rdr2: { name: 'CONTA COM RED DEAD 2 ( 100% ONLINE )', price: 'R$ 9,90' },
      steam_fc26: { name: 'CONTA COM STEAM COM EA SPORTS FC 26 ( 100% ONLINE )', price: 'R$ 9,90' },
      steam_gow: { name: 'CONTA COM GOD OF WAR RAGNAROK ( 100% ONLINE )', price: 'R$ 9,90' },
      steam_forza: { name: 'CONTA COM FORZA HORIZON 6 ( 100% ONLINE )', price: 'R$ 9,90' },
      cs2_diario: { name: 'CS2 External (Diário)', price: 'R$ 24,90' },
      cs2_semanal: { name: 'CS2 External (Semanal)', price: 'R$ 64,90' },
      cs2_mensal: { name: 'CS2 External (Mensal)', price: 'R$ 109,90' },
      cs2_180dias: { name: 'CS2 External (180 Dias)', price: 'R$ 389,00' },
      hours_500: { name: 'Steam Hours Boost (500 Horas + 100 Bônus)', price: 'R$ 9,90' },
      hours_1000: { name: 'Steam Hours Boost (1000 Horas + 200 Bônus)', price: 'R$ 19,90' },
      hours_2000: { name: 'Steam Hours Boost (2000 Horas + 500 Bônus)', price: 'R$ 39,90' },
      hours_4000: { name: 'Steam Hours Boost (4000 Horas + 1000 Bônus)', price: 'R$ 89,90' },
      hours_vitalicio: { name: 'Steam Hours Boost Vitalício', price: 'R$ 249,00' }
    };
    const prod = products[selected];

    return interaction.reply({
      content: `🛍️ **Pedido Criado com Sucesso!**\n\nVocê escolheu: **${prod?.name || 'Produto'}** (\`${prod?.price || 'R$ 4,99'}\`)\n\n📌 Para efetuar o pagamento via **PIX**, fale com um moderador em <#1562242410317218062> ou aguarde a confirmação automática!`,
      ephemeral: true
    });
  }
}

module.exports = InteractionRouter;
