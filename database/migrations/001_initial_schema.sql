-- Migração Inicial 001: Esquema Relacional Completo
-- Criado em conformidade com as especificações do sistema

-- 1. Proprietários Globais
CREATE TABLE IF NOT EXISTS global_owners (
    user_id TEXT PRIMARY KEY,
    added_by TEXT NOT NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    notes TEXT
);

-- 2. Servidores Autorizados
CREATE TABLE IF NOT EXISTS authorized_guilds (
    guild_id TEXT PRIMARY KEY,
    authorized_by TEXT NOT NULL,
    authorized_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    is_authorized INTEGER NOT NULL DEFAULT 1,
    revoked_by TEXT,
    revoked_at TEXT,
    reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_authorized_guilds_status ON authorized_guilds (is_authorized);

-- 3. Sessões OAuth2
CREATE TABLE IF NOT EXISTS oauth_sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar TEXT,
    access_token_encrypted TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    last_accessed_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    is_revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_user ON oauth_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expiry ON oauth_sessions (expires_at, is_revoked);

-- 4. Configurações Gerais da Guilda
CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT NOT NULL DEFAULT '?',
    language TEXT NOT NULL DEFAULT 'pt-BR',
    modlog_channel_id TEXT,
    auditlog_channel_id TEXT,
    quarantine_role_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- 5. Configurações de Módulos
CREATE TABLE IF NOT EXISTS module_settings (
    guild_id TEXT NOT NULL,
    module_name TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    config_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    PRIMARY KEY (guild_id, module_name)
);

-- 6. Cargos da Staff
CREATE TABLE IF NOT EXISTS staff_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    role_name TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    UNIQUE(guild_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_staff_roles_guild ON staff_roles (guild_id);

-- 7. Permissões Granulares dos Cargos da Staff
CREATE TABLE IF NOT EXISTS staff_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_role_id INTEGER NOT NULL,
    permission_key TEXT NOT NULL,
    FOREIGN KEY (staff_role_id) REFERENCES staff_roles(id) ON DELETE CASCADE,
    UNIQUE(staff_role_id, permission_key)
);
CREATE INDEX IF NOT EXISTS idx_staff_perms_role ON staff_permissions (staff_role_id);

-- 8. Overrides de Permissões por Usuário
CREATE TABLE IF NOT EXISTS user_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    permission_key TEXT NOT NULL,
    is_allowed INTEGER NOT NULL DEFAULT 1, -- 1 = Permitido, 0 = Negado explicitamente
    granted_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    UNIQUE(guild_id, user_id, permission_key)
);
CREATE INDEX IF NOT EXISTS idx_user_overrides_lookup ON user_overrides (guild_id, user_id);

-- 9. Casos de Moderação
CREATE TABLE IF NOT EXISTS moderation_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_number INTEGER NOT NULL,
    guild_id TEXT NOT NULL,
    action TEXT NOT NULL, -- WARN, TIMEOUT, UNTIMEOUT, KICK, BAN, UNBAN, PURGE, QUARANTINE
    target_id TEXT NOT NULL,
    target_tag TEXT,
    moderator_id TEXT NOT NULL,
    moderator_tag TEXT,
    reason TEXT NOT NULL,
    duration_seconds INTEGER,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, REVOKED, REVERTED
    correlation_id TEXT,
    UNIQUE(guild_id, case_number)
);
CREATE INDEX IF NOT EXISTS idx_mod_cases_guild ON moderation_cases (guild_id, case_number);
CREATE INDEX IF NOT EXISTS idx_mod_cases_target ON moderation_cases (guild_id, target_id);
CREATE INDEX IF NOT EXISTS idx_mod_cases_status ON moderation_cases (status, expires_at);

