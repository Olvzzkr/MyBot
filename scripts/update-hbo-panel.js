require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('node:path');
const fs = require('node:fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  console.log(`Logado como ${client.user.tag}`);

  try {
    const channelId = '1562563840527306992'; // # 📺・hbb0・m4x
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.error('Canal não encontrado!');
      process.exit(1);
    }

    // Limpar mensagens anteriores do canal
    const messages = await channel.messages.fetch({ limit: 10 });
    for (const msg of messages.values()) {
      await msg.delete().catch(() => {});
    }

    const bannerPath = path.join(__dirname, '../bot/assets/hbo-max-banner.png');
    const files = [];
    if (fs.existsSync(bannerPath)) {
      files.push(new AttachmentBuilder(bannerPath, { name: 'banner_hbo.png' }));
    }

    const embed = new EmbedBuilder()
      .setColor(0x5822B4)
      .setDescription(
        '⚡ **Entrega Automática!**\n\n' +
        '### MAX (HBO MAX)\n' +
        'DETALHES DO PLANO\n' +
        '• Plano Platinum (Qualidade 4K Ultra HD)\n' +
        '• Até 4 telas simultâneas\n' +
        '• Áudio Dolby Atmos e HDR10\n' +
        '• Catálogo completo (Warner, DC, HBO, Discovery e Champions League)\n' +
        '• Pagamento seguro via PIX\n' +
        '• Garantia de até 14 dias\n\n' +
        'BENEFÍCIOS EXCLUSIVOS\n' +
        '• Qualidade 4K Ultra HD sem travamentos\n' +
        '• Acesso aos maiores lançamentos do cinema\n' +
        '• Sem limitações de conteúdo\n' +
        '• Melhor desempenho em TVs, consoles, celulares e PC\n\n' +
        '**A partir de** `R$ 7,90`\n' +
        'Clique no botão **"Ver opções"** para ver as variações disponíveis'
      )
      .setFooter({ text: 'RealShop • Entrega Rápida & Garantia' });

    if (files.length > 0) {
      embed.setImage('attachment://banner_hbo.png');
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop_options_hbo')
        .setLabel('Ver opções')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      embeds: [embed],
      components: [row],
      files
    });

    console.log('✅ Painel com o banner da HBO Max atualizado com sucesso!');
  } catch (err) {
    console.error('Erro ao atualizar painel HBO Max:', err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
