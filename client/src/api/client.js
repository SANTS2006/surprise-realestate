import axios from 'axios';
import { API_URL } from '../config/env.js';

// `withCredentials: true` sends the HttpOnly session cookie on every request
// — this is a cookie-session app, not a bearer-token app, for the browser
// client (see docs/security/authentication.md). No token is ever stored in
// localStorage/sessionStorage here.
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15_000,
});

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Echo the double-submit CSRF cookie back as a header on state-changing
// requests, matching the server's csrfProtection middleware.
apiClient.interceptors.request.use((config) => {
  if (!['get', 'head', 'options'].includes(config.method)) {
    const csrfToken = readCookie('csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const normalized = {
      code: error.response?.data?.error?.code ?? 'NETWORK_ERROR',
      message: error.response?.data?.error?.message ?? 'Unable to reach the server. Please check your connection.',
      statusCode: error.response?.status ?? 0,
      details: error.response?.data?.error?.details,
    };
    return Promise.reject(normalized);
  }
);
