const test = require('node:test');
const assert = require('node:assert');
const {
  isValidSnowflake,
  parseHexColor,
  isValidPrefix,
  sanitizeText
} = require('../../shared/validation');

test('isValidSnowflake: valida formato de IDs do Discord', () => {
  assert.strictEqual(isValidSnowflake('123456789012345678'), true);
  assert.strictEqual(isValidSnowflake('1234567890123456789'), true);
  assert.strictEqual(isValidSnowflake('12345'), false); // curto demais
  assert.strictEqual(isValidSnowflake('abc123456789012345'), false); // caracteres não numéricos
  assert.strictEqual(isValidSnowflake(null), false);
  assert.strictEqual(isValidSnowflake(''), false);
});

test('parseHexColor: analisa cores hexadecimais', () => {
  const c1 = parseHexColor('#5865F2');
  assert.strictEqual(c1.valid, true);
  assert.strictEqual(c1.hexColor, '#5865F2');
  assert.strictEqual(c1.intColor, 5793266);

  const c2 = parseHexColor('FF0000');
  assert.strictEqual(c2.valid, true);
  assert.strictEqual(c2.hexColor, '#FF0000');
  assert.strictEqual(c2.intColor, 16711680);

  const invalid = parseHexColor('invalid_color');
  assert.strictEqual(invalid.valid, false);
});

test('isValidPrefix: valida prefixos de comando', () => {
  assert.strictEqual(isValidPrefix('?'), true);
  assert.strictEqual(isValidPrefix('!'), true);
  assert.strictEqual(isValidPrefix('bot!'), true);
  assert.strictEqual(isValidPrefix(''), false);
  assert.strictEqual(isValidPrefix('prefix toolong'), false);
  assert.strictEqual(isValidPrefix('? a'), false);
});

test('sanitizeText: trunca e limpa strings', () => {
  assert.strictEqual(sanitizeText('  olá mundo  ', 10), 'olá mundo');
  assert.strictEqual(sanitizeText('1234567890 extra', 10), '1234567890');
  assert.strictEqual(sanitizeText(null), '');
});
