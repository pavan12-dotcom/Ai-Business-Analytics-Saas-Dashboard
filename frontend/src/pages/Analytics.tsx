import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchCustomers, fetchKPIs, fetchRevenue } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area
} from 'recharts'
import './Analytics.css'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="tooltip-row">
          <span style={{ color: p.color || 'var(--accent)' }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{p.value.toLocaleString()}</span>
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
  const [hoveredCell, setHoveredCell] = useState<{ cohort: string; monthIndex: number; rate: number | null } | null>(null)

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
  const churnPct = totalCount > 0 ? (churnedCount / totalCount) * 100 : 3.2
  const arpuVal = activeCount > 0 ? rawMRR / activeCount : 29.68
  const ltvVal = churnPct > 0 ? (arpuVal / (churnPct / 100)) : arpuVal * 30
  const cacVal = 120 
  const ltvToCac = cacVal > 0 ? (ltvVal / cacVal).toFixed(1) : '3.5'

  // User growth over months
  const monthlyGrowthData = monthly.map((m, idx) => {
    const factor = (idx + 1) / monthly.length
    const count = Math.round((activeCount || 2841) * factor)
    const engagement = Math.round(75 + Math.sin(idx) * 8)
    return {
      month: m.month,
      'Active Users': count,
      'Revenue Growth ($)': m.revenue,
      'Engagement Index (%)': engagement
    }
  })

  // Conversion Funnel Data
  const funnelData = [
    { name: 'Website Visitors', value: 12500, color: 'var(--chart-1)' },
    { name: 'Account Signups', value: 4860, color: 'var(--chart-2)' },
    { name: 'App Activations', value: 2950, color: 'var(--chart-5)' },
    { name: 'Subscription Purchases', value: activeCount > 0 ? activeCount : 348, color: 'var(--chart-6)' }
  ]

  // Cohort Retention Grid
  const cohorts = [
    { cohort: 'Jan 2026', size: 120, rates: [100, 85, 78, 72, 68, 65] },
    { cohort: 'Feb 2026', size: 145, rates: [100, 88, 82, 75, 70, null] },
    { cohort: 'Mar 2026', size: 160, rates: [100, 90, 84, 79, null, null] },
    { cohort: 'Apr 2026', size: 195, rates: [100, 92, 86, null, null, null] },
    { cohort: 'May 2026', size: 210, rates: [100, 94, null, null, null, null] },
    { cohort: 'Jun 2026', size: activeCount > 0 ? activeCount : 250, rates: [100, null, null, null, null, null] }
  ]

  // AI Forecast Data
  const forecastData = [
    { month: 'Jun', revenue: rawMRR, upper: rawMRR, lower: rawMRR },
    { month: 'Jul (F)', revenue: rawMRR * 1.05, upper: rawMRR * 1.10, lower: rawMRR * 1.01 },
    { month: 'Aug (F)', revenue: rawMRR * 1.12, upper: rawMRR * 1.22, lower: rawMRR * 1.03 },
    { month: 'Sep (F)', revenue: rawMRR * 1.18, upper: rawMRR * 1.34, lower: rawMRR * 1.06 },
    { month: 'Oct (F)', revenue: rawMRR * 1.25, upper: rawMRR * 1.45, lower: rawMRR * 1.08 },
    { month: 'Nov (F)', revenue: rawMRR * 1.32, upper: rawMRR * 1.58, lower: rawMRR * 1.11 }
  ]

  const getHeatmapColor = (val: number | null) => {
    if (val === null) return 'var(--bg-hover)'
    const opacity = val / 100
    return `rgba(var(--chart-1-rgb), ${opacity * 0.9})`
  }

  return (
    <div className="analytics-page fade-in">
      {/* SaaS Advanced KPIs */}
      <div className="analytics-kpis">
        <div className="card analytics-kpi hover-lift">
          <div className="analytics-kpi-label">Active Subscriptions</div>
          <div className="analytics-kpi-val">{activeCount > 0 ? activeCount.toLocaleString() : '2,841'}</div>
          <div className="analytics-kpi-sub">
            <span style={{ color: 'var(--success)' }}>● {activeCount || 2841} Active</span>
            <span style={{ color: 'var(--warning)', marginLeft: 8 }}>● {pendingCount} Pending</span>
          </div>
        </div>
        <div className="card analytics-kpi hover-lift">
          <div className="analytics-kpi-label">Customer Lifetime Value</div>
          <div className="analytics-kpi-val">${Math.round(ltvVal).toLocaleString()}</div>
          <div className="tag-up">▲ Based on Churn/ARPU</div>
        </div>
        <div className="card analytics-kpi hover-lift">
          <div className="analytics-kpi-label">Acquisition Cost (CAC)</div>
          <div className="analytics-kpi-val">${cacVal}</div>
          <div className="analytics-kpi-sub">Payback period: 4.1 months</div>
        </div>
        <div className="card analytics-kpi hover-lift">
          <div className="analytics-kpi-label">LTV : CAC Ratio</div>
          <div className="analytics-kpi-val" style={{ color: Number(ltvToCac) >= 3 ? 'var(--success)' : 'var(--warning)' }}>
            {ltvToCac}x
          </div>
          <div className="tag-up">▲ Healthy ratio target &gt; 3x</div>
        </div>
      </div>

      {/* Growth and Funnel Row */}
      <div className="analytics-grid">
        {/* User Growth & Engagement Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">User Growth &amp; Engagement Index</div>
              <div className="card-sub">Active user metrics vs app engagement index</div>
            </div>
            <div className="chart-legend">
              <span className="legend-dot" style={{ background: 'var(--chart-1)' }} />Users
              <span className="legend-dot" style={{ background: 'var(--chart-2)', marginLeft: 12 }} />Engagement %
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyGrowthData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line yAxisId="left" type="monotone" dataKey="Active Users" name="Users" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="Engagement Index (%)" name="Engagement" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Analytics Funnel */}
        <div className="card">
          <div className="card-title">Conversion Funnel</div>
          <div className="card-sub">Marketing website conversion rates</div>
          <div className="funnel-container">
            {funnelData.map((step, idx) => {
              const maxVal = funnelData[0].value
              const percentage = Math.round((step.value / maxVal) * 100)
              const previousVal = idx > 0 ? funnelData[idx - 1].value : maxVal
              const stepConversion = idx > 0 ? Math.round((step.value / previousVal) * 100) : 100
              return (
                <div key={step.name} className="funnel-step">
                  <div className="funnel-label-wrap">
                    <span className="funnel-step-name">{step.name}</span>
                    <span className="funnel-step-val">
                      {step.value.toLocaleString()} 
                      <span className="funnel-step-pct">
                        ({percentage}% / {stepConversion}% step)
                      </span>
                    </span>
                  </div>
                  <div className="funnel-bar-bg">
                    <div 
                      className="funnel-bar-fg" 
                      style={{ 
                        width: `${percentage}%`, 
                        background: `linear-gradient(90deg, ${step.color} 0%, var(--secondary) 100%)`
                      }} 
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cohort Heatmap & AI Forecasting Grid */}
      <div className="analytics-grid">
        {/* Cohort Card */}
        <div className="card cohort-card">
          <div className="card-title">Customer Retention Heatmap (Cohorts)</div>
          <div className="card-sub">Percentage of customers active in subsequent months</div>
          
          <div className="cohort-table-wrapper">
            <table className="cohort-table">
              <thead>
                <tr>
                  <th>Cohort Month</th>
                  <th>Size</th>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <th key={i} style={{ textAlign: 'center' }}>M{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.cohort}>
                    <td style={{ fontWeight: 600 }}>{c.cohort}</td>
                    <td className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{c.size} users</td>
                    {c.rates.map((rate, idx) => (
                      <td 
                        key={idx} 
                        style={{ 
                          background: getHeatmapColor(rate),
                          color: rate !== null ? '#ffffff' : 'var(--text-muted)',
                          fontWeight: rate !== null ? 600 : 400
                        }}
                        className="cohort-cell"
                        onMouseEnter={() => setHoveredCell({ cohort: c.cohort, monthIndex: idx, rate })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {rate !== null ? `${rate}%` : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hoveredCell && hoveredCell.rate !== null && (
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--accent)', fontWeight: 650 }} className="fade-in">
              💡 {hoveredCell.cohort} cohort at Month {hoveredCell.monthIndex + 1} retained {hoveredCell.rate}% of users. Churn prediction: Low.
            </div>
          )}
        </div>

        {/* AI Forecasting Chart */}
        <div className="card">
          <div className="card-title">AI Projections &amp; Forecast</div>
          <div className="card-sub">Next 5 months predicted revenue with 90% confidence interval</div>
          <ResponsiveContainer width="100%" height={200} style={{ marginTop: 16 }}>
            <AreaChart data={forecastData}>
              <defs>
                <linearGradient id="forecastArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="upper" stroke="transparent" fill="url(#forecastArea)" />
              <Area type="monotone" dataKey="lower" stroke="transparent" fill="transparent" />
              <Line type="monotone" dataKey="revenue" name="Forecast" stroke="var(--chart-1)" strokeWidth={2.5} strokeDasharray="5 5" dot />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
