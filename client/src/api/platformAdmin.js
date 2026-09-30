import { apiClient } from './client.js';

export const platformAdminApi = {
  login: (body) => apiClient.post('/platform-admin/auth/login', body),
  logout: () => apiClient.post('/platform-admin/auth/logout'),
  me: () => apiClient.get('/platform-admin/auth/me'),
  listOrganizations: () => apiClient.get('/platform-admin/organizations'),
  createOrganization: (formData) =>
    apiClient.post('/platform-admin/organizations', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  setOrganizationStatus: (id, status) => apiClient.patch(`/platform-admin/organizations/${id}/status`, { status }),
};
