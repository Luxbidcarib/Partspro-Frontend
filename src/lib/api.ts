import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 60000,
});

// Attach token
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pp_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('pp_token');
      localStorage.removeItem('pp_agent');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth
export const auth = {
  login: (name: string, pin: string) => api.post('/api/auth/login', { name, pin }),
  me: () => api.get('/api/auth/me'),
  setup: (name: string, pin: string) => api.post('/api/auth/setup', { name, pin }),
  getAgents: () => api.get('/api/auth/agents'),
  createAgent: (data: any) => api.post('/api/auth/agents', data),
};

// ── Jobs
export const jobs = {
  list: (params?: any) => api.get('/api/jobs', { params }),
  get: (id: string) => api.get(`/api/jobs/${id}`),
  create: (data: any) => api.post('/api/jobs', data),
  update: (id: string, data: any) => api.patch(`/api/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/api/jobs/${id}`),
  uploadMedia: (id: string, files: File[], type: string) => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    form.append('type', type);
    return api.post(`/api/jobs/${id}/media`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  detectParts: (id: string) => api.post(`/api/jobs/${id}/detect-parts`),
  copyMedia: (id: string, from_type: string, to_type: string) => api.post(`/api/jobs/${id}/copy-media`, { from_type, to_type }),
};

// ── Parts
export const parts = {
  list: (jobId: string) => api.get('/api/parts', { params: { job_id: jobId } }),
  create: (data: any) => api.post('/api/parts', data),
  update: (id: string, data: any) => api.patch(`/api/parts/${id}`, data),
  bulkUpdate: (partIds: string[], updates: any) => api.patch('/api/parts/bulk', { part_ids: partIds, updates }),
  delete: (id: string) => api.delete(`/api/parts/${id}`),
  selectSupplier: (id: string, data: any) => api.post(`/api/parts/${id}/select-supplier`, data),
  aiLookup: (data: any) => api.post('/api/parts/ai-lookup', data),
};

// ── Sourcing
export const sourcing = {
  start: (jobId: string, partIds?: string[]) => api.post('/api/sourcing/start', { job_id: jobId, part_ids: partIds }),
  getResults: (jobId: string) => api.get(`/api/sourcing/results/${jobId}`),
  getStatus: (jobId: string) => api.get(`/api/sourcing/status/${jobId}`),
};

// ── Calls
export const calls = {
  getQueue: (jobId: string) => api.get(`/api/calls/queue/${jobId}`),
  addToQueue: (jobId: string, supplierResultId: string) => api.post('/api/calls/queue', { job_id: jobId, supplier_result_id: supplierResultId }),
  removeFromQueue: (id: string) => api.delete(`/api/calls/queue/${id}`),
  startQueue: (jobId: string) => api.post('/api/calls/start', { job_id: jobId }),
  getResults: (jobId: string) => api.get(`/api/calls/results/${jobId}`),
};

// ── Quotes
export const quotes = {
  generate: (jobId: string) => api.post('/api/quotes/generate', { job_id: jobId }),
  get: (id: string) => api.get(`/api/quotes/${id}`),
  getText: (id: string) => api.get(`/api/quotes/${id}/text`),
  updateStatus: (id: string, status: string) => api.patch(`/api/quotes/${id}/status`, { status }),
};

// ── Suppliers
export const suppliers = {
  list: () => api.get('/api/suppliers'),
  create: (data: any) => api.post('/api/suppliers', data),
  update: (id: string, data: any) => api.patch(`/api/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/api/suppliers/${id}`),
  test: (id: string) => api.post(`/api/suppliers/${id}/test`),
};

// ── Settings
export const settings = {
  get: () => api.get('/api/settings'),
  update: (data: any) => api.patch('/api/settings', data),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return api.post('/api/settings/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  createLocation: (data: any) => api.post('/api/settings/locations', data),
  updateLocation: (id: string, data: any) => api.patch(`/api/settings/locations/${id}`, data),
};

export default api;
