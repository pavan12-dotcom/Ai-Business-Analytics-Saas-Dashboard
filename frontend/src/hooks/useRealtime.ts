import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { fetchKPIs, fetchRevenue, fetchCustomers, fetchNotifications } from '../services/api'

export type RealtimeStatus = 'connecting' | 'live' | 'offline' | 'demo'

interface LiveKPIs {
  revenue: { value: string; change: string; up: boolean }
  users:   { value: string; change: string; up: boolean }
  churn:   { value: string; change: string; up: boolean }
  arpu:    { value: string; change: string; up: boolean }
}

interface LiveNotification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  timestamp: string
}

interface LiveCustomer {
  id: string
  name: string
  email: string
  plan: string
  mrr: number
  status: string
}

interface LiveMonthly {
  month: string
  revenue: number
  mrr: number
}

interface UseRealtimeReturn {
  status: RealtimeStatus
  kpis: LiveKPIs | null
  monthly: LiveMonthly[]
  customers: LiveCustomer[]
  notifications: LiveNotification[]
  unreadCount: number
  lastUpdated: Date | null
  refreshAll: () => void
  markNotificationRead: (id: string) => void
}

const DEMO_KPIS: LiveKPIs = {
  revenue: { value: '$84,320', change: '+12.4%', up: true },
  users:   { value: '2,841',   change: '+8.1%',  up: true },
  churn:   { value: '3.2%',    change: '-0.4%',  up: false },
  arpu:    { value: '$29.68',  change: '+4.2%',  up: true },
}

const DEMO_MONTHLY: LiveMonthly[] = [
  { month: 'Jan', revenue: 52000, mrr: 38000 },
  { month: 'Feb', revenue: 58000, mrr: 47000 },
  { month: 'Mar', revenue: 55000, mrr: 44000 },
  { month: 'Apr', revenue: 67000, mrr: 56000 },
  { month: 'May', revenue: 74000, mrr: 61000 },
  { month: 'Jun', revenue: 84320, mrr: 72000 },
]

const DEMO_CUSTOMERS: LiveCustomer[] = [
  { id: '1', name: 'Acme Corp',    email: 'billing@acme.com',      plan: 'Enterprise', mrr: 4200, status: 'Active'  },
  { id: '2', name: 'TechFlow',     email: 'pay@techflow.io',       plan: 'Team',       mrr: 1800, status: 'Active'  },
  { id: '3', name: 'Bright Labs',  email: 'admin@brightlabs.co',   plan: 'Pro',        mrr: 890,  status: 'Active'  },
  { id: '4', name: 'Nova Inc',     email: 'nova@novainc.com',      plan: 'Team',       mrr: 720,  status: 'Pending' },
  { id: '5', name: 'Apex Systems', email: 'hi@apex.systems',       plan: 'Pro',        mrr: 290,  status: 'Churned' },
]

// Check if Supabase is properly configured (not placeholder values)
function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL || ''
  return !!url && url !== 'https://placeholder.supabase.co' && url.includes('.supabase.co')
}

export function useRealtime(): UseRealtimeReturn {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const [kpis, setKpis] = useState<LiveKPIs | null>(null)
  const [monthly, setMonthly] = useState<LiveMonthly[]>([])
  const [customers, setCustomers] = useState<LiveCustomer[]>([])
  const [notifications, setNotifications] = useState<LiveNotification[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef = useRef<any>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const configured = isSupabaseConfigured()

  const refreshAll = useCallback(async () => {
    try {
      const [kpisData, revenueData, customersData, notifsData] = await Promise.allSettled([
        fetchKPIs(),
        fetchRevenue(),
        fetchCustomers(),
        fetchNotifications(),
      ])

      if (kpisData.status === 'fulfilled' && kpisData.value) setKpis(kpisData.value)
      if (revenueData.status === 'fulfilled' && revenueData.value) setMonthly(revenueData.value)
      if (customersData.status === 'fulfilled' && customersData.value) setCustomers(customersData.value)
      if (notifsData.status === 'fulfilled' && notifsData.value) setNotifications(notifsData.value)
      setLastUpdated(new Date())
    } catch (err) {
      console.warn('[Realtime] refreshAll failed, using demo data')
      setKpis(DEMO_KPIS)
      setMonthly(DEMO_MONTHLY)
      setCustomers(DEMO_CUSTOMERS)
    }
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  useEffect(() => {
    if (!configured) {
      setStatus('demo')
      setKpis(DEMO_KPIS)
      setMonthly(DEMO_MONTHLY)
      setCustomers(DEMO_CUSTOMERS)
      setLastUpdated(new Date())
      return
    }

    // Initial data load
    refreshAll()

    // Subscribe to Supabase Realtime channels
    try {
      const channel = supabase
        .channel('insightai-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (_payload) => {
          console.log('[Realtime] customers table changed, refreshing...')
          // Re-fetch KPIs and customers on any customer change
          Promise.all([fetchKPIs(), fetchCustomers()]).then(([k, c]) => {
            if (k) setKpis(k)
            if (c) setCustomers(c)
            setLastUpdated(new Date())
          }).catch(() => {})
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_metrics' }, (_payload) => {
          console.log('[Realtime] monthly_metrics changed, refreshing...')
          fetchRevenue().then(r => { if (r) setMonthly(r); setLastUpdated(new Date()) }).catch(() => {})
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'kpis' }, (_payload) => {
          console.log('[Realtime] kpis changed, refreshing...')
          fetchKPIs().then(k => { if (k) setKpis(k); setLastUpdated(new Date()) }).catch(() => {})
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
          console.log('[Realtime] new notification:', payload.new)
          const n = payload.new as any
          if (!n) return
          const newNotif: LiveNotification = {
            id: String(n.id),
            title: n.title,
            message: n.message,
            type: n.type,
            read: false,
            timestamp: 'Just now',
          }
          setNotifications(prev => [newNotif, ...prev])
          setLastUpdated(new Date())
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload) => {
          const n = payload.new as any
          if (!n) return
          setNotifications(prev => prev.map(notif =>
            notif.id === String(n.id) ? { ...notif, read: n.read } : notif
          ))
        })
        .subscribe((realtimeStatus) => {
          if (realtimeStatus === 'SUBSCRIBED') {
            console.log('[Realtime] ✅ Connected to Supabase Realtime')
            setStatus('live')
          } else if (realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT') {
            console.warn('[Realtime] ⚠️ Channel error, falling back to polling')
            setStatus('offline')
          } else if (realtimeStatus === 'CLOSED') {
            setStatus('offline')
          }
        })

      channelRef.current = channel
    } catch (err) {
      console.warn('[Realtime] Failed to create channel, using polling fallback')
      setStatus('offline')
    }

    // Polling fallback every 30s (works even when Realtime is live as a safety net)
    refreshTimerRef.current = setInterval(refreshAll, 30000)

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [configured, refreshAll])

  const unreadCount = notifications.filter(n => !n.read).length

  return {
    status,
    kpis,
    monthly,
    customers,
    notifications,
    unreadCount,
    lastUpdated,
    refreshAll,
    markNotificationRead,
  }
}
