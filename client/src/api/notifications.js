import { apiClient } from './client.js';

export const notificationsApi = {
  list: ({ page, pageSize, unreadOnly } = {}) =>
    apiClient.get('/notifications', { params: { page, pageSize, unreadOnly } }),
  markRead: (id) => apiClient.post(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/notifications/read-all'),
};
