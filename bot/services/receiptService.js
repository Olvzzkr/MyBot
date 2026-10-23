/**
 * Serviço gerador de Recibo Digital em Canvas — BlackShop
 * Réplica exata do comprovante de compra do RealBoost
 */

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('node:path');
const fs = require('node:fs');

class ReceiptService {
  /**
   * Gera o buffer PNG do recibo oficial de compra
   * @param {Object} options
   * @param {string} options.avatarUrl - URL do avatar do cliente
   * @param {string} options.displayName - Nome de exibição do cliente
   * @param {string} options.username - Tag/username do cliente (ex: olvzzxk_)
   * @param {string} options.productName - Nome do produto comprado
   * @param {string} options.price - Valor da compra (ex: 'R$ 13,90')
   * @param {Date} [options.date] - Data da compra
   * @param {string} [options.brandName] - Nome da loja no rodapé
   * @returns {Promise<Buffer>} Buffer PNG
   */
  static async generateReceipt({
    avatarUrl,
    displayName,
    username,
    productName,
    price,
    date = new Date(),
    brandName = 'REAL BOOST'
  }) {
    const width = 680;
    const height = 740;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Fundo do Cartão com cantos arredondados
    const radius = 26;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.clip();

    // Gradiente de Fundo Ultra Dark
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#16151a');
    bgGradient.addColorStop(0.3, '#131217');
    bgGradient.addColorStop(0.7, '#100f13');
    bgGradient.addColorStop(1, '#0c0c0f');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Efeito sutil de textura/atmosfera trap no topo
    const glow = ctx.createRadialGradient(width * 0.7, 100, 20, width * 0.7, 100, 300);
    glow.addColorStop(0, 'rgba(230, 40, 90, 0.12)');
    glow.addColorStop(0.6, 'rgba(180, 20, 70, 0.04)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Tentar desenhar arte/banner de fundo com opacidade muito baixa se existir
    const bannerPath = path.join(__dirname, '../assets/boosting-banner-clean.png');
    if (fs.existsSync(bannerPath)) {
      try {
        const bgImg = await loadImage(bannerPath);
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.drawImage(bgImg, 0, 0, width, 280);
        ctx.restore();
      } catch {}
    }

    // Borda rosa sutil no lado esquerdo (característica visual marcante do RealBoost)
    const leftBarGradient = ctx.createLinearGradient(0, 40, 0, height - 100);
    leftBarGradient.addColorStop(0, 'rgba(255, 67, 101, 0.8)');
    leftBarGradient.addColorStop(0.4, 'rgba(255, 67, 101, 0.35)');
    leftBarGradient.addColorStop(1, 'rgba(255, 67, 101, 0.05)');
    ctx.strokeStyle = leftBarGradient;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(0, height - 30);
    ctx.stroke();

    // Borda sutil de todo o cartão
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, width, height);
    ctx.restore();

    // 2. Cabeçalho: "⚡ RECIBO" e Badge "• PAGO"
    // Ícone raio / logo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(38, 40);
    ctx.lineTo(44, 40);
    ctx.lineTo(41, 46);
    ctx.lineTo(46, 46);
    ctx.lineTo(39, 56);
    ctx.lineTo(41, 49);
    ctx.lineTo(37, 49);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#8e8e98';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('R E C I B O', 54, 49);

    // Badge "• PAGO"
    const badgeW = 76;
    const badgeH = 26;
    const badgeX = width - badgeW - 36;
    const badgeY = 34;

    ctx.save();
    ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 13);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ponto vermelho e texto "PAGO"
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(badgeX + 18, badgeY + 13, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('PAGO', badgeX + 28, badgeY + 17);
    ctx.restore();

    // 3. Informações do Usuário
    const avatarX = 36;
    const avatarY = 88;
    const avatarSize = 58;

    // Carregar e desenhar avatar
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 14);
    ctx.clip();
    try {
      if (avatarUrl) {
        const avatarImg = await loadImage(avatarUrl);
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      } else {
        ctx.fillStyle = '#232428';
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      }
    } catch {
      ctx.fillStyle = '#232428';
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    }
    ctx.restore();

    // Borda do Avatar
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(avatarX, avatarY, avatarSize, avatarSize, 14);
    ctx.stroke();
    ctx.restore();

    // Nome e Handle do Usuário
    const cleanUsername = (username || displayName || 'cliente').toLowerCase();
    const cleanDisplayName = displayName || cleanUsername;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(cleanDisplayName, 108, 114);

    ctx.fillStyle = '#7a7a85';
    ctx.font = '14px sans-serif';
    ctx.fillText(`@${cleanUsername}`, 108, 136);

    // Data e Hora (na mesma altura, alinhado à direita)
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const dateStr = `${day}/${month} · ${hours}:${minutes}`;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#7a7a85';
    ctx.font = '13px sans-serif';
    ctx.fillText(dateStr, width - 36, 122);
    ctx.textAlign = 'left';

    // 4. Título Principal "Compra Realizada"
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('Compra Realizada', 36, 206);

    // 5. Linha Tracejada Divisória
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(36, 238);
    ctx.lineTo(width - 36, 238);
    ctx.stroke();
    ctx.restore();

    // 6. Seção CARRINHO
    ctx.fillStyle = '#7a7a85';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('CARRINHO', 36, 274);

    // Nome do Produto e Preço do Item
    ctx.fillStyle = '#e8e8ed';
    ctx.font = '500 15px sans-serif';

    const maxTextWidth = 460;
    const words = productName.split(' ');
    let line = '';
    let itemY = 306;
    for (const w of words) {
      const testLine = line + w + ' ';
      if (ctx.measureText(testLine).width > maxTextWidth && line !== '') {
        ctx.fillText(line.trim(), 36, itemY);
        line = w + ' ';
        itemY += 22;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), 36, itemY);

    // Preço do Item na direita
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(price, width - 36, 306);

    // 7. SUBTOTAL
    const subtotalY = Math.max(itemY + 34, 368);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7a7a85';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('SUBTOTAL', 36, subtotalY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#dcdde1';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(price, width - 36, subtotalY);

    // 8. Caixa "VALOR PAGO"
    const boxX = 36;
    const boxY = subtotalY + 32;
    const boxW = width - 72;
    const boxH = 104;

    ctx.save();
    ctx.fillStyle = '#17161c';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rótulo "VALOR PAGO"
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7a7a85';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('VALOR PAGO', boxX + 24, boxY + 56);

    // Preço Grande em Rosa Choque
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff4365';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(price, boxX + boxW - 24, boxY + 66);
    ctx.restore();

    // 9. Rodapé com Logo
    const footerY = height - 36;
    const logoSize = 18;

    // Ícone logo no rodapé
    ctx.save();
    ctx.fillStyle = '#ff4365';
    ctx.beginPath();
    ctx.arc(36 + logoSize / 2, footerY - 5, logoSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#7a7a85';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(brandName, 62, footerY - 1);

    return canvas.toBuffer('image/png');
  }
}

module.exports = ReceiptService;
