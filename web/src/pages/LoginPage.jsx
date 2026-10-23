import React from 'react';
import { Shield, Lock, Terminal, Activity, Sparkles, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const handleDiscordLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Círculos de iluminação no fundo */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(88, 101, 242, 0.18) 0%, transparent 70%)',
        top: '15%',
        left: '20%',
        pointerEvents: 'none',
        filter: 'blur(40px)'
      }} />

      <div style={{
        position: 'absolute',
        width: 450,
        height: 450,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
        bottom: '15%',
        right: '20%',
        pointerEvents: 'none',
        filter: 'blur(40px)'
      }} />

      <div className="animate-entrance" style={{
        maxWidth: 520,
        width: '100%',
        background: 'rgba(22, 27, 38, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        padding: '3rem 2.5rem',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(88, 101, 242, 0.15)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          width: 76,
          height: 76,
          background: 'linear-gradient(135deg, #5865f2 0%, #3b45b0 100%)',
          borderRadius: 20,
          margin: '0 auto 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 38,
          boxShadow: '0 8px 24px rgba(88, 101, 242, 0.45)',
          animation: 'floatAnim 4s ease-in-out infinite'
        }}>
          🤖
        </div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          background: 'rgba(88, 101, 242, 0.15)',
          border: '1px solid rgba(88, 101, 242, 0.3)',
          padding: '0.35rem 0.85rem',
          borderRadius: 9999,
          color: '#a5b4fc',
          fontSize: '0.8rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '1rem'
        }}>
          <Sparkles size={14} /> Sistema de Gestão Avançado
        </div>

        <h1 style={{
          fontSize: '2.1rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          marginBottom: '0.75rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Nexora Dashboard
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2.25rem' }}>
          Gerenciamento inteligente para sua comunidade no Discord com moderação granular, automação de segurança e auditoria em tempo real.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.85rem',
          textAlign: 'left',
          marginBottom: '2.25rem'
        }}>
          <div style={{
            background: 'rgba(16, 20, 29, 0.7)',
            padding: '1rem',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.05)',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              <Shield size={16} /> Cargos & RBAC
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Permissões granulares & hierarquia</span>
          </div>

          <div style={{
            background: 'rgba(16, 20, 29, 0.7)',
            padding: '1rem',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              <Lock size={16} /> Proteção Ativa
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Anti-Spam & contenção reversível</span>
          </div>

          <div style={{
            background: 'rgba(16, 20, 29, 0.7)',
            padding: '1rem',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              <Activity size={16} /> Auditoria
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Retenção estrita de 90 dias</span>
          </div>

          <div style={{
            background: 'rgba(16, 20, 29, 0.7)',
            padding: '1rem',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#22d3ee', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              <Terminal size={16} /> Backups WAL
            </div>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Checksum SHA-256 verificado</span>
          </div>
        </div>

        <button
          onClick={handleDiscordLogin}
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1.05rem',
            fontWeight: 700,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}
        >
          <span>Conectar com Discord</span>
          <ChevronRight size={18} />
        </button>

        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
          Autenticação OAuth2 criptografada com sessões seguras validadas no backend.
        </p>
      </div>
    </div>
  );
}
