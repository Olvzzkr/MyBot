const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const { app } = require('../../api/index');
const { getDatabase } = require('../../database/connection');

test('Segurança da API: controle de acesso, sessões e proteção contra abuso', async (t) => {
  const db = getDatabase();

  // Iniciar servidor em porta efêmera para teste
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Healthcheck público
    const resHealth = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(resHealth.status, 200);
    const healthJson = await resHealth.json();
    assert.strictEqual(healthJson.status, 'healthy');
    assert.strictEqual(healthJson.components.database, 'healthy');

    // 2. Acesso a endpoint protegido sem token de sessão -> 401 Unauthorized
    const resNoAuth = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(resNoAuth.status, 401);

    // 3. Acesso com sessão inexistente -> 401 Unauthorized
    const resFakeSession = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: 'session_token=fake_session_12345' }
    });
    assert.strictEqual(resFakeSession.status, 401);

    // 4. Criar sessão válida para usuário comum
    const normalSessionId = 'test_session_normal_user';
    const normalUserId = '112233445566778899';
    const futureExpiry = new Date(Date.now() + 3600000).toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO oauth_sessions (session_id, user_id, username, expires_at, is_revoked)
      VALUES (?, ?, 'normalUser', ?, 0)
    `).run(normalSessionId, normalUserId, futureExpiry);

    const resValidNormal = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `session_token=${normalSessionId}` }
    });
    assert.strictEqual(resValidNormal.status, 200);
    const userJson = await resValidNormal.json();
    assert.strictEqual(userJson.user.id, normalUserId);
    assert.strictEqual(userJson.user.isGlobalOwner, false);

    // 5. Usuário comum tentando acessar rotas administrativas restritas -> 403 Forbidden
    const resAdminForbidden = await fetch(`${baseUrl}/api/admin/authorized-guilds`, {
      headers: { Cookie: `session_token=${normalSessionId}` }
    });
    assert.strictEqual(resAdminForbidden.status, 403);

    // 6. Sessão revogada -> deve ser rejeitada com 401
    db.prepare('UPDATE oauth_sessions SET is_revoked = 1 WHERE session_id = ?').run(normalSessionId);
    const resRevoked = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `session_token=${normalSessionId}` }
    });
    assert.strictEqual(resRevoked.status, 401);

    // 7. Sessão expirada -> deve ser rejeitada com 401
    const expiredSessionId = 'test_session_expired';
    const pastExpiry = new Date(Date.now() - 3600000).toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO oauth_sessions (session_id, user_id, username, expires_at, is_revoked)
      VALUES (?, ?, 'expiredUser', ?, 0)
    `).run(expiredSessionId, normalUserId, pastExpiry);

    const resExpired = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `session_token=${expiredSessionId}` }
    });
    assert.strictEqual(resExpired.status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
