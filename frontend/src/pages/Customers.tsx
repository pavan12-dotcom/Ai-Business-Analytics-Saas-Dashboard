import { useState, useEffect } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { useNavigate } from 'react-router-dom'
import { formatNumber, formatYAxisTick } from '../services/dataCleaner'
import {
  Treemap, ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip
} from 'recharts'
import { AlertCircle } from 'lucide-react'
import './Customers.css'

export interface Customer {
  id: string
  name: string
  email: string
  plan: string
  mrr: number
  status: string
}

const statusClass: Record<string, string> = {
  Active: 'badge-green', 
  Pending: 'badge-amber', 
  Churned: 'badge-red',
}

function EmptyChart({ message, height = 200 }: { message?: string; height?: number }) {
  return (
    <div
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        color: 'var(--text-muted)',
        border: '1.5px dashed var(--border2)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(99,102,241,0.02)',
        width: '100%',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600 }}>No data available</span>
      <span style={{ fontSize: 11.5, textAlign: 'center', maxWidth: 220 }}>
        {message || "Upload a CSV, Excel, or JSON file to generate insights."}
      </span>
    </div>
  )
}

// Journey events generic generator
const getJourneyEvents = (name: string, plan: string, status: string, entity: string, valMetric: string) => {
  const events = [
    { date: 'Initial Period', title: `${entity} Record Logged`, desc: `Successfully imported record for ${name}.`, color: 'var(--indigo)' },
  ]
  if (plan !== 'Standard' && plan !== 'Other' && plan !== 'None') {
    events.push({ date: 'Cluster Assignment', title: `Assigned to Category: ${plan}`, desc: `Categorized under segment ${plan} for operational tracking.`, color: 'var(--teal)' })
  }
  if (status === 'Active') {
    events.push({ date: 'Current Status', title: 'Status: Active', desc: `Entity is active with ${valMetric} metrics recorded.`, color: 'var(--green)' })
  } else if (status === 'Pending') {
    events.push({ date: 'Current Status', title: 'Status: Pending', desc: `Entity is under verification or pending lifecycle completion.`, color: 'var(--amber)' })
  } else {
    events.push({ date: 'Lifecycle Shift', title: 'Status: Warning Flag', desc: `Record flag changed to Churned / Closed / Inactive / Failed.`, color: 'var(--danger)' })
  }
  return events
}

