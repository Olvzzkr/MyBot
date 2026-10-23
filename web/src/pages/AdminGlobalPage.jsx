import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';
import { Server, CheckCircle2, XCircle, Plus, ShieldAlert } from 'lucide-react';

export default function AdminGlobalPage() {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGuildId, setNewGuildId] = useState('');
  const [reason, setReason] = useState('Autorizado manualmente pelo painel');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadGuilds();
  }, []);

  const loadGuilds = async () => {
    setLoading(true);
    try {
      const data = await api.getAuthorizedGuilds();
      setGuilds(data.guilds || []);
    } catch (err) {
      setMessage({ type: 'error', text: `Erro ao buscar servidores: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorize = async (e) => {
    e.preventDefault();
    try {
      await api.authorizeGuild(newGuildId, reason);
      setMessage({ type: 'success', text: `Servidor ${newGuildId} autorizado com sucesso!` });
      setNewGuildId('');
      loadGuilds();
    } catch (err) {
      setMessage({ type: 'error', text: `Erro ao autorizar servidor: ${err.message}` });
    }
  };

  const handleRevoke = async (guildId) => {
    const revReason = prompt('Motivo da revogação de autorização:', 'Revogado pelo proprietário global');
    if (!revReason) return;

    try {
      await api.revokeGuild(guildId, revReason);
      setMessage({ type: 'success', text: `Autorização do servidor ${guildId} revogada.` });
      loadGuilds();
    } catch (err) {
      setMessage({ type: 'error', text: `Erro ao revogar: ${err.message}` });
    }
  };

  if (loading) return <div className="loading-spinner">Carregando lista global de servidores...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Gestão Global de Servidores Autorizados</h1>
        <p className="page-subtitle">Acesso restrito ao Proprietário Global. Servidores não autorizados têm o bot bloqueado.</p>
      </div>

      <AlertBanner type={message?.type} message={message?.text} />

      {/* Formulário de Autorização */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title"><Plus size={18} /> Autorizar Novo Servidor</h2>
        <form onSubmit={handleAuthorize} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>ID do Servidor Discord (Guild ID)</label>
            <input
              type="text"
              placeholder="Ex: 123456789012345678"
              value={newGuildId}
              onChange={e => setNewGuildId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.65rem', background: '#161922', border: '1px solid #2b3245', borderRadius: 6, color: '#fff' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>Justificativa / Motivo</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', background: '#161922', border: '1px solid #2b3245', borderRadius: 6, color: '#fff' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: 40 }}>
            <Plus size={16} /> Autorizar
          </button>
        </form>
      </div>

      {/* Tabela de Servidores */}
      <div className="card">
        <h2 className="card-title"><Server size={18} /> Servidores Registrados</h2>
        {guilds.length === 0 ? (
          <div className="empty-state">Nenhum servidor registrado na base de autorizações.</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>ID do Servidor</th>
                  <th>Autorizado Por</th>
                  <th>Data Autorização (UTC)</th>
                  <th>Motivo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {guilds.map(g => (
                  <tr key={g.guild_id}>
                    <td>
                      {g.is_authorized ? (
                        <span className="badge badge-success">Autorizado</span>
                      ) : (
                        <span className="badge badge-danger">Revogado</span>
                      )}
                    </td>
                    <td><code>{g.guild_id}</code></td>
                    <td><code>{g.authorized_by}</code></td>
                    <td>{g.authorized_at}</td>
                    <td>{g.reason || '-'}</td>
                    <td>
                      {g.is_authorized ? (
                        <button
                          onClick={() => handleRevoke(g.guild_id)}
                          className="btn btn-danger"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        >
                          Revogar
                        </button>
                      ) : (
                        <button
                          onClick={() => api.authorizeGuild(g.guild_id, 'Reautorizado').then(loadGuilds)}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        >
                          Reautorizar
                        </button>
                      )}
                    </td>
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
