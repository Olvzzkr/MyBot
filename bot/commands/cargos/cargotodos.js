/**
 * Comando ?cargotodos / !membros - Adiciona um cargo a todos os membros do servidor de forma segura com barra de progresso
 */

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'cargotodos',
  aliases: ['darcargo', 'darcargotodos', 'membros', 'addmembros', 'massrole', 'rolemass', 'membro'],
  description: 'Adiciona um cargo a todos os membros do servidor com barra de progresso em tempo real',
  usage: '!cargotodos [cargo] ou !membros',

  async execute({ message, interaction, args, authService, db, auditRepo }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const member = isInteraction ? interaction.member : message.member;
    const guild = isInteraction ? interaction.guild : message.guild;

    // 1. Verificação de Permissão Administrativa
    const isGlobalOwner = author.id === '1517970601342664768';
    const isGuildOwner = guild.ownerId === author.id;
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner || isGuildOwner;

    if (!isAdmin) {
      const errText = '❌ Apenas Administradores podem executar a atribuição em massa de cargos.';
      if (isInteraction) return interaction.reply({ content: errText, ephemeral: true });
      return message.reply(errText);
    }

    // 2. Verificar se o bot tem permissão de gerenciar cargos
    const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const errText = '❌ Eu não possuo a permissão **Gerenciar Cargos** (`ManageRoles`) neste servidor!';
      if (isInteraction) return interaction.reply({ content: errText, ephemeral: true });
      return message.reply(errText);
    }

    // 3. Localizar o cargo alvo
    await guild.roles.fetch();
    let targetRole = null;
    const rawQuery = (args && args.length > 0) ? args.join(' ').trim() : '';

    if (rawQuery) {
      const mentionMatch = rawQuery.match(/<@&(\d+)>/);
      if (mentionMatch) {
        targetRole = guild.roles.cache.get(mentionMatch[1]);
      } else if (/^\d+$/.test(rawQuery)) {
        targetRole = guild.roles.cache.get(rawQuery);
      } else {
        targetRole = guild.roles.cache.find(r => r.name.toLowerCase() === rawQuery.toLowerCase()) ||
                     guild.roles.cache.find(r => r.name.toLowerCase().includes(rawQuery.toLowerCase()));
      }
    }

    // Se nenhum cargo foi especificado, busca automaticamente pelo cargo de Membro
    if (!targetRole) {
      targetRole = guild.roles.cache.get('1561907386153963591') || // Resenha "👤 Membro"
                   guild.roles.cache.find(r => r.name.toLowerCase().includes('membro')) ||
                   guild.roles.cache.find(r => r.name.toLowerCase().includes('member'));
    }

    if (!targetRole) {
      const errText = '❌ Cargo não encontrado! Especifique o cargo desejado. Exemplo:\n`!cargotodos @Membro` ou `!cargotodos 👤 Membro`';
      if (isInteraction) return interaction.reply({ content: errText, ephemeral: true });
      return message.reply(errText);
    }

    // 4. Checar hierarquia de cargos
    if (targetRole.position >= botMember.roles.highest.position && !isGlobalOwner) {
      const errText = `❌ O cargo <@&${targetRole.id}> (${targetRole.name}) está acima ou no mesmo nível do meu cargo mais alto (${botMember.roles.highest.name})!\nSuba o cargo do bot nas configurações de cargos do Discord para resolver.`;
      if (isInteraction) return interaction.reply({ content: errText, ephemeral: true });
      return message.reply(errText);
    }

    // 5. Carregar todos os membros do servidor
    const waitMsg = isInteraction 
      ? await interaction.reply({ content: '🔍 **Carregando lista de membros do servidor...**', fetchReply: true })
      : await message.reply('🔍 **Carregando lista de membros do servidor...**');

    await guild.members.fetch();
    const allMembers = Array.from(guild.members.cache.values());
    const humanMembers = allMembers.filter(m => !m.user.bot);
    const toAdd = humanMembers.filter(m => !m.roles.cache.has(targetRole.id));

    if (toAdd.length === 0) {
      const allDoneEmbed = new EmbedBuilder()
        .setTitle('✅ Todos os Membros Já Possuem o Cargo!')
        .setDescription(`Todos os **${humanMembers.length}** membros humanos do servidor já possuem o cargo <@&${targetRole.id}>!`)
        .setColor(0x2ECC71)
        .setTimestamp();

      return waitMsg.edit({ content: null, embeds: [allDoneEmbed] });
    }

    // Função auxiliar para barra de progresso
    const renderProgressBar = (current, total) => {
      const percent = Math.min(100, Math.floor((current / total) * 100));
      const filled = Math.round((percent / 100) * 16);
      const bar = '█'.repeat(filled) + '░'.repeat(16 - filled);
      return `\`[${bar}] ${percent}%\` (${current}/${total})`;
    };

    const startTime = Date.now();
    let processed = 0;
    let successCount = 0;
    let failCount = 0;
    let lastEditTime = Date.now();

    const progressEmbed = new EmbedBuilder()
      .setTitle('⚡ Adicionando Cargo em Massa')
      .setColor(0x5865F2)
      .setDescription(
        `📌 **Cargo:** <@&${targetRole.id}> (\`${targetRole.name}\`)\n` +
        `👥 **Total a receber:** \`${toAdd.length}\` membros\n` +
        `🤖 **Bots ignorados:** \`${allMembers.length - humanMembers.length}\`\n\n` +
        `📊 **Progresso:** ${renderProgressBar(0, toAdd.length)}\n\n` +
        `⏳ *Processando com proteção anti-ratelimit do Discord...*`
      )
      .setFooter({ text: 'Nexora • Operação em Massa' })
      .setTimestamp();

    await waitMsg.edit({ content: null, embeds: [progressEmbed] });

    for (const targetMember of toAdd) {
      try {
        await targetMember.roles.add(targetRole, 'Atribuição em massa solicitada por ' + author.tag);
        successCount++;
      } catch (err) {
        failCount++;
      }
      processed++;

      // Atualiza mensagem a cada 3.5 segundos ou a cada 40 membros
      const now = Date.now();
      if (now - lastEditTime > 3500 || processed === toAdd.length) {
        lastEditTime = now;
        const elapsedSec = (now - startTime) / 1000;
        const speed = processed / (elapsedSec || 1);
        const remainingSec = Math.max(0, Math.round((toAdd.length - processed) / (speed || 1)));

        progressEmbed.setDescription(
          `📌 **Cargo:** <@&${targetRole.id}> (\`${targetRole.name}\`)\n` +
          `👥 **Total a receber:** \`${toAdd.length}\` membros\n\n` +
          `📊 **Progresso:** ${renderProgressBar(processed, toAdd.length)}\n` +
          `✅ **Adicionados:** \`${successCount}\`\n` +
          `${failCount > 0 ? `⚠️ **Falhas:** \`${failCount}\`\n` : ''}` +
          `⏱️ **Tempo estimado restante:** ~\`${remainingSec}s\``
        );

        await waitMsg.edit({ embeds: [progressEmbed] }).catch(() => {});
      }

      // Intervalo seguro entre requisições (75ms)
      await new Promise(r => setTimeout(r, 75));
    }

    const totalSeconds = Math.round((Date.now() - startTime) / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const timeFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    const finishEmbed = new EmbedBuilder()
      .setTitle('🎉 Operação Concluída com Sucesso!')
      .setColor(0x2ECC71)
      .setDescription(
        `O cargo <@&${targetRole.id}> foi adicionado com sucesso a todos os membros do servidor!\n\n` +
        `👥 **Total Atribuído:** \`${successCount}\` membros\n` +
        `${failCount > 0 ? `⚠️ **Não atribuídos (erro/saíram):** \`${failCount}\`\n` : ''}` +
        `⏱️ **Tempo Total:** \`${timeFormatted}\`\n` +
        `👤 **Solicitado por:** <@${author.id}>`
      )
      .setFooter({ text: 'Nexora • Atribuição Concluída' })
      .setTimestamp();

    await waitMsg.edit({ embeds: [finishEmbed] }).catch(() => {});
  }
};
