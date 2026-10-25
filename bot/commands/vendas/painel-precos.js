/**
 * Comando ?painel-precos / !precos / /precos - Painel Interativo de Gerenciamento de Preços
 * Permite alterar o preço de qualquer produto registrado na loja através de Dropdowns e Modais.
 */

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require('discord.js');
const CartService = require('../../services/cartService');

function buildPricePanelEmbed(selectedCategory = 'ALL') {
  const catalog = CartService.getCatalog();
  const allProducts = Object.values(catalog);
  const categories = CartService.getCategories();

  let filtered = allProducts;
  if (selectedCategory && selectedCategory !== 'ALL') {
    filtered = allProducts.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
  }

  const categoryName = selectedCategory === 'ALL' ? 'Todas as Categorias' : selectedCategory;

  // Montar prévia dos primeiros 10 itens
  const previewLines = filtered.slice(0, 10).map(p => 
    `• **${p.name.slice(0, 36)}**: \`R$ ${p.price.toFixed(2)}\` *(ID: \`${p.id}\`)*`
  );

  if (filtered.length > 10) {
    previewLines.push(`*...e mais ${filtered.length - 10} produtos desta categoria.*`);
  }

  const embed = new EmbedBuilder()
    .setTitle('🏷️ Painel de Gestão de Preços • Nexora Store')
    .setColor(0x2B2D31)
    .setDescription(
      `Aqui você pode visualizar e alterar o valor de **qualquer produto registrado** da loja em tempo real.\n\n` +
      `📦 **Total de Produtos Cadastrados:** \`${allProducts.length}\`\n` +
      `📂 **Categoria Selecionada:** \`${categoryName}\` (\`${filtered.length} itens\`)\n\n` +
      `### 📋 Amostra de Preços Atuais:\n` +
      (previewLines.length > 0 ? previewLines.join('\n') : '*Nenhum produto nesta categoria.*') +
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👉 **Como alterar um preço:**\n` +
      `1. Filtre a categoria no primeiro menu (opcional);\n` +
      `2. Selecione o produto no segundo menu;\n` +
      `3. Digite o novo valor no pop-up (Modal) e confirme!\n` +
      `*(Você também pode alterar via comando rápido: \`!preco <id_ou_nome> <novo_valor>\`)*`
    )
    .setFooter({ text: 'Nexora Store • Sistema de Vendas & Checkout PIX' })
    .setTimestamp();

  return embed;
}

function buildPricePanelComponents(selectedCategory = 'ALL') {
  const catalog = CartService.getCatalog();
  const allProducts = Object.values(catalog);
  const categories = CartService.getCategories();

  // 1. Menu de Categorias
  const catOptions = [
    {
      label: '⭐ Todas as Categorias',
      value: 'ALL',
      description: `Ver todos os ${allProducts.length} produtos cadastrados`,
      default: selectedCategory === 'ALL'
    }
  ];

  for (const cat of categories) {
    const count = allProducts.filter(p => p.category === cat).length;
    catOptions.push({
      label: `📂 ${cat}`,
      value: cat,
      description: `${count} produto(s) cadastrado(s)`,
      default: selectedCategory.toLowerCase() === cat.toLowerCase()
    });
  }

  const catSelect = new StringSelectMenuBuilder()
    .setCustomId('price_select_category')
    .setPlaceholder('Filtrar produtos por categoria...')
    .addOptions(catOptions.slice(0, 25));

  // 2. Menu de Produtos da categoria selecionada (máximo 25 por restrição do Discord)
  let filtered = allProducts;
  if (selectedCategory && selectedCategory !== 'ALL') {
    filtered = allProducts.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
  }

  const prodOptions = filtered.slice(0, 25).map(p => ({
    label: p.name.length > 50 ? p.name.slice(0, 47) + '...' : p.name,
    value: p.id,
    description: `Preço Atual: R$ ${p.price.toFixed(2)} • ID: ${p.id}`,
    emoji: '💰'
  }));

  const rows = [];
  rows.push(new ActionRowBuilder().addComponents(catSelect));

  if (prodOptions.length > 0) {
    const prodSelect = new StringSelectMenuBuilder()
      .setCustomId('price_select_product')
      .setPlaceholder(`Selecione um produto para alterar o preço (${filtered.length} disp.)...`)
      .addOptions(prodOptions);

    rows.push(new ActionRowBuilder().addComponents(prodSelect));
  }

  // 3. Botões de Ações Rápidas
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_price_bulk_modal')
      .setLabel('Reajuste em Massa (%)')
      .setEmoji('📈')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('btn_price_view_all')
      .setLabel('Ver Tabela Completa')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`btn_price_refresh:${selectedCategory}`)
      .setLabel('Recarregar')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary)
  );

  rows.push(actionRow);
  return rows;
}

