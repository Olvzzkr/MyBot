import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';
import { Database, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

export default function BackupsPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await api.getBackups();
      setBackups(data.backups || []);
    } catch (err) {
      setMessage({ type: 'error', text: `Erro ao buscar histórico de backups: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-spinner">Carregando registros de backup...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Histórico de Backups e Resiliência</h1>
        <p className="page-subtitle">Backups atômicos com SQLite WAL, verificação SHA-256 e teste de integridade contínuo.</p>
      </div>

      <AlertBanner type={message?.type} message={message?.text} />

      <div className="card">
        <h2 className="card-title"><Database size={18} /> Cópias de Segurança Registradas</h2>
        {backups.length === 0 ? (
          <div className="empty-state">Nenhum backup registrado até o momento.</div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Arquivo</th>
                  <th>Tamanho</th>
                  <th>Checksum SHA-256</th>
                  <th>Data de Criação (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id}>
                    <td>
                      {b.status === 'SUCCESS' ? (
                        <span className="badge badge-success">Íntegro</span>
                      ) : (
                        <span className="badge badge-danger">Corrompido</span>
                      )}
                    </td>
                    <td><strong>{b.backup_file_name}</strong></td>
                    <td>{(b.file_size_bytes / 1024).toFixed(1)} KB</td>
                    <td><code style={{ fontSize: '0.75rem' }}>{b.checksum_sha256?.slice(0, 16)}...</code></td>
                    <td>{b.created_at}</td>
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
