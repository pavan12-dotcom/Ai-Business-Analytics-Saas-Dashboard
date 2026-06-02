import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
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
export const askAI = (question: string) =>
  api.post('/api/ai/query', { question }).then(r => r.data)
export const createCheckout = (plan: string) =>
  api.post('/api/billing/checkout', { plan }).then(r => r.data)
export const openBillingPortal = () =>
  api.post('/api/billing/portal').then(r => r.data)
