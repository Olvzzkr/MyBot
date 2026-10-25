import React from 'react';
import { LogOut, ShieldCheck, Activity } from 'lucide-react';

export default function Navbar({ user, health, onLogout, selectedGuildId, onSelectGuild }) {
  return (
    <header className="navbar">
      <div className="nav-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} color={health?.status === 'healthy' ? '#10b981' : '#f59e0b'} />
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            API: <strong style={{ color: '#fff' }}>{health?.status || 'Online'}</strong>
          </span>
        </div>

        {/* Seletor de Servidor Ativo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.35rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Servidor Ativo:</span>
          <select
            value={selectedGuildId}
            onChange={(e) => onSelectGuild && onSelectGuild(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="1553633196296511498" style={{ background: '#1c212d', color: '#fff' }}>
              Resenha (1553633196296511498)
            </option>
            <option value="1562230954594934887" style={{ background: '#1c212d', color: '#fff' }}>
              BlackShop (1562230954594934887)
            </option>
            <option value="1563369608205963325" style={{ background: '#1c212d', color: '#fff' }}>
              ORG GHOST (1563369608205963325)
            </option>
          </select>
        </div>
      </div>

      <div className="nav-right">
        {user?.isGlobalOwner && (
          <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <ShieldCheck size={14} /> Proprietário Global
          </span>
        )}

        <div className="user-profile">
          {user?.avatar ? (
            <img
              src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`}
              alt="Avatar"
              className="avatar"
            />
          ) : (
            <div className="avatar" style={{ background: '#5865f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <span className="user-tag">{user?.username}</span>
        </div>

        <button onClick={onLogout} className="btn btn-secondary" title="Encerrar sessão" style={{ padding: '0.5rem 0.85rem' }}>
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
}
