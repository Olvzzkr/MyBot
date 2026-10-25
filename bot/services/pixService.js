/**
 * Serviço de Geração e Gerenciamento de PIX (Padrão Banco Central do Brasil - BR Code / EMV)
 */

const QRCode = require('qrcode');

class PixService {
  /**
   * Calcula CRC16 CCITT (0xFFFF)
   */
  static crc16(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = (crc << 1);
        }
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  static emvField(id, value) {
    const len = String(value.length).padStart(2, '0');
    return `${id}${len}${value}`;
  }

  /**
   * Obtém configurações de PIX para uma guilda
   */
  static getSettings(db, guildId) {
    try {
      const row = db.prepare('SELECT * FROM pix_settings WHERE guild_id = ?').get(guildId);
      if (row) return row;
    } catch {}

    return {
      guild_id: guildId,
      pix_key: process.env.PIX_KEY || '5b38ac46-01c8-456e-9d7f-3d4c9eb1c294',
      key_type: process.env.PIX_KEY_TYPE || 'ALEATORIA',
      beneficiary_name: process.env.PIX_BENEFICIARY_NAME || 'DAVI DE S O DA SILVA',
      beneficiary_city: process.env.PIX_BENEFICIARY_CITY || 'FORTALEZA'
    };
  }

  /**
   * Salva configurações de PIX
   */
  static saveSettings(db, guildId, { pixKey, keyType = 'CHAVE', beneficiaryName = 'REALSHOP', beneficiaryCity = 'SAO PAULO' }) {
    db.prepare(`
      INSERT INTO pix_settings (guild_id, pix_key, key_type, beneficiary_name, beneficiary_city, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'utc'))
      ON CONFLICT(guild_id) DO UPDATE SET
        pix_key = excluded.pix_key,
        key_type = excluded.key_type,
        beneficiary_name = excluded.beneficiary_name,
        beneficiary_city = excluded.beneficiary_city,
        updated_at = datetime('now', 'utc')
    `).run(guildId, pixKey.trim(), keyType, beneficiaryName.trim(), beneficiaryCity.trim());
  }

  /**
   * Gera o Copia e Cola Oficial do PIX
   */
  static generatePayload({ key, name = 'REALSHOP', city = 'SAO PAULO', amount, txId = '***' }) {
    const cleanName = (name || 'REALSHOP').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25).toUpperCase();
    const cleanCity = (city || 'SAO PAULO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15).toUpperCase();
    const cleanKey = key.trim();
    const formattedAmount = Number(amount).toFixed(2);

    const merchantAccountInfo = this.emvField('00', 'br.gov.bcb.pix') + this.emvField('01', cleanKey);
    const cleanTxId = (txId || '***').slice(0, 25);
    const additionalData = this.emvField('05', cleanTxId);

    let payload = 
      this.emvField('00', '01') +
      this.emvField('01', '12') +
      this.emvField('26', merchantAccountInfo) +
      this.emvField('52', '0000') +
      this.emvField('53', '986') +
      this.emvField('54', formattedAmount) +
      this.emvField('58', 'BR') +
      this.emvField('59', cleanName) +
      this.emvField('60', cleanCity) +
      this.emvField('62', additionalData) +
      '6304';

    const crc = this.crc16(payload);
    return payload + crc;
  }

  /**
   * Gera buffer de imagem PNG do QR Code
   */
  static async generateQrCodeBuffer(payload) {
    return QRCode.toBuffer(payload, {
      width: 480,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }
}

module.exports = PixService;
