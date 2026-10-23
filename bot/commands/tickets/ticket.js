/**
 * Comando ?ticket - Sistema de Suporte, Painéis e Transcrições
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');

module.exports = {
  name: 'ticket',
  aliases: ['tickets', 'suporte'],
  description: 'Gerenciamento do sistema de suporte e tickets',
  usage: '?ticket <painel|fechar|adicionar|transcricao> [argumentos]',
  requiredPermission: PERMISSIONS.TICKETS_VIEW,

  async execute({ message, args, authService, db, auditRepo }) {
    const { guild, member, channel, author } = message;
    const subCommand = (args[0] || '').toLowerCase();

    // ==========================================
    // 1. ?ticket painel
    // ==========================================
    if (subCommand === 'painel') {
      const isAllowed = authService.canExecute(
        guild.id,
        member.id,
        member.roles.cache.map(r => r.id),
        guild.ownerId === member.id,
        member.permissions.has('Administrator'),
        PERMISSIONS.SETTINGS_MANAGE
      );

      if (!isAllowed) {
        return message.reply('🚫 Você não possui permissão (`settings.manage`) para criar painéis de ticket.');
      }

      const embed = new EmbedBuilder()
        .setTitle('🎫 Central de Suporte & Atendimento')
        .setDescription('Precisa de ajuda ou deseja falar com a equipe de moderação?\nClique no botão abaixo para abrir um canal de atendimento privado.')
        .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
        .setFooter({ text: 'Sistema de Suporte' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create_open')
          .setLabel('Abrir Ticket de Suporte')
          .setEmoji('🎫')
          .setStyle(ButtonStyle.Primary)
      );

      await message.channel.send({ embeds: [embed], components: [row] });
      return message.reply('✅ Painel de tickets criado com sucesso!');
    }

    // ==========================================
    // 2. ?ticket fechar
    // ==========================================
    if (subCommand === 'fechar' || subCommand === 'close') {
      // Verificar se este canal é um ticket no banco
      const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND status != "CLOSED"').get(channel.id);
      if (!ticket) {
        return message.reply('⚠️ Este canal não é um ticket ativo ou já foi fechado.');
      }

      const isAllowed = authService.canExecute(
        guild.id,
        member.id,
        member.roles.cache.map(r => r.id),
        guild.ownerId === member.id,
        member.permissions.has('Administrator'),
        PERMISSIONS.TICKETS_CLOSE
      ) || ticket.creator_id === member.id;

      if (!isAllowed) {
        return message.reply('🚫 Você não possui permissão para fechar este ticket.');
      }

      // Atualiza banco
      db.prepare(`
        UPDATE tickets 
        SET status = 'CLOSED', closed_by = ?, closed_at = datetime('now', 'utc'), updated_at = datetime('now', 'utc')
        WHERE id = ?
      `).run(author.id, ticket.id);

      auditRepo.logAudit({
        guildId: guild.id,
        actorId: author.id,
        actionType: 'TICKET_CLOSE',
        targetId: channel.id,
        reason: 'Ticket encerrado pelo usuário ou equipe',
        result: 'SUCCESS',
        metadata: { ticketNumber: ticket.ticket_number }
      });

      await message.channel.send('🔒 **Ticket fechado com sucesso.** Este canal será removido em 5 segundos...');
      setTimeout(() => channel.delete().catch(() => {}), 5000);
      return;
    }

    // ==========================================
    // 3. ?ticket transcricao
    // ==========================================
    if (subCommand === 'transcricao' || subCommand === 'transcript') {
      const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channel.id);
      if (!ticket) {
        return message.reply('⚠️ Transcrições só podem ser geradas dentro de um canal de ticket.');
      }

      const isAllowed = authService.canExecute(
        guild.id,
        member.id,
        member.roles.cache.map(r => r.id),
        guild.ownerId === member.id,
        member.permissions.has('Administrator'),
        PERMISSIONS.TICKETS_TRANSCRIPT
      );

      if (!isAllowed) {
        return message.reply('🚫 Você não possui permissão (`tickets.transcript`) para exportar transcrições.');
      }

      // Buscar mensagens do canal
      const messages = await channel.messages.fetch({ limit: 100 });
      const transcriptLines = [
        `====================================================`,
        `TRANSCRIÇÃO DO TICKET #${ticket.ticket_number}`,
        `Servidor: ${guild.name} (${guild.id})`,
        `Criador ID: ${ticket.creator_id}`,
        `Gerado por: ${author.tag} em ${new Date().toISOString()}`,
        `====================================================\n`
      ];

      const sortedMessages = Array.from(messages.values()).reverse();
      for (const m of sortedMessages) {
        transcriptLines.push(`[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.cleanContent}`);
      }

      const transcriptsDir = path.resolve(process.env.TRANSCRIPT_STORAGE_PATH || './transcripts');
      if (!fs.existsSync(transcriptsDir)) {
        fs.mkdirSync(transcriptsDir, { recursive: true });
      }

      const fileName = `ticket-${ticket.ticket_number}-${Date.now()}.txt`;
      const filePath = path.join(transcriptsDir, fileName);
      fs.writeFileSync(filePath, transcriptLines.join('\n'), 'utf8');

      // Salva referência no banco
      db.prepare('UPDATE tickets SET transcript_path = ? WHERE id = ?').run(filePath, ticket.id);

      return message.reply({
        content: `📄 **Transcrição gerada com sucesso!** Arquivo salvo com segurança em: \`${fileName}\``
      });
    }

    return message.reply('⚠️ Subcomando não reconhecido. Use: `?ticket <painel|fechar|transcricao>`');
  }
};
