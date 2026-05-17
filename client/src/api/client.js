import axios from 'axios';
import { isDemoMode, mockRequest } from '../demo/mockApi';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Request interceptor — add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('safecheck_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('safecheck_token');
      localStorage.removeItem('safecheck_user');
      window.location.hash = '/';
    }
    return Promise.reject(error);
  }
);

// Wrapper that uses mock in demo mode
async function request(method, url, data, config) {
  if (isDemoMode) {
    return mockRequest(method, url, data);
  }
  return apiClient.request({ method, url, data, ...config });
}

export default apiClient;

export function isOnline() {
  return navigator.onLine;
}

export const toursApi = {
  getAll: () => request('GET', '/tours'),
  getOne: (id) => request('GET', `/tours/${id}`),
  create: (data) => request('POST', '/tours', data),
  update: (id, data) => request('PUT', `/tours/${id}`, data),
  delete: (id) => request('DELETE', `/tours/${id}`),
};

export const checklistApi = {
  getForTour: (tourId) => request('GET', `/tours/${tourId}/checklist`),
  init: (tourId, type) => request('POST', `/tours/${tourId}/checklist/init`, { checklist_type: type }),
  update: (id, data) => request('PUT', `/checklist/${id}`, data),
  delete: (id) => request('DELETE', `/checklist/${id}`),
};

export const photosApi = {
  upload: (checklistItemId, formData) =>
    isDemoMode
      ? mockRequest('POST', `/photos/${checklistItemId}`, formData)
      : apiClient.post(`/photos/${checklistItemId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
  delete: (id) => request('DELETE', `/photos/${id}`),
  getUrl: (id) => (isDemoMode ? null : `/api/photos/${id}`),
};

export const syncApi = {
  push: (data) => request('POST', '/sync', data),
  timestamp: () => request('GET', '/sync/timestamp'),
};

export const dashboardApi = {
  get: () => request('GET', '/dashboard'),
};

export const reportsApi = {
  tourPdf: (tourId) =>
    isDemoMode
      ? Promise.reject(new Error('PDF non disponible en mode démo. Installez le serveur pour générer les rapports.'))
      : apiClient.get(`/reports/tour/${tourId}`, { responseType: 'blob' }),
};

export const usersApi = {
  getAll: () => request('GET', '/users'),
  create: (data) => request('POST', '/users', data),
  update: (id, data) => request('PUT', `/users/${id}`, data),
  delete: (id) => request('DELETE', `/users/${id}`),
};

export { isDemoMode };
