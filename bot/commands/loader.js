/**
 * Carregador Modular de Comandos
 */

const fs = require('node:fs');
const path = require('node:path');

class CommandLoader {
  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
  }

  loadAll(commandsDir = path.join(__dirname)) {
    this.commands.clear();
    this.aliases.clear();

    const categories = fs.readdirSync(commandsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const category of categories) {
      const categoryPath = path.join(commandsDir, category);
      const commandFiles = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.js') && !file.startsWith('_'));

      for (const file of commandFiles) {
        const filePath = path.join(categoryPath, file);
        try {
          const command = require(filePath);
          if (!command.name || typeof command.execute !== 'function') {
            console.warn(`[CommandLoader] Comando inválido ignorado: ${filePath}`);
            continue;
          }

          command.category = category;
          this.commands.set(command.name.toLowerCase(), command);

          if (Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
              this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
            }
          }
        } catch (err) {
          console.error(`[CommandLoader] Erro ao carregar comando ${filePath}:`, err);
        }
      }
    }

    return {
      commandCount: this.commands.size,
      aliasCount: this.aliases.size
    };
  }

  getCommand(commandName) {
    if (!commandName) return null;
    const lower = commandName.toLowerCase();
    const resolvedName = this.aliases.get(lower) || lower;
    return this.commands.get(resolvedName) || null;
  }
}

module.exports = CommandLoader;
