/**
 * Módulo de Validação e Sanitização de Entradas
 */

const SNOWFLAKE_REGEX = /^[0-9]{17,20}$/;
const HEX_COLOR_REGEX = /^#?([0-9A-Fa-f]{6})$/;

/**
 * Valida se uma string é um ID Snowflake válido do Discord
 * @param {string} id
 * @returns {boolean}
 */
function isValidSnowflake(id) {
  if (typeof id !== 'string' && typeof id !== 'number') return false;
  return SNOWFLAKE_REGEX.test(String(id).trim());
}

/**
 * Valida e converte cor hexadecimal para número inteiro
 * @param {string|number} colorInput
 * @returns {{ valid: boolean, intColor?: number, hexColor?: string }}
 */
function parseHexColor(colorInput) {
  if (typeof colorInput === 'number') {
    if (colorInput >= 0 && colorInput <= 0xFFFFFF) {
      return {
        valid: true,
        intColor: colorInput,
        hexColor: '#' + colorInput.toString(16).padStart(6, '0').toUpperCase()
      };
    }
    return { valid: false };
  }

  if (typeof colorInput !== 'string') return { valid: false };

  const match = colorInput.trim().match(HEX_COLOR_REGEX);
  if (!match) return { valid: false };

  const hex = match[1].toUpperCase();
  const intColor = parseInt(hex, 16);

  return {
    valid: true,
    intColor,
    hexColor: '#' + hex
  };
}

/**
 * Valida o prefixo de comandos
 * @param {string} prefix
 * @returns {boolean}
 */
function isValidPrefix(prefix) {
  if (typeof prefix !== 'string') return false;
  const trimmed = prefix.trim();
  return trimmed.length >= 1 && trimmed.length <= 5 && !trimmed.includes(' ');
}

/**
 * Sanitiza texto para prevenir quebras ou abusos
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function sanitizeText(text, maxLength = 1000) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, maxLength);
}

module.exports = {
  isValidSnowflake,
  parseHexColor,
  isValidPrefix,
  sanitizeText
};
