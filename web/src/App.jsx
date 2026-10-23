import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardOverview from './pages/DashboardOverview';
import RolesPermissionsPage from './pages/RolesPermissionsPage';
import ProtectionPage from './pages/ProtectionPage';
import AdminGlobalPage from './pages/AdminGlobalPage';
import BackupsPage from './pages/BackupsPage';
import './styles/theme.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedGuildId, setSelectedGuildId] = useState('1553633196296511498');

  useEffect(() => {
    checkAuth();
    loadHealth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', color: '#94a3b8' }}>
        Carregando painel administrativo...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isGlobalOwner={user.isGlobalOwner}
      />

      <div className="content-area">
        <Navbar
          user={user}
          health={health}
          onLogout={handleLogout}
          selectedGuildId={selectedGuildId}
          onSelectGuild={setSelectedGuildId}
        />

        <main>
          {currentPage === 'dashboard' && (
            <DashboardOverview selectedGuildId={selectedGuildId} user={user} />
          )}

          {currentPage === 'roles' && (
            <RolesPermissionsPage selectedGuildId={selectedGuildId} />
          )}

          {currentPage === 'protection' && (
            <ProtectionPage selectedGuildId={selectedGuildId} />
          )}

          {currentPage === 'global-guilds' && user.isGlobalOwner && (
            <AdminGlobalPage />
          )}

          {currentPage === 'backups' && user.isGlobalOwner && (
            <BackupsPage />
          )}

          {['moderation', 'tickets', 'welcome', 'settings', 'system-events'].includes(currentPage) && (
            <div className="page-container">
              <div className="page-header">
                <h1 className="page-title">{currentPage.toUpperCase()}</h1>
                <p className="page-subtitle">Módulo operacional ativo e integrado à API backend.</p>
              </div>
              <div className="card">
                <p>O módulo de <strong>{currentPage}</strong> está ativo e respondendo diretamente pelos comandos do Discord e banco de dados SQLite.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
