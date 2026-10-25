/**
 * Serviço de Carrinho de Compras, Cupons e Checkout com PIX
 */

const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder
} = require('discord.js');
const PixService = require('./pixService');
const ReceiptService = require('./receiptService');
const { resolveProductChannel } = require('../utils/channelResolver');
const { getDatabase } = require('../../database/connection');

// Catálogo Global Unificado de Produtos
const PRODUCT_CATALOG = {
  // Discord & Nitro
  conta_virgem: { id: 'conta_virgem', name: 'Conta Virgem Discord (Full Acesso + Nitro Resgatável)', price: 1.50, category: 'Discord' },
  conta_virgem_5x: { id: 'conta_virgem_5x', name: 'Combo 5x Contas Virgens Discord (Full Acesso)', price: 6.90, category: 'Discord' },
  nitro_1m: { id: 'nitro_1m', name: 'Conta com 1 Mês de Nitro Ativado (2x Impulsos)', price: 4.90, category: 'Discord' },
  nitro_3m: { id: 'nitro_3m', name: 'Conta com 3 Meses de Nitro Ativado (2x Impulsos)', price: 6.90, category: 'Discord' },
  nitro_1y: { id: 'nitro_1y', name: 'Conta com 1 Ano de Nitro (12 Meses + 2x Impulsos)', price: 8.99, category: 'Discord' },
  link_1m: { id: 'link_1m', name: 'Nitro Link Mensal (1 Mês)', price: 1.99, category: 'Discord' },
  link_3m: { id: 'link_3m', name: 'Nitro Link Trimensal (3 Meses)', price: 3.90, category: 'Discord' },
  ativacao_nitro: { id: 'ativacao_nitro', name: 'Ativação NITRO LINK na sua Conta', price: 9.90, category: 'Discord' },
  boost_2x_30d: { id: 'boost_2x_30d', name: '2x Impulsos Mensais (30 Dias)', price: 7.99, category: 'Impulsos' },
  boost_4x_30d: { id: 'boost_4x_30d', name: '4x Impulsos Mensais (30 Dias)', price: 13.90, category: 'Impulsos' },
  boost_6x_30d: { id: 'boost_6x_30d', name: '6x Impulsos Mensais (30 Dias)', price: 16.90, category: 'Impulsos' },
  boost_8x_30d: { id: 'boost_8x_30d', name: '8x Impulsos Mensais (Nível 2 - 30 Dias)', price: 18.90, category: 'Impulsos' },
  boost_14x_30d: { id: 'boost_14x_30d', name: '14x Impulsos Mensais (Nível 3 - 30 Dias)', price: 24.90, category: 'Impulsos' },
  boost_14x_3m: { id: 'boost_14x_3m', name: '14x Impulsos Trimestrais (Nível 3 - 3 Meses)', price: 59.90, category: 'Impulsos' },
  boost_14x_1y: { id: 'boost_14x_1y', name: '14x Impulsos Anuais (Nível 3 - 1 Ano)', price: 119.90, category: 'Impulsos' },
  conta_2025: { id: 'conta_2025', name: 'Conta Antiga Discord (Criada em 2025)', price: 11.90, category: 'Contas Antigas' },
  conta_2024: { id: 'conta_2024', name: 'Conta Antiga Discord (Criada em 2024)', price: 13.90, category: 'Contas Antigas' },
  conta_2023: { id: 'conta_2023', name: 'Conta Antiga Discord (Criada em 2023)', price: 16.90, category: 'Contas Antigas' },
  conta_2022: { id: 'conta_2022', name: 'Conta Antiga Discord (Criada em 2022)', price: 22.90, category: 'Contas Antigas' },
  conta_2021: { id: 'conta_2021', name: 'Conta Antiga Discord (Criada em 2021)', price: 31.90, category: 'Contas Antigas' },
  conta_2020: { id: 'conta_2020', name: 'Conta Antiga Discord (Criada em 2020)', price: 49.90, category: 'Contas Antigas' },
  conta_2019: { id: 'conta_2019', name: 'Conta Antiga Discord (Criada em 2019)', price: 79.90, category: 'Contas Antigas' },
  conta_2018: { id: 'conta_2018', name: 'Conta Antiga Discord (Criada em 2018)', price: 119.90, category: 'Contas Antigas' },
  conta_2017: { id: 'conta_2017', name: 'Conta Antiga Discord (Criada em 2017)', price: 179.90, category: 'Contas Antigas' },
  conta_2016: { id: 'conta_2016', name: 'Conta Antiga Discord (Criada em 2016)', price: 289.90, category: 'Contas Antigas' },
  conta_2015: { id: 'conta_2015', name: 'Conta Antiga Discord (Criada em 2015)', price: 499.00, category: 'Contas Antigas' },
  membros_100: { id: 'membros_100', name: '100 Membros Reais no Servidor', price: 4.90, category: 'Membros' },
  membros_300: { id: 'membros_300', name: '300 Membros Reais no Servidor', price: 11.90, category: 'Membros' },
  membros_500: { id: 'membros_500', name: '500 Membros Reais no Servidor', price: 17.90, category: 'Membros' },
  membros_1000: { id: 'membros_1000', name: '1000 Membros Reais no Servidor', price: 29.90, category: 'Membros' },

  // Free Fire & Cheats
  external_1d: { id: 'external_1d', name: 'Painel Emulador External (1 Dia)', price: 11.90, category: 'Free Fire' },
  external_7d: { id: 'external_7d', name: 'Painel Emulador External (7 Dias)', price: 29.90, category: 'Free Fire' },
  external_30d: { id: 'external_30d', name: 'Painel Emulador External (30 Dias)', price: 59.90, category: 'Free Fire' },
  external_perm: { id: 'external_perm', name: 'Painel Emulador External (Permanente)', price: 119.90, category: 'Free Fire' },
  xit_ff: { id: 'xit_ff', name: 'Painel Xit Free Fire • 100% HS (Permanente)', price: 14.90, category: 'Free Fire' },
  hs_pescoco: { id: 'hs_pescoco', name: 'HS Pescoço Free Fire (Permanente)', price: 11.90, category: 'Free Fire' },
  holograma: { id: 'holograma', name: 'Holograma + Auxílio Permanente', price: 15.90, category: 'Free Fire' },
  aimbot_mobile: { id: 'aimbot_mobile', name: 'Painel Aim Bot iOS e Android (Permanente)', price: 18.90, category: 'Free Fire' },
  otim_basico: { id: 'otim_basico', name: 'Pack de Otimização Windows (Básico)', price: 8.90, category: 'Otimização' },
  otim_vip: { id: 'otim_vip', name: 'Pack de Otimização VIP (Completo PC & Jogos)', price: 11.90, category: 'Otimização' },

  // Ferramentas & Banners
  capcut_pc: { id: 'capcut_pc', name: 'CapCut Pro - PC Permanente', price: 5.99, category: 'Ferramentas' },
  capcut_android: { id: 'capcut_android', name: 'CapCut Pro - Android Permanente', price: 4.99, category: 'Ferramentas' },
  capcut_combo: { id: 'capcut_combo', name: 'CapCut Pro - Combo PC + Android', price: 8.99, category: 'Ferramentas' },
  wallpaper_engine: { id: 'wallpaper_engine', name: 'Wallpaper Engine - PC Permanente', price: 3.99, category: 'Ferramentas' },
  pack_designer: { id: 'pack_designer', name: 'Pack Designer Profissional (+50 mil PSDs)', price: 2.99, category: 'Ferramentas' },

  // Streamings (Atualizados com produtos e fornecedor oficial)
  yt_convite: { id: 'yt_convite', name: 'YOUTUBE PREMIUM - CONVITE', price: 8.90, category: 'Streamings' },
  yt_adm_familia: { id: 'yt_adm_familia', name: 'YOUTUBE PREMIUM ( ADM FAMILIA )', price: 22.90, category: 'Streamings' },
  yt_link_1m: { id: 'yt_link_1m', name: 'YOUTUBE PREMIUM - CONVITE', price: 8.90, category: 'Streamings' },
  yt_conta_1m: { id: 'yt_conta_1m', name: 'YOUTUBE PREMIUM ( ADM FAMILIA )', price: 22.90, category: 'Streamings' },

  prime_7d: { id: 'prime_7d', name: 'PRIME VIDEO PREMIUM - 7 DIAS', price: 7.90, category: 'Streamings' },
  prime_30d: { id: 'prime_30d', name: 'PRIME VIDEO PREMIUM - 30 DIAS', price: 13.90, category: 'Streamings' },
  prime_nba_30d: { id: 'prime_nba_30d', name: 'PRIME VIDEO PREMIUM + NBA LEAGUE PASS - 30 DIAS', price: 24.90, category: 'Streamings' },
  prime_1tela: { id: 'prime_1tela', name: 'PRIME VIDEO PREMIUM - 7 DIAS', price: 7.90, category: 'Streamings' },
  prime_completa: { id: 'prime_completa', name: 'PRIME VIDEO PREMIUM - 30 DIAS', price: 13.90, category: 'Streamings' },

  paramount_7d: { id: 'paramount_7d', name: 'PARAMOUNT PREMIUM - 7 DIAS', price: 7.90, category: 'Streamings' },
  paramount_30d: { id: 'paramount_30d', name: 'PARAMOUNT PREMIUM - 30 DIAS', price: 12.90, category: 'Streamings' },
  paramount_1tela: { id: 'paramount_1tela', name: 'PARAMOUNT PREMIUM - 7 DIAS', price: 7.90, category: 'Streamings' },
  paramount_completa: { id: 'paramount_completa', name: 'PARAMOUNT PREMIUM - 30 DIAS', price: 12.90, category: 'Streamings' },

  disney_7d: { id: 'disney_7d', name: 'DISNEY PREMIUM - 7 DIAS', price: 12.90, category: 'Streamings' },
  disney_30d: { id: 'disney_30d', name: 'DISNEY PREMIUM - 30 DIAS', price: 19.90, category: 'Streamings' },
  disney_1tela: { id: 'disney_1tela', name: 'DISNEY PREMIUM - 7 DIAS', price: 12.90, category: 'Streamings' },
  disney_completa: { id: 'disney_completa', name: 'DISNEY PREMIUM - 30 DIAS', price: 19.90, category: 'Streamings' },

  hbo_7d: { id: 'hbo_7d', name: 'HBOMAX PLATINUM - 7 DIAS', price: 7.90, category: 'Streamings' },
  hbo_30d: { id: 'hbo_30d', name: 'HBOMAX PLATINUM - 30 DIAS', price: 14.90, category: 'Streamings' },
  hbo_1tela: { id: 'hbo_1tela', name: 'HBOMAX PLATINUM - 7 DIAS', price: 7.90, category: 'Streamings' },
  hbo_completa: { id: 'hbo_completa', name: 'HBOMAX PLATINUM - 30 DIAS', price: 14.90, category: 'Streamings' },
  netflix_7d: { id: 'netflix_7d', name: 'NETFLIX PREMIUM - 7 DIAS', price: 8.90, category: 'Streamings' },
  netflix_30d: { id: 'netflix_30d', name: 'NETFLIX PREMIUM - 30 DIAS', price: 14.90, category: 'Streamings' },
  netflix_1tela: { id: 'netflix_1tela', name: 'NETFLIX PREMIUM - 7 DIAS', price: 8.90, category: 'Streamings' },
  netflix_completa: { id: 'netflix_completa', name: 'NETFLIX PREMIUM - 30 DIAS', price: 14.90, category: 'Streamings' },

  crunchyroll_7d: { id: 'crunchyroll_7d', name: 'CRUNCHYROLL MEGA FAN - 7 DIAS', price: 6.90, category: 'Streamings' },
  crunchyroll_30d: { id: 'crunchyroll_30d', name: 'CRUNCHYROLL MEGA FAN - 30 DIAS', price: 12.90, category: 'Streamings' },
  crunchyroll_1tela: { id: 'crunchyroll_1tela', name: 'CRUNCHYROLL MEGA FAN - 7 DIAS', price: 6.90, category: 'Streamings' },
  crunchyroll_completa: { id: 'crunchyroll_completa', name: 'CRUNCHYROLL MEGA FAN - 30 DIAS', price: 12.90, category: 'Streamings' },
  spot_link_1m: { id: 'spot_link_1m', name: 'Spotify Premium Link (1 Mês)', price: 5.50, category: 'Streamings' },
  spot_link_3m: { id: 'spot_link_3m', name: 'Spotify Premium Link (3 Meses)', price: 8.90, category: 'Streamings' },
  spot_conta_1m: { id: 'spot_conta_1m', name: 'Conta Spotify Premium (1 Mês)', price: 15.90, category: 'Streamings' },
  spot_conta_1y: { id: 'spot_conta_1y', name: 'Conta Spotify Anual (1 Ano)', price: 39.90, category: 'Streamings' },

  // Jogos & Geradores
  gamepass_90d: { id: 'gamepass_90d', name: 'Xbox Game Pass Ultimate (90 Dias)', price: 19.90, category: 'Jogos' },
  gamepass_console_90d: { id: 'gamepass_console_90d', name: 'Xbox Game Pass Console (90 Dias)', price: 19.90, category: 'Jogos' },
  gamepass_pc_90d: { id: 'gamepass_pc_90d', name: 'Xbox Game Pass PC (90 Dias)', price: 19.90, category: 'Jogos' },
  minecraft_nfa: { id: 'minecraft_nfa', name: 'Minecraft Original Java + Bedrock (NFA)', price: 22.90, category: 'Jogos' },
  steam_gta5: { id: 'steam_gta5', name: 'Conta Steam com GTA V (100% Online)', price: 9.90, category: 'Jogos' },
  steam_rdr2: { id: 'steam_rdr2', name: 'Conta Steam com Red Dead 2 (100% Online)', price: 9.90, category: 'Jogos' },
  steam_fc26: { id: 'steam_fc26', name: 'Conta Steam com EA FC (100% Online)', price: 9.90, category: 'Jogos' },
  steam_gow: { id: 'steam_gow', name: 'Conta Steam com God of War Ragnarok', price: 9.90, category: 'Jogos' },
  steam_forza: { id: 'steam_forza', name: 'Conta Steam com Forza Horizon 5', price: 9.90, category: 'Jogos' },
  cs2_diario: { id: 'cs2_diario', name: 'CS2 External (Diário)', price: 24.90, category: 'Jogos' },
  cs2_semanal: { id: 'cs2_semanal', name: 'CS2 External (Semanal)', price: 64.90, category: 'Jogos' },
  cs2_mensal: { id: 'cs2_mensal', name: 'CS2 External (Mensal)', price: 109.90, category: 'Jogos' },
  cs2_180dias: { id: 'cs2_180dias', name: 'CS2 External (180 Dias)', price: 389.00, category: 'Jogos' },
  hours_500: { id: 'hours_500', name: 'Steam Hours Boost (500 Horas + 100 Bônus)', price: 9.90, category: 'Jogos' },
  hours_1000: { id: 'hours_1000', name: 'Steam Hours Boost (1000 Horas + 200 Bônus)', price: 19.90, category: 'Jogos' },
  hours_2000: { id: 'hours_2000', name: 'Steam Hours Boost (2000 Horas + 500 Bônus)', price: 39.90, category: 'Jogos' },
  hours_4000: { id: 'hours_4000', name: 'Steam Hours Boost (4000 Horas + 1000 Bônus)', price: 89.90, category: 'Jogos' },
  hours_vitalicio: { id: 'hours_vitalicio', name: 'Steam Hours Boost Vitalício', price: 249.00, category: 'Jogos' },
  gen_streaming: { id: 'gen_streaming', name: 'Gerador Netflix/HBO/Disney/Prime Video', price: 21.90, category: 'Geradores' },
  gen_yt: { id: 'gen_yt', name: 'Gerador de YouTube Premium', price: 16.90, category: 'Geradores' },
  gen_spot: { id: 'gen_spot', name: 'Gerador de Spotify Premium', price: 16.90, category: 'Geradores' },
  gen_all: { id: 'gen_all', name: 'TODOS OS GERADORES ACIMA (Combo Completo)', price: 32.90, category: 'Geradores' }
};

