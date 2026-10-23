import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';
import { Server, Activity, Shield, Hash, Save, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function DashboardOverview({ selectedGuildId, user }) {
  const [guildData, setGuildData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prefixInput, setPrefixInput] = useState('?');
  const [modlogInput, setModlogInput] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedGuildId]);

  const loadData = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const g = await api.getGuild(selectedGuildId);
      setGuildData(g);
      setPrefixInput(g.settings?.prefix || '?');
      setModlogInput(g.settings?.modlog_channel_id || '');

      const logsRes = await api.getAuditLogs(selectedGuildId, 10, 0);
      setAuditLogs(logsRes.logs || []);
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Erro ao carregar dados: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: 'info', text: 'Salvando configurações...' });
    try {
      const res = await api.updateGuildSettings(selectedGuildId, {
        prefix: prefixInput,
        modlog_channel_id: modlogInput || null
      });
      setStatusMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' });
      setGuildData(prev => ({ ...prev, settings: res.settings }));
    } catch (err) {
      setStatusMessage({ type: 'error', text: `Falha ao salvar: ${err.message}` });
    }
  };

  if (loading) {
    return <div className="loading-spinner">Carregando métricas e dados operacionais...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Painel de Controle</h1>
        <p className="page-subtitle">Monitore a saúde do bot, gerencie configurações e acompanhe o log de auditoria em tempo real.</p>
      </div>

      <AlertBanner type={statusMessage?.type} message={statusMessage?.text} />

      {/* Grade de Estatísticas Animadas */}
      <div className="card-grid">
        <div className="card">
          <div className="card-title">
            <Server size={20} color="#5865f2" /> Estado de Autorização
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            {guildData?.isAuthorized ? (
              <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>
                <CheckCircle2 size={14} /> Servidor Autorizado
              </span>
            ) : (
              <span className="badge badge-danger">
                <AlertTriangle size={14} /> Não Autorizado
              </span>
            )}
            <p style={{ marginTop: '0.85rem', fontSize: '0.85rem', color: '#94a3b8' }}>
              Servidor ID: <code style={{ color: '#fff', background: 'rgba(255,255,255,0.06)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{selectedGuildId}</code>
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <Hash size={20} color="#f59e0b" /> Prefixo Atual
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            {guildData?.settings?.prefix || '?'}
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>Configurável exclusivamente por servidor</p>
        </div>

        <div className="card">
          <div className="card-title">
            <ShieldCheck size={20} color="#10b981" /> Auditoria & Retenção
          </div>
          <div style={{ fontSize: '2.25rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.02em' }}>
            90 Dias
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>Exclusão segura de registros detalhados</p>
        </div>
      </div>

      {/* Formulário de Configurações */}
      <div className="card" style={{ marginBottom: '2.25rem' }}>
        <h2 className="card-title">Ajustes Rápidos do Servidor</h2>
        <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1.25rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
              Prefixo de Comandos
            </label>
            <input
              type="text"
              value={prefixInput}
              onChange={(e) => setPrefixInput(e.target.value)}
              maxLength={5}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(16, 20, 29, 0.8)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
              ID do Canal de ModLog / Auditoria
            </label>
            <input
              type="text"
              value={modlogInput}
              onChange={(e) => setModlogInput(e.target.value)}
              placeholder="Ex: 123456789012345678"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(16, 20, 29, 0.8)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                color: '#fff',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: 46 }}>
            <Save size={18} /> Salvar Alterações
          </button>
        </form>
      </div>

      {/* Tabela de Atividades Recentes de Auditoria */}
      <div className="card">
        <h2 className="card-title">
          <Clock size={20} /> Histórico Recente de Auditoria
        </h2>
        {auditLogs.length === 0 ? (
          <div className="empty-state">Nenhum evento registrado recentemente neste servidor.</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ação</th>
                  <th>Autor ID</th>
                  <th>Alvo</th>
                  <th>Resultado</th>
                  <th>Data (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td><code style={{ background: 'rgba(88, 101, 242, 0.1)', color: '#a5b4fc', padding: '0.2rem 0.5rem', borderRadius: 4 }}>{log.action_type}</code></td>
                    <td><code>{log.actor_id}</code></td>
                    <td>{log.target_id ? <code>{log.target_id}</code> : '-'}</td>
                    <td>
                      <span className={`badge ${log.result === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                        {log.result}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8' }}>{log.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