module.exports = {
  name: 'painel-precos',
  aliases: ['precos', 'preço', 'preco', 'tabeladeprecos', 'painelprecos', 'alterarpreco', 'mudarpreco'],
  description: 'Abre o painel interativo de gerenciamento de preços ou altera diretamente via comando',
  usage: '!precos ou !preco <id_ou_nome> <novo_valor>',

  buildPricePanelEmbed,
  buildPricePanelComponents,

  async execute({ message, interaction, db, args }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const member = isInteraction ? interaction.member : message.member;
    const guild = isInteraction ? interaction.guild : message.guild;

    const isGlobalOwner = author.id === '1517970601342664768';
    const isGuildOwner = guild.ownerId === author.id;
    const hasDirecao = member?.roles?.cache?.some(r => 
      r.name.toLowerCase().includes('direção') || r.name.toLowerCase().includes('direcao')
    );
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner || isGuildOwner || hasDirecao;

    if (!isAdmin) {
      const err = '❌ Apenas Administradores ou a Direção podem gerenciar preços da loja.';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    // 1. Modo CLI Rápido: !preco <id_ou_nome> <novo_valor>
    if (!isInteraction && args && args.length >= 2) {
      const lastArg = args[args.length - 1];
      const possiblePrice = Number(lastArg.replace(',', '.'));

      if (!isNaN(possiblePrice) && possiblePrice >= 0) {
        const query = args.slice(0, -1).join(' ').replace(/^["']|["']$/g, '');
        const prod = CartService.findProduct(query);

        if (!prod) {
          return message.reply(
            `❌ Produto não encontrado para o termo: \`${query}\`.\n` +
            `👉 Digite \`!precos\` para abrir o painel com todos os produtos e IDs cadastrados.`
          );
        }

        const res = CartService.setProductPrice(prod.id, possiblePrice, author.id, db);
        if (!res.success) {
          return message.reply(`❌ ${res.error}`);
        }

        const confirmEmbed = new EmbedBuilder()
          .setTitle('✅ Preço Atualizado com Sucesso!')
          .setColor(0x22C55E)
          .setDescription(
            `O valor do produto foi modificado no catálogo e no banco de dados.\n\n` +
            `📦 **Produto:** **${prod.name}**\n` +
            `🏷️ **ID:** \`${prod.id}\`\n` +
            `📂 **Categoria:** \`${prod.category}\`\n\n` +
            `💰 **Preço Anterior:** ~~R$ ${res.oldPrice.toFixed(2)}~~\n` +
            `✨ **Novo Preço:** **R$ ${res.newPrice.toFixed(2)}**\n` +
            `👤 **Atualizado por:** <@${author.id}>`
          )
          .setFooter({ text: 'Nexora Store • Os novos pedidos já usarão este valor' })
          .setTimestamp();

        return message.reply({ embeds: [confirmEmbed] });
      }
    }

    // 2. Modo Painel Interativo
    const embed = buildPricePanelEmbed('ALL');
    const components = buildPricePanelComponents('ALL');

    if (isInteraction) {
      return interaction.reply({ embeds: [embed], components, ephemeral: true });
    } else {
      return message.reply({ embeds: [embed], components });
    }
  }
};
