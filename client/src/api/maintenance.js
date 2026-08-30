import { apiClient } from './client.js';

export const maintenanceApi = {
  list: ({ page, pageSize, status, priority, propertyId, tenantId } = {}) =>
    apiClient.get('/maintenance', { params: { page, pageSize, status, priority, propertyId, tenantId } }),
  get: (id) => apiClient.get(`/maintenance/${id}`),
  create: (body) => apiClient.post('/maintenance', body),
  review: (id) => apiClient.post(`/maintenance/${id}/review`),
  assign: (id, assignedTo) => apiClient.post(`/maintenance/${id}/assign`, { assignedTo }),
  cancel: (id) => apiClient.post(`/maintenance/${id}/cancel`),
  listWorkOrders: (maintenanceRequestId) => apiClient.get(`/maintenance/${maintenanceRequestId}/work-orders`),
  createWorkOrder: (maintenanceRequestId, body) => apiClient.post(`/maintenance/${maintenanceRequestId}/work-orders`, body),
};
