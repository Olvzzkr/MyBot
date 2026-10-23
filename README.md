# Bot Discord Multifuncional Avançado com API e Painel Web

Sistema corporativo e modular para Discord, composto por Bot (discord.js v14), API Backend (Express com sessões seguras e OAuth2), Painel Administrativo Web (React + Vite) e Banco de Dados Relacional (SQLite WAL nativo).

---

## 🏛️ Arquitetura do Sistema

```
discord-bot/
├── bot/                 # Aplicação do Bot Discord
│   ├── commands/        # Comandos categorizados (?cargo, ?ban, ?ticket, etc.)
│   ├── events/          # Manipuladores de eventos (ready, messageCreate, etc.)
│   ├── interactions/    # Roteador de botões, select menus e modais
│   ├── services/        # Regras de autorização e proteção automática
│   └── index.js         # Inicialização do cliente Discord
├── api/                 # API RESTful Backend
│   ├── controllers/     # Controladores (auth, guilds, roles, admin)
│   ├── middleware/      # Sessões OAuth2 e permissões granulares
│   ├── routes/          # Rotas modulares (/api/auth, /api/guilds, etc.)
│   └── index.js         # Servidor Express com Helmet e CORS
├── web/                 # Painel Administrativo Web
│   ├── src/             # Componentes, Páginas React, Hooks e Estilos
│   ├── vite.config.js   # Configuração do Vite com proxy reverso
│   └── package.json     # Dependências do frontend
├── database/            # Persistência e Esquema Relacional
│   ├── migrations/      # Migrações versionadas (001_initial_schema.sql)
│   ├── repositories/    # Repositórios (Guilds, Perms, Mod, Audit, etc.)
│   ├── connection.js    # Conexão nativa node:sqlite em modo WAL
│   └── migrate.js       # Executor transacional de migrações
├── shared/              # Núcleo de Regras Compartilhadas
│   ├── constants/       # Enums, limites, cores e tipos de auditoria
│   ├── permissions/     # Matriz RBAC e avaliador de hierarquia Discord
│   └── validation/      # Validadores (Snowflake, Hex, Prefixos, etc.)
├── scripts/             # Utilitários de operação
│   ├── backup.js        # Backup consistente com VACUUM INTO e SHA-256
│   ├── restore.js       # Validação e restauração de cópias
│   └── start-dev.js     # Orquestrador do ambiente local
├── tests/               # Bateria de testes automatizados
│   ├── unit/            # Permissões, hierarquia e validadores
│   ├── integration/     # Migrações, repositórios e comandos do bot
│   ├── security/        # Sessões OAuth2, CSRF e controle de acesso
│   └── recovery/        # Recuperação de desastres e integridade de backup
├── .env.example         # Template de variáveis de ambiente
└── package.json         # Scripts e dependências raiz
```