-- 10. Advertências (Warnings)
CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    case_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (case_id) REFERENCES moderation_cases(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_warnings_target ON warnings (guild_id, target_id, is_active);

-- 11. Logs de Auditoria (com retenção de 90 dias)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_id TEXT,
    reason TEXT,
    result TEXT NOT NULL, -- SUCCESS, FAILURE, PARTIAL
    error_message TEXT,
    correlation_id TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_guild_date ON audit_logs (guild_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs (correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_retention ON audit_logs (created_at);

-- 12. Eventos de Segurança (Detecção Automática)
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- SPAM, MASS_MENTION, REPEATED_TEXT, ADMIN_ATTEMPT
    severity TEXT NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX IF NOT EXISTS idx_security_events_guild ON security_events (guild_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events (guild_id, user_id);

-- 13. Ações de Proteção e Contenção Aplicadas
CREATE TABLE IF NOT EXISTS protection_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- QUARANTINE, AUTO_TIMEOUT, MESSAGE_DELETE
    reason TEXT NOT NULL,
    duration_seconds INTEGER,
    expires_at TEXT,
    reverted_at TEXT,
    is_reverted INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX IF NOT EXISTS idx_protection_actions_active ON protection_actions (guild_id, user_id, is_reverted, expires_at);

-- 14. Tickets de Atendimento
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_number INTEGER NOT NULL,
    guild_id TEXT NOT NULL,
    channel_id TEXT UNIQUE,
    creator_id TEXT NOT NULL,
    assigned_staff_id TEXT,
    category TEXT NOT NULL DEFAULT 'Geral',
    subject TEXT,
    priority TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, CLOSED, ARCHIVED
    transcript_path TEXT,
    closed_by TEXT,
    closed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    UNIQUE(guild_id, ticket_number)
);
CREATE INDEX IF NOT EXISTS idx_tickets_guild_status ON tickets (guild_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_creator ON tickets (guild_id, creator_id);

-- 15. Mensagens do Ticket (Metadados para Histórico / Transcrição)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    content TEXT,
    attachments_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages (ticket_id);

-- 16. Configurações de Boas-vindas
CREATE TABLE IF NOT EXISTS welcome_settings (
    guild_id TEXT PRIMARY KEY,
    is_enabled INTEGER NOT NULL DEFAULT 0,
    channel_id TEXT,
    message_text TEXT,
    embed_json TEXT,
    autorole_ids_json TEXT DEFAULT '[]',
    farewell_channel_id TEXT,
    farewell_message_text TEXT,
    farewell_is_enabled INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- 17. Painéis Interativos de Cargos (Role Panels)
CREATE TABLE IF NOT EXISTS role_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    color INTEGER DEFAULT 5793266,
    roles_json TEXT NOT NULL DEFAULT '[]', -- Array com { role_id, label, emoji, description }
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX IF NOT EXISTS idx_role_panels_guild ON role_panels (guild_id);

-- 18. Regras de Proteção Automática por Servidor
CREATE TABLE IF NOT EXISTS protection_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    rule_name TEXT NOT NULL, -- anti_spam, anti_mass_mention, anti_raid
    is_enabled INTEGER NOT NULL DEFAULT 1,
    threshold_limit INTEGER NOT NULL DEFAULT 5,
    threshold_interval_seconds INTEGER NOT NULL DEFAULT 5,
    action_type TEXT NOT NULL DEFAULT 'TIMEOUT', -- TIMEOUT, QUARANTINE, WARN
    action_duration_seconds INTEGER NOT NULL DEFAULT 300,
    whitelist_roles_json TEXT NOT NULL DEFAULT '[]',
    whitelist_channels_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    UNIQUE(guild_id, rule_name)
);
CREATE INDEX IF NOT EXISTS idx_protection_rules_guild ON protection_rules (guild_id);

-- 19. Dupla Confirmação Pendente (Two-Step Confirmations)
CREATE TABLE IF NOT EXISTS pending_confirmations (
    token TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_id TEXT,
    payload_json TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    is_used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_lookup ON pending_confirmations (token, expires_at, is_used);

-- 20. Registros de Backups
CREATE TABLE IF NOT EXISTS backup_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_file_name TEXT NOT NULL,
    backup_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    is_valid INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, CORRUPT, RESTORED
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_backup_records_date ON backup_records (created_at);

-- 21. Eventos do Sistema e Resiliência
CREATE TABLE IF NOT EXISTS system_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component TEXT NOT NULL, -- BOT, API, WEB, DATABASE, BACKUP
    event_level TEXT NOT NULL, -- INFO, WARN, ERROR, CRITICAL
    message TEXT NOT NULL,
    error_stack TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX IF NOT EXISTS idx_system_events_component ON system_events (component, created_at);
