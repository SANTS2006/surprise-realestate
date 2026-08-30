import { apiClient } from './client.js';

export const organizationsApi = {
  getMe: () => apiClient.get('/organizations/me'),
  updateMe: (body) => apiClient.patch('/organizations/me', body),
};
