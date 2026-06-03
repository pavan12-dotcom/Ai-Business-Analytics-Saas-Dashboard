// Analytics.tsx
import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchCustomers, fetchKPIs, fetchRevenue } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, BarChart, Bar, Cell
} from 'recharts'
import './Analytics.css'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="tooltip-row">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function Analytics() {
  const { activeSheet, activeDocument, getSpreadsheetCustomers, getSpreadsheetMonthlyMetrics, getSpreadsheetKPIs } = useSpreadsheet()
  const [customers, setCustomers] = useState(SEED.customers)
  const [kpis, setKpis] = useState(SEED.kpis)
  const [monthly, setMonthly] = useState(SEED.monthly)

  useEffect(() => {
    if (activeSheet || (activeDocument && activeDocument.parsedRows?.length > 0)) {
      setCustomers(getSpreadsheetCustomers())
      const spreadsheetKPIs = getSpreadsheetKPIs()
      if (spreadsheetKPIs) setKpis(spreadsheetKPIs)
      setMonthly(getSpreadsheetMonthlyMetrics())
    } else {
      let active = true
      Promise.all([fetchCustomers(), fetchKPIs(), fetchRevenue()])
        .then(([custData, kpisData, revData]) => {
          if (!active) return
          if (custData) setCustomers(custData)
          if (kpisData) setKpis(kpisData)
          if (revData) setMonthly(revData)
        })
        .catch(err => console.error('Error fetching analytics metrics:', err))
      return () => { active = false }
    }
  }, [activeSheet, activeDocument])

  // Advanced SaaS Metrics Calculations
  const activeCount = customers.filter(c => c.status === 'Active').length
  const churnedCount = customers.filter(c => c.status === 'Churned').length
  const pendingCount = customers.filter(c => c.status === 'Pending').length
  const totalCount = customers.length

  const mrrVal = Number(String(kpis.revenue.value).replace(/[^\d\.-]/g, '').trim())
  const rawMRR = isNaN(mrrVal) ? 84320 : mrrVal

  // Churn Rate
  const churnPct = totalCount > 0 ? (churnedCount / totalCount) * 100 : 3.2
  // ARPU
  const arpuVal = activeCount > 0 ? rawMRR / activeCount : 29.68
  // LTV (Customer Lifetime Value) = ARPU / Churn Rate
  const ltvVal = churnPct > 0 ? (arpuVal / (churnPct / 100)) : arpuVal * 30
  // Mock Customer Acquisition Cost (CAC)
  const cacVal = 120 // constant mock
  // LTV to CAC Ratio
  const ltvToCac = cacVal > 0 ? (ltvVal / cacVal).toFixed(1) : '3.5'

  // User growth over months
  let runningCustomers = 0
  const monthlyUserGrowth = monthly.map((m, idx) => {
    // Distribute customers over months
    const factor = (idx + 1) / monthly.length
    const count = Math.round(activeCount * factor)
    return {
      month: m.month,
      'Active Users': count,
      'New Users': Math.round(count * 0.15)
    }
  })

  // Mock SaaS Funnel Data
  const funnelData = [
    { name: 'Website Visitors', value: 12000, color: 'var(--accent)' },
    { name: 'Signups', value: 3500, color: 'var(--teal)' },
    { name: 'Active Users', value: activeCount > 0 ? activeCount * 4 : 1400, color: 'var(--amber)' },
    { name: 'Paid Customers', value: activeCount > 0 ? activeCount : 350, color: 'var(--green)' }
  ]

  // Mock Cohort Retention Grid
  const cohorts = [
    { cohort: 'Jan 2026', size: 120, r1: 100, r2: 85, r3: 78, r4: 72, r5: 68, r6: 65 },
    { cohort: 'Feb 2026', size: 145, r1: 100, r2: 88, r3: 82, r4: 75, r5: 70, r6: null },
    { cohort: 'Mar 2026', size: 160, r1: 100, r2: 90, r3: 84, r4: 79, r5: null, r6: null },
    { cohort: 'Apr 2026', size: 195, r1: 100, r2: 92, r3: 86, r4: null, r5: null, r6: null },
    { cohort: 'May 2026', size: 210, r1: 100, r2: 94, r3: null, r4: null, r5: null, r6: null },
    { cohort: 'Jun 2026', size: activeCount > 0 ? activeCount : 250, r1: 100, r2: null, r3: null, r4: null, r5: null, r6: null }
  ]

  const getHeatmapColor = (val: number | null) => {
    if (val === null) return 'transparent'
    const opacity = val / 100
    return `rgba(99, 102, 241, ${opacity * 0.85})`
  }

  return (
    <div className="analytics-page fade-in">
      {/* SaaS Advanced KPIs */}
      <div className="analytics-kpis">
        <div className="analytics-kpi">
          <div className="analytics-kpi-label">Active Subscriptions</div>
          <div className="analytics-kpi-val">{activeCount > 0 ? activeCount : '2,841'}</div>
          <div className="analytics-kpi-sub">
            <span style={{ color: 'var(--green)' }}>● {activeCount} Active</span> · 
            <span style={{ color: 'var(--amber)', marginLeft: 6 }}>● {pendingCount} Pending</span>
          </div>
        </div>
        <div className="analytics-kpi">
          <div className="analytics-kpi-label">Est. Customer Lifetime Value (LTV)</div>
          <div className="analytics-kpi-val">${Math.round(ltvVal).toLocaleString()}</div>
          <div className="tag-up">▲ Based on ARPU / Churn</div>
        </div>
        <div className="analytics-kpi">
          <div className="analytics-kpi-label">Customer Acquisition Cost (CAC)</div>
          <div className="analytics-kpi-val">${cacVal}</div>
          <div className="analytics-kpi-sub">Fixed payback: 4.1 months</div>
        </div>
        <div className="analytics-kpi">
          <div className="analytics-kpi-label">LTV : CAC Ratio</div>
          <div className="analytics-kpi-val" style={{ color: Number(ltvToCac) >= 3 ? 'var(--green)' : 'var(--amber)' }}>
            {ltvToCac}x
          </div>
          <div className="tag-up">▲ Healthy SaaS ratio &gt; 3.0x</div>
        </div>
      </div>

      {/* Charts section */}
      <div className="analytics-grid">
        {/* User Growth Line Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">User Growth &amp; Engagement</div>
              <div className="card-sub">Active vs new accounts month-over-month</div>
            </div>
            <div className="chart-legend">
              <span className="legend-dot" style={{ background: 'var(--accent)' }} />Active Users
              <span className="legend-dot" style={{ background: 'var(--teal)', marginLeft: 12 }} />New Users
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyUserGrowth}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="newUserGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--teal)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Active Users" stroke="var(--accent)" strokeWidth={2} fill="url(#userGrad)" dot={{ fill: 'var(--accent)', r: 3 }} />
              <Area type="monotone" dataKey="New Users" stroke="var(--teal)" strokeWidth={1.5} fill="url(#newUserGrad)" dot={{ fill: 'var(--teal)', r: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Funnel */}
        <div className="card">
          <div className="card-title">Conversion Funnel</div>
          <div className="card-sub" style={{ marginBottom: 16 }}>From landing page visits to paid customer accounts</div>
          <div className="funnel-container">
            {funnelData.map((step, idx) => {
              const maxVal = funnelData[0].value
              const percentage = Math.round((step.value / maxVal) * 100)
              return (
                <div key={step.name} className="funnel-step">
                  <div className="funnel-label-wrap">
                    <span className="funnel-step-name">{step.name}</span>
                    <span className="funnel-step-val">{step.value.toLocaleString()} <span className="funnel-step-pct">({percentage}%)</span></span>
                  </div>
                  <div className="funnel-bar-bg">
                    <div 
                      className="funnel-bar-fg" 
                      style={{ 
                        width: `${percentage}%`, 
                        background: step.color,
                        opacity: 0.85 + (idx * 0.05) 
                      }} 
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cohort Retention Section */}
      <div className="card cohort-card" style={{ marginTop: 20 }}>
        <div className="card-title">Customer Retention Cohorts (H1 2026)</div>
        <div className="card-sub" style={{ marginBottom: 16 }}>Percentage of customers retained by signup cohort month</div>
        <div className="cohort-table-wrapper">
          <table className="cohort-table">
            <thead>
              <tr>
                <th>Cohort Month</th>
                <th>Users</th>
                <th>Month 1</th>
                <th>Month 2</th>
                <th>Month 3</th>
                <th>Month 4</th>
                <th>Month 5</th>
                <th>Month 6</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.cohort}>
                  <td style={{ fontWeight: 500 }}>{c.cohort}</td>
                  <td className="mono" style={{ color: 'var(--muted)', fontSize: 12 }}>{c.size} users</td>
                  {[c.r1, c.r2, c.r3, c.r4, c.r5, c.r6].map((rate, idx) => (
                    <td 
                      key={idx} 
                      style={{ 
                        background: getHeatmapColor(rate),
                        color: rate !== null ? '#ffffff' : 'var(--muted)',
                        fontWeight: rate !== null ? 500 : 400
                      }}
                      className="cohort-cell"
                    >
                      {rate !== null ? `${rate}%` : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
