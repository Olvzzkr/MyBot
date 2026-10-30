require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const PANELS = [
  {
    channelId: '1562563841928331397', // Disney+
    banner: path.join(__dirname, '../bot/assets/disney-plus-banner.png'),
    bannerName: 'banner_disney.png',
    description:
      '⚡ **Entrega Automática!**\n\n' +
      '### DISNEY+ PREMIUM\n' +
      'DETALHES DO PLANO\n' +
      '• Plano Premium (Qualidade 4K Ultra HD + HDR)\n' +
      '• Até 4 telas simultâneas\n' +
      '• Catálogo completo: Disney, Pixar, Marvel, Star Wars, NatGeo & ESPN\n' +
      '• Possibilidade de assistir offline (download liberado)\n' +
      '• Pagamento seguro via PIX\n' +
      '• Suporte e garantia exclusivos\n\n' +
      'BENEFÍCIOS EXCLUSIVOS\n' +
      '• Qualidade 4K Ultra HD e som imersivo\n' +
      '• Acesso aos maiores sucessos e originais exclusivos\n' +
      '• Sem anúncios e sem limitações\n' +
      '• Melhor desempenho em Smart TVs, consoles, celulares e PC\n\n' +
      '**A partir de** `R$ 12,90`\n' +
      'Clique no botão **"Ver opções"** para ver as variações disponíveis',
    customId: 'shop_options_disney',
    color: 0x113CCF
  },
  {
    channelId: '1562563837587099739', // Netflix
    banner: path.join(__dirname, '../bot/assets/netflix-banner.png'),
    bannerName: 'banner_netflix.png',
    description:
      '⚡ **Entrega Automática!**\n\n' +
      '### N3TFL1X\n' +
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
      '**A partir de** `R$ 8,90`\n' +
      'Clique no botão **"Ver opções"** para ver as variações disponíveis',
    customId: 'shop_options_netflix'
  },
  {
    channelId: '1562563839034269806', // Crunchyroll
    banner: path.join(__dirname, '../bot/assets/crunchyroll-banner.png'),
    bannerName: 'banner_crunchyroll.png',
    description:
      '⚡ **Entrega Automática!**\n\n' +
      '### CRUNCHYROLL MEGA FAN\n' +
      'DETALHES DO PLANO\n' +
      '• Plano Mega Fan (Sem Anúncios)\n' +
      '• Qualidade Full HD (1080p)\n' +
      '• Episódios logo após o lançamento no Japão\n' +
      '• Catálogo completo de animes, filmes e mangás\n' +
      '• Pagamento seguro via PIX\n' +
      '• Suporte e garantia exclusivos\n\n' +
      'BENEFÍCIOS EXCLUSIVOS\n' +
      '• Assista em qualquer dispositivo (TV, Celular, PC, Console)\n' +
      '• Download de episódios para assistir offline\n' +
      '• Sem propagandas ou limitações\n' +
      '• Entrega rápida e automática\n\n' +
      '**A partir de** `R$ 6,90`\n' +
      'Clique no botão **"Ver opções"** para ver as variações disponíveis',
    customId: 'shop_options_crunchyroll',
    color: 0xF47521
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
        .setColor(p.color || 0x2B2D31)
        .setDescription(p.description)
        .setFooter({ text: 'RealShop • Entrega Rápida & Garantia' });

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
