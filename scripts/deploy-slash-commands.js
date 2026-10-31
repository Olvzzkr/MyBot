/**
 * Registro de Slash Commands (Comandos de Barra '/') diretamente na Guilda
 * O registro em nível de guilda é instantâneo no Discord.
 */

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { RESENHA_GUILD_ID, SCHEDULED_MESSAGES_GUILD_IDS } = require('../shared/constants');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1561883923301277716';
const GUILDS = ['1553633196296511498', '1562230954594934887', '1563369608205963325'];
const TOKEN = process.env.DISCORD_BOT_TOKEN;

const commands = [
  // 1. /ajuda
  new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Exibe a lista de comandos disponíveis e instruções de uso')
    .addStringOption(opt =>
      opt.setName('comando')
        .setDescription('Nome do comando específico para ver detalhes')
        .setRequired(false)
    ),

  // 2. /servidor
  new SlashCommandBuilder()
    .setName('servidor')
    .setDescription('Exibe estatísticas e propriedades do servidor'),

  // 3. /avatar
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Exibe a foto de perfil em alta qualidade')
    .addUserOption(opt =>
      opt.setName('usuario')
        .setDescription('Usuário para ver o avatar')
        .setRequired(false)
    ),

  // 4. /autoserver
  new SlashCommandBuilder()
    .setName('autoserver')
    .setDescription('Automatiza e cria categorias, salas, painéis de ticket e autorroles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 5. /cargo
  new SlashCommandBuilder()
    .setName('cargo')
    .setDescription('Gerenciamento completo de cargos do servidor')
    .addSubcommand(sub =>
      sub.setName('listar')
        .setDescription('Lista os cargos do servidor em ordem hierárquica')
    )
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Cria automaticamente os 12 cargos essenciais do servidor')
    )
    .addSubcommand(sub =>
      sub.setName('criar')
        .setDescription('Cria um novo cargo')
        .addStringOption(opt => opt.setName('nome').setDescription('Nome do cargo').setRequired(true))
        .addStringOption(opt => opt.setName('cor').setDescription('Cor em Hexadecimal (ex: #5865F2)').setRequired(false))
    ),

  // 6. /limpar
  new SlashCommandBuilder()
    .setName('limpar')
    .setDescription('Exclui mensagens em lote no canal')
    .addIntegerOption(opt =>
      opt.setName('quantidade')
        .setDescription('Quantidade de mensagens a apagar (1 a 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // 7. /advertir
  new SlashCommandBuilder()
    .setName('advertir')
    .setDescription('Aplica uma advertência formal a um membro com motivo obrigatório')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro a ser advertido').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da advertência').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  // 8. /avisos
  new SlashCommandBuilder()
    .setName('avisos')
    .setDescription('Consulta as advertências ativas de um membro')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro a consultar').setRequired(true)),

  // 9. /timeout
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Silencia temporariamente um membro no servidor')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro').setRequired(true))
    .addStringOption(opt => opt.setName('tempo').setDescription('Duração (ex: 10m, 1h, 1d)').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  // 10. /kick
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa um membro do servidor')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo da expulsão').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  // 11. /ban
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bane um membro do servidor com dupla confirmação')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo do banimento').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  // 12. /quarentena
  new SlashCommandBuilder()
    .setName('quarentena')
    .setDescription('Aplica quarentena preventiva e isola um membro')
    .addUserOption(opt => opt.setName('membro').setDescription('Membro').setRequired(true))
    .addStringOption(opt => opt.setName('motivo').setDescription('Motivo').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  // 13. /protecao
  new SlashCommandBuilder()
    .setName('protecao')
    .setDescription('Consulta e monitora as regras ativas de proteção automática')
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Exibe as regras ativas de anti-spam, flood e menções')
    )
    .addSubcommand(sub =>
      sub.setName('configurar')
        .setDescription('Ativa e inicializa as regras de proteção recomendadas')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 14. /autoloja
  new SlashCommandBuilder()
    .setName('autoloja')
    .setDescription('Cria automaticamente todas as categorias e canais de produtos da loja')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 15. /painel-nitro
  new SlashCommandBuilder()
    .setName('painel-nitro')
    .setDescription('Envia o painel oficial de Contas Nitradas no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 16. /painel-link
  new SlashCommandBuilder()
    .setName('painel-link')
    .setDescription('Envia o painel oficial de Nitro Link no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 17. /painel-impulsos
  new SlashCommandBuilder()
    .setName('painel-impulsos')
    .setDescription('Envia o painel oficial de Impulsos para Servidor no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 18. /painel-antigas
  new SlashCommandBuilder()
    .setName('painel-antigas')
    .setDescription('Envia o painel oficial de Contas Antigas no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 19. /painel-membros
  new SlashCommandBuilder()
    .setName('painel-membros')
    .setDescription('Envia o painel oficial de Membros Reais no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 20. /painel-ativacao
  new SlashCommandBuilder()
    .setName('painel-ativacao')
    .setDescription('Envia o painel oficial de Ativação Nitro Link no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 21. /painel-external
  new SlashCommandBuilder()
    .setName('painel-external')
    .setDescription('Envia o painel oficial de Painel Emulador External no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 22. /painel-xit
  new SlashCommandBuilder()
    .setName('painel-xit')
    .setDescription('Envia o painel oficial de Xit Free Fire no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 23. /painel-pescoco
  new SlashCommandBuilder()
    .setName('painel-pescoco')
    .setDescription('Envia o painel oficial de HS Pescoço no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 24. /painel-holograma
  new SlashCommandBuilder()
    .setName('painel-holograma')
    .setDescription('Envia o painel oficial de Holograma + Auxílio no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 25. /painel-aimbot
  new SlashCommandBuilder()
    .setName('painel-aimbot')
    .setDescription('Envia o painel oficial de Aimbot Mobile no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 26. /painel-otimizacao
  new SlashCommandBuilder()
    .setName('painel-otimizacao')
    .setDescription('Envia o painel oficial de Pack de Otimização no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 27. /painel-youtube
  new SlashCommandBuilder()
    .setName('painel-youtube')
    .setDescription('Envia o painel oficial de YouTube Premium no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 28. /painel-spotify
  new SlashCommandBuilder()
    .setName('painel-spotify')
    .setDescription('Envia o painel oficial de Spotify Premium no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 29. /painel-gerador
  new SlashCommandBuilder()
    .setName('painel-gerador')
    .setDescription('Envia o painel oficial de Gerador de Assinaturas no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 30. /painel-gamepass
  new SlashCommandBuilder()
    .setName('painel-gamepass')
    .setDescription('Envia o painel oficial de Xbox Game Pass no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 31. /painel-minecraft
  new SlashCommandBuilder()
    .setName('painel-minecraft')
    .setDescription('Envia o painel oficial de Minecraft no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 32. /painel-steamgames
  new SlashCommandBuilder()
    .setName('painel-steamgames')
    .setDescription('Envia o painel oficial de Contas Steam no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 33. /painel-cs2
  new SlashCommandBuilder()
    .setName('painel-cs2')
    .setDescription('Envia o painel oficial de CS2 External no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 34. /painel-steamhours
  new SlashCommandBuilder()
    .setName('painel-steamhours')
    .setDescription('Envia o painel oficial de Steam Hours no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 35. /entregar
  new SlashCommandBuilder()
    .setName('entregar')
    .setDescription('Registra a entrega de um produto, envia recibo ao cliente e posta no canal de entregas')
    .addUserOption(opt => opt.setName('usuario').setDescription('Cliente comprador').setRequired(true))
    .addStringOption(opt => opt.setName('produto').setDescription('Nome do produto entregue').setRequired(true))
    .addStringOption(opt => opt.setName('valor').setDescription('Valor pago (ex: R$ 13,90)').setRequired(true))
    .addStringOption(opt => opt.setName('conteudo').setDescription('Chave, login, link ou credenciais').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 36. /dollynho
  new SlashCommandBuilder()
    .setName('dollynho')
    .setDescription('Cria as categorias e canais de Partidas, Informações, Free Fire e Análise')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 37. /config-pix
  new SlashCommandBuilder()
    .setName('config-pix')
    .setDescription('Configura a chave PIX e os dados do beneficiário para geração de QR Code e Copia e Cola')
    .addStringOption(opt => opt.setName('chave').setDescription('Sua chave PIX (Email, CPF, Telefone ou Aleatória)').setRequired(true))
    .addStringOption(opt => opt.setName('tipo').setDescription('Tipo da chave').setRequired(false)
      .addChoices(
        { name: 'E-mail', value: 'EMAIL' },
        { name: 'CPF', value: 'CPF' },
        { name: 'CNPJ', value: 'CNPJ' },
        { name: 'Telefone', value: 'TELEFONE' },
        { name: 'Chave Aleatória', value: 'ALEATORIA' }
      ))
    .addStringOption(opt => opt.setName('nome').setDescription('Nome do Beneficiário (ex: BlackShop)').setRequired(false))
    .addStringOption(opt => opt.setName('cidade').setDescription('Cidade do Beneficiário (ex: Sao Paulo)').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 38. /precos
  new SlashCommandBuilder()
    .setName('precos')
    .setDescription('Painel interativo para visualizar e alterar os preços de todos os produtos da loja')
    .addStringOption(opt =>
      opt.setName('produto')
        .setDescription('ID ou nome do produto para alteração direta (opcional)')
        .setRequired(false)
    )
    .addNumberOption(opt =>
      opt.setName('novo_preco')
        .setDescription('Novo valor em R$ para o produto (opcional)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 39. /painel-virgem
  new SlashCommandBuilder()
    .setName('painel-virgem')
    .setDescription('Envia o painel oficial de Contas Virgens Discord no canal atual')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // 40. /trancar-canais
  new SlashCommandBuilder()
    .setName('trancar-canais')
    .setDescription('Libera leitura ao cargo Membro e tranca o envio, exceto em Geral, Mídias e Setup')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  // 41. /recriar-downloads
  new SlashCommandBuilder()
    .setName('recriar-downloads')
    .setDescription('Copia e verifica Downloads antes de recriar seus canais')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  // 42. /mensagens
  new SlashCommandBuilder()
    .setName('mensagens')
    .setDescription('Configura mensagens automáticas e mensagens cadastradas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

function getCommandsForGuild(guildId) {
  const guildCommands = guildId === RESENHA_GUILD_ID
    ? commands
    : commands.filter(command => !['trancar-canais', 'recriar-downloads'].includes(command.name));
  return SCHEDULED_MESSAGES_GUILD_IDS.includes(guildId)
    ? guildCommands
    : guildCommands.filter(command => command.name !== 'mensagens');
}

async function deployToGuild(guildId, clientId = CLIENT_ID, token = TOKEN) {
  try {
    const r = new REST({ version: '10' }).setToken(token);
    const data = await r.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: getCommandsForGuild(guildId) }
    );
    console.log(`[Slash] ✅ ${data.length} comandos registrados no servidor ${guildId}!`);
    return data;
  } catch (err) {
    console.error(`[Slash] ❌ Erro ao registrar comandos na guilda ${guildId}:`, err.message);
  }
}

async function deploy() {
  for (const guildId of GUILDS) {
    console.log(`[Slash] Registrando ${commands.length} comandos de barra (/) no servidor ${guildId}...`);
    await deployToGuild(guildId);
  }
}

if (require.main === module) {
  deploy();
}

module.exports = { commands, getCommandsForGuild, deployToGuild, deploy };
