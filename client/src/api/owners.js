import { apiClient } from './client.js';

export const ownersApi = {
  list: ({ page, pageSize, search, status } = {}) =>
    apiClient.get('/owners', { params: { page, pageSize, search, status } }),
  get: (id) => apiClient.get(`/owners/${id}`),
  create: (body) => apiClient.post('/owners', body),
  update: (id, body) => apiClient.patch(`/owners/${id}`, body),
  setStatus: (id, status) => apiClient.patch(`/owners/${id}/status`, { status }),
};
