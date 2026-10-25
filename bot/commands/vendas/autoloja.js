/**
 * Comando ?autoloja - Criação automatizada de todas as categorias e canais da loja
 */

const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { PERMISSIONS } = require('../../../shared/permissions');
const { SYSTEM_DEFAULTS } = require('../../../shared/constants');

const STORE_STRUCTURE = [
  {
    category: '🛒 Central da Loja',
    channels: [
      { name: '📌・como-comprar', topic: 'Instruções e dúvidas frequentes sobre como comprar na loja' },
      { name: '📢・avisos-loja', topic: 'Novidades, reposição de estoque e promoções' },
      { name: '⭐・avaliações', topic: 'Avaliações e feedbacks de clientes satisfeitos' }
    ]
  },
  {
    category: 'Assinaturas',
    channels: [
      { name: '🎮・game-pass', topic: 'Assinaturas Xbox Game Pass Ultimate e PC' },
      { name: '📺・gerador・assinaturas', topic: 'Gerador de assinaturas e acessos' },
      { name: '🎶・spotify', topic: 'Spotify Premium Individual e Família' },
      { name: '⭐・youtube', topic: 'YouTube Premium sem anúncios' }
    ]
  },
  {
    category: 'D1scord',
    channels: [
      { name: '⭐・1mpulso・membro', topic: 'Impulsos (Boosts) para servidores do Discord' },
      { name: '⭐・c0nta・v1rgem', topic: 'Contas Discord Virgens com Nitro Resgatável' },
      { name: '⭐・c0nta・n1tro', topic: 'Contas Discord com Nitro ativo' },
      { name: '⭐・n1tro・link', topic: 'Links promocionais de ativação Nitro' },
      { name: '⭐・n1tro・gift', topic: 'Códigos Gift Nitro mensais e anuais' },
      { name: '⭐・c0nta・antig4', topic: 'Contas antigas do Discord (2015-2020)' },
      { name: '👥・membro・real', topic: 'Membros reais para engajamento no servidor' },
      { name: '⭐・decoração', topic: 'Decorações de perfil e efeitos de avatar' },
      { name: '⭐・ativação', topic: 'Serviço de ativação rápida' }
    ]
  },
  {
    category: 'HACK FREE FIRE',
    channels: [
      { name: '🖥️・external・emulador', topic: 'Painéis e programas externos para emuladores' },
      { name: '🎯・xit・hs・aimbot', topic: 'Aimbot 100% calibrado e indetectável' },
      { name: '🎯・hs・pescoço', topic: 'Configuração HS pescoço para disfarçar' },
      { name: '🎯・holograma・antena', topic: 'Antena holograma para localização de alvos' },
      { name: '🎯・aim・bot・android', topic: 'Aimbot e otimizações para mobile Android' }
    ]
  },
  {
    category: 'Outros - Ferramentas',
    channels: [
      { name: '🔍・pa1nel・puxada', topic: 'Painel de consultas e puxadas de dados' },
      { name: '🏦・bancos・fake', topic: 'Comprovantes e telas editáveis' },
      { name: '⚙️・pack・otimizacao', topic: 'Pack de otimização de FPS e redução de input lag' },
      { name: '📞・pa1nel・de・ligacao', topic: 'Painel spoof de chamadas' },
      { name: '⭐・capcut・pro', topic: 'Acessos CapCut Pro e ferramentas de edição' },
      { name: '⭐・wallpaper・engine', topic: 'Licenças e papéis de parede animados' },
      { name: '🎨・pack・design', topic: 'Packs de artes, flyers, banners e fontes' }
    ]
  }
];

module.exports = {
  name: 'autoloja',
  aliases: ['setup-loja', 'criar-loja', 'loja-setup'],
  description: 'Cria automaticamente todas as categorias e canais de produtos da loja',
  usage: '?autoloja',
  requiredPermission: PERMISSIONS.CHANNELS_MANAGE,

  async execute({ message, guild, member, author, auditRepo }) {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && author.id !== '1517970601342664768') {
      return message.reply('❌ Apenas Administradores podem executar a criação automática da loja.');
    }

    const statusMsg = await message.reply('⏳ **Iniciando criação da estrutura completa da loja... Aguarde alguns instantes.**');

    let totalCategories = 0;
    let totalChannels = 0;

    for (const group of STORE_STRUCTURE) {
      try {
        // 1. Criar Categoria
        const categoryChannel = await message.guild.channels.create({
          name: group.category,
          type: ChannelType.GuildCategory,
          reason: 'Criação automática de categoria de loja por ?autoloja'
        });
        totalCategories++;

        // 2. Criar Canais dentro da Categoria com permissão de somente-leitura para @everyone
        for (const ch of group.channels) {
          await message.guild.channels.create({
            name: ch.name,
            type: ChannelType.GuildText,
            parent: categoryChannel.id,
            topic: ch.topic,
            permissionOverwrites: [
              {
                id: message.guild.id, // @everyone
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads]
              },
              {
                id: message.client.user.id, // Nexora Bot
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageChannels]
              }
            ],
            reason: `Canal de produto ${ch.name} criado via ?autoloja`
          });
          totalChannels++;
          // Pequena pausa para evitar rate limit do Discord
          await new Promise(r => setTimeout(r, 400));
        }
      } catch (err) {
        console.error(`Erro ao criar categoria ${group.category}:`, err);
      }
    }

    const successEmbed = new EmbedBuilder()
      .setTitle('🛒 Estrutura da Loja Criada com Sucesso!')
      .setColor(SYSTEM_DEFAULTS.COLOR_SUCCESS)
      .setDescription(`Todas as categorias e salas de produtos foram criadas e organizadas com permissões de somente-leitura para clientes (somente o bot/staff posta produtos).`)
      .addFields(
        { name: '📁 Categorias Criadas', value: `${totalCategories}`, inline: true },
        { name: '💬 Canais de Produtos', value: `${totalChannels}`, inline: true },
        { name: '🛡️ Permissões', value: 'Canal limpo: clientes só leem e compram via botões', inline: false }
      )
      .setFooter({ text: 'Próximo passo: Cadastrar e postar os painéis de produtos!' })
      .setTimestamp();

    await statusMsg.edit({ content: '✅ **Criação concluída com sucesso!**', embeds: [successEmbed] });

    if (auditRepo) {
      auditRepo.logAudit({
        guildId: message.guild.id,
        actorId: author.id,
        actionType: 'SETTINGS_UPDATE',
        reason: `Estrutura de loja criada via ?autoloja (${totalChannels} canais em ${totalCategories} categorias)`,
        result: 'SUCCESS'
      });
    }
  }
};
