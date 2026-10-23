require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const PANELS = [
  {
    channelId: '1562563846449664131', // YouTube
    banner: path.join(__dirname, '../bot/assets/youtube-streaming-banner.png'),
    bannerName: 'banner_youtube.png',
    title: 'YOUTUB3 PR3M1UM',
    description:
      '⚡ **Entrega Automática!**\n\n' +
      '### YOUTUB3 PR3M1UM\n' +
      'Sem anúncios (adeus interrupções)\n' +
      'Vídeos rodando em segundo plano\n' +
      'Download pra assistir offline\n' +
      'Acesso completo ao YouTube Music\n\n' +
      '**A partir de** `R$ 8,90`\n' +
      'Clique no botão **"Ver opções"** para ver as variações disponíveis',
    customId: 'shop_options_youtube'
  },
  {
    channelId: '1562563845044707389', // Prime Video
    banner: path.join(__dirname, '../bot/assets/prime-video-banner.png'),
    bannerName: 'banner_prime.png',
    title: 'PR1ME V1DE0',
    description:
      '⚡ **Entrega Automática!**\n\n' +
      '### PR1ME V1DE0\n' +
      'DETALHES DO PLANO\n' +
      '• Plano Premium\n' +
      '• Até 4 telas simultâneas\n' +
      '• Qualidade Ultra HD (4K) + HDR\n' +
      '• Catálogo completo (filmes, séries, jogos e lançamentos)\n' +
      '• Pagamento seguro\n' +
      '• Garantia de até 14 dias\n\n' +
      'BENEFÍCIOS EXCLUSIVOS\n' +
      '• Qualidade 4K Ultra HD\n' +
      '• Acesso aos principais lançamentos\n' +
      '• Sem limitações de conteúdo\n' +
      '• Melhor desempenho em TVs, consoles e PC\n\n' +
      '**A partir de** `R$ 7,90`\n' +
      'Clique no botão **"Ver opções"** para ver as variações disponíveis',
    customId: 'shop_options_prime'
  },
  {
    channelId: '1562563843387949137', // Paramount+
    banner: path.join(__dirname, '../bot/assets/paramount-banner.png'),
    bannerName: 'banner_paramount.png',
    title: 'P4R4M0NT',
    description:
      '⚡ **Entrega Automática!**\n\n' +
      '### P4R4M0NT\n' +
      'DETALHES DO PLANO\n' +
      '• Plano Premium\n' +
      '• Até 4 telas simultâneas\n' +
      '• Qualidade Ultra HD (4K) + HDR\n' +
      '• Catálogo completo (filmes, séries, jogos e lançamentos)\n' +
      '• Pagamento seguro\n' +
      '• Garantia de até 14 dias\n\n' +
      'BENEFÍCIOS EXCLUSIVOS\n' +
      '• Qualidade 4K Ultra HD\n' +
      '• Acesso aos principais lançamentos\n' +
      '• Sem limitações de conteúdo\n' +
      '• Melhor desempenho em TVs, consoles e PC\n\n' +
      '**A partir de** `R$ 7,90`\n' +
      'Clique no botão **"Ver opções"** para ver as variações disponíveis',
    customId: 'shop_options_paramount'
  },
  {
    channelId: '1562563841928331397', // Disney+
    banner: path.join(__dirname, '../bot/assets/disney-banner.png'),
    bannerName: 'banner_disney.png',
    title: 'D1SN3Y PLUS',
    description:
      '⚡ **Entrega Automática!**\n\n' +
      '### D1SN3Y PLUS\n' +
      'DETALHES DO PLANO\n' +
      '• Plano Premium\n' +
      '• Até 4 telas simultâneas\n' +
      '• Qualidade Ultra HD (4K) + HDR\n' +
      '• Catálogo completo (filmes, séries, jogos e lançamentos)\n' +
      '• Pagamento seguro\n' +
      '• Garantia de até 14 dias\n\n' +
      'BENEFÍCIOS EXCLUSIVOS\n' +
      '• Qualidade 4K Ultra HD\n' +
      '• Acesso aos principais lançamentos\n' +
      '• Sem limitações de conteúdo\n' +
      '• Melhor desempenho em TVs, consoles e PC\n\n' +
      '**A partir de** `R$ 12,90`\n' +
      'Clique no botão **"Ver opções"** para ver as variações disponíveis',
    customId: 'shop_options_disney'
  },
  {
    channelId: '1562563840527306992', // HBO Max
    banner: path.join(__dirname, '../bot/assets/hbo-banner.png'),
    bannerName: 'banner_hbo.png',
    title: 'HB0 M4X',
    description:
      '⚡ **Entrega Automática!**\n\n' +
      '### HB0 M4X\n' +
      'DETALHES DO PLANO\n' +
      '• Plano Premium\n' +
      '• Até 4 telas simultâneas\n' +
      '• Qualidade Ultra HD (4K) + HDR\n' +
      '• Catálogo completo (filmes, séries, jogos e lançamentos)\n' +
      '• Pagamento seguro\n' +
      '• Garantia de até 14 dias\n\n' +
      'BENEFÍCIOS EXCLUSIVOS\n' +
      '• Qualidade 4K Ultra HD\n' +
      '• Acesso aos principais lançamentos\n' +
      '• Sem limitações de conteúdo\n' +
      '• Melhor desempenho em TVs, consoles e PC\n\n' +
      '**A partir de** `R$ 7,90`\n' +
      'Clique no botão **"Ver opções"** para ver as variações disponíveis',
    customId: 'shop_options_hbo'
  }
];

client.once('ready', async () => {
  console.log(`Logado como ${client.user.tag}`);

  for (const p of PANELS) {
    try {
      const channel = await client.channels.fetch(p.channelId);
      if (!channel) continue;

      // Limpar mensagens antigas do canal
      const messages = await channel.messages.fetch({ limit: 10 });
      for (const m of messages.values()) {
        await m.delete().catch(() => {});
      }

      const files = [];
      if (fs.existsSync(p.banner)) {
        files.push(new AttachmentBuilder(p.banner, { name: p.bannerName }));
      }

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription(p.description)
        .setFooter({ text: 'REAL BOOST • BlackShop' });

      if (files.length > 0) {
        embed.setImage(`attachment://${p.bannerName}`);
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(p.customId)
          .setLabel('Ver opções')
          .setEmoji('🛒')
          .setStyle(ButtonStyle.Secondary)
      );

      await channel.send({
        embeds: [embed],
        components: [row],
        files
      });

      console.log(`✅ Painel atualizado em #${channel.name}`);
    } catch (err) {
      console.error(`Erro ao atualizar canal ${p.channelId}:`, err);
    }
  }

  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_BOT_TOKEN);
