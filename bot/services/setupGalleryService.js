/**
 * Serviço de Galeria de Setups Interativa com Moderação Automática
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const NsfwFilterService = require('./nsfwFilterService');
const ModLogService = require('./modLogService');
const { SYSTEM_DEFAULTS } = require('../../shared/constants');

class SetupGalleryService {
  constructor(db) {
    this.db = db;
  }

  getSetupChannelId(guildId) {
    const row = this.db.prepare('SELECT setup_channel_id FROM guild_settings WHERE guild_id = ?').get(guildId);
    return row?.setup_channel_id || '1553647551352275074';
  }

  /**
   * Processa mensagens enviadas no canal de setups
   * @param {import('discord.js').Message} message
   * @returns {Promise<boolean>} Retorna true se a mensagem foi tratada
   */
  async handleMessage(message) {
    if (message.author.bot || !message.guild) return false;

    const setupChannelId = this.getSetupChannelId(message.guild.id);
    if (message.channel.id !== setupChannelId) return false;

    const { author, channel, guild } = message;

    // 1. Caso o usuário não envie nenhum anexo (apenas texto)
    if (message.attachments.size === 0) {
      try {
        await message.delete();
      } catch {}

      const warnMsg = await channel.send({
        content: `⚠️ ${author}, este canal é exclusivo para **fotos de setups**! Se quiser bater papo ou tirar dúvidas, use os tópicos (threads) embaixo de cada setup ou o canal <#1553646569818030191>.`
      }).catch(() => null);

      if (warnMsg) {
        setTimeout(() => warnMsg.delete().catch(() => {}), 7000);
      }
      return true;
    }

    // 2. Verificar se o anexo é uma imagem válida
    const imageAttachment = message.attachments.find(att => {
      const name = (att.name || '').toLowerCase();
      return att.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name);
    });

    if (!imageAttachment) {
      try {
        await message.delete();
      } catch {}

      const warnMsg = await channel.send({
        content: `⚠️ ${author}, apenas imagens (PNG, JPG, WEBP) são permitidas no canal de setups.`
      }).catch(() => null);

      if (warnMsg) {
        setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
      }
      return true;
    }

    // 3. Avaliação de Conteúdo Imoral / +18 (NSFW)
    const nsfwCheck = await NsfwFilterService.evaluate(message);
    if (nsfwCheck.isNsfw) {
      // Excluir mensagem original imediatamente
      try {
        await message.delete();
      } catch {}

      // Registrar no canal de mod-logs
      const alertEmbed = new EmbedBuilder()
        .setTitle('🚨 Alerta de Segurança: Foto Imoral / +18 Bloqueada')
        .setColor(SYSTEM_DEFAULTS.COLOR_DANGER)
        .addFields(
          { name: '👤 Infrator', value: `${author.tag} (\`${author.id}\`)`, inline: true },
          { name: '📍 Canal', value: `<#${channel.id}>`, inline: true },
          { name: '🔍 Motivo do Bloqueio', value: nsfwCheck.reason || 'Conteúdo explícito detectado', inline: false },
          { name: '🛡️ Ação Executada', value: 'Mensagem excluída preventivamente pelo Nexora Shield', inline: false }
        )
        .setTimestamp();

      await ModLogService.send(guild, this.db, alertEmbed);

      // Alertar o infrator
      const userAlert = await channel.send({
        content: `❌ ${author}, sua publicação foi **bloqueada e excluída** pelo sistema de segurança por conter conteúdo potencialmente impróprio ou +18.`
      }).catch(() => null);

      if (userAlert) {
        setTimeout(() => userAlert.delete().catch(() => {}), 8000);
      }

      return true;
    }

    // 4. Conteúdo Seguro: Formatando e Publicando no Estilo do Modelo
    const caption = message.content ? message.content.trim() : '';

    // Baixar a imagem do Discord para reanexar na nova mensagem (evita link quebrado por expiração de CDN)
    let attachmentFile = null;
    let fileName = imageAttachment.name || 'setup.png';
    try {
      const imgRes = await fetch(imageAttachment.url);
      if (imgRes.ok) {
        const arrayBuf = await imgRes.arrayBuffer();
        attachmentFile = new AttachmentBuilder(Buffer.from(arrayBuf), { name: fileName });
      }
    } catch (err) {
      console.warn('[SetupGallery] Falha ao baixar anexo para reupload:', err.message);
    }

    // Deletar mensagem bruta original
    try {
      await message.delete();
    } catch {}

    const setupEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`## 💻 Setup de ${author}\n` + (caption ? `> *${caption}*\n\n` : ''))
      .setImage(attachmentFile ? `attachment://${fileName}` : imageAttachment.url)
      .setFooter({
        text: `Enviado por ${author.username} • Nexora Community`,
        iconURL: author.displayAvatarURL({ dynamic: true })
      })
      .setTimestamp();

    // Inserir registro preliminar no banco de dados
    const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_like:${tempId}`)
        .setLabel('🤍 0')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`setup_thread:${tempId}`)
        .setLabel('💬 Comentários')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`setup_delete:${tempId}:${author.id}`)
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    const messageOptions = {
      embeds: [setupEmbed],
      components: [actionRow]
    };

    if (attachmentFile) {
      messageOptions.files = [attachmentFile];
    }

    const sentMessage = await channel.send(messageOptions);

    // Salvar post no SQLite
    this.db.prepare(`
      INSERT INTO setup_posts (guild_id, channel_id, message_id, author_id, author_tag, image_url, caption, likes_count, likes_users_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, '[]')
    `).run(
      guild.id,
      channel.id,
      sentMessage.id,
      author.id,
      author.tag,
      imageAttachment.url,
      caption || null
    );

    // Atualizar os botões com o message.id definitivo
    const finalRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`setup_like:${sentMessage.id}`)
        .setLabel('🤍 0')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`setup_thread:${sentMessage.id}`)
        .setLabel('💬 Comentários')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`setup_delete:${sentMessage.id}:${author.id}`)
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    await sentMessage.edit({ components: [finalRow] }).catch(() => {});

    return true;
  }
}

module.exports = SetupGalleryService;
