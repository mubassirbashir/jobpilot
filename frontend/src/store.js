import { create } from 'zustand';
import { auth as authApi, dashboard as dashApi, agent as agentApi } from '../services/api.js';

export const useStore = create((set, get) => ({
  // ── Auth ─────────────────────────────────────────────────────────────
  user: null,
  token: localStorage.getItem('jp_token'),
  authLoading: true,

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token, user } = res.data;
    localStorage.setItem('jp_token', token);
    set({ token, user, authLoading: false });
    return user;
  },

  register: async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
    const { token, user } = res.data;
    localStorage.setItem('jp_token', token);
    set({ token, user, authLoading: false });
    return user;
  },

  logout: () => {
    localStorage.removeItem('jp_token');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  loadUser: async () => {
    try {
      const res = await authApi.me();
      set({ user: res.data.user, authLoading: false });
    } catch {
      set({ user: null, authLoading: false });
    }
  },

  // ── Dashboard ─────────────────────────────────────────────────────────
  overview: null,
  overviewLoading: false,

  loadOverview: async () => {
    set({ overviewLoading: true });
    try {
      const res = await dashApi.overview();
      set({ overview: res.data, overviewLoading: false });
    } catch {
      set({ overviewLoading: false });
    }
  },

  // ── Agent ─────────────────────────────────────────────────────────────
  agentRunning: false,
  agentLogs: [],

  startAgent: async () => {
    await agentApi.start();
    set({ agentRunning: true });
  },

  stopAgent: async () => {
    await agentApi.stop();
    set({ agentRunning: false });
  },

  addAgentLog: (log) => set(s => ({
    agentLogs: [log, ...s.agentLogs].slice(0, 50),
  })),

  // ── Notifications ────────────────────────────────────────────────────
  notifications: [],
  addNotification: (n) => {
    const id = Date.now();
    set(s => ({ notifications: [{ id, ...n }, ...s.notifications] }));
    setTimeout(() => set(s => ({ notifications: s.notifications.filter(x => x.id !== id) })), 5000);
  },
}));
