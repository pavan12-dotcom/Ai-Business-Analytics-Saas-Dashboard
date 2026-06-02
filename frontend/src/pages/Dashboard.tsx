import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchKPIs, fetchRevenue, fetchCustomers } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import './Dashboard.css'

const statusClass: Record<string, string> = {
  Active: 'badge-green',
  Pending: 'badge-amber',
  Churned: 'badge-red',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="tooltip-row">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>${(p.value / 1000).toFixed(0)}k</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(SEED.kpis)
  const [monthly, setMonthly] = useState(SEED.monthly)
  const [customers, setCustomers] = useState(SEED.customers)

  useEffect(() => {
    let active = true
    Promise.all([fetchKPIs(), fetchRevenue(), fetchCustomers()])
      .then(([kpisData, revenueData, customersData]) => {
        if (!active) return
        if (kpisData) setKpis(kpisData)
        if (revenueData) setMonthly(revenueData)
        if (customersData) setCustomers(customersData)
      })
      .catch(err => console.error('Error fetching dashboard metrics:', err))
    return () => { active = false }
  }, [])

  // Calculate plan distribution dynamically from customer data
  const planColors: Record<string, string> = {
    Pro: 'var(--accent)',
    Team: 'var(--teal)',
    Enterprise: 'var(--amber)',
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
    color: planColors[plan] || 'var(--muted)',
  })).sort((a, b) => b.pct - a.pct)


  return (
    <div className="dashboard fade-in">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <KPICard label="Total Revenue" value={kpis.revenue.value} change={kpis.revenue.change} up={kpis.revenue.up} />
        <KPICard label="Active Users"  value={kpis.users.value}   change={kpis.users.change}   up={kpis.users.up} />
        <KPICard label="Churn Rate"    value={kpis.churn.value}   change={kpis.churn.change}   up={kpis.churn.up} />
        <KPICard label="Avg. Rev / User" value={kpis.arpu.value}  change={kpis.arpu.change}    up={kpis.arpu.up} />
      </div>

      {/* Charts */}
      <div className="charts-row">
        {/* Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Revenue</div>
              <div className="card-sub">Jan – Jun 2026</div>
            </div>
            <div className="chart-legend">
              <span className="legend-dot" style={{ background: 'var(--accent)' }} />Revenue
              <span className="legend-dot" style={{ background: 'var(--teal)', marginLeft: 12 }} />New MRR
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={monthly} barSize={10} barCategoryGap={6}>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="revenue" name="Revenue" radius={[4,4,0,0]}>
                {monthly.map((_, i) => <Cell key={i} fill="var(--accent)" fillOpacity={0.8} />)}
              </Bar>
              <Bar dataKey="mrr" name="New MRR" radius={[4,4,0,0]}>
                {monthly.map((_, i) => <Cell key={i} fill="var(--teal)" fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="card donut-card">
          <div className="card-title">Revenue by Plan</div>
          <div className="card-sub">Current distribution</div>
          <div className="donut-wrap">
            <svg width="110" height="110" viewBox="0 0 110 110">
              <DonutChart data={planDistribution} />
            </svg>
            <div className="donut-legend">
              {planDistribution.map(d => (
                <div key={d.plan} className="donut-legend-item">
                  <span className="donut-dot" style={{ background: d.color }} />
                  <span>{d.plan} · {d.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-row">
        {/* AI panel teaser */}
        <div className="card ai-teaser">
          <div className="ai-teaser-header">
            <span className="ai-live-dot" />
            <span className="ai-teaser-title">AI Data Assistant</span>
            <span className="ai-teaser-badge">Powered by Claude</span>
          </div>
          <div className="ai-teaser-msg ai-msg">
            Hi! I can answer questions about your business data. Try asking about revenue, customers, or trends.
          </div>
          <div className="ai-suggestions">
            {['Which month had highest revenue?', "What's our churn trend?", 'Top performing plan?'].map(s => (
              <span key={s} className="ai-sug" onClick={() => window.location.href = '/app/ai'}>{s}</span>
            ))}
          </div>
          <a className="btn btn-primary ai-teaser-link" href="/app/ai">Open AI Assistant →</a>
        </div>

        {/* Customers Table */}
        <div className="card">
          <div className="card-title">Top Customers</div>
          <div className="card-sub">By monthly spend</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>MRR</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.slice(0, 5).map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{c.plan}</td>
                  <td className="mono">${c.mrr.toLocaleString()}</td>
                  <td><span className={`badge ${statusClass[c.status]}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, change, up }: { label: string; value: string; change: string; up: boolean }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-change ${up ? 'tag-up' : 'tag-down'}`}>
        {up ? '▲' : '▼'} {change} vs last month
      </div>
    </div>
  )
}

// Simple SVG donut
function DonutChart({ data }: { data: { plan: string; pct: number; color: string }[] }) {
  const r = 42, cx = 55, cy = 55
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg3)" strokeWidth={18} />
      {data.map(d => {
        const dash = (d.pct / 100) * circ
        const gap = circ - dash
        const el = (
          <circle
            key={d.plan}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={18}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fill="var(--text)" fontFamily="DM Sans" fontWeight="600">
        {data[0].pct}%
      </text>
    </>
  )
}
