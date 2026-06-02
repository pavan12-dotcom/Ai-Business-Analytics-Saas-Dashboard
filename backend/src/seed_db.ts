import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

async function seedDatabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    console.error('❌ Supabase credentials not found in env.')
    return
  }

  const supabase = createClient(url, key)

  console.log('Seeding Supabase tables...')

  // 1. Seed KPIs
  console.log('Seeding kpis...')
  const { error: kpisError } = await supabase.from('kpis').upsert([
    { label: 'Total Revenue', value: '$84,320', change: '+12.4%', up: true },
    { label: 'Active Users', value: '2,841', change: '+8.1%', up: true },
    { label: 'Churn Rate', value: '3.2%', change: '-0.4%', up: false },
    { label: 'Avg. Rev / User', value: '$29.68', change: '+2.1%', up: true }
  ], { onConflict: 'label' })
  if (kpisError) console.error('Error seeding kpis:', kpisError.message)
  else console.log('✅ KPIs seeded successfully')

  // 2. Seed Monthly Metrics
  console.log('Seeding monthly_metrics...')
  const { error: metricsError } = await supabase.from('monthly_metrics').upsert([
    { month: 'Jan', revenue: 52000, mrr: 38000, sort_order: 1 },
    { month: 'Feb', revenue: 58000, mrr: 47000, sort_order: 2 },
    { month: 'Mar', revenue: 55000, mrr: 44000, sort_order: 3 },
    { month: 'Apr', revenue: 67000, mrr: 56000, sort_order: 4 },
    { month: 'May', revenue: 74000, mrr: 61000, sort_order: 5 },
    { month: 'Jun', revenue: 84320, mrr: 72000, sort_order: 6 }
  ], { onConflict: 'month' })
  if (metricsError) console.error('Error seeding monthly_metrics:', metricsError.message)
  else console.log('✅ Monthly Metrics seeded successfully')

  // 3. Seed Plan Distribution
  console.log('Seeding plan_distribution...')
  const { error: planError } = await supabase.from('plan_distribution').upsert([
    { plan: 'Pro', pct: 60, color: 'var(--accent)' },
    { plan: 'Team', pct: 30, color: 'var(--teal)' },
    { plan: 'Enterprise', pct: 10, color: 'var(--amber)' }
  ], { onConflict: 'plan' })
  if (planError) console.error('Error seeding plan_distribution:', planError.message)
  else console.log('✅ Plan Distribution seeded successfully')

  // 4. Seed Customers
  console.log('Seeding customers...')
  const { error: customersError } = await supabase.from('customers').upsert([
    { id: '1', name: 'Acme Corp', plan: 'Enterprise', mrr: 4200, status: 'Active' },
    { id: '2', name: 'TechFlow', plan: 'Team', mrr: 1800, status: 'Active' },
    { id: '3', name: 'Bright Labs', plan: 'Pro', mrr: 890, status: 'Active' },
    { id: '4', name: 'Nova Inc', plan: 'Team', mrr: 720, status: 'Pending' },
    { id: '5', name: 'Apex Systems', plan: 'Pro', mrr: 290, status: 'Churned' }
  ], { onConflict: 'id' })
  if (customersError) console.error('Error seeding customers:', customersError.message)
  else console.log('✅ Customers seeded successfully')
}

seedDatabase()
