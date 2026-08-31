import { apiClient } from './client.js';

export const tenantMessagesApi = {
  list: ({ page, pageSize } = {}) => apiClient.get('/tenant-messages', { params: { page, pageSize } }),
  create: (content) => apiClient.post('/tenant-messages', { content }),
};
