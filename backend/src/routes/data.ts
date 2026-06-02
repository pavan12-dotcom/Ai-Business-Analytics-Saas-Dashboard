import { Router } from 'express'
import { requireAuth, getSupabase } from '../middleware/auth'

const router = Router()

// Seed data for demo / fallback
const SEED = {
  kpis: {
    revenue: { value: '$84,320', change: '+12.4%', up: true },
    users:   { value: '2,841',   change: '+8.1%',  up: true },
    churn:   { value: '3.2%',    change: '-0.4%',  up: false },
    arpu:    { value: '$29.68',  change: '+4.2%',  up: true },
  },
  monthly: [
    { month: 'Jan', revenue: 52000, mrr: 38000 },
    { month: 'Feb', revenue: 58000, mrr: 47000 },
    { month: 'Mar', revenue: 55000, mrr: 44000 },
    { month: 'Apr', revenue: 67000, mrr: 56000 },
    { month: 'May', revenue: 74000, mrr: 61000 },
    { month: 'Jun', revenue: 84320, mrr: 72000 },
  ],
  customers: [
    { id: '1', name: 'Acme Corp',     plan: 'Enterprise', mrr: 4200, status: 'Active',  email: 'billing@acme.com' },
    { id: '2', name: 'TechFlow',      plan: 'Team',       mrr: 1800, status: 'Active',  email: 'pay@techflow.io' },
    { id: '3', name: 'Bright Labs',   plan: 'Pro',        mrr:  890, status: 'Active',  email: 'admin@brightlabs.co' },
    { id: '4', name: 'Nova Inc',      plan: 'Team',       mrr:  720, status: 'Pending', email: 'nova@novainc.com' },
    { id: '5', name: 'Apex Systems',  plan: 'Pro',        mrr:  290, status: 'Churned', email: 'hi@apex.systems' },
    { id: '6', name: 'SkyBridge',     plan: 'Pro',        mrr:  540, status: 'Active',  email: 'pay@skybridge.io' },
    { id: '7', name: 'Dataform Inc',  plan: 'Enterprise', mrr: 3200, status: 'Active',  email: 'billing@dataform.io' },
    { id: '8', name: 'Cresent AI',    plan: 'Team',       mrr:  980, status: 'Active',  email: 'cresent@cresent.ai' },
  ],
}

router.get('/kpis', requireAuth, async (_req, res) => {
  const supabase = getSupabase()
  if (!supabase) {
    return res.json(SEED.kpis)
  }

  try {
    const { data, error } = await supabase
      .from('kpis')
      .select('label, value, change, up')
    
    if (error || !data || data.length === 0) {
      return res.json(SEED.kpis)
    }

    const formatted: any = {}
    data.forEach((row: any) => {
      if (row.label === 'Total Revenue') formatted.revenue = { value: row.value, change: row.change, up: row.up }
      else if (row.label === 'Active Users') formatted.users = { value: row.value, change: row.change, up: row.up }
      else if (row.label === 'Churn Rate') formatted.churn = { value: row.value, change: row.change, up: row.up }
      else if (row.label === 'Avg. Rev / User') formatted.arpu = { value: row.value, change: row.change, up: row.up }
    })

    // If any keys are missing from the formatted DB payload, fill in from SEED
    const finalKPIs = { ...SEED.kpis, ...formatted }
    res.json(finalKPIs)
  } catch (err) {
    res.json(SEED.kpis)
  }
})

router.get('/revenue', requireAuth, async (_req, res) => {
  const supabase = getSupabase()
  if (!supabase) {
    return res.json(SEED.monthly)
  }

  try {
    const { data, error } = await supabase
      .from('monthly_metrics')
      .select('month, revenue, mrr')
      .order('sort_order', { ascending: true })

    if (error || !data || data.length === 0) {
      return res.json(SEED.monthly)
    }
    
    res.json(data.map((row: any) => ({
      month: row.month,
      revenue: Number(row.revenue),
      mrr: Number(row.mrr)
    })))
  } catch (err) {
    res.json(SEED.monthly)
  }
})

router.get('/customers', requireAuth, async (_req, res) => {
  const supabase = getSupabase()
  if (!supabase) {
    return res.json(SEED.customers)
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, plan, mrr, status')
      .order('mrr', { ascending: false })

    if (error || !data || data.length === 0) {
      return res.json(SEED.customers)
    }
    
    res.json(data.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email || `${row.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      plan: row.plan,
      mrr: Number(row.mrr),
      status: row.status
    })))
  } catch (err) {
    res.json(SEED.customers)
  }
})

export default router
