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
const uniqueBases = (values) => {
  const seen = new Set();
  const list = [];
  for (const value of values) {
    const normalized = normalizeBase(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    list.push(normalized);
  }
  return list;
};

const baseCandidates = uniqueBases([
  API_BASE_URL,
  envApiUrl,
  deriveRenderApiUrl(),
  'https://invoice-processor-api.onrender.com/api',
  normalizeBase(API_BASE_URL).endsWith('/api') ? normalizeBase(API_BASE_URL).slice(0, -4) : '',
  'https://invoice-processor-api.onrender.com',
  'http://localhost:8000/api',
  'http://localhost:8000',
]);

console.log('[api] Base URL candidates:', baseCandidates);

const apiClients = baseCandidates.map((baseURL) =>
  axios.create({
    baseURL,
    // Keep each attempt short so fallback can happen quickly.
    timeout: 10000,
  })
);

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

for (const client of apiClients) {
  attachInterceptors(client);
}

const requestWithBaseFallback = async (config) => {
  let lastError = null;

  for (let i = 0; i < apiClients.length; i += 1) {
    const client = apiClients[i];
    const base = baseCandidates[i];

    try {
      return await client.request(config);
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const isNetworkOrTimeout = !error?.response;
      const isLikelyRouteMismatch = status === 404 || status === 405;
      const shouldTryNext = i < apiClients.length - 1 && (isNetworkOrTimeout || isLikelyRouteMismatch);

      if (!shouldTryNext) {
        throw error;
      }

      console.warn(`[api] Request failed on ${base}, trying next base URL`, {
        message: error?.message,
        status,
      });
    }
  }

  throw lastError;
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

export default apiClients[0];
