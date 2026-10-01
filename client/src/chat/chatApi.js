import { apiClient } from '../api/client.js';

// Thin wrappers over /chat — everything sent or received here is ciphertext
// or public/wrapped key material; plaintext never leaves the browser.
export const chatApi = {
  getKeys: () => apiClient.get('/chat/keys/me'),
  saveKeys: (body) => apiClient.put('/chat/keys/me', body),
  iceServers: () => apiClient.get('/chat/ice-servers'),
  directory: () => apiClient.get('/chat/directory'),

  rooms: () => apiClient.get('/chat/rooms'),
  room: (roomId) => apiClient.get(`/chat/rooms/${roomId}`),
  openDirect: (ref) => apiClient.post('/chat/rooms/direct', { ref }),
  distributeKeys: (roomId, keys) => apiClient.put(`/chat/rooms/${roomId}/keys`, { keys }),
  messages: (roomId, { before, limit } = {}) => apiClient.get(`/chat/rooms/${roomId}/messages`, { params: { before, limit } }),
  send: (roomId, body) => apiClient.post(`/chat/rooms/${roomId}/messages`, body),
  markRead: (roomId) => apiClient.post(`/chat/rooms/${roomId}/read`),

  uploadAttachment: (roomId, cipher) =>
    apiClient.post(`/chat/rooms/${roomId}/attachments`, cipher, { headers: { 'Content-Type': 'application/octet-stream' }, maxBodyLength: Infinity }),
  downloadAttachment: (attachmentId) => apiClient.get(`/chat/attachments/${attachmentId}`, { responseType: 'arraybuffer' }),
};
