import axios from 'axios';
import toast from 'react-hot-toast';

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
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Helper to check if we're online
export function isOnline() {
  return navigator.onLine;
}

// API methods with offline support
export const toursApi = {
  getAll: () => apiClient.get('/tours'),
  getOne: (id) => apiClient.get(`/tours/${id}`),
  create: (data) => apiClient.post('/tours', data),
  update: (id, data) => apiClient.put(`/tours/${id}`, data),
  delete: (id) => apiClient.delete(`/tours/${id}`),
};

export const checklistApi = {
  getForTour: (tourId) => apiClient.get(`/tours/${tourId}/checklist`),
  init: (tourId, type) => apiClient.post(`/tours/${tourId}/checklist/init`, { checklist_type: type }),
  update: (id, data) => apiClient.put(`/checklist/${id}`, data),
  delete: (id) => apiClient.delete(`/checklist/${id}`),
};

export const photosApi = {
  upload: (checklistItemId, formData) =>
    apiClient.post(`/photos/${checklistItemId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id) => apiClient.delete(`/photos/${id}`),
  getUrl: (id) => `/api/photos/${id}`,
};

export const syncApi = {
  push: (data) => apiClient.post('/sync', data),
  timestamp: () => apiClient.get('/sync/timestamp'),
};

export const dashboardApi = {
  get: () => apiClient.get('/dashboard'),
};

export const reportsApi = {
  tourPdf: (tourId) =>
    apiClient.get(`/reports/tour/${tourId}`, { responseType: 'blob' }),
};

export const usersApi = {
  getAll: () => apiClient.get('/users'),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
};
