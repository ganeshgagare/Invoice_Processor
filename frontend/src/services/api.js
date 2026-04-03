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

const normalizeBase = (url) => (url || '').trim().replace(/\/+$/, '');
const primaryBase = normalizeBase(API_BASE_URL);
const fallbackBase = primaryBase.endsWith('/api') ? primaryBase.slice(0, -4) : '';

console.log('[api] Using primary base URL:', primaryBase);
if (fallbackBase) {
  console.log('[api] Using fallback base URL:', fallbackBase);
}

const api = axios.create({
  baseURL: primaryBase,
  timeout: 20000,
});

const apiFallback = fallbackBase
  ? axios.create({
      baseURL: fallbackBase,
      timeout: 20000,
    })
  : null;

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

const attachInterceptors = (client) => {
  client.interceptors.request.use(
    (config) => {
      const token = authStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
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
};

attachInterceptors(api);
if (apiFallback) {
  attachInterceptors(apiFallback);
}

const requestWithBaseFallback = async (config) => {
  try {
    return await api.request(config);
  } catch (error) {
    const shouldRetry = apiFallback && error?.response?.status === 404;
    if (!shouldRetry) {
      throw error;
    }

    console.warn('[api] Primary base returned 404, retrying with fallback base URL');
    return apiFallback.request(config);
  }
};

export const authAPI = {
  register: (email, password, fullName) =>
    requestWithBaseFallback({
      url: '/auth/register',
      method: 'post',
      data: { email, password, full_name: fullName },
    }),
  login: (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    return requestWithBaseFallback({
      url: '/auth/login',
      method: 'post',
      data: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  getMe: () =>
    requestWithBaseFallback({
      url: '/auth/me',
      method: 'get',
    }),
};

export const invoiceAPI = {
  uploadInvoice: (file, userPrompt) => {
    const formData = new FormData();
    formData.append('file', file);
    if (userPrompt) formData.append('user_prompt', userPrompt);
    return requestWithBaseFallback({
      url: '/invoices/upload',
      method: 'post',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  listInvoices: (skip = 0, limit = 10) =>
    requestWithBaseFallback({
      url: '/invoices/list',
      method: 'get',
      params: { skip, limit },
    }),
  getInvoice: (id) =>
    requestWithBaseFallback({
      url: `/invoices/${id}`,
      method: 'get',
    }),
  getInvoiceHTML: (id) =>
    requestWithBaseFallback({
      url: `/invoices/${id}/html`,
      method: 'get',
    }),
  deleteInvoice: (id) =>
    requestWithBaseFallback({
      url: `/invoices/${id}`,
      method: 'delete',
    }),
};

export default api;
