import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE,
})

// Attach Supabase JWT if available
api.interceptors.request.use(async (config) => {
  try {
    const { supabase } = await import('./supabase')
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch {
    // demo mode — no token
  }
  return config
})

export default api

// ── Data helpers ──────────────────────────────────────────────
export const fetchKPIs   = () => api.get('/api/data/kpis').then(r => r.data)
export const fetchRevenue = () => api.get('/api/data/revenue').then(r => r.data)
export const fetchCustomers = () => api.get('/api/data/customers').then(r => r.data)
export const askAI = (question: string, mode?: string) =>
  api.post('/api/ai/query', { question, mode }).then(r => r.data)
export const createCheckout = (plan: string) =>
  api.post('/api/billing/checkout', { plan }).then(r => r.data)
export const openBillingPortal = () =>
  api.post('/api/billing/portal').then(r => r.data)

// ── Spreadsheet upload / query helpers ─────────────────────────
export const uploadSpreadsheet = (payload: { filename: string; headers: string[]; columns_metadata: Record<string, string>; rows: any[] }) =>
  api.post('/api/data/spreadsheet', payload).then(r => r.data)
export const fetchSpreadsheet = () =>
  api.get('/api/data/spreadsheet').then(r => r.data)
export const deleteSpreadsheet = () =>
  api.delete('/api/data/spreadsheet').then(r => r.data)

// ── Document upload / query helpers ──────────────────────────────
export const uploadDocument = (payload: { filename: string; base64: string }) =>
  api.post('/api/data/document', payload).then(r => r.data)
export const fetchDocument = () =>
  api.get('/api/data/document').then(r => r.data)
export const deleteDocument = () =>
  api.delete('/api/data/document').then(r => r.data)
export const reparseDocument = () =>
  api.post('/api/data/document/parse').then(r => r.data)

export const fetchDBStatus = () =>
  api.get('/api/data/db-status').then(r => r.data)

// ── Audit Logs & Notifications helpers ─────────────────────────
export const fetchAuditLogs = () => api.get('/api/data/audit-logs').then(r => r.data)
export const createAuditLog = (action: string) => api.post('/api/data/audit-logs', { action }).then(r => r.data)
export const fetchNotifications = () => api.get('/api/data/notifications').then(r => r.data)
export const markNotificationRead = (id: string) => api.post(`/api/data/notifications/${id}/read`).then(r => r.data)
export const clearNotifications = () => api.delete('/api/data/notifications').then(r => r.data)

export const fetchSubscription = () =>
  api.get('/api/data/subscription').then(r => r.data)
export const simulateUpgrade = (plan: string) =>
  api.post('/api/billing/simulate-upgrade', { plan }).then(r => r.data)



