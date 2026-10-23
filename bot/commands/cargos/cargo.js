/**
 * Comando ?cargo - Gerenciamento de cargos no servidor
 * Subcomandos: criar, editar, adicionar, remover, listar, info, painel
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');
const { parseHexColor, isValidSnowflake } = require('../../../shared/validation');

module.exports = {
  name: 'cargo',
  aliases: ['role', 'cargos'],
  description: 'Gerenciamento completo de cargos e painéis de seleção',
  usage: '?cargo <criar|editar|adicionar|remover|listar|info|painel> [argumentos]',
  requiredPermission: PERMISSIONS.ROLES_VIEW,

  async execute({ message, args, authService, db, auditRepo }) {
    const { guild, member } = message;
    const subCommand = (args[0] || '').toLowerCase();

    // ==========================================
    // 0. ?cargo setup (Criação de Cargos Úteis Padrão)
    // ==========================================
    if (subCommand === 'todos' || subCommand === 'mass' || subCommand === 'all') {
      const cargoTodosCmd = require('./cargotodos');
      return cargoTodosCmd.execute({
        message,
        args: args.slice(1),
        authService,
        db,
        auditRepo
      });
    }

    if (subCommand === 'setup' || subCommand === 'uteis') {
      const isAllowed = authService.canExecute(
        guild.id,
        member.id,
        member.roles.cache.map(r => r.id),
        guild.ownerId === member.id,
        member.permissions.has('Administrator'),
        PERMISSIONS.ROLES_MANAGE
      );

      if (!isAllowed) {
        return message.reply('🚫 Você não possui permissão (`roles.manage`) para configurar cargos do servidor.');
      }

      const defaultRoles = [
        { name: '👑 Direção', color: 0xED4245, hoist: true, mentionable: true },
        { name: '⭐ Administrador', color: 0xE67E22, hoist: true, mentionable: true },
        { name: '🛡️ Moderador', color: 0x3498DB, hoist: true, mentionable: true },
        { name: '🤝 Suporte', color: 0x2ECC71, hoist: true, mentionable: true },
        { name: '💎 VIP', color: 0xE91E63, hoist: true, mentionable: false },
        { name: '🏆 Membro Ativo', color: 0xF1C40F, hoist: true, mentionable: false },
        { name: '👤 Membro', color: 0x99AAB5, hoist: false, mentionable: false },
        { name: '🤖 Bots', color: 0x7289DA, hoist: true, mentionable: false },
        { name: '📢 Anúncios', color: 0x5865F2, hoist: false, mentionable: true },
        { name: '🎉 Sorteios', color: 0x9B59B6, hoist: false, mentionable: true },
        { name: '🎮 Eventos', color: 0x1ABC9C, hoist: false, mentionable: true },
        { name: '☣️ Quarentena', color: 0x36393F, hoist: false, mentionable: false }
      ];

      const created = [];
      const botHighest = guild.members.me?.roles.highest.position || 0;

      for (const def of defaultRoles) {
        const exists = guild.roles.cache.find(r => r.name.toLowerCase() === def.name.toLowerCase());
        if (!exists) {
          try {
            const role = await guild.roles.create({
              name: def.name,
              color: def.color,
              hoist: def.hoist,
              mentionable: def.mentionable,
              reason: 'Setup automatizado de cargos úteis'
            });
            created.push(role.name);
          } catch (err) {
            console.error(`Erro ao criar ${def.name}:`, err);
          }
        }
      }

      return message.reply(`✅ **Setup Concluído!** ${created.length > 0 ? `Cargos criados: ${created.join(', ')}` : 'Todos os cargos padrão já existiam no servidor.'}`);
    }

    // ==========================================
    // 1. ?cargo listar
    // ==========================================
    if (subCommand === 'listar' || !subCommand) {
      const roles = guild.roles.cache
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position);

      const roleList = roles.map(r => `${r.name} (\`${r.id}\`) - Posição: ${r.position}`).slice(0, 25).join('\n');

      const embed = new EmbedBuilder()
        .setTitle(`🛡️ Cargos do Servidor: ${guild.name}`)
        .setDescription(roleList || 'Nenhum cargo encontrado.')
        .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
        .setFooter({ text: `Total de cargos: ${roles.size}` });

      return message.reply({ embeds: [embed] });
    }

    // ==========================================
    // 2. ?cargo info <cargo>
    // ==========================================
    if (subCommand === 'info') {
      const targetQuery = args[1];
      if (!targetQuery) {
        return message.reply('⚠️ Por favor, informe o ID, menção ou nome do cargo. Ex: `?cargo info @Membro`');
      }

      const role = message.mentions.roles.first() ||
        guild.roles.cache.get(targetQuery) ||
        guild.roles.cache.find(r => r.name.toLowerCase() === targetQuery.toLowerCase());

      if (!role) {
        return message.reply('❌ Cargo não encontrado no servidor.');
      }

      const embed = new EmbedBuilder()
        .setTitle(`ℹ️ Informações do Cargo: ${role.name}`)
        .setColor(role.color || SYSTEM_DEFAULTS.COLOR_PRIMARY)
        .addFields(
          { name: 'ID', value: `\`${role.id}\``, inline: true },
          { name: 'Cor', value: role.hexColor.toUpperCase(), inline: true },
          { name: 'Posição', value: `${role.position}`, inline: true },
          { name: 'Membros', value: `${role.members.size}`, inline: true },
          { name: 'Mencionável', value: role.mentionable ? 'Sim' : 'Não', inline: true },
          { name: 'Separado (Hoist)', value: role.hoist ? 'Sim' : 'Não', inline: true }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ==========================================
    // 3. ?cargo criar <nome> [cor]
    // ==========================================
    if (subCommand === 'criar') {
      const isAllowed = authService.canExecute(
        guild.id,
        member.id,
        member.roles.cache.map(r => r.id),
        guild.ownerId === member.id,
        member.permissions.has('Administrator'),
        PERMISSIONS.ROLES_MANAGE
      );

      if (!isAllowed) {
        return message.reply('🚫 Você não possui permissão (`roles.manage`) para criar cargos.');
      }

      const name = args[1];
      if (!name) {
        return message.reply('⚠️ Uso correto: `?cargo criar <nome> [#corHexadecimal]`');
      }

      let roleColor = SYSTEM_DEFAULTS.COLOR_PRIMARY;
      if (args[2]) {
        const parsed = parseHexColor(args[2]);
        if (parsed.valid) roleColor = parsed.intColor;
      }

      const botHighestRole = guild.members.me?.roles.highest;
      if (!guild.members.me?.permissions.has('ManageRoles')) {
        return message.reply('❌ O bot não possui a permissão nativa `ManageRoles` (Gerenciar Cargos) no Discord.');
      }

      try {
        const createdRole = await guild.roles.create({
          name: name.replace(/_/g, ' '),
          color: roleColor,
          reason: `Criado por ${message.author.tag} (${message.author.id})`
        });

        auditRepo.logAudit({
          guildId: guild.id,
          actorId: message.author.id,
          actionType: 'ROLE_CREATE',
          targetId: createdRole.id,
          reason: `Criado via comando ?cargo criar`,
          result: 'SUCCESS'
        });

        return message.reply(`✅ Cargo **${createdRole.name}** criado com sucesso! (ID: \`${createdRole.id}\`)`);
      } catch (err) {
        return message.reply(`❌ Erro ao criar cargo: ${err.message}`);
      }
    }

    // ==========================================
    // 4. ?cargo editar <cargo> <nome|cor> <novoValor>
    // ==========================================
    if (subCommand === 'editar') {
      const isAllowed = authService.canExecute(
        guild.id,
        member.id,
        member.roles.cache.map(r => r.id),
        guild.ownerId === member.id,
        member.permissions.has('Administrator'),
        PERMISSIONS.ROLES_MANAGE
      );

      if (!isAllowed) {
        return message.reply('🚫 Você não possui permissão (`roles.manage`) para editar cargos.');
      }

      const roleIdOrMention = args[1];
      const property = (args[2] || '').toLowerCase();
      const newValue = args.slice(3).join(' ');

      const role = message.mentions.roles.first() || guild.roles.cache.get(roleIdOrMention);
      if (!role) {
        return message.reply('⚠️ Cargo não encontrado. Uso: `?cargo editar <@cargo|ID> <nome|cor> <novoValor>`');
      }

      // Validação de hierarquia
      const botMember = guild.members.me;
      if (role.position >= botMember.roles.highest.position) {
        return message.reply('❌ O bot não pode modificar este cargo pois ele está acima ou no mesmo nível do cargo mais alto do bot.');
      }

      if (guild.ownerId !== member.id && role.position >= member.roles.highest.position) {
        return message.reply('❌ Você não pode modificar um cargo superior ou igual ao seu mais alto na hierarquia.');
      }

      try {
        if (property === 'nome' || property === 'name') {
          await role.setName(newValue, `Editado por ${message.author.tag}`);
          return message.reply(`✅ Nome do cargo atualizado para **${newValue}**.`);
        } else if (property === 'cor' || property === 'color') {
          const parsed = parseHexColor(newValue);
          if (!parsed.valid) return message.reply('❌ Cor inválida. Utilize formato hexadecimal: `#5865F2`');
          await role.setColor(parsed.intColor, `Editado por ${message.author.tag}`);
          return message.reply(`✅ Cor do cargo atualizada para **${parsed.hexColor}**.`);
        } else {
          return message.reply('⚠️ Propriedade inválida. Escolha entre `nome` ou `cor`.');
        }
      } catch (err) {
        return message.reply(`❌ Falha ao editar cargo: ${err.message}`);
      }
    }

    // ==========================================
    // 5. ?cargo adicionar <@membro|ID> <@cargo|ID>
    // ==========================================
    if (subCommand === 'adicionar' || subCommand === 'add') {
      const isAllowed = authService.canExecute(
        guild.id,
        member.id,
        member.roles.cache.map(r => r.id),
        guild.ownerId === member.id,
        member.permissions.has('Administrator'),
        PERMISSIONS.ROLES_ASSIGN
      );

      if (!isAllowed) {
        return message.reply('🚫 Você não possui permissão (`roles.assign`) para atribuir cargos.');
      }

      const targetMember = message.mentions.members.first() || (args[1] ? await guild.members.fetch(args[1]).catch(() => null) : null);
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[2]);

      if (!targetMember || !role) {
        return message.reply('⚠️ Uso correto: `?cargo adicionar <@membro|ID> <@cargo|ID>`');
      }

      // Validação de hierarquia
      const botMember = guild.members.me;
      if (role.position >= botMember.roles.highest.position) {
        return message.reply('❌ Não posso atribuir este cargo pois ele é superior ou igual ao meu cargo mais alto.');
      }

      if (guild.ownerId !== member.id && role.position >= member.roles.highest.position) {
        return message.reply('❌ Você não pode atribuir um cargo superior ou igual ao seu cargo mais alto.');
      }

      try {
        await targetMember.roles.add(role, `Atribuído por ${message.author.tag}`);
        auditRepo.logAudit({
          guildId: guild.id,
          actorId: message.author.id,
          actionType: 'ROLE_ASSIGN',
          targetId: targetMember.id,
          reason: `Cargo ${role.name} adicionado`,
          result: 'SUCCESS'
        });
        return message.reply(`✅ Cargo **${role.name}** adicionado com sucesso a **${targetMember.user.tag}**!`);
      } catch (err) {
        return message.reply(`❌ Erro ao adicionar cargo: ${err.message}`);
      }
    }

    // ==========================================
    // 6. ?cargo remover <@membro|ID> <@cargo|ID>
    // ==========================================
    if (subCommand === 'remover' || subCommand === 'remove') {
      const isAllowed = authService.canExecute(
        guild.id,
        member.id,
        member.roles.cache.map(r => r.id),
        guild.ownerId === member.id,
        member.permissions.has('Administrator'),
        PERMISSIONS.ROLES_ASSIGN
      );

      if (!isAllowed) {
        return message.reply('🚫 Você não possui permissão (`roles.assign`) para remover cargos.');
      }

      const targetMember = message.mentions.members.first() || (args[1] ? await guild.members.fetch(args[1]).catch(() => null) : null);
      const role = message.mentions.roles.first() || guild.roles.cache.get(args[2]);

      if (!targetMember || !role) {
        return message.reply('⚠️ Uso correto: `?cargo remover <@membro|ID> <@cargo|ID>`');
      }

      const botMember = guild.members.me;
      if (role.position >= botMember.roles.highest.position) {
        return message.reply('❌ Não posso remover este cargo pois ele é superior ou igual ao meu cargo mais alto.');
      }

      if (guild.ownerId !== member.id && role.position >= member.roles.highest.position) {
        return message.reply('❌ Você não pode remover um cargo superior ou igual ao seu cargo mais alto.');
      }

      try {
        await targetMember.roles.remove(role, `Removido por ${message.author.tag}`);
        auditRepo.logAudit({
          guildId: guild.id,
          actorId: message.author.id,
          actionType: 'ROLE_REMOVE',
          targetId: targetMember.id,
          reason: `Cargo ${role.name} removido`,
          result: 'SUCCESS'
        });
        return message.reply(`✅ Cargo **${role.name}** removido com sucesso de **${targetMember.user.tag}**!`);
      } catch (err) {
        return message.reply(`❌ Erro ao remover cargo: ${err.message}`);
      }
    }

    // ==========================================
    // 7. ?cargo painel <título> <@cargo1> [@cargo2...]
    // ==========================================
    if (subCommand === 'painel') {
      const isAllowed = authService.canExecute(
        guild.id,
        member.id,
        member.roles.cache.map(r => r.id),
        guild.ownerId === member.id,
        member.permissions.has('Administrator'),
        PERMISSIONS.ROLES_MANAGE
      );

      if (!isAllowed) {
        return message.reply('🚫 Você não possui permissão (`roles.manage`) para criar painéis de cargos.');
      }

      const mentionedRoles = Array.from(message.mentions.roles.values());
      if (mentionedRoles.length === 0) {
        return message.reply('⚠️ Mencione os cargos que devem compor o painel interativo. Ex: `?cargo painel Escolha seu Jogo @Minecraft @Valorant`');
      }

      const panelTitle = args[1] && !args[1].startsWith('<@&') ? args[1] : 'Seleção de Cargos';

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('role_panel_select')
        .setPlaceholder('Selecione os cargos desejados')
        .setMinValues(0)
        .setMaxValues(mentionedRoles.length);

      for (const r of mentionedRoles.slice(0, 25)) {
        selectMenu.addOptions({
          label: r.name.slice(0, 50),
          value: r.id,
          description: `Clique para receber/remover o cargo ${r.name}`.slice(0, 100)
        });
      }

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle(`🎭 ${panelTitle}`)
        .setDescription('Use o menu abaixo para adicionar ou remover seus cargos autoatribuíveis.')
        .setColor(SYSTEM_DEFAULTS.COLOR_PRIMARY)
        .setFooter({ text: 'Sistema de Autorroles' });

      const sentMsg = await message.channel.send({ embeds: [embed], components: [row] });

      // Salva no banco
      const rolesData = JSON.stringify(mentionedRoles.map(r => ({ role_id: r.id, label: r.name })));
      db.prepare(`
        INSERT INTO role_panels (guild_id, channel_id, message_id, title, roles_json)
        VALUES (?, ?, ?, ?, ?)
      `).run(guild.id, message.channel.id, sentMsg.id, panelTitle, rolesData);

      return message.reply('✅ Painel interativo criado e registrado com sucesso!');
    }

    return message.reply('⚠️ Subcomando desconhecido. Use: `?cargo <criar|editar|adicionar|remover|listar|info|painel>`');
  }
};
