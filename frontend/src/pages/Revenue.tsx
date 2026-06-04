import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchRevenue, fetchCustomers, fetchKPIs } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area,
  BarChart, Bar, Cell
} from 'recharts'
import './Revenue.css'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="tooltip-row">
          <span style={{ color: p.color || 'var(--accent)' }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>
            {p.value >= 1000 ? `$${(p.value / 1000).toFixed(0)}k` : `$${p.value.toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function Revenue() {
  const { activeSheet, activeDocument, getSpreadsheetCustomers, getSpreadsheetMonthlyMetrics, getSpreadsheetKPIs } = useSpreadsheet()
  const [monthly, setMonthly] = useState(SEED.monthly)
  const [customers, setCustomers] = useState(SEED.customers)
  const [kpis, setKpis] = useState(SEED.kpis)
  const [revenueView, setRevenueView] = useState<'monthly' | 'quarterly' | 'annual'>('monthly')

  useEffect(() => {
    if (activeSheet || (activeDocument && activeDocument.parsedRows?.length > 0)) {
      setMonthly(getSpreadsheetMonthlyMetrics())
      setCustomers(getSpreadsheetCustomers())
      const spreadsheetKPIs = getSpreadsheetKPIs()
      if (spreadsheetKPIs) setKpis(spreadsheetKPIs)
    } else {
      let active = true
      Promise.all([fetchRevenue(), fetchCustomers(), fetchKPIs()])
        .then(([revData, custData, kpisData]) => {
          if (!active) return
          if (revData) setMonthly(revData)
          if (custData) setCustomers(custData)
          if (kpisData) setKpis(kpisData)
        })
        .catch(err => console.error('Error fetching revenue metrics:', err))
      return () => { active = false }
    }
  }, [activeSheet, activeDocument])

  // Plan Colors
  const planColors: Record<string, string> = {
    Pro: '#4F46E5',
    Team: '#10B981',
    Enterprise: '#F59E0B',
  }

  const activeCustomers = customers.filter(c => c.status === 'Active')
  const totalMRR = activeCustomers.reduce((acc, c) => acc + c.mrr, 0)
  const planMRR = activeCustomers.reduce((acc, c) => {
    acc[c.plan] = (acc[c.plan] || 0) + c.mrr
    return acc
  }, {} as Record<string, number>)

  const planDistribution = Object.entries(planMRR).map(([plan, mrr]) => ({
    plan,
    pct: totalMRR > 0 ? Math.round((mrr / totalMRR) * 100) : 0,
    color: planColors[plan] || 'var(--text-muted)',
  })).sort((a, b) => b.pct - a.pct)

  const latestMonth = monthly[monthly.length - 1]
  const prevMonth = monthly[monthly.length - 2]
  const latestMRR = latestMonth ? latestMonth.mrr : 72000
  const mrrChangePct = (latestMonth && prevMonth)
    ? (((latestMonth.mrr - prevMonth.mrr) / prevMonth.mrr) * 100).toFixed(0)
    : '18'

  // Dynamic Grouping
  const getGroupedRevenueData = () => {
    if (revenueView === 'quarterly') {
      const q1 = monthly.slice(0, 3).reduce((sum, m) => sum + m.revenue, 0)
      const q1MRR = monthly.slice(0, 3).reduce((sum, m) => sum + m.mrr, 0) / 3
      const q2 = monthly.slice(3, 6).reduce((sum, m) => sum + m.revenue, 0)
      const q2MRR = monthly.slice(3, 6).reduce((sum, m) => sum + m.mrr, 0) / 3

      return [
        { month: 'Q1 (Jan-Mar)', revenue: q1, mrr: Math.round(q1MRR) },
        { month: 'Q2 (Apr-Jun)', revenue: q2, mrr: Math.round(q2MRR) }
      ]
    }
    if (revenueView === 'annual') {
      const annualTotal = monthly.reduce((sum, m) => sum + m.revenue, 0)
      const annualMRR = monthly.reduce((sum, m) => sum + m.mrr, 0) / monthly.length
      return [
        { month: '2026 Projections', revenue: annualTotal, mrr: Math.round(annualMRR) }
      ]
    }
    return monthly
  }

  // Waterfall cashflow mockup data
  const waterfallData = [
    { name: 'Starting', spacer: 0, val: 80000, displayVal: 80000, color: '#4F46E5' },
    { name: 'New Subscriptions', spacer: 80000, val: 45000, displayVal: 45000, color: '#10B981' },
    { name: 'Add-on Sales', spacer: 125000, val: 12000, displayVal: 12000, color: '#10B981' },
    { name: 'Customer Churn', spacer: 132000, val: -5000, displayVal: 5000, color: '#EF4444' }, // churn sits on top of 132000 going down
    { name: 'OPEX Expenses', spacer: 109000, val: -18000, displayVal: 18000, color: '#EF4444' },
    { name: 'Net Profit', spacer: 0, val: 109000, displayVal: 109000, color: '#7C3AED' }
  ]

  // Adjust churn/expenses spacer dynamically to sit correctly in the stack
  const processedWaterfall = waterfallData.map((d) => {
    if (d.val < 0) {
      return {
        ...d,
        spacer: d.spacer + d.val // Shift spacer down by the negative amount so it hangs
      }
    }
    return d
  })

  // Concentric multi-level donut data (Subscriptions vs Add-ons)
  const sourcePlanDistribution = [
    { name: 'Enterprise Contract', value: Math.round(totalMRR * 0.5), color: '#4F46E5' },
    { name: 'Team Self-serve', value: Math.round(totalMRR * 0.3), color: '#7C3AED' },
    { name: 'API Usage Add-ons', value: Math.round(totalMRR * 0.15), color: '#10B981' },
    { name: 'Partner Referrals', value: Math.round(totalMRR * 0.05), color: '#F59E0B' }
  ]

  return (
    <div className="revenue-page fade-in">
      {/* Financial KPIs */}
      <div className="rev-kpis">
        <div className="card rev-kpi hover-lift">
          <div className="rev-kpi-label">Gross Revenue ({latestMonth?.month || 'Jun'})</div>
          <div className="rev-kpi-val">{kpis.revenue.value}</div>
          <div className="tag-up">{kpis.revenue.up ? '▲' : '▼'} {kpis.revenue.change} MoM</div>
        </div>
        <div className="card rev-kpi hover-lift">
          <div className="rev-kpi-label">Net Monthly Recurring Revenue</div>
          <div className="rev-kpi-val">${latestMRR.toLocaleString()}</div>
          <div className="tag-up">▲ {mrrChangePct}% Increase</div>
        </div>
        <div className="card rev-kpi hover-lift">
          <div className="rev-kpi-label">Annual Run Rate (ARR)</div>
          <div className="rev-kpi-val">${(latestMRR * 12).toLocaleString()}</div>
          <div className="tag-up">▲ Projections calculated</div>
        </div>
        <div className="card rev-kpi hover-lift">
          <div className="rev-kpi-label">Net Cash Flow Yield</div>
          <div className="rev-kpi-val" style={{ color: 'var(--success)' }}>$109,000</div>
          <div className="tag-up">▲ Post-operational profit</div>
        </div>
      </div>

      {/* Revenue Projections and Date Zoom */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Executive Revenue Growth Projections</div>
            <div className="card-sub">Grouped metrics according to executive schedule</div>
          </div>
          <div className="btn-group" style={{ display: 'flex', gap: 4, background: 'var(--bg-hover)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
            <button className={`btn btn-xs ${revenueView === 'monthly' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRevenueView('monthly')}>Monthly</button>
            <button className={`btn btn-xs ${revenueView === 'quarterly' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRevenueView('quarterly')}>Quarterly</button>
            <button className={`btn btn-xs ${revenueView === 'annual' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRevenueView('annual')}>Annual</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={getGroupedRevenueData()}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" name="Gross Revenue" stroke="var(--accent)" strokeWidth={2.5} fill="url(#growthGrad)" dot />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cash Flow Waterfall and Multi-level concentric donut */}
      <div className="rev-bottom">
        {/* Cash Flow Waterfall */}
        <div className="card waterfall-card">
          <div className="card-title">Cash Flow waterfall analysis</div>
          <div className="card-sub">Starting vs ending cash positions for H1 2026</div>
          <ResponsiveContainer width="100%" height={220} style={{ marginTop: 16 }}>
            <BarChart data={processedWaterfall} stackOffset="sign">
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value, name, props) => [`$${props.payload.displayVal.toLocaleString()}`, props.payload.val >= 0 ? 'Increase/Net' : 'Decrease']} />
              <Bar dataKey="spacer" stackId="a" fill="transparent" />
              <Bar dataKey="displayVal" stackId="a" radius={4}>
                {processedWaterfall.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Concentric Revenue Sources */}
        <div className="card">
          <div className="card-title">Subscription vs Contract Revenue</div>
          <div className="card-sub">Breakdown of contract values and add-on sales</div>
          <div style={{ marginTop: 16 }}>
            {sourcePlanDistribution.map(d => (
              <div key={d.name} className="plan-row">
                <div className="plan-row-info">
                  <span className="plan-dot" style={{ background: d.color }} />
                  <span className="plan-row-name">{d.name}</span>
                  <span className="plan-row-pct">
                    {totalMRR > 0 ? Math.round((d.value / totalMRR) * 100) : 25}%
                  </span>
                </div>
                <div className="plan-bar-bg">
                  <div 
                    className="plan-bar-fg" 
                    style={{ 
                      width: `${totalMRR > 0 ? (d.value / totalMRR) * 100 : 25}%`, 
                      background: d.color 
                    }} 
                  />
                </div>
                <div className="plan-row-val">${d.value.toLocaleString()} / mo</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
