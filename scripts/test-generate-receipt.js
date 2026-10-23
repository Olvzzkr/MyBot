const fs = require('node:fs');
const path = require('node:path');
const ReceiptService = require('../bot/services/receiptService');

async function test() {
  console.log('Generating test receipt...');
  const buffer = await ReceiptService.generateReceipt({
    displayName: 'bangleo_o',
    username: 'bangleo_o',
    productName: '1x 1mpuls0s M3ns4is - 2 Impulsos Mensais - 30 Dias',
    price: 'R$ 2,99'
  });

  const outPath = path.join(__dirname, 'test-receipt.png');
  fs.writeFileSync(outPath, buffer);
  console.log(`Receipt saved to ${outPath}!`);
}

test();
