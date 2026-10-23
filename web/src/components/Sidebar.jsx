import React from 'react';
import {
  LayoutDashboard,
  Shield,
  Hammer,
  Lock,
  Ticket,
  UserPlus,
  Settings,
  Server,
  Database,
  Terminal,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ currentPage, onNavigate, isGlobalOwner }) {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: <LayoutDashboard size={18} /> },
    { id: 'roles', label: 'Cargos & Permissões', icon: <Shield size={18} /> },
    { id: 'moderation', label: 'Moderação & Casos', icon: <Hammer size={18} /> },
    { id: 'protection', label: 'Proteção Automática', icon: <Lock size={18} /> },
    { id: 'tickets', label: 'Tickets & Atendimento', icon: <Ticket size={18} /> },
    { id: 'welcome', label: 'Boas-Vindas & Cargos', icon: <UserPlus size={18} /> },
    { id: 'settings', label: 'Configurações', icon: <Settings size={18} /> }
  ];

  const adminItems = [
    { id: 'global-guilds', label: 'Servidores Autorizados', icon: <Server size={18} /> },
    { id: 'backups', label: 'Backups & Recuperação', icon: <Database size={18} /> },
    { id: 'system-events', label: 'Eventos do Sistema', icon: <Terminal size={18} /> }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="bot-icon-badge">
          🤖
        </div>
        <div>
          <span className="sidebar-title">Nexora Bot</span>
          <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            Online
          </div>
        </div>
      </div>

      <ul className="nav-list">
        {menuItems.map(item => (
          <li key={item.id}>
            <button
              className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          </li>
        ))}

        {isGlobalOwner && (
          <>
            <li style={{ padding: '1.25rem 0.5rem 0.35rem', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Controle Supremo
            </li>
            {adminItems.map(item => (
              <li key={item.id}>
                <button
                  className={`nav-link ${currentPage === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </>
        )}
      </ul>
    </aside>
  );
}
