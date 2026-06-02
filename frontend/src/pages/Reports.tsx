import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchRevenue, fetchCustomers } from '../services/api'
import './Reports.css'

export default function Reports() {
  const [monthly, setMonthly] = useState(SEED.monthly)
  const [customers, setCustomers] = useState(SEED.customers)

  useEffect(() => {
    let active = true
    Promise.all([fetchRevenue(), fetchCustomers()])
      .then(([revData, custData]) => {
        if (!active) return
        if (revData) setMonthly(revData)
        if (custData) setCustomers(custData)
      })
      .catch(err => console.error('Error fetching reports data:', err))
    return () => { active = false }
  }, [])

  const totalRev = monthly.reduce((s, m) => s + m.revenue, 0)
  const totalMRR = monthly.reduce((s, m) => s + m.mrr, 0)

  return (
    <div className="reports-page fade-in">
      <div className="reports-header">
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Monthly Business Report</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>January – June 2026 · Auto-generated</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          Export PDF ↓
        </button>
      </div>

      {/* Summary cards */}
      <div className="report-summary">
        <div className="report-metric">
          <div className="report-metric-label">6-Month Revenue</div>
          <div className="report-metric-val">${(totalRev / 1000).toFixed(0)}k</div>
        </div>
        <div className="report-metric">
          <div className="report-metric-label">6-Month New MRR</div>
          <div className="report-metric-val">${(totalMRR / 1000).toFixed(0)}k</div>
        </div>
        <div className="report-metric">
          <div className="report-metric-label">Revenue Growth</div>
          <div className="report-metric-val tag-up">▲ 62%</div>
        </div>
        <div className="report-metric">
          <div className="report-metric-label">Avg Churn (H1)</div>
          <div className="report-metric-val">3.4%</div>
        </div>
      </div>

      <div className="reports-grid">
        {/* Monthly table */}
        <div className="card">
          <div className="card-title">Revenue by Month</div>
          <div className="card-sub" style={{ marginBottom: 12 }}>Full breakdown</div>
          <table className="data-table">
            <thead>
              <tr><th>Month</th><th>Revenue</th><th>New MRR</th><th>vs Prev</th></tr>
            </thead>
            <tbody>
              {monthly.map((m, i) => {
                const prev = i > 0 ? monthly[i-1].revenue : null
                const diff = prev ? m.revenue - prev : 0
                return (
                  <tr key={m.month}>
                    <td>{m.month} 2026</td>
                    <td className="mono">${m.revenue.toLocaleString()}</td>
                    <td className="mono">${m.mrr.toLocaleString()}</td>
                    <td className={diff >= 0 ? 'tag-up' : 'tag-down'}>
                      {prev ? `${diff >= 0 ? '+' : ''}$${Math.abs(diff / 1000).toFixed(0)}k` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Customer report */}
        <div className="card">
          <div className="card-title">Customer Report</div>
          <div className="card-sub" style={{ marginBottom: 12 }}>All customers this period</div>
          <table className="data-table">
            <thead>
              <tr><th>Customer</th><th>Plan</th><th>MRR</th><th>Status</th></tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.plan}</td>
                  <td className="mono">${c.mrr.toLocaleString()}</td>
                  <td><span className={`badge ${c.status === 'Active' ? 'badge-green' : c.status === 'Pending' ? 'badge-amber' : 'badge-red'}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
