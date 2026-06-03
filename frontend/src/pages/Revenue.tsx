import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchRevenue, fetchCustomers, fetchKPIs } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area
} from 'recharts'
import './Revenue.css'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="tooltip-row">
          <span style={{ color: p.color }}>{p.name}</span>
          <span>{p.value >= 1000 ? `$${(p.value / 1000).toFixed(0)}k` : `$${p.value.toLocaleString()}`}</span>
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

  const latestMonth = monthly[monthly.length - 1]
  const prevMonth = monthly[monthly.length - 2]
  const latestMRR = latestMonth ? latestMonth.mrr : 72000
  const mrrChangePct = (latestMonth && prevMonth)
    ? (((latestMonth.mrr - prevMonth.mrr) / prevMonth.mrr) * 100).toFixed(0)
    : '18'

  return (
    <div className="revenue-page fade-in">
      {/* KPIs */}
      <div className="rev-kpis">
        <div className="rev-kpi">
          <div className="rev-kpi-label">Total Revenue ({latestMonth?.month || 'Jun'})</div>
          <div className="rev-kpi-val">{kpis.revenue.value}</div>
          <div className="tag-up">{kpis.revenue.up ? '▲' : '▼'} {kpis.revenue.change} MoM</div>
        </div>
        <div className="rev-kpi">
          <div className="rev-kpi-label">New MRR ({latestMonth?.month || 'Jun'})</div>
          <div className="rev-kpi-val">${latestMRR.toLocaleString()}</div>
          <div className="tag-up">▲ {mrrChangePct}% MoM</div>
        </div>
        <div className="rev-kpi">
          <div className="rev-kpi-label">Churn Rate</div>
          <div className="rev-kpi-val">{kpis.churn.value}</div>
          <div className={kpis.churn.up ? 'tag-down' : 'tag-up'}>
            {kpis.churn.up ? '▲' : '▼'} {kpis.churn.change.replace('-', '')} improved
          </div>
        </div>
        <div className="rev-kpi">
          <div className="rev-kpi-label">ARPU</div>
          <div className="rev-kpi-val">{kpis.arpu.value}</div>
          <div className="tag-up">{kpis.arpu.up ? '▲' : '▼'} {kpis.arpu.change} MoM</div>
        </div>
      </div>

      {/* Area chart */}
      <div className="card">
        <div className="card-title">Revenue Trend</div>
        <div className="card-sub" style={{ marginBottom: 16 }}>Monthly revenue vs new MRR · Jan–Jun 2026</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthly}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#14b8a6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `$${v/1000}k` : `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2}
              fill="url(#revGrad)" dot={{ fill: '#6366f1', r: 4 }} />
            <Area type="monotone" dataKey="mrr" name="New MRR" stroke="#14b8a6" strokeWidth={2}
              fill="url(#mrrGrad)" dot={{ fill: '#14b8a6', r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Plan split */}
      <div className="rev-bottom">
        <div className="card">
          <div className="card-title">Revenue by Plan</div>
          <div className="card-sub" style={{ marginBottom: 16 }}>Breakdown this month</div>
          {planDistribution.map(d => (
            <div key={d.plan} className="plan-row">
              <div className="plan-row-info">
                <span className="plan-dot" style={{ background: d.color }} />
                <span className="plan-row-name">{d.plan}</span>
                <span className="plan-row-pct">{d.pct}%</span>
              </div>
              <div className="plan-bar-bg">
                <div className="plan-bar-fg" style={{ width: `${d.pct}%`, background: d.color }} />
              </div>
              <div className="plan-row-val">${Math.round(totalMRR * d.pct / 100).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">Monthly Breakdown</div>
          <div className="card-sub" style={{ marginBottom: 16 }}>Revenue per month</div>
          <table className="data-table">
            <thead>
              <tr><th>Month</th><th>Revenue</th><th>New MRR</th><th>Growth</th></tr>
            </thead>
            <tbody>
              {monthly.map((m, i) => {
                const prev = i > 0 ? monthly[i - 1].revenue : null
                const growth = prev ? (((m.revenue - prev) / prev) * 100).toFixed(1) : '—'
                return (
                  <tr key={m.month}>
                    <td>{m.month}</td>
                    <td className="mono">{m.revenue >= 1000 ? `$${(m.revenue / 1000).toFixed(0)}k` : `$${m.revenue.toLocaleString()}`}</td>
                    <td className="mono">{m.mrr >= 1000 ? `$${(m.mrr / 1000).toFixed(0)}k` : `$${m.mrr.toLocaleString()}`}</td>
                    <td className={prev && m.revenue > prev ? 'tag-up' : 'tag-down'}>
                      {growth !== '—' ? `${m.revenue > (prev ?? 0) ? '▲' : '▼'} ${Math.abs(Number(growth))}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
