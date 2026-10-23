require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = client.guilds.cache.get('1562230954594934887');
  if (guild) {
    const channels = await guild.channels.fetch();
    channels.forEach(ch => {
      if (ch) console.log(`${ch.id} | ${ch.name}`);
    });
  }
  process.exit(0);
});

client.login(process.env.DISCORD_BOT_TOKEN);