class CartService {
  static getCatalog() {
    return PRODUCT_CATALOG;
  }

  static getProduct(productId, db) {
    const prod = PRODUCT_CATALOG[productId];
    if (!prod) return null;

    try {
      const database = db || (typeof getDatabase === 'function' ? getDatabase() : null);
      if (database) {
        const row = database.prepare('SELECT price FROM product_prices WHERE product_id = ?').get(productId);
        if (row && typeof row.price === 'number') {
          return { ...prod, price: Number(row.price) };
        }
      }
    } catch {}

    return { ...prod };
  }

  static initPrices(db) {
    const database = db || (typeof getDatabase === 'function' ? getDatabase() : null);
    if (!database) return;
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS product_prices (
          product_id TEXT PRIMARY KEY,
          price REAL NOT NULL,
          default_price REAL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
          updated_by TEXT
        );
      `);

      // 1. Carregar preços customizados salvos no banco para o catálogo em memória
      const rows = database.prepare('SELECT product_id, price FROM product_prices').all();
      for (const row of rows) {
        if (PRODUCT_CATALOG[row.product_id]) {
          PRODUCT_CATALOG[row.product_id].price = Number(row.price);
        }
      }

      // 2. Garantir que todos os produtos do PRODUCT_CATALOG estejam registrados na tabela
      const insertStmt = database.prepare(`
        INSERT OR IGNORE INTO product_prices (product_id, price, default_price, updated_at, updated_by)
        VALUES (?, ?, ?, datetime('now', 'utc'), 'CATALOG_DEFAULT')
      `);
      for (const [id, item] of Object.entries(PRODUCT_CATALOG)) {
        insertStmt.run(id, item.price, item.price);
      }
    } catch (err) {
      console.error('[CartService] Erro ao carregar preços personalizados:', err);
    }
  }

  static getCategories() {
    const cats = new Set();
    for (const p of Object.values(PRODUCT_CATALOG)) {
      cats.add(p.category);
    }
    return Array.from(cats);
  }

  static findProduct(query) {
    if (!query) return null;
    const q = String(query).toLowerCase().trim();
    if (PRODUCT_CATALOG[q]) return PRODUCT_CATALOG[q];

    // Busca exata pelo nome
    for (const p of Object.values(PRODUCT_CATALOG)) {
      if (p.name.toLowerCase() === q) return p;
    }

    // Busca por inclusão no ID ou nome
    for (const p of Object.values(PRODUCT_CATALOG)) {
      if (p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) {
        return p;
      }
    }

    return null;
  }

  static setProductPrice(productId, newPrice, updatedBy, db) {
    const prod = PRODUCT_CATALOG[productId];
    if (!prod) return { success: false, error: 'Produto não encontrado.' };

    const priceNum = Number(String(newPrice).replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) {
      return { success: false, error: 'Preço inválido. Digite um valor numérico positivo (ex: 14.90).' };
    }

    const oldPrice = prod.price;
    prod.price = Math.round(priceNum * 100) / 100;

    const database = db || (typeof getDatabase === 'function' ? getDatabase() : null);
    if (database) {
      try {
        database.prepare(`
          INSERT INTO product_prices (product_id, price, default_price, updated_at, updated_by)
          VALUES (?, ?, ?, datetime('now', 'utc'), ?)
          ON CONFLICT(product_id) DO UPDATE SET
            price = excluded.price,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by
        `).run(productId, prod.price, oldPrice, updatedBy || 'SYSTEM');
      } catch (err) {
        console.error('[CartService] Erro ao salvar preço no banco:', err);
      }
    }

    return { success: true, oldPrice, newPrice: prod.price, product: prod };
  }

  static adjustCategoryPrices(category, percentage, updatedBy, db) {
    const percentNum = Number(String(percentage).replace(',', '.'));
    if (isNaN(percentNum)) return { success: false, error: 'Porcentagem inválida. Informe um número como 10 ou -15.' };

    const factor = 1 + (percentNum / 100);
    const updated = [];
    const database = db || (typeof getDatabase === 'function' ? getDatabase() : null);

    for (const [id, prod] of Object.entries(PRODUCT_CATALOG)) {
      if (!category || category === 'ALL' || prod.category.toLowerCase() === category.toLowerCase()) {
        const oldPrice = prod.price;
        const newPrice = Math.max(0.01, Math.round((oldPrice * factor) * 100) / 100);
        prod.price = newPrice;
        if (database) {
          try {
            database.prepare(`
              INSERT INTO product_prices (product_id, price, default_price, updated_at, updated_by)
              VALUES (?, ?, ?, datetime('now', 'utc'), ?)
              ON CONFLICT(product_id) DO UPDATE SET
                price = excluded.price,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
            `).run(id, newPrice, oldPrice, updatedBy || 'SYSTEM');
          } catch (e) {}
        }
        updated.push({ id, name: prod.name, oldPrice, newPrice });
      }
    }

    return { success: true, count: updated.length, updated };
  }

  /**
   * Obtém ou cria o carrinho para o usuário
   */
  static async handleProductSelect(interaction, productId, db) {
    const { guild, user } = interaction;
    const prod = this.getProduct(productId, db);

    if (!prod) {
      return interaction.reply({
        content: '⚠️ Produto não encontrado no catálogo.',
        ephemeral: true
      });
    }

    // 1. Verificar se o usuário já tem um carrinho aberto
    const existing = db.prepare(`
      SELECT * FROM cart_orders WHERE guild_id = ? AND user_id = ? AND status = 'OPEN'
    `).get(guild.id, user.id);

    if (existing) {
      const channel = guild.channels.cache.get(existing.channel_id);
      if (channel) {
        // Adicionar produto ao carrinho existente
        await this.addItemToCart(existing.cart_id, prod, db);
        const updated = this.getCart(existing.cart_id, db);
        await this.updateCartMessage(channel, updated, guild);

        if (interaction.replied || interaction.deferred) {
          return interaction.followUp({
            content: `🛒 **${prod.name}** foi adicionado ao seu carrinho existente!\n👉 Acesse seu carrinho: <#${channel.id}>`,
            ephemeral: true
          });
        }
        return interaction.reply({
          content: `🛒 **${prod.name}** foi adicionado ao seu carrinho existente!\n👉 Acesse seu carrinho: <#${channel.id}>`,
          ephemeral: true
        });
      }
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
    }

    // 2. Localizar ou criar Categoria 🛒 CARRINHOS
    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && (c.name.includes('CARRINHO') || c.name.includes('PEDIDOS'))
    );

    if (!category) {
      try {
        category = await guild.channels.create({
          name: '🛒 CARRINHOS',
          type: ChannelType.GuildCategory,
          reason: 'Categoria automática para carrinhos de compras'
        });
      } catch (err) {
        console.warn('Não foi possível criar categoria para carrinhos:', err);
      }
    }

    // 3. Criar Canal Privado: carrinho-usuario-nomedoproduto (visto apenas pela Direção e pelo cliente)
    const userClean = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user';
    const prodClean = prod.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20);
    const channelName = `carrinho-${userClean}-${prodClean}`;

    const direcaoRole = guild.roles.cache.find(r => 
      r.name.toLowerCase().includes('direção') || 
      r.name.toLowerCase().includes('direcao')
    );
    const adminRole = guild.roles.cache.find(r => 
      r.name.toLowerCase().includes('administrador')
    );

    const permissionOverwrites = [
      {
        id: guild.id, // @everyone oculto
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: user.id, // Cliente que pediu algo
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      },
      {
        id: guild.members.me.id, // Bot
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory
        ]
      }
    ];

    if (direcaoRole) {
      permissionOverwrites.push({
        id: direcaoRole.id, // Direção
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages
        ]
      });
    }

    if (adminRole) {
      permissionOverwrites.push({
        id: adminRole.id, // Administradores
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages
        ]
      });
    }

    try {
      const cartChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: category ? category.id : null,
        topic: `Carrinho de compras de @${user.tag} (${user.id}) | BlackShop`,
        permissionOverwrites
      });

      // 4. Salvar registro no banco
      const cartId = `CART-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      const initialItems = [{ id: prod.id, name: prod.name, price: prod.price, quantity: 1 }];

      db.prepare(`
        INSERT INTO cart_orders (cart_id, channel_id, guild_id, user_id, items_json, subtotal, total_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
      `).run(
        cartId,
        cartChannel.id,
        guild.id,
        user.id,
        JSON.stringify(initialItems),
        prod.price,
        prod.price
      );

      const cart = this.getCart(cartId, db);

      // 5. Enviar painel inicial no canal do carrinho
      const { embeds, components } = this.renderCartPayload(cart, user);
      const cartMsg = await cartChannel.send({
        content: `👋 Olá <@${user.id}>, seu carrinho foi aberto com sucesso!`,
        embeds,
        components
      });

      if (interaction.deferred) {
        return interaction.editReply({
          content: `✅ **Carrinho Criado com Sucesso!**\n📦 Produto: **${prod.name}** (\`R$ ${prod.price.toFixed(2)}\`)\n👉 Clique aqui para ir ao seu carrinho: <#${cartChannel.id}>`
        });
      } else if (!interaction.replied) {
        return interaction.reply({
          content: `✅ **Carrinho Criado com Sucesso!**\n📦 Produto: **${prod.name}** (\`R$ ${prod.price.toFixed(2)}\`)\n👉 Clique aqui para ir ao seu carrinho: <#${cartChannel.id}>`,
          ephemeral: true
        });
      }

    } catch (err) {
      console.error('Erro ao criar carrinho de compras:', err);
      try {
        if (interaction.deferred) {
          return interaction.editReply({
            content: `❌ Ocorreu um erro ao abrir seu carrinho: ${err.message}`
          });
        } else if (!interaction.replied) {
          return interaction.reply({
            content: `❌ Ocorreu um erro ao abrir seu carrinho: ${err.message}`,
            ephemeral: true
          });
        }
      } catch {}
    }
  }

  static getCart(cartId, db) {
    const row = db.prepare('SELECT * FROM cart_orders WHERE cart_id = ?').get(cartId);
    if (!row) return null;
    try {
      row.items = JSON.parse(row.items_json);
    } catch {
      row.items = [];
    }
    return row;
  }

  static getCartByChannel(channelId, db) {
    const row = db.prepare('SELECT * FROM cart_orders WHERE channel_id = ?').get(channelId);
    if (!row) return null;
    try {
      row.items = JSON.parse(row.items_json);
    } catch {
      row.items = [];
    }
    return row;
  }

  static async addItemToCart(cartId, prod, db) {
    const cart = this.getCart(cartId, db);
    if (!cart) return;

    const currentProd = this.getProduct(prod.id, db) || prod;
    const items = cart.items || [];
    const existingIndex = items.findIndex(i => i.id === currentProd.id);

    if (existingIndex > -1) {
      items[existingIndex].quantity = (items[existingIndex].quantity || 1) + 1;
      items[existingIndex].price = currentProd.price;
    } else {
      items.push({ id: currentProd.id, name: currentProd.name, price: currentProd.price, quantity: 1 });
    }

    this.recalculateAndUpdate(cartId, items, cart.coupon_code, db);
  }

  static async changeItemQuantity(cartId, delta, db) {
    const cart = this.getCart(cartId, db);
    if (!cart || !cart.items || cart.items.length === 0) return;

    const items = cart.items;
    // Modifica o último item adicionado
    const lastItem = items[items.length - 1];
    lastItem.quantity = (lastItem.quantity || 1) + delta;

    if (lastItem.quantity <= 0) {
      items.pop();
    }

    this.recalculateAndUpdate(cartId, items, cart.coupon_code, db);
  }

  static applyCoupon(cartId, couponCode, db) {
    const cart = this.getCart(cartId, db);
    if (!cart) return { success: false, message: 'Carrinho não encontrado.' };

    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(couponCode.toUpperCase().trim());
    if (!coupon) {
      return { success: false, message: '❌ Cupom inválido ou inexistente.' };
    }

    if (coupon.expires_at) {
      const expTime = new Date(coupon.expires_at).getTime();
      if (!isNaN(expTime) && Date.now() > expTime) {
        return { success: false, message: '❌ Este cupom de desconto já expirou!' };
      }
    }

    if (coupon.current_uses >= coupon.max_uses) {
      return { success: false, message: '❌ Este cupom já atingiu o limite máximo de utilizações.' };
    }

    this.recalculateAndUpdate(cartId, cart.items, coupon.code, db);
    return { success: true, message: `✅ Cupom **${coupon.code}** aplicado com sucesso!` };
  }

  static recalculateAndUpdate(cartId, items, couponCode, db) {
    let subtotal = 0;
    items.forEach(i => {
      subtotal += (i.price * (i.quantity || 1));
    });

    let discount = 0;
    if (couponCode) {
      const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(couponCode);
      if (coupon) {
        if (coupon.discount_percent > 0) {
          discount += (subtotal * (coupon.discount_percent / 100));
        }
        if (coupon.discount_fixed > 0) {
          discount += coupon.discount_fixed;
        }
      }
    }

    discount = Math.min(discount, subtotal);
    const total = Math.max(subtotal - discount, 0);

    db.prepare(`
      UPDATE cart_orders SET
        items_json = ?,
        coupon_code = ?,
        discount_amount = ?,
        subtotal = ?,
        total_amount = ?,
        updated_at = datetime('now', 'utc')
      WHERE cart_id = ?
    `).run(
      JSON.stringify(items),
      couponCode || null,
      discount,
      subtotal,
      total,
      cartId
    );
  }

  static renderCartPayload(cart, targetUser) {
    const items = cart.items || [];
    const subtotal = cart.subtotal || 0;
    const discount = cart.discount_amount || 0;
    const total = cart.total_amount || 0;
    const couponCode = cart.coupon_code;

    const itemsDesc = items.length > 0
      ? items.map((it, idx) => `**${idx + 1}.** \`${it.quantity}x\` **${it.name}**\n   ↳ \`R$ ${it.price.toFixed(2)}\` cada • **Subtotal: R$ ${(it.price * it.quantity).toFixed(2)}**`).join('\n\n')
      : '⚠️ Nenhum produto no carrinho.';

    const embed = new EmbedBuilder()
      .setTitle('🛒 SEU CARRINHO DE COMPRAS — REALSHOP')
      .setColor(0x2B2D31)
      .setDescription(
        `👤 **Cliente:** <@${cart.user_id}>\n` +
        `🆔 **Pedido:** \`${cart.cart_id}\`\n\n` +
        `📦 **PRODUTOS NO CARRINHO:**\n${itemsDesc}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 **Subtotal:** \`R$ ${subtotal.toFixed(2)}\`\n` +
        `🎟️ **Cupom:** ${couponCode ? `\`${couponCode}\` (-R$ ${discount.toFixed(2)})` : '*Nenhum cupom aplicado*'}\n` +
        `💳 **VALOR TOTAL:** **\`R$ ${total.toFixed(2)}\`**\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `⚡ Clique em **Confirmar Pagamento** abaixo para gerar o seu **PIX Copia e Cola & QR Code**!`
      )
      .setFooter({ text: 'RealShop • Entrega Rápida & Garantia' })
      .setTimestamp();

    // Linha 1: Controles de Produtos e Cupom
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cart_qty_plus:${cart.cart_id}`)
        .setLabel('+1 Unidade')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`cart_qty_minus:${cart.cart_id}`)
        .setLabel('-1 Unidade')
        .setEmoji('➖')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`cart_add_item:${cart.cart_id}`)
        .setLabel('Mais Produtos')
        .setEmoji('🛍️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`cart_coupon_btn:${cart.cart_id}`)
        .setLabel('Cupom')
        .setEmoji('🎟️')
        .setStyle(ButtonStyle.Secondary)
    );

    // Linha 2: Checkout e Cancelamento
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cart_checkout_btn:${cart.cart_id}`)
        .setLabel('Confirmar Pagamento')
        .setEmoji('💳')
        .setStyle(ButtonStyle.Success)
        .setDisabled(items.length === 0),
      new ButtonBuilder()
        .setCustomId(`cart_cancel_btn:${cart.cart_id}`)
        .setLabel('Cancelar Carrinho')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row1, row2] };
  }

  static async updateCartMessage(channel, cart, guild) {
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      const botMsg = messages.find(m => m.author.id === guild.client.user.id && m.embeds.length > 0);
      const { embeds, components } = this.renderCartPayload(cart);

      if (botMsg) {
        await botMsg.edit({ embeds, components });
      } else {
        await channel.send({ embeds, components });
      }
    } catch (err) {
      console.warn('Erro ao atualizar mensagem do carrinho:', err);
    }
  }

  /**
   * Renderiza a tela de Pagamento via PIX com QR Code dinâmico
   */
  static async renderPixCheckout(interaction, cartId, db) {
    const cart = this.getCart(cartId, db);
    if (!cart) {
      const msg = '❌ **Este carrinho expirou ou não foi localizado.** Por favor, selecione o produto novamente no canal de vendas para abrir um novo carrinho!';
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: msg, ephemeral: true });
      }
      return interaction.reply({ content: msg, ephemeral: true });
    }

    const { guild, user } = interaction;
    const pixSettings = PixService.getSettings(db, guild.id);
    const amount = cart.total_amount || 0;

    if (amount <= 0) {
      return interaction.reply({ content: '❌ O valor total do carrinho deve ser maior que zero.', ephemeral: true });
    }

    // Gerar payload PIX Copia e Cola oficial
    const txId = cart.cart_id.replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
    const pixPayload = PixService.generatePayload({
      key: pixSettings.pix_key,
      name: pixSettings.beneficiary_name,
      city: pixSettings.beneficiary_city,
      amount: amount,
      txId: txId
    });

    // Salvar código PIX gerado no banco
    db.prepare('UPDATE cart_orders SET pix_code = ?, status = ? WHERE cart_id = ?').run(pixPayload, 'WAITING_PAYMENT', cartId);

    // Gerar imagem do QR Code
    const qrBuffer = await PixService.generateQrCodeBuffer(pixPayload);
    const qrAttachment = new AttachmentBuilder(qrBuffer, { name: 'pix_qrcode.png' });

    const embed = new EmbedBuilder()
      .setTitle('💠 PAGAMENTO VIA PIX — REALSHOP')
      .setColor(0x2B2D31)
      .setDescription(
        `Olá <@${user.id}>, seu pedido está aguardando pagamento!\n\n` +
        `💰 **Valor a Pagar:** **\`R$ ${amount.toFixed(2)}\`**\n\n` +
        `📱 **COMO PAGAR:**\n` +
        `1. Abra o app do seu banco ou carteira digital.\n` +
        `2. Escaneie o **QR Code** abaixo com a câmera do app.\n` +
        `3. Ou clique no botão **Copiar Chave PIX** abaixo para transferir pela chave.\n` +
        `4. Assim que pagar, clique no botão **✅ Já Paguei / Confirmar**!`
      )
      .setImage('attachment://pix_qrcode.png')
      .setFooter({ text: 'O QR Code expira em 30 minutos • RealShop' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cart_paid_notify:${cartId}`)
        .setLabel('Já Efetuei o Pagamento')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`cart_copy_key:${cartId}`)
        .setLabel('Copiar Chave PIX')
        .setEmoji('🔑')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`cart_copy_payload:${cartId}`)
        .setLabel('Copia e Cola')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`cart_back_btn:${cartId}`)
        .setLabel('Voltar')
        .setEmoji('🔙')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`cart_cancel_btn:${cartId}`)
        .setLabel('Cancelar')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger)
    );

    return interaction.update({
      embeds: [embed],
      components: [row],
      files: [qrAttachment]
    });
  }

  /**
   * Finaliza o pedido e gera o comprovante oficial
   */
  static async completeOrderAndDeliver(cartId, client, db, adminUser, deliveryContent) {
    const cart = this.getCart(cartId, db);
    if (!cart) return;

    const guild = client.guilds.cache.get(cart.guild_id);
    if (!guild) return;

    let targetUser = null;
    try {
      targetUser = await client.users.fetch(cart.user_id);
    } catch {}

    if (!targetUser) return;

    const items = cart.items || [];
    const productName = items.map(i => `${i.quantity}x ${i.name}`).join(' + ') || 'Produto BlackShop';
    const priceFormatted = `R$ ${(cart.total_amount || 0).toFixed(2)}`;
    const accessText = deliveryContent || 'Acesso liberado com sucesso pela administração da BlackShop. Aproveite seu produto!';

    // 1. Gerar recibo digital oficial
    const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
    const receiptBuffer = await ReceiptService.generateReceipt({
      avatarUrl,
      displayName: targetUser.globalName || targetUser.username,
      username: targetUser.username,
      productName,
      price: priceFormatted,
      date: new Date(),
      brandName: 'REAL BOOST'
    });

    const receiptAttachmentPublic = new AttachmentBuilder(receiptBuffer, { name: 'recibo_entrega.png' });
    const receiptAttachmentDM = new AttachmentBuilder(receiptBuffer, { name: 'recibo_entrega.png' });

    // 2. Postar no canal oficial de entregas (#🚚・entr3gas-realizadas)
    const entregasChannel = guild.channels.cache.get('1562634795781988404') || 
                            guild.channels.cache.find(c => c.name.includes('entr3gas') || c.name.includes('entregas'));

    const publicButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Comprar')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Link)
        .setURL(resolveProductChannel(productName, guild)),
      new ButtonBuilder()
        .setLabel('Feedbacks')
        .setEmoji('🏆')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/1562634794263777280`)
    );

    if (entregasChannel) {
      await entregasChannel.send({
        files: [receiptAttachmentPublic],
        components: [publicButtons]
      });
    }

    // 3. Enviar na DM do comprador com as credenciais
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('🎉 Pagamento Confirmado e Pedido Entregue!')
        .setColor(0x2B2D31)
        .setDescription(
          `Olá <@${targetUser.id}>, seu pagamento de **${priceFormatted}** via PIX foi confirmado com sucesso!\n\n` +
          `📦 **Produtos Adquiridos:**\n${productName}\n\n` +
          `🔑 **Seu Acesso / Link / Credenciais:**\n\`\`\`\n${accessText}\n\`\`\`\n` +
          `⭐ Gostou do atendimento? Deixe sua avaliação em <#1562634794263777280>!`
        )
        .setImage('attachment://recibo_entrega.png')
        .setFooter({ text: 'REAL BOOST • BlackShop' })
        .setTimestamp();

      await targetUser.send({
        embeds: [dmEmbed],
        files: [receiptAttachmentDM]
      });
    } catch (dmErr) {
      console.warn(`Não foi possível enviar DM para ${targetUser.tag}: ${dmErr.message}`);
    }

    // 4. Marcar como entregue no banco
    db.prepare('UPDATE cart_orders SET status = ?, updated_at = datetime(\'now\', \'utc\') WHERE cart_id = ?').run('DELIVERED', cartId);

    // 4.1 Log Administrativo para a Staff e Atualização do Contador de Entregas
    try {
      const logsChan = guild.channels.cache.find(c => c.name.includes('logs-staff'));
      if (logsChan) {
        const logEmbed = new EmbedBuilder()
          .setTitle('📦 Nova Entrega Concluída!')
          .setColor(0x00FF88)
          .addFields(
            { name: '👤 Cliente', value: `<@${targetUser.id}> (\`${targetUser.id}\`)`, inline: true },
            { name: '🛡️ Autorizado por', value: adminUser ? `<@${adminUser.id}>` : 'Sistema', inline: true },
            { name: '💰 Valor', value: priceFormatted, inline: true },
            { name: '📦 Produto(s)', value: productName }
          )
          .setTimestamp();
        await logsChan.send({ embeds: [logEmbed] }).catch(() => {});
      }
    } catch (logErr) {
      console.warn('[CartService] Erro ao registrar log administrativo:', logErr.message);
    }

    try {
      const salesChan = guild.channels.cache.find(c => c.name.startsWith('📦・Entregas:'));
      if (salesChan) {
        const row = db.prepare("SELECT COUNT(*) as count FROM cart_orders WHERE guild_id = ? AND status = 'DELIVERED'").get(guild.id);
        const total = (row?.count || 0) + 12;
        await salesChan.setName(`📦・Entregas: ${total}`).catch(() => {});
      }
    } catch (countErr) {
      console.warn('[CartService] Erro ao atualizar canal de entregas:', countErr.message);
    }

    // 5. Excluir canal do carrinho após aviso
    const cartChannel = guild.channels.cache.get(cart.channel_id);
    if (cartChannel) {
      await cartChannel.send({
        content: `🎉 **Entrega concluída com sucesso!** O link/acesso foi enviado na DM privada de <@${targetUser.id}> e o comprovante postado em <#1562634795781988404>.\n⏳ *Este canal será excluído automaticamente em 15 segundos.*`
      });

      setTimeout(() => {
        cartChannel.delete('Carrinho finalizado e entregue').catch(() => {});
      }, 15000);
    }
  }
}

try {
  CartService.initPrices();
} catch (e) {}

module.exports = CartService;
