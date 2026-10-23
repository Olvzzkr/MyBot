const QRCode = require('qrcode');

function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function emvField(id, value) {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

function generatePixPayload({ key, name, city, amount, txId = '***' }) {
  const cleanName = (name || 'BLACKSHOP').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25).toUpperCase();
  const cleanCity = (city || 'SAO PAULO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15).toUpperCase();
  const cleanKey = key.trim();
  const formattedAmount = Number(amount).toFixed(2);

  // 26: Merchant Account Information
  const merchantAccountInfo = emvField('00', 'br.gov.bcb.pix') + emvField('01', cleanKey);

  // 62: Additional Data Field Template
  const cleanTxId = (txId || '***').slice(0, 25);
  const additionalData = emvField('05', cleanTxId);

  let payload = 
    emvField('00', '01') + // Payload Format Indicator
    emvField('01', '12') + // Point of Initiation (12 = multiple / dynamic)
    emvField('26', merchantAccountInfo) +
    emvField('52', '0000') + // Merchant Category Code
    emvField('53', '986') + // Currency: BRL
    emvField('54', formattedAmount) + // Transaction Amount
    emvField('58', 'BR') + // Country Code
    emvField('59', cleanName) + // Merchant Name
    emvField('60', cleanCity) + // Merchant City
    emvField('62', additionalData) +
    '6304'; // CRC16 placeholder

  const crc = crc16(payload);
  return payload + crc;
}

async function test() {
  const payload = generatePixPayload({
    key: 'blackshop@pix.com',
    name: 'BLACKSHOP',
    city: 'SAO PAULO',
    amount: 13.90,
    txId: 'PED12345'
  });

  console.log('Pix Copia e Cola:', payload);
  const qrBuffer = await QRCode.toBuffer(payload, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
  console.log('QR Code buffer gerado! Tamanho:', qrBuffer.length, 'bytes');
}

test();
