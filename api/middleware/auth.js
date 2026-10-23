/**
 * Middleware de Autenticação de Sessão OAuth2
 */

const { getDatabase } = require('../../database/connection');
const { isGlobalOwner } = require('../../shared/permissions');

function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session_token;
  if (!sessionId) {
    return res.status(401).json({ error: 'Não autenticado. Sessão não encontrada.' });
  }

  const db = getDatabase();
  const session = db.prepare(`
    SELECT session_id, user_id, username, avatar, expires_at, is_revoked
    FROM oauth_sessions
    WHERE session_id = ?
  `).get(sessionId);

  if (!session) {
    res.clearCookie('session_token');
    return res.status(401).json({ error: 'Sessão inválida ou inexistente.' });
  }

  if (session.is_revoked === 1) {
    res.clearCookie('session_token');
    return res.status(401).json({ error: 'Sessão revogada.' });
  }

  const now = new Date().toISOString();
  if (session.expires_at < now) {
    res.clearCookie('session_token');
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }

  // Atualizar last_accessed_at
  db.prepare(`
    UPDATE oauth_sessions
    SET last_accessed_at = datetime('now', 'utc')
    WHERE session_id = ?
  `).run(sessionId);

  const globalOwnerId = process.env.GLOBAL_OWNER_ID || '';
  const isOwner = isGlobalOwner(session.user_id, globalOwnerId) ||
    Boolean(db.prepare('SELECT 1 FROM global_owners WHERE user_id = ?').get(session.user_id));

  req.user = {
    id: session.user_id,
    username: session.username,
    avatar: session.avatar,
    isGlobalOwner: isOwner
  };
  req.sessionId = sessionId;

  next();
}

module.exports = {
  requireAuth
};
