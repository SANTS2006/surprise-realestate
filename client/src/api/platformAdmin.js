import { apiClient } from './client.js';

export const platformAdminApi = {
  login: (body) => apiClient.post('/platform-admin/auth/login', body),
  logout: () => apiClient.post('/platform-admin/auth/logout'),
  me: () => apiClient.get('/platform-admin/auth/me'),
  forgotPassword: (email) => apiClient.post('/platform-admin/auth/forgot-password', { email }),
  resetPassword: (body) => apiClient.post('/platform-admin/auth/reset-password', body),
  changePassword: (body) => apiClient.post('/platform-admin/auth/change-password', body),
  updateProfile: (body) => apiClient.patch('/platform-admin/auth/profile', body),

  overview: () => apiClient.get('/platform-admin/overview'),

  listOrganizations: () => apiClient.get('/platform-admin/organizations'),
  getOrganization: (id) => apiClient.get(`/platform-admin/organizations/${id}`),
  createOrganization: (formData) =>
    apiClient.post('/platform-admin/organizations', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateOrganization: (id, body) => apiClient.patch(`/platform-admin/organizations/${id}`, body),
  setOrganizationStatus: (id, status) => apiClient.patch(`/platform-admin/organizations/${id}/status`, { status }),
  sendOrganizationAdminReset: (id, userId) => apiClient.post(`/platform-admin/organizations/${id}/send-admin-reset`, { userId }),

  listAdmins: () => apiClient.get('/platform-admin/admins'),
  createAdmin: (body) => apiClient.post('/platform-admin/admins', body),
  deleteAdmin: (id) => apiClient.delete(`/platform-admin/admins/${id}`),
  auditLogs: (params) => apiClient.get('/platform-admin/audit-logs', { params }),
  replaceOrganizationLogo: (id, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return apiClient.post(`/platform-admin/organizations/${id}/logo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  setAdminActive: (id, isActive) => apiClient.patch(`/platform-admin/admins/${id}/status`, { isActive }),
};