---

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
- Node.js v22.5.0 ou superior (utiliza `node:sqlite` nativo e `node:test`).
- Uma aplicação criada no [Discord Developer Portal](https://discord.com/developers/applications).

### 2. Configuração do Discord Developer Portal
No painel de desenvolvedores do Discord:
1. **Intents Privilegiados** (na aba `Bot`):
   - Ative **Server Members Intent** (`GuildMembers`).
   - Ative **Message Content Intent** (obrigatório para comandos com prefixo `?`).
2. **OAuth2** (na aba `OAuth2`):
   - Adicione o Redirect URI: `http://localhost:3001/api/auth/callback`
   - Copie o **Client ID** e **Client Secret**.
3. **Token do Bot**:
   - Copie o **Bot Token** na aba `Bot`.

### 3. Configuração do `.env`
Copie o template de ambiente:
```bash
cp .env.example .env
```
Preencha as variáveis em `.env`:
```env
GLOBAL_OWNER_ID=seu_discord_id_aqui
DISCORD_BOT_TOKEN=seu_bot_token_aqui
DISCORD_CLIENT_ID=seu_client_id_aqui
DISCORD_CLIENT_SECRET=seu_client_secret_aqui
SESSION_SECRET=uma_chave_longa_e_aleatoria_com_mais_de_32_caracteres
```

### 4. Instalação e Execução dos Serviços

Instale as dependências:
```bash
npm install
npm --prefix web install
```

Execute as migrações do banco SQLite:
```bash
npm run db:migrate
```

Você pode iniciar as aplicações em terminais separados ou em conjunto:

- **Executar Tudo em Conjunto:**
  ```bash
  npm run dev
  ```
- **Executar Apenas o Bot Discord:**
  ```bash
  npm run bot
  ```
- **Executar Apenas a API Backend:**
  ```bash
  npm run api
  ```
- **Executar o Painel Web (Vite Dev Server):**
  ```bash
  npm run web:dev
  ```
  Acesse o painel em: `http://localhost:5173`

---

## 🛡️ Matriz de Permissões Granulares

O bot combina a hierarquia nativa de cargos do Discord com permissões RBAC internas:

| Permissão | Finalidade |
|---|---|
| `roles.view` | Consulta cargos e permissões |
| `roles.assign` | Atribui e remove cargos de membros permitidos |
| `roles.manage` | Cria, edita e exclui cargos e painéis |
| `moderation.warn` | Aplica advertências e consulta histórico |
| `moderation.timeout` | Silenciamento temporário de membros |
| `moderation.kick` | Expulsa membros do servidor |
| `moderation.ban` | Bane e desbane membros com motivo obrigatório |
| `moderation.purge` | Exclusão de mensagens em lote nos canais |
| `protection.view` | Visualiza regras de proteção e alertas |
| `protection.manage` | Configura limites anti-spam e anti-raid |
| `protection.quarantine`| Aplica ou revoga quarentena preventiva |
| `tickets.view` | Acesso aos canais e histórico de suporte |
| `tickets.close` | Encerramento formal de tickets |
| `tickets.transcript` | Geração de transcrições completas |
| `audit.view` | Acesso a logs de auditoria detalhados |
| `settings.manage` | Alteração de prefixo e canais do bot |
| `channels.manage` | Criação, edição e exclusão de canais |
| `welcome.manage` | Configuração de boas-vindas e autorroles |

---

## ⚡ Comandos do Discord

### Cargos e Staff
- `?cargo listar` - Lista os cargos do servidor em ordem de hierarquia.
- `?cargo info <@cargo|ID>` - Exibe detalhes técnicos do cargo.
- `?cargo criar <nome> [#corHex]` - Cria um novo cargo (respeitando limites do bot).
- `?cargo editar <@cargo|ID> <nome|cor> <novoValor>` - Edita propriedades do cargo.
- `?cargo adicionar <@membro> <@cargo>` - Atribui cargo (valida hierarquia).
- `?cargo remover <@membro> <@cargo>` - Remove cargo de um membro.
- `?cargo painel <título> <@cargo1> [@cargo2...]` - Gera menu interativo autoatribuível.
- `?permissoes [@membro]` - Detalha permissões granulares e overrides do membro.
- `?equipe` - Exibe a estrutura da equipe administrativa e seus integrantes.

### Moderação e Casos
- `?ban <@membro|ID> <motivo>` - Banimento com dupla confirmação e registro de caso.
- `?kick <@membro|ID> <motivo>` - Expulsão com motivo obrigatório.
- `?timeout <@membro|ID> <duração> <motivo>` - Silenciamento temporário (ex: `10m`, `2h`, `1d`).
- `?advertir <@membro|ID> <motivo>` - Aplica advertência acumulando pontos.
- `?avisos <@membro|ID>` - Consulta advertências ativas do membro.
- `?caso <número>` - Consulta detalhes de uma ocorrência específica.
- `?historico [@membro]` - Lista histórico de punições da guilda ou usuário.
- `?limpar <1-100> [motivo]` - Exclusão de mensagens (com dupla confirmação para ≥ 50).

### Proteção e Segurança
- `?protecao status` - Consulta regras anti-spam, anti-mass-mention e limites ativos.
- `?protecao configurar` - Inicializa as regras recomendadas de segurança.
- `?quarentena <@membro> [motivo]` - Isola membro com cargo de quarentena ou timeout 24h.

### Suporte e Tickets
- `?ticket painel` - Publica embed com botão interativo para abertura de chamados.
- `?ticket fechar` - Encerra o atendimento e remove o canal com segurança.
- `?ticket transcricao` - Exporta todas as mensagens do ticket para arquivo texto.

### Utilitários e Servidor
- `?ajuda [comando]` - Documentação interativa de todos os recursos.
- `?servidor` - Estatísticas detalhadas do servidor atual.
- `?boasvindas <status|canal|mensagem|autorole>` - Personaliza recepção de membros.
- `?canal <criar|excluir>` - Gestão de canais com dupla confirmação para deleção.

---

## 🧪 Bateria de Testes Automatizados

O sistema inclui testes abrangentes utilizando o test runner nativo do Node.js:

```bash
# Executar todos os testes
npm test

# Executar suítes específicas
npm run test:unit
npm run test:integration
npm run test:security
npm run test:recovery
```

### Cenários Cobertos nos Testes:
1. **Servidor não autorizado**: Comandos e APIs administrativas são bloqueados sumariamente.
2. **Usuário sem permissão**: Acesso negado em comandos restritos (`?cargo criar`).
3. **Hierarquia de cargos**: Bloqueio de ações contra cargos iguais/superiores ao bot ou moderador.
4. **Sessões OAuth2**: Validação estrita de expiração, revogação e cookies HttpOnly.
5. **Ações críticas**: Rejeição de confirmações expiradas ou reutilizadas (proteção contra replay).
6. **Integridade de Banco**: Execução e idempotência de migrações relacionais em SQLite.
7. **Retenção de 90 dias**: Purga segura de logs antigos sem afetar logs vigentes.
8. **Recuperação de Desastres**: Criação atômica de backup com `VACUUM INTO`, verificação de checksum SHA-256, detecção de arquivos corrompidos e restauração com verificação de integridade.

---

## 📦 Backups e Recuperação em Produção

Para executar um backup sob demanda:
```bash
npm run db:backup
```
- Localização padrão das cópias: `./backups/`
- Cada cópia é verificada imediatamente através do `PRAGMA integrity_check` e seu hash SHA-256 é registrado no SQLite na tabela `backup_records`.
- Rotação automática configurável através de `BACKUP_RETENTION_COPIES` (padrão: 7 cópias).

---

## 🌐 Preparação para Hospedagem Futura

1. **Variáveis de Produção**:
   - Altere `COOKIE_SECURE=true` para exigir HTTPS.
   - Ajuste `CORS_ORIGIN` com o domínio real do frontend.
2. **Process Manager (PM2)**:
   - Execute o bot e a API sob gerenciadores de processo como PM2 ou Docker com reinicialização automática (`restart: unless-stopped`).
3. **Armazenamento Persistente**:
   - Mantenha o arquivo `./database/storage.sqlite` e a pasta `./backups` em volumes persistentes caso utilize containers Docker.
