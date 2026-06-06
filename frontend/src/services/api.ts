import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE,
})

// Attach Supabase JWT if available, or guest demo token
api.interceptors.request.use(async (config) => {
  try {
    const guestId = localStorage.getItem('guest_session_id')
    if (guestId) {
      config.headers['X-Guest-ID'] = guestId
    }
    const isGuest = localStorage.getItem('demo_guest_user') === 'true'
    if (isGuest) {
      config.headers.Authorization = 'Bearer demo-guest-token'
      return config
    }
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

// ── Real-time AI streaming helper ──────────────────────────────
// Returns a ReadableStream of SSE chunks from /api/ai/stream
export const streamAI = async (
  question: string,
  mode: string,
  onChunk: (chunk: string) => void,
  onDone: (engine: string, demo: boolean) => void,
  onError: (msg: string) => void,
  signal?: AbortSignal
): Promise<void> => {
  const { supabase } = await import('./supabase')
  let token: string | null = null
  try {
    const isGuest = localStorage.getItem('demo_guest_user') === 'true'
    if (isGuest) {
      token = 'demo-guest-token'
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token ?? null
    }
  } catch {}

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const guestId = localStorage.getItem('guest_session_id')
  if (guestId) headers['X-Guest-ID'] = guestId
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const response = await fetch(`${API_BASE}/api/ai/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, mode }),
      signal,
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      onError(errData.error || `Server error ${response.status}`)
      return
    }

    if (!response.body) {
      onError('No response body')
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let engine = 'fallback'
    let demo = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const raw = decoder.decode(value, { stream: true })
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') { onDone(engine, demo); return }
        try {
          const parsed = JSON.parse(data)
          if (parsed.chunk !== undefined) onChunk(parsed.chunk)
          if (parsed.engine) engine = parsed.engine
          if (parsed.demo !== undefined) demo = parsed.demo
        } catch {}
      }
    }

    onDone(engine, demo)
  } catch (err: any) {
    if (err.name !== 'AbortError') onError(err.message || 'Stream failed')
  }
}
