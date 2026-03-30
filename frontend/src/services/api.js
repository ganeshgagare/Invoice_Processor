import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
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
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
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
