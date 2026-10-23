import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';
import { Shield, Plus, Trash2, CheckSquare } from 'lucide-react';

const AVAILABLE_PERMISSIONS = [
  'roles.view',
  'roles.assign',
  'roles.manage',
  'moderation.warn',
  'moderation.timeout',
  'moderation.kick',
  'moderation.ban',
  'moderation.purge',
  'protection.view',
  'protection.manage',
  'protection.quarantine',
  'tickets.view',
  'tickets.assign',
  'tickets.close',
  'tickets.transcript',
  'audit.view',
  'settings.manage',
  'channels.manage',
  'welcome.manage'
];

export default function RolesPermissionsPage({ selectedGuildId }) {
  const [staffRoles, setStaffRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newPriority, setNewPriority] = useState('10');
  const [selectedPerms, setSelectedPerms] = useState(['roles.view', 'moderation.warn']);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadRoles();
  }, [selectedGuildId]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await api.getStaffRoles(selectedGuildId);
      setStaffRoles(data.staffRoles || []);
    } catch (err) {
      setMessage({ type: 'error', text: `Erro ao buscar cargos da equipe: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaffRole = async (e) => {
    e.preventDefault();
    try {
      await api.createStaffRole(selectedGuildId, {
        roleId: newRoleId,
        roleName: newRoleName,
        priority: parseInt(newPriority, 10) || 0,
        permissions: selectedPerms
      });
      setMessage({ type: 'success', text: `Cargo "${newRoleName}" cadastrado com sucesso!` });
      setNewRoleId('');
      setNewRoleName('');
      loadRoles();
    } catch (err) {
      setMessage({ type: 'error', text: `Falha ao cadastrar cargo: ${err.message}` });
    }
  };

  const handleDeleteStaffRole = async (roleId) => {
    if (!window.confirm('Tem certeza que deseja remover este cargo da equipe administrativa?')) return;
    try {
      await api.deleteStaffRole(selectedGuildId, roleId);
      setMessage({ type: 'success', text: 'Cargo de staff removido com sucesso.' });
      loadRoles();
    } catch (err) {
      setMessage({ type: 'error', text: `Erro: ${err.message}` });
    }
  };

  const togglePerm = (p) => {
    if (selectedPerms.includes(p)) {
      setSelectedPerms(selectedPerms.filter(x => x !== p));
    } else {
      setSelectedPerms([...selectedPerms, p]);
    }
  };

  if (loading) return <div className="loading-spinner">Carregando permissões e cargos...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Cargos da Equipe & Permissões Granulares</h1>
        <p className="page-subtitle">Configure a hierarquia interna de staff e defina permissões específicas para cada nível.</p>
      </div>

      <AlertBanner type={message?.type} message={message?.text} />

      {/* Formulário de Adicionar Cargo */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title"><Plus size={18} /> Adicionar Novo Cargo de Staff</h2>
        <form onSubmit={handleAddStaffRole}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>ID do Cargo Discord</label>
              <input
                type="text"
                placeholder="Ex: 123456789012345678"
                value={newRoleId}
                onChange={e => setNewRoleId(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem', background: '#161922', border: '1px solid #2b3245', borderRadius: 6, color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>Nome Interno (ex: Moderador Pleno)</label>
              <input
                type="text"
                placeholder="Nome do Cargo"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem', background: '#161922', border: '1px solid #2b3245', borderRadius: 6, color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', fontWeight: 600 }}>Prioridade</label>
              <input
                type="number"
                value={newPriority}
                onChange={e => setNewPriority(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', background: '#161922', border: '1px solid #2b3245', borderRadius: 6, color: '#fff' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Permissões Granulares Concedidas</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {AVAILABLE_PERMISSIONS.map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#161922', padding: '0.4rem 0.6rem', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedPerms.includes(p)}
                    onChange={() => togglePerm(p)}
                  />
                  <code>{p}</code>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            <Plus size={16} /> Cadastrar Cargo
          </button>
        </form>
      </div>

      {/* Lista de Cargos Configurados */}
      <div className="card">
        <h2 className="card-title"><Shield size={18} /> Cargos Configurados na Staff</h2>
        {staffRoles.length === 0 ? (
          <div className="empty-state">Nenhum cargo de staff configurado para este servidor.</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Prioridade</th>
                  <th>Nome do Cargo</th>
                  <th>ID Discord</th>
                  <th>Permissões Associadas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {staffRoles.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.priority}</strong></td>
                    <td style={{ fontWeight: 600 }}>{r.role_name}</td>
                    <td><code>{r.role_id}</code></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {r.permissions?.map(p => (
                          <span key={p} className="badge badge-primary">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteStaffRole(r.role_id)}
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
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
