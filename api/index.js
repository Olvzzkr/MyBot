/**
 * Ponto de entrada do Servidor API Backend
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { getDatabase } = require('../database/connection');
const { runMigrations } = require('../database/migrate');

// Inicializar e validar migrações do banco
const db = getDatabase();
runMigrations(db);

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middlewares de Segurança
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Rotas da API
const authRoutes = require('./routes/auth');
const guildsRoutes = require('./routes/guilds');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');

app.use('/api/auth', authRoutes);
app.use('/api/guilds', guildsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health', healthRoutes);

// Servir frontend web compilado em produção
const path = require('node:path');
const fs = require('node:fs');
const distPath = path.join(__dirname, '../web/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Tratamento central de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado.' });
});

// Tratamento central de erros
app.use((err, req, res, next) => {
  console.error('[API Erro]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Ocorreu um erro interno no servidor.'
      : err.message
  });
});

let server = null;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`[API] Servidor backend rodando na porta ${PORT}`);
    console.log(`[API] Healthcheck disponível em: http://localhost:${PORT}/api/health`);

    // Keep-alive anti-sleep para o Render Free
    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    if (renderUrl) {
      console.log(`[Keep-Alive] Ativando auto-ping 24/7 em: ${renderUrl}`);
      const https = require('node:https');
      setInterval(() => {
        https.get(`${renderUrl}/api/health`, () => {}).on('error', () => {});
      }, 10 * 60 * 1000);
    }
  });
}

module.exports = {
  app,
  server
};
