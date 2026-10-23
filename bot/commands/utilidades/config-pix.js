/**
 * Comando /config-pix e ?config-pix
 * Configura a Chave PIX da loja para a geração automática de QR Codes
 */

const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const PixService = require('../../services/pixService');

module.exports = {
  name: 'config-pix',
  aliases: ['pix-config', 'setpix', 'chavepix'],
  description: 'Configura a chave PIX e os dados do beneficiário para geração de QR Code e Copia e Cola',
  usage: '/config-pix chave:sua_chave tipo:EMAIL|CPF|CNPJ|TELEFONE|ALEATORIA nome:"Nome da Loja" cidade:"Sao Paulo"',

  async execute({ message, interaction, db, args }) {
    const isInteraction = !!interaction;
    const author = isInteraction ? interaction.user : message.author;
    const member = isInteraction ? interaction.member : message.member;
    const guild = isInteraction ? interaction.guild : message.guild;

    const isGlobalOwner = author.id === '1517970601342664768';
    const isAdmin = member?.permissions?.has?.(PermissionFlagsBits.Administrator) || isGlobalOwner;

    if (!isAdmin) {
      const errText = '❌ Apenas Administradores podem configurar a chave PIX.';
      if (isInteraction) return interaction.reply({ content: errText, ephemeral: true });
      return message.reply(errText);
    }

    let pixKey = '';
    let keyType = 'EMAIL';
    let beneficiaryName = 'BLACKSHOP';
    let beneficiaryCity = 'SAO PAULO';

    if (isInteraction) {
      pixKey = interaction.options.getString('chave') || '';
      keyType = interaction.options.getString('tipo') || 'EMAIL';
      beneficiaryName = interaction.options.getString('nome') || 'BLACKSHOP';
      beneficiaryCity = interaction.options.getString('cidade') || 'SAO PAULO';
    } else {
      if (!args || args.length === 0) {
        // Exibir chave atual
        const current = PixService.getSettings(db, guild.id);
        const embed = new EmbedBuilder()
          .setTitle('🔑 Configurações Atuais do PIX')
          .setColor(0x2B2D31)
          .addFields(
            { name: 'Chave PIX', value: `\`${current.pix_key}\``, inline: true },
            { name: 'Tipo', value: `\`${current.key_type}\``, inline: true },
            { name: 'Beneficiário', value: `\`${current.beneficiary_name}\``, inline: true },
            { name: 'Cidade', value: `\`${current.beneficiary_city}\``, inline: true }
          )
          .setFooter({ text: 'Use ?config-pix <chave> <tipo> <nome> <cidade> para alterar.' });

        return message.reply({ embeds: [embed] });
      }

      pixKey = args[0] || '';
      keyType = args[1] || 'EMAIL';
      beneficiaryName = args[2] || 'BLACKSHOP';
      beneficiaryCity = args[3] || 'SAO PAULO';
    }

    if (!pixKey) {
      const err = '❌ Você precisa informar a chave PIX! Exemplo: `/config-pix chave:suachave@email.com`';
      if (isInteraction) return interaction.reply({ content: err, ephemeral: true });
      return message.reply(err);
    }

    PixService.saveSettings(db, guild.id, {
      pixKey,
      keyType: keyType.toUpperCase(),
      beneficiaryName,
      beneficiaryCity
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ Chave PIX Configurada com Sucesso!')
      .setColor(0x57F287)
      .setDescription(
        `Agora, todos os carrinhos de compra que gerarem pagamento por PIX usarão estes dados:\n\n` +
        `🔑 **Chave PIX:** \`${pixKey}\`\n` +
        `🏷️ **Tipo:** \`${keyType.toUpperCase()}\`\n` +
        `👤 **Beneficiário:** \`${beneficiaryName}\`\n` +
        `🏙️ **Cidade:** \`${beneficiaryCity}\``
      )
      .setFooter({ text: 'Padrão Oficial Banco Central do Brasil • EMV BR Code' })
      .setTimestamp();

    if (isInteraction) {
      return interaction.reply({ embeds: [embed] });
    } else {
      return message.reply({ embeds: [embed] });
    }
  }
};
