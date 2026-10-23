/**
 * Evento messageCreate - Tratamento de comandos por prefixo configurável
 */

const { SYSTEM_DEFAULTS } = require('../../shared/constants');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, { db, guildsRepo, permsRepo, auditRepo, authService, commandLoader, protectionService, setupGalleryService }) {
    if (message.author.bot || !message.guild) {
      return;
    }

    // Anti-Invite / Bloqueador de links de outros servidores
    const inviteRegex = /(discord\.(gg|io|me|li)\/.+|discord(app)?\.com\/invite\/.+)/i;
    if (inviteRegex.test(message.content)) {
      const isOwner = message.guild.ownerId === message.author.id;
      const isAdmin = message.member?.permissions?.has?.('Administrator') || false;
      const isStaff = message.member?.permissions?.has?.('ManageMessages') || false;
      const isGlobal = authService?.isGlobalOwner?.(message.author.id) || false;

      if (!isOwner && !isAdmin && !isStaff && !isGlobal) {
        await message.delete().catch(() => {});
        const warn = await message.channel.send(`⚠️ ${message.author}, links de convite de outros servidores do Discord não são permitidos aqui!`);
        setTimeout(() => warn.delete().catch(() => {}), 6000);

        try {
          const logsChan = message.guild.channels.cache.find(c => c.name.includes('logs-staff'));
          if (logsChan) {
            const { EmbedBuilder } = require('discord.js');
            const alertEmbed = new EmbedBuilder()
              .setTitle('🛡️ Anti-Invite: Divulgação Bloqueada!')
              .setColor(0xED4245)
              .setDescription(`O usuário <@${message.author.id}> (\`${message.author.id}\`) enviou um link de convite em <#${message.channel.id}>.`)
              .addFields(
                { name: '💬 Mensagem Deletada', value: `\`\`\`${message.content.slice(0, 500)}\`\`\`` }
              )
              .setTimestamp();
            await logsChan.send({ embeds: [alertEmbed] }).catch(() => {});
          }
        } catch {}
        return;
      }
    }

    // 0. Avaliação Automática de Proteção (Anti-Spam / Anti-Raid / Menções em Massa)
    if (protectionService) {
      try {
        const securityCheck = await protectionService.evaluateMessage(message);
        if (securityCheck.violated) {
          // Mensagem violou regra e contenção automática já foi aplicada pelo serviço
          return;
        }
      } catch (err) {
        console.error('[Proteção Automática] Erro na avaliação:', err);
      }
    }

    // 0.1 Tratamento do Canal de Setups (Feed/Galeria Estilizada com filtro NSFW)
    if (setupGalleryService) {
      try {
        const handledSetup = await setupGalleryService.handleMessage(message);
        if (handledSetup) return;
      } catch (err) {
        console.error('[Galeria de Setups] Erro no processamento:', err);
      }
    }

    // 1. Obter prefixo do servidor
    const settings = guildsRepo.getGuildSettings(message.guild.id);
    const prefix = settings ? settings.prefix : SYSTEM_DEFAULTS.PREFIX;

    const botId = message.client?.user?.id || '';
    const botMention = botId ? `<@${botId}>` : null;
    const botNicknameMention = botId ? `<@!${botId}>` : null;

    let contentToProcess = message.content.trim();
    let isMentionCall = false;

    if (botMention && (contentToProcess === botMention || contentToProcess === botNicknameMention)) {
      return message.reply(`👋 Olá, ${message.author}! Meu prefixo neste servidor é \`${prefix}\`.\n• Digite \`${prefix}ajuda\` para ver a lista de comandos.\n• Você também pode usar comandos de barra digitando **/** (Slash Commands)!`);
    }

    if (botMention && contentToProcess.startsWith(botMention)) {
      contentToProcess = contentToProcess.slice(botMention.length).trim();
      isMentionCall = true;
    } else if (botNicknameMention && contentToProcess.startsWith(botNicknameMention)) {
      contentToProcess = contentToProcess.slice(botNicknameMention.length).trim();
      isMentionCall = true;
    }

    const validPrefixes = Array.from(new Set([prefix, '!', '?'].filter(Boolean)));
    const matchedPrefix = validPrefixes.find(p => contentToProcess.startsWith(p));

    if (!isMentionCall && !matchedPrefix) {
      return;
    }

    const commandText = isMentionCall ? contentToProcess : contentToProcess.slice(matchedPrefix.length).trim();
    const args = commandText.split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!commandName) return;

    const command = commandLoader.getCommand(commandName);
    if (!command) return;

    // 2. Validação de Autorização do Servidor
    const isGlobalOwner = authService.isGlobalOwner(message.author.id);
    const isAuthorized = guildsRepo.isGuildAuthorized(message.guild.id);

    // Servidor não autorizado bloqueia comandos administrativos
    if (!isAuthorized && !isGlobalOwner) {
      return message.reply('🚫 **Servidor não autorizado.** Este servidor não possui autorização ativa para usar os recursos do bot. Solicite autorização ao proprietário global.');
    }

    // 3. Validação de Permissão Granular do Usuário
    if (command.requiredPermission) {
      const isGuildOwner = message.guild.ownerId === message.author.id;
      const isDiscordAdmin = message.member.permissions?.has?.('Administrator') || false;
      const rolesCache = message.member.roles?.cache;
      const memberRoleIds = rolesCache?.map 
        ? rolesCache.map(r => r.id || r) 
        : Array.from(rolesCache?.values?.() || []).map(r => r.id || r);

      const hasPerm = authService.canExecute(
        message.guild.id,
        message.author.id,
        memberRoleIds,
        isGuildOwner,
        isDiscordAdmin,
        command.requiredPermission
      );

      if (!hasPerm) {
        return message.reply(`⛔ **Acesso Negado.** Você não possui a permissão necessária (\`${command.requiredPermission}\`) para executar este comando.`);
      }
    }

    // 4. Execução Segura do Comando
    try {
      await command.execute({
        message,
        args,
        prefix: matchedPrefix,
        author: message.author,
        member: message.member,
        guild: message.guild,
        db,
        guildsRepo,
        permsRepo,
        auditRepo,
        authService,
        commandLoader
      });
    } catch (err) {
      console.error(`[Comando: ${commandName}] Erro de execução:`, err);
      
      // Registrar evento do sistema
      try {
        db.prepare(`
          INSERT INTO system_events (component, event_level, message, error_stack)
          VALUES ('BOT', 'ERROR', ?, ?)
        `).run(`Erro no comando ${commandName} na guilda ${message.guild.id}: ${err.message}`, err.stack);
      } catch {
        // Ignora erro de gravação secundária
      }

      const replyContent = '⚠️ Ocorreu um erro interno ao processar o comando. A equipe técnica foi informada.';
      if (message.replied || message.deferred) {
        return message.followUp({ content: replyContent });
      }
      return message.reply({ content: replyContent });
    }
  }
};
