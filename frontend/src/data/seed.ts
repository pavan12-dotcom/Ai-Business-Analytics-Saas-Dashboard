// Seed data used across the app in demo mode
export const SEED = {
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
  planDistribution: [
    { plan: 'Pro',        pct: 60, color: '#6366f1' },
    { plan: 'Team',       pct: 30, color: '#14b8a6' },
    { plan: 'Enterprise', pct: 10, color: '#f59e0b' },
  ],
  customers: [
    { id: 1, name: 'Acme Corp',     plan: 'Enterprise', mrr: 4200, status: 'Active',  email: 'billing@acme.com' },
    { id: 2, name: 'TechFlow',      plan: 'Team',       mrr: 1800, status: 'Active',  email: 'pay@techflow.io' },
    { id: 3, name: 'Bright Labs',   plan: 'Pro',        mrr:  890, status: 'Active',  email: 'admin@brightlabs.co' },
    { id: 4, name: 'Nova Inc',      plan: 'Team',       mrr:  720, status: 'Pending', email: 'nova@novainc.com' },
    { id: 5, name: 'Apex Systems',  plan: 'Pro',        mrr:  290, status: 'Churned', email: 'hi@apex.systems' },
    { id: 6, name: 'SkyBridge',     plan: 'Pro',        mrr:  540, status: 'Active',  email: 'pay@skybridge.io' },
    { id: 7, name: 'Dataform Inc',  plan: 'Enterprise', mrr: 3200, status: 'Active',  email: 'billing@dataform.io' },
    { id: 8, name: 'Cresent AI',    plan: 'Team',       mrr:  980, status: 'Active',  email: 'cresent@cresent.ai' },
  ],
  aiContext: `
You are an AI assistant embedded in InsightAI, a SaaS business analytics platform.
Answer based on this data only. Be concise (2-3 sentences max).

REVENUE: Total $84,320/mo (+12.4%); Jan $52k, Feb $58k, Mar $55k, Apr $67k, May $74k, Jun $84k
NEW MRR: Jan $38k, Feb $47k, Mar $44k, Apr $56k, May $61k, Jun $72k
USERS: 2,841 active (+8.1%), Churn 3.2% (↓ from 3.6%), ARPU $29.68
PLANS: Pro 60%, Team 30%, Enterprise 10%
TOP CUSTOMERS: Acme Corp Enterprise $4,200 Active | TechFlow Team $1,800 Active | Bright Labs Pro $890 Active | Nova Inc Team $720 Pending | Apex Systems Pro $290 Churned
  `.trim(),
}

export type Customer = typeof SEED.customers[0]
