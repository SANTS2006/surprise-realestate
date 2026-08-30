import { apiClient } from './client.js';

export const documentsApi = {
  list: (entityType, entityId, { page, pageSize } = {}) =>
    apiClient.get('/documents', { params: { entityType, entityId, page, pageSize } }),
  upload: (entityType, entityId, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    formData.append('file', file);
    return apiClient.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/documents/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getAccessUrl: (id) => apiClient.get(`/documents/${id}/access-url`),
  remove: (id) => apiClient.delete(`/documents/${id}`),
};
