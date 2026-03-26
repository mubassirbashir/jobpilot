import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Attach JWT on every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('jp_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jp_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const auth = {
  register:      (data) => api.post('/auth/register', data),
  login:         (data) => api.post('/auth/login', data),
  me:            ()     => api.get('/auth/me'),
  linkedinDemo:  ()     => api.post('/auth/linkedin/demo'),
  linkedinOAuth: ()     => api.get('/auth/linkedin'),
};

// ── Dashboard ─────────────────────────────────────────────────────────────
export const dashboard = {
  overview: () => api.get('/dashboard/overview'),
  activity: (limit = 20) => api.get(`/dashboard/activity?limit=${limit}`),
};

// ── Jobs ──────────────────────────────────────────────────────────────────
export const jobs = {
  list:         (params = {}) => api.get('/jobs', { params }),
  get:          (id)          => api.get(`/jobs/${id}`),
  create:       (data)        => api.post('/jobs', data),
  update:       (id, data)    => api.patch(`/jobs/${id}`, data),
  remove:       (id)          => api.delete(`/jobs/${id}`),
  analyze:      (id)          => api.post(`/jobs/${id}/analyze`),
  coverLetter:  (id)          => api.post(`/jobs/${id}/cover-letter`),
  interviewPrep:(id)          => api.post(`/jobs/${id}/interview-prep`),
  pipeline:     ()            => api.get('/jobs/stats/pipeline'),
};

// ── Agent ─────────────────────────────────────────────────────────────────
export const agent = {
  start:  () => api.post('/agent/start'),
  stop:   () => api.post('/agent/stop'),
  status: () => api.get('/agent/status'),
  tasks:  () => api.get('/agent/tasks'),
};

// ── LinkedIn ──────────────────────────────────────────────────────────────
export const linkedin = {
  profile:          ()           => api.get('/linkedin/profile'),
  sync:             ()           => api.post('/linkedin/sync'),
  optimize:         ()           => api.post('/linkedin/optimize'),
  applyOptimization:(data)       => api.post('/linkedin/apply-optimization', data),
  health:           ()           => api.get('/linkedin/health'),
};

// ── Documents ────────────────────────────────────────────────────────────
export const documents = {
  cvList:        ()              => api.get('/documents/cvs'),
  cvGet:         (id)            => api.get(`/documents/cvs/${id}`),
  cvCreate:      (data)          => api.post('/documents/cvs', data),
  cvUpdate:      (id, data)      => api.put(`/documents/cvs/${id}`, data),
  cvTailor:      (id, jobId)     => api.post(`/documents/cvs/${id}/tailor`, { jobId }),
  cvScore:       (id, jobId)     => api.post(`/documents/cvs/${id}/score`, { jobId }),
  coverLetters:  ()              => api.get('/documents/cover-letters'),
};

// ── Settings ─────────────────────────────────────────────────────────────
export const settings = {
  get:               ()     => api.get('/settings'),
  update:            (data) => api.put('/settings', data),
  updatePreferences: (data) => api.patch('/settings/preferences', data),
};

export default api;
