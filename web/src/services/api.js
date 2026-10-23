/**
 * Cliente HTTP da API com suporte a credenciais e tratamento de erros
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });

  if (response.status === 401) {
    throw new Error('SESSAO_EXPIRADA');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }

  return data;
}

export const api = {
  // Autenticação
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Status e Saúde
  getHealth: () => request('/health'),

  // Servidor (Guilda)
  getGuild: (guildId) => request(`/guilds/${guildId}`),
  updateGuildSettings: (guildId, payload) => request(`/guilds/${guildId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }),
  getAuditLogs: (guildId, limit = 50, offset = 0) => request(`/guilds/${guildId}/audit?limit=${limit}&offset=${offset}`),

  // Proteção Automática
  getProtectionRules: (guildId) => request(`/guilds/${guildId}/protection`),
  updateProtectionRule: (guildId, payload) => request(`/guilds/${guildId}/protection`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),

  // Cargos e Permissões
  getStaffRoles: (guildId) => request(`/guilds/${guildId}/roles`),
  createStaffRole: (guildId, payload) => request(`/guilds/${guildId}/staff-roles`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  updateRolePermissions: (guildId, staffRoleId, permissions) => request(`/guilds/${guildId}/staff-roles/${staffRoleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions })
  }),
  deleteStaffRole: (guildId, roleId) => request(`/guilds/${guildId}/staff-roles/${roleId}`, {
    method: 'DELETE'
  }),

  // Administração Global
  getAuthorizedGuilds: () => request('/admin/authorized-guilds'),
  authorizeGuild: (guildId, reason) => request('/admin/authorized-guilds', {
    method: 'POST',
    body: JSON.stringify({ guildId, reason })
  }),
  revokeGuild: (guildId, reason) => request(`/admin/authorized-guilds/${guildId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason })
  }),
  getSystemEvents: () => request('/admin/system-events'),
  getBackups: () => request('/admin/backups')
};
