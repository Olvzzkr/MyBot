/**
 * Controller de Autenticação OAuth2 do Discord
 */

const crypto = require('node:crypto');
const { getDatabase } = require('../../database/connection');

class AuthController {
  static login(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/auth/callback';
    const scopes = process.env.DISCORD_OAUTH_SCOPES || 'identify guilds';

    if (!clientId) {
      return res.status(500).json({ error: 'DISCORD_CLIENT_ID não configurado no servidor.' });
    }

    // Gerar state criptográfico para proteção CSRF
    const state = crypto.randomBytes(24).toString('hex');
    
    // Armazena o state em um cookie HttpOnly de curta duração (10 minutos)
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000
    });

    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}`;

    return res.redirect(discordAuthUrl);
  }

  static async callback(req, res) {
    const { code, state } = req.query;
    const savedState = req.cookies?.oauth_state;

    // 1. Validação estrita do State (Prevenção de CSRF)
    if (!state || !savedState || state !== savedState) {
      return res.status(403).json({ error: 'Falha na validação do parâmetro state (possível ataque CSRF).' });
    }
    res.clearCookie('oauth_state');

    if (!code) {
      return res.status(400).json({ error: 'Código de autorização OAuth2 não fornecido.' });
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/auth/callback';

    try {
      // 2. Troca do code por access_token com a API do Discord
      const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        return res.status(400).json({ error: 'Erro ao trocar código OAuth2 com o Discord.', details: errorData });
      }

      const tokenData = await tokenResponse.json();

      // 3. Buscar informações do usuário autenticado no Discord
      const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      if (!userResponse.ok) {
        return res.status(400).json({ error: 'Falha ao buscar perfil do usuário no Discord.' });
      }

      const userData = await userResponse.json();

      // 4. Criar sessão segura no SQLite
      const db = getDatabase();
      const sessionId = crypto.randomBytes(32).toString('hex');
      const expiresInSeconds = tokenData.expires_in || 604800; // 7 dias padrão
      const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();

      db.prepare(`
        INSERT INTO oauth_sessions (session_id, user_id, username, avatar, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        sessionId,
        userData.id,
        `${userData.username}`,
        userData.avatar || null,
        expiresAt
      );

      // 5. Definir cookie seguro de sessão
      res.cookie('session_token', sessionId, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: 'lax',
        maxAge: expiresInSeconds * 1000
      });

      const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/dashboard`);
    } catch (err) {
      console.error('[OAuth2 Callback] Erro:', err);
      return res.status(500).json({ error: 'Erro interno durante autenticação OAuth2.' });
    }
  }

  static me(req, res) {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    return res.json({ user: req.user });
  }

  static logout(req, res) {
    const sessionId = req.sessionId;
    if (sessionId) {
      const db = getDatabase();
      db.prepare('UPDATE oauth_sessions SET is_revoked = 1 WHERE session_id = ?').run(sessionId);
    }

    res.clearCookie('session_token');
    return res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  }
}

module.exports = AuthController;
