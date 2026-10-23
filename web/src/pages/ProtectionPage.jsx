import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AlertBanner from '../components/AlertBanner';
import { Shield, ShieldAlert, Lock, CheckCircle2, Save, RefreshCw, Zap } from 'lucide-react';

const RULE_DESCRIPTIONS = {
  anti_spam: {
    title: 'Anti-Spam (Frequência Rápida)',
    desc: 'Detecta membros enviando muitas mensagens em um curto intervalo de tempo.'
  },
  anti_mass_mention: {
    title: 'Anti-Mass Mention (Menções em Massa)',
    desc: 'Bloqueia mensagens que mencionam múltiplos usuários ou cargos simultaneamente.'
  },
  anti_repeat: {
    title: 'Anti-Repetição (Flood de Texto Igual)',
    desc: 'Impede o envio repetitivo da mesma mensagem em sequência.'
  }
};

export default function ProtectionPage({ selectedGuildId }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadRules();
  }, [selectedGuildId]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await api.getProtectionRules(selectedGuildId);
      setRules(data.rules || []);
    } catch (err) {
      setMessage({ type: 'error', text: `Erro ao buscar regras: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRule = async (ruleName, updatedFields) => {
    setMessage({ type: 'info', text: `Salvando regra ${ruleName}...` });
    try {
      const currentRule = rules.find(r => r.rule_name === ruleName) || {};
      const payload = {
        rule_name: ruleName,
        is_enabled: currentRule.is_enabled ?? 1,
        threshold_limit: currentRule.threshold_limit ?? 5,
        threshold_interval_seconds: currentRule.threshold_interval_seconds ?? 5,
        action_type: currentRule.action_type ?? 'TIMEOUT',
        action_duration_seconds: currentRule.action_duration_seconds ?? 300,
        ...updatedFields
      };

      await api.updateProtectionRule(selectedGuildId, payload);
      setMessage({ type: 'success', text: `Regra "${ruleName}" atualizada com sucesso!` });
      loadRules();
    } catch (err) {
      setMessage({ type: 'error', text: `Erro ao salvar: ${err.message}` });
    }
  };

  const handleInitDefaults = async () => {
    setMessage({ type: 'info', text: 'Aplicando regras recomendadas...' });
    const defaults = [
      { rule_name: 'anti_spam', is_enabled: 1, threshold_limit: 5, threshold_interval_seconds: 4, action_type: 'TIMEOUT', action_duration_seconds: 300 },
      { rule_name: 'anti_mass_mention', is_enabled: 1, threshold_limit: 4, threshold_interval_seconds: 1, action_type: 'TIMEOUT', action_duration_seconds: 600 },
      { rule_name: 'anti_repeat', is_enabled: 1, threshold_limit: 3, threshold_interval_seconds: 8, action_type: 'TIMEOUT', action_duration_seconds: 300 }
    ];

    try {
      for (const d of defaults) {
        await api.updateProtectionRule(selectedGuildId, d);
      }
      setMessage({ type: 'success', text: 'Regras de proteção ativadas com sucesso!' });
      loadRules();
    } catch (err) {
      setMessage({ type: 'error', text: `Erro: ${err.message}` });
    }
  };

  if (loading) return <div className="loading-spinner">Carregando módulo de segurança...</div>;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Proteção Automática do Servidor</h1>
          <p className="page-subtitle">Configure limites e ações automáticas de contenção contra spam, raids e comportamento abusivo.</p>
        </div>
        <button onClick={handleInitDefaults} className="btn btn-primary" style={{ gap: '0.5rem' }}>
          <Zap size={16} /> Ativar Padrão Recomendado
        </button>
      </div>

      <AlertBanner type={message?.type} message={message?.text} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {['anti_spam', 'anti_mass_mention', 'anti_repeat'].map(ruleKey => {
          const rule = rules.find(r => r.rule_name === ruleKey) || {
            rule_name: ruleKey,
            is_enabled: 1,
            threshold_limit: ruleKey === 'anti_mass_mention' ? 4 : (ruleKey === 'anti_repeat' ? 3 : 5),
            threshold_interval_seconds: ruleKey === 'anti_mass_mention' ? 1 : (ruleKey === 'anti_repeat' ? 8 : 4),
            action_type: 'TIMEOUT',
            action_duration_seconds: 300
          };

          const info = RULE_DESCRIPTIONS[ruleKey];

          return (
            <div key={ruleKey} className="card" style={{ borderLeft: rule.is_enabled ? '4px solid #10b981' : '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={20} color={rule.is_enabled ? '#10b981' : '#ef4444'} />
                    {info?.title || ruleKey}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    {info?.desc}
                  </p>
                </div>

                <button
                  onClick={() => handleUpdateRule(ruleKey, { is_enabled: rule.is_enabled ? 0 : 1 })}
                  className={`btn ${rule.is_enabled ? 'btn-danger' : 'btn-primary'}`}
                  style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                >
                  {rule.is_enabled ? 'Desativar Regra' : 'Ativar Regra'}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: 'rgba(16, 20, 29, 0.6)', padding: '1.25rem', borderRadius: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Limite de Disparo
                  </label>
                  <input
                    type="number"
                    defaultValue={rule.threshold_limit}
                    onBlur={(e) => handleUpdateRule(ruleKey, { threshold_limit: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '0.55rem', background: '#1c212d', border: '1px solid var(--border-color)', borderRadius: 6, color: '#fff' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ocorrências</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Intervalo de Tempo
                  </label>
                  <input
                    type="number"
                    defaultValue={rule.threshold_interval_seconds}
                    onBlur={(e) => handleUpdateRule(ruleKey, { threshold_interval_seconds: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '0.55rem', background: '#1c212d', border: '1px solid var(--border-color)', borderRadius: 6, color: '#fff' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>segundos</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Castigo / Ação
                  </label>
                  <select
                    defaultValue={rule.action_type}
                    onChange={(e) => handleUpdateRule(ruleKey, { action_type: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', background: '#1c212d', border: '1px solid var(--border-color)', borderRadius: 6, color: '#fff' }}
                  >
                    <option value="TIMEOUT">Silenciamento (Timeout)</option>
                    <option value="QUARANTINE">Isolar em Quarentena</option>
                    <option value="WARN">Apenas Advertência</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Duração do Castigo
                  </label>
                  <input
                    type="number"
                    defaultValue={rule.action_duration_seconds}
                    onBlur={(e) => handleUpdateRule(ruleKey, { action_duration_seconds: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', padding: '0.55rem', background: '#1c212d', border: '1px solid var(--border-color)', borderRadius: 6, color: '#fff' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>segundos ({Math.floor(rule.action_duration_seconds / 60)} min)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
