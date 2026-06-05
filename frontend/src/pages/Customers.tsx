import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchCustomers } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import type { Customer } from '../data/seed'
import {
  Treemap, ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip
} from 'recharts'
import './Customers.css'

const statusClass: Record<string, string> = {
  Active: 'badge-green', 
  Pending: 'badge-amber', 
  Churned: 'badge-red',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{data.name}</div>
      <div style={{ fontSize: 11.5 }}>MRR: <strong>${data.mrr.toLocaleString()}</strong></div>
      <div style={{ fontSize: 11.5 }}>Engagement: <strong>{data.engagement}%</strong></div>
      <div style={{ fontSize: 11.5 }}>LTV: <strong>${data.ltv.toLocaleString()}</strong></div>
    </div>
  )
}

// Journey events mock data based on customer name / plan
const getJourneyEvents = (name: string, plan: string, status: string) => {
  const events = [
    { date: 'Jan 15, 2026', title: 'Account Created', desc: `Signed up via self-serve onboarding.`, color: 'var(--indigo)' },
  ]
  if (plan === 'Enterprise' || plan === 'Team') {
    events.push({ date: 'Feb 10, 2026', title: 'Data Uploaded', desc: 'Imported first business dataset (480 rows).', color: 'var(--teal)' })
  }
  if (status === 'Active') {
    events.push({ date: 'Mar 01, 2026', title: `Upgraded to ${plan} Plan`, desc: `Started paid monthly tier of $${plan === 'Enterprise' ? '4,200' : plan === 'Team' ? '1,800' : '890'}/mo.`, color: 'var(--green)' })
    events.push({ date: 'Jun 01, 2026', title: 'Invoice Paid', desc: `Monthly charge completed successfully.`, color: 'var(--green)' })
  } else if (status === 'Pending') {
    events.push({ date: 'Mar 15, 2026', title: 'Trial Started', desc: `Currently evaluating the Team plan features.`, color: 'var(--amber)' })
  } else {
    events.push({ date: 'Feb 15, 2026', title: 'Upgraded to Pro', desc: 'Paid first invoice of $290.', color: 'var(--green)' })
    events.push({ date: 'May 20, 2026', title: 'Subscription Cancelled', desc: 'User requested churn due to project completion.', color: 'var(--danger)' })
  }
  return events
}

