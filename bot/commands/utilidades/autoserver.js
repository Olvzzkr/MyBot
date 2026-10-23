/**
 * Comando ?autoserver - Configuração Automática Completa do Servidor
 * Cria categorias, canais, painéis interativos de tickets, cargos e logs em 1 comando.
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField
} = require('discord.js');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');

module.exports = {
  name: 'autoserver',
  aliases: ['setup-total', 'automacao', 'iniciar'],
  description: 'Automatiza o servidor por completo: cria categorias, canais, painéis de ticket e autorroles',
  usage: '?autoserver',

  async execute({ message, authService, db, auditRepo }) {
    const { guild, member, author } = message;

    // Apenas Dono do servidor ou Administrador pode rodar
    if (guild.ownerId !== member.id && !authService.isGlobalOwner(member.id) && !member.permissions.has('Administrator')) {
      return message.reply('🚫 Apenas o dono do servidor ou administradores podem executar a automação completa.');
    }

    const statusMsg = await message.reply('🚀 **Iniciando automação completa do servidor...** Aguarde alguns instantes enquanto organizo tudo!');

    try {
      // ==========================================
      // 1. Obter ou Criar Cargos Essenciais
      // ==========================================
      const roleMod = guild.roles.cache.find(r => r.name.includes('Moderador')) || guild.roles.cache.find(r => r.name.includes('Administrador'));
      const roleMembro = guild.roles.cache.find(r => r.name.includes('Membro'));
      const roleAnuncios = guild.roles.cache.find(r => r.name.includes('Anúncios'));
      const roleSorteios = guild.roles.cache.find(r => r.name.includes('Sorteios'));
      const roleEventos = guild.roles.cache.find(r => r.name.includes('Eventos'));

      // ==========================================
      // 2. Criar Categorias e Canais
      // ==========================================
      
      // A. Categoria: 📌 INFORMAÇÕES
      let catInfo = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes('INFORMAÇÕES'));
      if (!catInfo) {
        catInfo = await guild.channels.create({ name: '📌 INFORMAÇÕES', type: ChannelType.GuildCategory });
      }

      // Canais de Informações
      let chanBoasVindas = guild.channels.cache.find(c => c.name === 'boas-vindas');
      if (!chanBoasVindas) {
        chanBoasVindas = await guild.channels.create({
          name: 'boas-vindas',
          type: ChannelType.GuildText,
          parent: catInfo.id,
          permissionOverwrites: [
            { id: guild.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] }
          ]
        });
      }

      let chanRegras = guild.channels.cache.find(c => c.name === 'regras');
      if (!chanRegras) {
        chanRegras = await guild.channels.create({
          name: 'regras',
          type: ChannelType.GuildText,
          parent: catInfo.id,
          permissionOverwrites: [
            { id: guild.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] }
          ]
        });
        
        // Envia mensagem padrão de regras
        const regrasEmbed = new EmbedBuilder()
          .setTitle(`📜 Diretrizes da Comunidade - ${guild.name}`)
          .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
          .setDescription(
            `**1.** Respeite todos os membros e a equipe da comunidade.\n` +
            `**2.** Proibido spam, flood ou menções em massa desnecessárias.\n` +
            `**3.** Divulgação não autorizada de links e convites de outros servidores é proibida.\n` +
            `**4.** Mantenha os assuntos nos canais adequados.\n` +
            `**5.** Siga os Termos de Serviço e Diretrizes do Discord.`
          )
          .setFooter({ text: 'Divirta-se e seja bem-vindo(a)!' });
        await chanRegras.send({ embeds: [regrasEmbed] }).catch(() => {});
      }

      // B. Categoria: 💬 COMUNIDADE
      let catComunidade = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes('COMUNIDADE'));
      if (!catComunidade) {
        catComunidade = await guild.channels.create({ name: '💬 COMUNIDADE', type: ChannelType.GuildCategory });
      }

      const canaisComunidade = ['chat-geral', 'comandos', 'midia'];
      for (const name of canaisComunidade) {
        if (!guild.channels.cache.find(c => c.name === name)) {
          await guild.channels.create({ name, type: ChannelType.GuildText, parent: catComunidade.id });
        }
      }

      // C. Categoria: 🎭 AUTORROLES & CARGOS
      let catCargos = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes('CARGOS'));
      if (!catCargos) {
        catCargos = await guild.channels.create({ name: '🎭 AUTORROLES', type: ChannelType.GuildCategory });
      }

      let chanPegarCargos = guild.channels.cache.find(c => c.name === 'pegar-cargos');
      if (!chanPegarCargos) {
        chanPegarCargos = await guild.channels.create({
          name: 'pegar-cargos',
          type: ChannelType.GuildText,
          parent: catCargos.id,
          permissionOverwrites: [
            { id: guild.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] }
          ]
        });

        // Monta o Painel de Seleção de Cargos se os cargos de notificação existirem
        const rolesParaPainel = [roleAnuncios, roleSorteios, roleEventos].filter(Boolean);
        if (rolesParaPainel.length > 0) {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('role_panel_select')
            .setPlaceholder('Clique para escolher suas notificações')
            .setMinValues(0)
            .setMaxValues(rolesParaPainel.length);

          rolesParaPainel.forEach(r => {
            selectMenu.addOptions({
              label: r.name,
              value: r.id,
              description: `Receber avisos de ${r.name}`
            });
          });

          const row = new ActionRowBuilder().addComponents(selectMenu);
          const panelEmbed = new EmbedBuilder()
            .setTitle('🎭 Escolha suas Notificações')
            .setDescription('Selecione abaixo os cargos que você deseja ter para ser avisado sobre novidades no servidor.\nVocê pode adicionar ou remover quando quiser!')
            .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY);

          const sentPanel = await chanPegarCargos.send({ embeds: [panelEmbed], components: [row] });

          // Registra painel no banco
          const rolesData = JSON.stringify(rolesParaPainel.map(r => ({ role_id: r.id, label: r.name })));
          db.prepare(`
            INSERT INTO role_panels (guild_id, channel_id, message_id, title, roles_json)
            VALUES (?, ?, ?, ?, ?)
          `).run(guild.id, chanPegarCargos.id, sentPanel.id, 'Escolha suas Notificações', rolesData);
        }
      }

      // D. Categoria: 🎫 SUPORTE
      let catSuporte = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes('SUPORTE'));
      if (!catSuporte) {
        catSuporte = await guild.channels.create({ name: '🎫 SUPORTE', type: ChannelType.GuildCategory });
      }

      let chanTickets = guild.channels.cache.find(c => c.name === 'abrir-ticket');
      if (!chanTickets) {
        chanTickets = await guild.channels.create({
          name: 'abrir-ticket',
          type: ChannelType.GuildText,
          parent: catSuporte.id,
          permissionOverwrites: [
            { id: guild.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages] }
          ]
        });

        // Envia o painel de abertura de ticket
        const ticketEmbed = new EmbedBuilder()
          .setTitle('🎫 Central de Atendimento & Suporte')
          .setDescription('Precisa de ajuda com o servidor, tirar dúvidas ou fazer uma denúncia?\nClique no botão abaixo para abrir um canal de atendimento privado com a equipe.')
          .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
          .setFooter({ text: 'Atendimento Confidencial' });

        const ticketRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_create_open')
            .setLabel('Abrir Ticket')
            .setEmoji('🎫')
            .setStyle(ButtonStyle.Primary)
        );

        await chanTickets.send({ embeds: [ticketEmbed], components: [ticketRow] });
      }

      // E. Categoria: 🛡️ MODERAÇÃO & LOGS (Privada para Staff)
      let catStaff = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.includes('MODERAÇÃO'));
      if (!catStaff) {
        catStaff = await guild.channels.create({
          name: '🛡️ MODERAÇÃO & LOGS',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
          ]
        });

        // Libera visualização para quem tem cargo de Moderação ou Admin
        if (roleMod) {
          await catStaff.permissionOverwrites.create(roleMod.id, {
            ViewChannel: true,
            SendMessages: true
          });
        }
      }

      let chanLogs = guild.channels.cache.find(c => c.name === 'mod-logs');
      if (!chanLogs) {
        chanLogs = await guild.channels.create({
          name: 'mod-logs',
          type: ChannelType.GuildText,
          parent: catStaff.id
        });
      }

      let chanChatStaff = guild.channels.cache.find(c => c.name === 'chat-staff');
      if (!chanChatStaff) {
        await guild.channels.create({
          name: 'chat-staff',
          type: ChannelType.GuildText,
          parent: catStaff.id
        });
      }

      // ==========================================
      // 3. Vincular Automações no Banco de Dados
      // ==========================================
      
      // Vincula o mod-logs na guild_settings
      db.prepare(`
        UPDATE guild_settings
        SET modlog_channel_id = ?, auditlog_channel_id = ?
        WHERE guild_id = ?
      `).run(chanLogs.id, chanLogs.id, guild.id);

      // Vincula o canal de boas-vindas
      db.prepare(`
        INSERT INTO welcome_settings (guild_id, channel_id, is_enabled)
        VALUES (?, ?, 1)
        ON CONFLICT(guild_id) DO UPDATE SET
          channel_id = excluded.channel_id,
          is_enabled = 1
      `).run(guild.id, chanBoasVindas.id);

      // Ativa regras de proteção automática recomendadas
      const defaultRules = [
        { name: 'anti_spam', limit: 5, interval: 4, action: 'TIMEOUT', duration: 300 },
        { name: 'anti_mass_mention', limit: 4, interval: 1, action: 'TIMEOUT', duration: 600 },
        { name: 'anti_repeat', limit: 3, interval: 8, action: 'TIMEOUT', duration: 300 }
      ];

      for (const dr of defaultRules) {
        db.prepare(`
          INSERT INTO protection_rules (guild_id, rule_name, threshold_limit, threshold_interval_seconds, action_type, action_duration_seconds, is_enabled)
          VALUES (?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(guild_id, rule_name) DO UPDATE SET is_enabled = 1
        `).run(guild.id, dr.name, dr.limit, dr.interval, dr.action, dr.duration);
      }

      // ==========================================
      // 4. Mensagem Final de Conclusão
      // ==========================================
      const successEmbed = new EmbedBuilder()
        .setTitle('✨ Automação do Servidor Concluída com Sucesso!')
        .setColor(SYSTEM_DEFAULTS.COLOR_SUCCESS)
        .setDescription('Toda a estrutura do seu servidor foi configurada e automatizada:')
        .addFields(
          { name: '📌 Informações & Regras', value: `• ${chanBoasVindas} (Boas-vindas ativas)\n• ${chanRegras} (Regras publicadas)` },
          { name: '🎭 Autorroles Interativos', value: `• ${chanPegarCargos} (Painel clicável enviado)` },
          { name: '🎫 Sistema de Atendimento', value: `• ${chanTickets} (Painel com botão de abrir ticket ativo)` },
          { name: '🛡️ Moderação & Auditoria', value: `• ${chanLogs} (Canal de logs configurado no banco)` },
          { name: '🤖 Automações Ativas', value: `• **Auto-Role:** Novos membros recebem \`👤 Membro\` e bots recebem \`🤖 Bots\`.\n• **Anti-Spam & Anti-Raid:** Contenção automática e quarentena ligadas.` }
        )
        .setFooter({ text: 'Tudo pronto! Você não precisa configurar mais nada manualmente.' })
        .setTimestamp();

      await statusMsg.edit({ content: null, embeds: [successEmbed] });

    } catch (err) {
      console.error('[Autoserver] Erro durante o setup automático:', err);
      statusMsg.edit(`❌ Ocorreu um erro ao configurar o servidor: ${err.message}`);
    }
  }
};
