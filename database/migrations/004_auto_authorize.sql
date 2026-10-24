-- Migração 004: Auto-autorização de servidores e proprietário global

INSERT OR IGNORE INTO global_owners (user_id, added_by, notes)
VALUES ('1517970601342664768', 'SYSTEM', 'Proprietário Global Oficial');

INSERT OR IGNORE INTO authorized_guilds (guild_id, authorized_by, reason, is_authorized)
VALUES 
  ('1553633196296511498', '1517970601342664768', 'Servidor Oficial Resenha', 1),
  ('1562230954594934887', '1517970601342664768', 'Servidor Oficial RealShop', 1);

UPDATE authorized_guilds
SET is_authorized = 1, revoked_by = NULL, revoked_at = NULL
WHERE guild_id IN ('1553633196296511498', '1562230954594934887');

INSERT OR IGNORE INTO guild_settings (guild_id, prefix)
VALUES 
  ('1553633196296511498', '?'),
  ('1562230954594934887', '?');
