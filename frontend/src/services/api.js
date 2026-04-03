import axios from 'axios';

const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();

const deriveRenderApiUrl = () => {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  if (!host.endsWith('.onrender.com')) return '';
  // Common pattern: <project>-web.onrender.com -> <project>-api.onrender.com
  const apiHost = host.replace(/-web(?=\.onrender\.com$)/, '-api');
  return `https://${apiHost}/api`;
};

const API_BASE_URL = envApiUrl || deriveRenderApiUrl() || 'http://localhost:8000/api';

console.log('[api] Using base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

const createSafeStorage = () => {
  const memoryStore = new Map();

  const getBrowserStorage = () => {
    if (typeof window === 'undefined') return null;
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  };

  return {
    getItem: (key) => {
      const storage = getBrowserStorage();
      if (storage) return storage.getItem(key);
      return memoryStore.has(key) ? memoryStore.get(key) : null;
    },
    setItem: (key, value) => {
      const storage = getBrowserStorage();
      if (storage) {
        storage.setItem(key, value);
        return;
      }
      memoryStore.set(key, value);
    },
    removeItem: (key) => {
      const storage = getBrowserStorage();
      if (storage) {
        storage.removeItem(key);
        return;
      }
      memoryStore.delete(key);
    },
  };
};

const authStorage = createSafeStorage();

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = authStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authStorage.removeItem('access_token');
      authStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email, password, fullName) =>
    api.post('/auth/register', { email, password, full_name: fullName }),
  login: (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/auth/login', formData, { 
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
    });
  },
  getMe: () => api.get('/auth/me'),
};

export const invoiceAPI = {
  uploadInvoice: (file, userPrompt) => {
    const formData = new FormData();
    formData.append('file', file);
    if (userPrompt) formData.append('user_prompt', userPrompt);
    return api.post('/invoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  listInvoices: (skip = 0, limit = 10) =>
    api.get('/invoices/list', { params: { skip, limit } }),
  getInvoice: (id) => api.get(`/invoices/${id}`),
  getInvoiceHTML: (id) => api.get(`/invoices/${id}/html`),
  deleteInvoice: (id) => api.delete(`/invoices/${id}`),
};

export default api;
