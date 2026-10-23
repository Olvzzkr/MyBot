require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const ReceiptService = require('../bot/services/receiptService');
const { resolveProductChannel } = require('../bot/utils/channelResolver');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
  console.log(`Logado como ${client.user.tag}`);

  try {
    const guildId = '1562230954594934887';
    const channelId = '1562634795781988404'; // # 🚚・entr3gas-realizadas
    const guild = await client.guilds.fetch(guildId);
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.error('Canal não encontrado!');
      process.exit(1);
    }

    // Limpar mensagens de teste anteriores do bot no canal
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      for (const msg of messages.values()) {
        if (msg.author.id === client.user.id) {
          await msg.delete().catch(() => {});
        }
      }
    } catch (cleanErr) {
      console.warn('Aviso ao limpar canal:', cleanErr.message);
    }

    let avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
    let displayName = 'olvzzkr';
    let username = 'olvzzxk_';

    try {
      const user = await client.users.fetch('1517970601342664768');
      if (user) {
        avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
        displayName = user.globalName || user.username;
        username = user.username;
      }
    } catch {}

    const productName = '1x 14x Impulsos de Servidor (1 Ano)';
    const price = 'R$ 179.90';

    const receiptBuffer = await ReceiptService.generateReceipt({
      avatarUrl,
      displayName,
      username,
      productName,
      price,
      date: new Date(),
      brandName: 'REAL BOOST'
    });

    const attachment = new AttachmentBuilder(receiptBuffer, { name: 'recibo_entrega.png' });

    // Link dinâmico do produto: aponta diretamente para o canal de impulsos!
    const productUrl = resolveProductChannel(productName, guild);
    console.log(`Link dinâmico gerado para "${productName}":`, productUrl);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Comprar')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Link)
        .setURL(productUrl),
      new ButtonBuilder()
        .setLabel('Feedbacks')
        .setEmoji('🏆')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guildId}/1562634794263777280`)
    );

    await channel.send({
      files: [attachment],
      components: [buttons]
    });

    console.log('✅ Recibo com redirecionamento dinâmico postado com sucesso!');
  } catch (err) {
    console.error('Erro ao postar recibo:', err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
