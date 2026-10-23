/**
 * Serviço de Detecção e Filtragem de Conteúdo +18 / Imoral
 * Abordagem em camadas:
 * 1. Análise léxica de nomes de arquivos, texto e metadados
 * 2. Validação de tags e flags da CDN do Discord
 * 3. Amostragem heurística de tons de pele (Skin-tone detection)
 */

class NsfwFilterService {
  static BLACKLISTED_TERMS = [
    'nsfw', 'porn', 'porno', 'nude', 'nudes', 'sex', 'sexo', 'hentai', 'xxx',
    'boobs', 'penis', 'vagina', 'bunda', 'pelada', 'pelado', 'buceta', 'piroca',
    'erotic', 'erotico', 'gore', 'nudity', 'rule34', 'onlyfans'
  ];

  /**
   * Avalia se uma mensagem ou seus anexos contêm conteúdo impróprio
   * @param {import('discord.js').Message} message
   * @returns {Promise<{ isNsfw: boolean, reason?: string }>}
   */
  static async evaluate(message) {
    const text = (message.content || '').toLowerCase();
    
    // 1. Verificação de texto da mensagem
    for (const term of this.BLACKLISTED_TERMS) {
      const regex = new RegExp(`\\b${term}\\b`, 'i');
      if (regex.test(text)) {
        return { isNsfw: true, reason: `Palavra-chave suspeita no texto: "${term}"` };
      }
    }

    // 2. Verificação dos anexos
    for (const [, attachment] of message.attachments) {
      const name = (attachment.name || '').toLowerCase();

      // Verificar nome do arquivo
      for (const term of this.BLACKLISTED_TERMS) {
        if (name.includes(term)) {
          return { isNsfw: true, reason: `Nome de anexo suspeito: "${name}"` };
        }
      }

      // Verificar se é imagem
      const isImage = attachment.contentType?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name);
      if (!isImage) continue;

      // 3. Verificação de tags do Discord
      if (attachment.spoiler && (name.includes('nsfw') || name.includes('18'))) {
        return { isNsfw: true, reason: 'Anexo oculto (spoiler) com nomenclatura suspeita' };
      }

      // 4. Heurística de amostragem de tons de pele via buffer
      try {
        const isSkinHeavy = await this.checkSkinRatio(attachment.url);
        if (isSkinHeavy) {
          return { isNsfw: true, reason: 'Detecção de alta densidade de exposição corporal' };
        }
      } catch (err) {
        // Fallback silencioso se download falhar
      }
    }

    return { isNsfw: false };
  }

  /**
   * Analisa amostragem de bytes do arquivo de imagem para identificar alta proporção de pele
   * @param {string} url
   * @returns {Promise<boolean>}
   */
  static async checkSkinRatio(url) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Nexora-SafetyBot/1.0' } });
      if (!response.ok) return false;

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 500) return false;

      // Amostragem linear de trios RGB no buffer da imagem
      let skinPixels = 0;
      let totalSampled = 0;
      const step = Math.max(3, Math.floor(buffer.length / 5000));

      for (let i = 50; i < buffer.length - 3; i += step) {
        const r = buffer[i];
        const g = buffer[i + 1];
        const b = buffer[i + 2];

        // Regra clássica de Peer et al. para tons de pele humana em RGB
        const isSkin = (
          r > 95 && g > 40 && b > 20 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 15 &&
          r > g && r > b
        );

        if (isSkin) skinPixels++;
        totalSampled++;
      }

      if (totalSampled > 0) {
        const ratio = skinPixels / totalSampled;
        // Se mais de 55% da amostragem corresponder a tons de pele em canal aberto, sinaliza suspeita
        return ratio > 0.55;
      }
    } catch {
      return false;
    }
    return false;
  }
}

module.exports = NsfwFilterService;
