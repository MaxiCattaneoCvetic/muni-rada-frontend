import axios from 'axios';
import { demoLoginPath } from '../lib/demo';

/** Base URL centralizada para toda la API (inyectada por Vite). */
function resolveBaseURL(): string {
  const raw = import.meta.env.VITE_API_URL;
  return String(raw).trim().replace(/\/$/, '');
}

const api = axios.create({
  baseURL: resolveBaseURL(),
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Let the browser set the multipart boundary for FormData uploads.
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = demoLoginPath();
    }
    return Promise.reject(error);
  },
);

export default api;
