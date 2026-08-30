import { apiClient } from './client.js';

export const usersApi = {
  list: ({ page, pageSize, search, status } = {}) =>
    apiClient.get('/users', { params: { page, pageSize, search, status } }),
  get: (id) => apiClient.get(`/users/${id}`),
  invite: (body) => apiClient.post('/users/invite', body),
  updateStatus: (id, status) => apiClient.patch(`/users/${id}/status`, { status }),
  updateRole: (id, role) => apiClient.patch(`/users/${id}/role`, { role }),
};