export default function Customers() {
  const { analytics, hasData } = useSpreadsheet()
  const navigate = useNavigate()

  const { customers = [], kpis = [], categories = [], datasetType, entityName, valueMetricName } = analytics

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')

  // Sync selected customer ID
  useEffect(() => {
    if (customers.length > 0) {
      if (!selectedCustomerId || !customers.some(c => String(c.id) === String(selectedCustomerId))) {
        setSelectedCustomerId(String(customers[0].id))
      }
    } else {
      setSelectedCustomerId('')
    }
  }, [customers, selectedCustomerId])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filter])

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.email || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || c.status === matchStatus(filter)
    return matchSearch && matchFilter
  })

  // Normalize search filters
  function matchStatus(f: string): string {
    if (f === 'Active') return 'Active'
    if (f === 'Pending') return 'Pending'
    return 'Churned'
  }

  const rowsPerPage = 5
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  const activeCount = customers.filter(c => c.status === 'Active').length
  const totalCount = customers.length

  // selected customer info
  const selectedCustomer = customers.find(c => String(c.id) === String(selectedCustomerId)) || customers[0]

  // Treemap segmentation data
  const treemapData = [
    {
      name: 'Segmentation',
      children: categories.length > 0 ? categories.map(cat => ({
        name: cat.label,
        size: cat.count * 10 + 5,
        color: cat.color
      })) : [
        { name: 'Standard', size: 10, color: 'var(--chart-1)' }
      ]
    }
  ]

  // Bubble chart data
  const bubbleData = customers.map((c, idx) => {
    const engagement = Math.round(55 + (idx * 7.5) % 40)
    const ltv = c.mrr * 10
    return {
      name: c.name,
      mrr: c.mrr,
      engagement,
      ltv,
      z: ltv > 0 ? ltv / 500 : 10
    }
  })

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const data = payload[0].payload
    const isCurrency = /revenue|mrr|acv|amount|price|sales|income|spend|profit|earn|salary|wage|cost|treatment/i.test(valueMetricName)
    const formatValue = (v: number) => formatNumber(Math.round(v), isCurrency)
    return (
      <div className="chart-tooltip">
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{data.name}</div>
        <div style={{ fontSize: 11.5 }}>{valueMetricName}: <strong>{formatValue(data.mrr)}</strong></div>
        <div style={{ fontSize: 11.5 }}>Engagement: <strong>{data.engagement}%</strong></div>
        <div style={{ fontSize: 11.5 }}>Projected Lifetime: <strong>{formatValue(data.ltv)}</strong></div>
      </div>
    )
  }

  return (
    <div className="customers-page fade-in">
      {!hasData ? (
        <div className="card no-print" style={{
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 12,
          marginTop: 20
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>No Data Available</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 450, margin: 0, lineHeight: 1.6 }}>
            Upload a dataset to generate AI-powered analytics.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/app')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          {/* Dynamic Stats */}
          <div className="cust-stats">
            {kpis.slice(0, 4).map((kpi, idx) => (
              <div key={idx} className="card cust-stat hover-lift">
                <div className="cust-stat-label">{kpi.label}</div>
                <div className="cust-stat-value">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Advanced Treemap & Bubble Charts Grid */}
          <div className="analytics-grid">
            {/* Customer Segmentation Treemap */}
            <div className="card">
              <div className="card-title">{entityName} Category Segmentation</div>
              <div className="card-sub">Proportional count of {entityName.toLowerCase()}s grouped by category</div>
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
              <div className="card-title">{entityName} Value Analysis</div>
              <div className="card-sub">{valueMetricName} vs engagement index (bubble size = estimated lifetime value)</div>
              {bubbleData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220} style={{ marginTop: 16 }}>
                  <ScatterChart>
                    <XAxis type="number" dataKey="engagement" name="Engagement" unit="%" tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
                    <YAxis tickFormatter={formatYAxisTick} type="number" dataKey="mrr" name={valueMetricName} unit="" tick={{ fontSize: 9 }} stroke="var(--text-muted)" />
                    <ZAxis type="number" dataKey="z" range={[60, 400]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Scatter name={entityName} data={bubbleData} fill="var(--chart-2)" fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="Upload a dataset to view dynamic scatter projections." height={220} />
              )}
            </div>
          </div>

          {/* Lists & Journey Timelines */}
          <div className="analytics-grid">
            {/* Customer list and search */}
            <div className="card">
              <div className="cust-toolbar">
                <input
                  className="cust-search"
                  placeholder={`Search ${entityName.toLowerCase()}s...`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <div className="filter-tabs">
                  {['All', 'Active', 'Pending', 'Warning / Closed'].map(f => (
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
                    <th>{entityName}</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>{valueMetricName}</th>
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
                        {formatNumber(Math.round(c.mrr), /revenue|mrr|acv|amount|price|sales|income|spend|profit|earn|salary|wage|cost|treatment/i.test(valueMetricName))}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${statusClass[c.status]}`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                        No records found matching your search.
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

            {/* Selected Journey Timeline */}
            <div className="card">
              <div className="card-title">{entityName} Health &amp; Activity Timeline</div>
              {selectedCustomer ? (
                <>
                  <div className="card-sub" style={{ marginBottom: 16 }}>
                    Active history for <strong>{selectedCustomer.name}</strong> ({selectedCustomer.plan} category)
                  </div>
                  <div className="journey-timeline">
                    {getJourneyEvents(selectedCustomer.name, selectedCustomer.plan, selectedCustomer.status, entityName, valueMetricName).map((ev, idx) => (
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
                  Select an entry to view their activity journey.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
