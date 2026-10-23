/**
 * Utilitário para resolver o canal de venda de acordo com o produto comprado
 */

const CHANNEL_MAP = [
  // Impulsos
  { keywords: ['impulso', 'boost'], channelId: '1562242438620250252', fallbackName: '1mpulso' },

  // Discord & Nitro
  { keywords: ['nitro link', 'link trimensal', 'link mensal'], channelId: '1562242446971371550', fallbackName: 'n1tro・link' },
  { keywords: ['conta com 1', 'conta com 1 ano', 'nitrada', 'c0nta・n1tro'], channelId: '1562242442449916055', fallbackName: 'c0nta・n1tro' },
  { keywords: ['antiga', 'conta 20', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'], channelId: '1562242452688080918', fallbackName: 'c0nta・antig4' },
  { keywords: ['membro', 'membros reais'], channelId: '1562242456123211807', fallbackName: 'membro・real' },
  { keywords: ['ativação', 'ativacao'], channelId: '1562242462230122558', fallbackName: 'ativação' },

  // Streamings
  { keywords: ['youtube', 'yt_'], channelId: '1562563846449664131', fallbackName: 'y0utub3' },
  { keywords: ['prime', 'nba league'], channelId: '1562563845044707389', fallbackName: 'pr11m3' },
  { keywords: ['paramount'], channelId: '1562563843387949137', fallbackName: 'p4ram00unt' },
  { keywords: ['disney'], channelId: '1562563841928331397', fallbackName: 'd1sn33y' },
  { keywords: ['hbo', 'hbomax'], channelId: '1562563840527306992', fallbackName: 'hbb0' },
  { keywords: ['netflix'], channelId: '1562563837587099739', fallbackName: 'n33tfl1x' },
  { keywords: ['crunchyroll', 'cruncholl'], channelId: '1562563839034269806', fallbackName: 'crunchr00ll' },
  { keywords: ['spotify'], channelId: '1562242429770534995', fallbackName: 'spotify' },

  // Jogos
  { keywords: ['game pass', 'gamepass', 'xbox'], channelId: '1562242422459727882', fallbackName: 'game-pass' },
  { keywords: ['minecraft'], channelId: '1562563829978759378', fallbackName: 'min3craft' },
  { keywords: ['gta', 'rdr', 'red dead', 'forza', 'god of war', 'fc 26', 'conta steam'], channelId: '1562563831878656040', fallbackName: 'c0nt・st3am' },
  { keywords: ['cs2'], channelId: '1562563833501982840', fallbackName: 'cs2・ext3rnal' },
  { keywords: ['hours', 'horas', 'steam hours'], channelId: '1562563834961600623', fallbackName: 'st3am・h0urs' },

  // Cheats Free Fire
  { keywords: ['external', 'emulador'], channelId: '1562242467242311752', fallbackName: 'external・emulador' },
  { keywords: ['xit', '100% hs'], channelId: '1562242471633887263', fallbackName: 'xit・hs' },
  { keywords: ['pescoço', 'pescoco'], channelId: '1562242477224755221', fallbackName: 'pescoço' },
  { keywords: ['holograma', 'antena'], channelId: '1562242481356152862', fallbackName: 'holograma' },
  { keywords: ['aimbot', 'aim bot'], channelId: '1562242484610924606', fallbackName: 'aim・bot' },

  // Ferramentas & Outros
  { keywords: ['otimização', 'otimizacao', 'pack de otimização'], channelId: '1562242498016059392', fallbackName: 'otimizacao' },
  { keywords: ['capcut'], channelId: '1562242504739524720', fallbackName: 'capcut' },
  { keywords: ['wallpaper'], channelId: '1562242508191436934', fallbackName: 'wallpaper' },
  { keywords: ['designer', 'pack design'], channelId: '1562242512666632252', fallbackName: 'pack・design' }
];

function resolveProductChannel(productName = '', guild) {
  if (!guild) return 'https://discord.com';

  const clean = productName.toLowerCase();

  for (const entry of CHANNEL_MAP) {
    const matched = entry.keywords.some(k => clean.includes(k));
    if (matched) {
      // 1. Tentar canal por ID fixo
      if (entry.channelId && guild.channels.cache.has(entry.channelId)) {
        return `https://discord.com/channels/${guild.id}/${entry.channelId}`;
      }

      // 2. Tentar busca dinâmica no cache da guilda
      const dynamicCh = guild.channels.cache.find(c => c.name.toLowerCase().includes(entry.fallbackName));
      if (dynamicCh) {
        return `https://discord.com/channels/${guild.id}/${dynamicCh.id}`;
      }
    }
  }

  // Fallback geral: canal de como-comprar ou o primeiro canal de texto
  const defaultShop = guild.channels.cache.get('1562242410317218062') ||
                      guild.channels.cache.find(c => c.name.includes('compre') || c.name.includes('comprar'));

  const finalId = defaultShop ? defaultShop.id : guild.id;
  return `https://discord.com/channels/${guild.id}/${finalId}`;
}

module.exports = {
  resolveProductChannel
};
