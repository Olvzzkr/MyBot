/**
 * Comando /config-pix e ?config-pix
 * Permite que a Direção configure a chave PIX, tipo de chave, beneficiário e cidade
 */

const { EmbedBuilder, PermissionFlagsBits, ApplicationCommandOptionType } = require('discord.js');
const PixService = require('../../services/pixService');

module.exports = {
  name: 'config-pix',
  aliases: ['configpix', 'setpix', 'pix', 'chavepix'],
  description: 'Configura a chave PIX oficial da loja para recebimento automático',
  usage: '?config-pix <chave> <tipo: CPF/CNPJ/EMAIL/TELEFONE/ALEATORIA> [nome] [cidade]',

  options: [
    {
      name: 'chave',
      type: ApplicationCommandOptionType.String,
      description: 'Sua chave PIX (CPF, CNPJ, e-mail, telefone ou chave aleatória)',
      required: false
    },
    {
      name: 'tipo',
      type: ApplicationCommandOptionType.String,
      description: 'Tipo da chave PIX',
      required: false,
      choices: [
        { name: 'E-mail', value: 'EMAIL' },
        { name: 'CPF', value: 'CPF' },
        { name: 'CNPJ', value: 'CNPJ' },
        { name: 'Telefone (+55...)', value: 'TELEFONE' },
        { name: 'Chave Aleatória (EVP)', value: 'ALEATORIA' }
      ]
    },
    {
      name: 'beneficiario',
      type: ApplicationCommandOptionType.String,
      description: 'Nome do titular da conta bancária (máx 25 letras)',
      required: false
    },
    {
      name: 'cidade',
      type: ApplicationCommandOptionType.String,
      description: 'Cidade da conta bancária (ex: SAO PAULO)',
      required: false
    }
  ],

  async execute({ message, interaction, db, args }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const member = isInteraction ? interaction.member : message.member;
    const guild = isInteraction ? interaction.guild : message.guild;

    const isGlobalOwner = author.id === '1517970601342664768';
    const isGuildOwner = guild.ownerId === author.id;
    const hasDirecao = member?.roles?.cache?.some(r => r.name.toLowerCase().includes('direção') || r.name.toLowerCase().includes('direcao'));
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner || isGuildOwner || hasDirecao;

    if (!isAdmin) {
      const errText = '❌ Apenas Administradores e a Direção podem configurar a chave PIX.';
      if (isInteraction) return interaction.reply({ content: errText, ephemeral: true });
      return message.reply(errText);
    }

    let chave = '';
    let tipo = '';
    let beneficiario = '';
    let cidade = '';

    if (isInteraction) {
      chave = interaction.options.getString('chave');
      tipo = interaction.options.getString('tipo');
      beneficiario = interaction.options.getString('beneficiario');
      cidade = interaction.options.getString('cidade');
    } else if (args && args.length > 0) {
      chave = args[0];
      tipo = args[1] ? args[1].toUpperCase() : '';
      beneficiario = args[2] || '';
      cidade = args.slice(3).join(' ') || '';
    }

    const current = PixService.getSettings(db, guild.id);

    // Se não passou argumentos, exibe as configurações atuais
    if (!chave) {
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Configurações Atuais do PIX — RealShop')
        .setColor(0x5865F2)
        .setDescription(
          'Aqui estão os dados atualmente cadastrados para geração do **PIX Copia e Cola** e **QR Code**:\n\n' +
          `🔑 **Chave PIX:** \`${current.pix_key || 'Não configurada'}\`\n` +
          `🏷️ **Tipo de Chave:** \`${current.key_type || 'EMAIL'}\`\n` +
          `👤 **Beneficiário:** \`${current.beneficiary_name || 'REALSHOP'}\`\n` +
          `🏙️ **Cidade:** \`${current.beneficiary_city || 'SAO PAULO'}\`\n\n` +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '💡 **Para alterar a chave, execute:**\n' +
          '`?config-pix <sua_chave> <tipo: CPF/CNPJ/EMAIL/TELEFONE/ALEATORIA> [Nome do Titular] [Cidade]`\n\n' +
          '*Exemplo:* `?config-pix 11999998888 TELEFONE "Meu Nome" "Sao Paulo"`'
        )
        .setFooter({ text: 'Nexora Store • Configuração de Pagamento' });

      if (isInteraction) return interaction.reply({ embeds: [embed], ephemeral: true });
      return message.reply({ embeds: [embed] });
    }

    // Auto-detectar tipo se não especificado
    if (!tipo) {
      if (chave.includes('@')) tipo = 'EMAIL';
      else if (/^\d{11}$/.test(chave.replace(/\D/g, ''))) tipo = 'CPF';
      else if (/^\d{14}$/.test(chave.replace(/\D/g, ''))) tipo = 'CNPJ';
      else if (/^\+?\d{10,13}$/.test(chave.replace(/\D/g, ''))) tipo = 'TELEFONE';
      else tipo = 'ALEATORIA';
    }

    beneficiario = beneficiario || current.beneficiary_name || 'REALSHOP';
    cidade = cidade || current.beneficiary_city || 'SAO PAULO';

    PixService.saveSettings(db, guild.id, {
      pixKey: chave,
      keyType: tipo.toUpperCase(),
      beneficiaryName: beneficiario,
      beneficiaryCity: cidade
    });

    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Chave PIX Atualizada com Sucesso!')
      .setColor(0x57F287)
      .setDescription(
        'Todos os novos carrinhos e checkouts agora gerarão o pagamento diretamente para esta chave:\n\n' +
        `🔑 **Nova Chave PIX:** \`${chave}\`\n` +
        `🏷️ **Tipo:** \`${tipo.toUpperCase()}\`\n` +
        `👤 **Beneficiário:** \`${beneficiario}\`\n` +
        `🏙️ **Cidade:** \`${cidade}\`\n\n` +
        '⚡ Os clientes já podem escanear o QR Code e pagar via PIX automaticamente!'
      )
      .setFooter({ text: 'RealShop • Sistema de Pagamentos' });

    if (isInteraction) return interaction.reply({ embeds: [successEmbed], ephemeral: true });
    return message.reply({ embeds: [successEmbed] });
  }
};