export default function Customers() {
  const { activeSheet, activeDocument, getSpreadsheetCustomers } = useSpreadsheet()
  const [customers, setCustomers] = useState<Customer[]>(SEED.customers)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('1')
  const rowsPerPage = 5

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filter])

  useEffect(() => {
    if (activeSheet || (activeDocument && activeDocument.parsedRows?.length > 0)) {
      const data = getSpreadsheetCustomers()
      setCustomers(data)
      if (data.length > 0) setSelectedCustomerId(data[0].id)
    } else {
      fetchCustomers()
        .then(data => {
          if (data) {
            setCustomers(data)
            if (data.length > 0) setSelectedCustomerId(data[0].id)
          }
        })
        .catch(err => console.error('Error fetching customers:', err))
    }
  }, [activeSheet, activeDocument])

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.email || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || c.status === filter
    return matchSearch && matchFilter
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  const totalMRR = customers.reduce((s, c) => s + c.mrr, 0)
  const activeCount = customers.filter(c => c.status === 'Active').length
  const churnedCount = customers.filter(c => c.status === 'Churned').length
  const healthScore = totalCount() > 0 ? Math.round(((activeCount) / totalCount()) * 100) : 85

  function totalCount() {
    return customers.length
  }

  // selected customer info
  const selectedCustomer = customers.find(c => String(c.id) === String(selectedCustomerId)) || customers[0]

  // Treemap segmentation data
  const treemapData = [
    {
      name: 'Segmentation',
      children: [
        { name: 'Enterprise', size: customers.filter(c => c.plan === 'Enterprise').length * 10 + 5, color: 'var(--chart-1)' },
        { name: 'Team', size: customers.filter(c => c.plan === 'Team').length * 10 + 5, color: 'var(--chart-2)' },
        { name: 'Pro', size: customers.filter(c => c.plan === 'Pro').length * 10 + 5, color: 'var(--chart-5)' },
        { name: 'Free', size: customers.filter(c => c.plan === 'Free').length * 10 + 5, color: 'var(--chart-6)' }
      ]
    }
  ]

  // Bubble chart (Scatter chart) data
  const bubbleData = customers.map((c, idx) => {
    const engagement = Math.round(55 + (Number(c.id) * 7.5) % 40)
    const ltv = c.mrr * 12
    return {
      name: c.name,
      mrr: c.mrr,
      engagement,
      ltv,
      z: ltv / 500
    }
  })

  return (
    <div className="customers-page fade-in">
      {/* Premium Dashboard Metrics */}
      <div className="cust-stats">
        <div className="card cust-stat hover-lift">
          <div className="cust-stat-label">Total Customers</div>
          <div className="cust-stat-value">{totalCount().toLocaleString()}</div>
        </div>
        <div className="card cust-stat hover-lift">
          <div className="cust-stat-label">Active Users</div>
          <div className="cust-stat-value" style={{ color: 'var(--success)' }}>
            {activeCount.toLocaleString()}
          </div>
        </div>
        <div className="card cust-stat hover-lift">
          <div className="cust-stat-label">Total MRR Projections</div>
          <div className="cust-stat-value">${totalMRR.toLocaleString()}</div>
        </div>
        <div className="card cust-stat hover-lift">
          <div className="cust-stat-label">Average Health Rating</div>
          <div className="cust-stat-value" style={{ color: healthScore >= 80 ? 'var(--success)' : 'var(--warning)' }}>
            {healthScore}%
          </div>
        </div>
      </div>

      {/* Advanced Treemap & Bubble Charts Grid */}
      <div className="analytics-grid">
        {/* Customer Segmentation Treemap */}
        <div className="card">
          <div className="card-title">Customer Tier Segmentation</div>
          <div className="card-sub">Proportional count of customers grouped by subscription plan</div>
          <ResponsiveContainer width="100%" height={220} style={{ marginTop: 16 }}>
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="var(--bg-card)"
              fill="var(--chart-1)"
            />
          </ResponsiveContainer>
        </div>

        {/* Customer LTV Bubble Chart */}
        <div className="card">
          <div className="card-title">Customer Lifetime Value Analysis</div>
          <div className="card-sub">MRR vs App engagement index (bubble size = estimated LTV)</div>
          <ResponsiveContainer width="100%" height={220} style={{ marginTop: 16 }}>
            <ScatterChart>
              <XAxis type="number" dataKey="engagement" name="Engagement" unit="%" tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
              <YAxis type="number" dataKey="mrr" name="MRR" unit="$" tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
              <ZAxis type="number" dataKey="z" range={[60, 400]} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter name="Customers" data={bubbleData} fill="var(--chart-2)" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lists & Journey Timelines */}
      <div className="analytics-grid">
        {/* Customer list and search */}
        <div className="card">
          <div className="cust-toolbar">
            <input
              className="cust-search"
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="filter-tabs">
              {['All', 'Active', 'Pending', 'Churned'].map(f => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >{f}</button>
              ))}
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th style={{ textAlign: 'right' }}>MRR</th>
                <th style={{ textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c: Customer) => (
                <tr 
                  key={c.id} 
                  onClick={() => setSelectedCustomerId(String(c.id))}
                  style={{ 
                    cursor: 'pointer',
                    background: String(c.id) === String(selectedCustomerId) ? 'var(--bg-hover)' : 'transparent'
                  }}
                >
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    <span className="plan-tag">{c.plan}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }} className="mono">
                    ${c.mrr.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge ${statusClass[c.status]}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button 
                className="btn btn-secondary btn-xs"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <button 
                className="btn btn-secondary btn-xs"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Selected Customer Journey Timeline */}
        <div className="card">
          <div className="card-title">Customer Health &amp; Journey Timeline</div>
          {selectedCustomer ? (
            <>
              <div className="card-sub" style={{ marginBottom: 16 }}>
                Active history for <strong>{selectedCustomer.name}</strong> ({selectedCustomer.plan} plan)
              </div>
              <div className="journey-timeline">
                {getJourneyEvents(selectedCustomer.name, selectedCustomer.plan, selectedCustomer.status).map((ev, idx) => (
                  <div key={idx} className="journey-event">
                    <div className="journey-dot" style={{ background: ev.color }} />
                    <div className="journey-date">{ev.date}</div>
                    <div className="journey-title">{ev.title}</div>
                    <div className="journey-desc">{ev.desc}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 20 }}>
              Select a customer to view their activity journey.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
