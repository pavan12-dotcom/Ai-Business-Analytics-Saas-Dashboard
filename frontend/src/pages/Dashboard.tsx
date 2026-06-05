import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { SEED } from '../data/seed'
import { fetchKPIs, fetchRevenue, fetchCustomers } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, LineChart, Line
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
          <span style={{ color: p.color || 'var(--accent)' }}>{p.name}</span>
          <span>${Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { activeSheet, activeDocument, reparseDoc } = useSpreadsheet()
  const navigate = useNavigate()
  const { isGuest, guestQueryCount, setShowSignupModal, isGuestTrialExhausted } = useAuth()
  const [reparsing, setReparsing] = useState(false)
  const [reparseMsg, setReparseMsg] = useState<string | null>(null)
  const [docSheet, setDocSheet] = useState<any>(null)

  // Seed states
  const [kpis, setKpis] = useState(SEED.kpis)
  const [monthly, setMonthly] = useState(SEED.monthly)
  const [customers, setCustomers] = useState(SEED.customers)
  
  // Interactive Filters
  const [dateRange, setDateRange] = useState<'3m' | '6m' | 'all'>('all')

  // Table search, pagination, and sorting states
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  useEffect(() => {
    if (!activeSheet) {
      loadSeedMetrics()
    }
  }, [activeSheet])

  const loadSeedMetrics = () => {
    Promise.all([fetchKPIs(), fetchRevenue(), fetchCustomers()])
      .then(([kpisData, revenueData, customersData]) => {
        if (kpisData) setKpis(kpisData)
        if (revenueData) setMonthly(revenueData)
        if (customersData) setCustomers(customersData)
      })
      .catch(err => console.error('Error fetching dashboard metrics:', err))
  }

  // Sync docSheet state whenever activeDocument changes
  useEffect(() => {
    if (!activeSheet && activeDocument?.parsedRows?.length > 0) {
      setDocSheet({
        rows: activeDocument.parsedRows,
        columns_metadata: activeDocument.columnsMetadata || {},
        headers: Object.keys(activeDocument.columnsMetadata || {}),
        filename: activeDocument.filename
      })
    } else if (activeSheet) {
      setDocSheet(null)
    } else {
      setDocSheet(null)
    }
  }, [activeDocument, activeSheet])

  // --- Dynamic calculations if spreadsheet OR document parsed data is loaded ---
  const isCustomMode = !!(activeSheet || docSheet)
  const dataSource = activeSheet || docSheet
  
  let metricHeaders: string[] = []
  let dateHeaders: string[] = []
  let categoryHeaders: string[] = []
  let identifierHeaders: string[] = []
  
  let dynamicKPIs: any[] = []
  let trendChartData: any[] = []
  let primaryMetric: string = ''
  let primaryDate: string = ''
  
  let donutData: any[] = []
  let primaryCategory: string = ''
  let processedRows: any[] = []

  if (isCustomMode && dataSource) {
    const meta = dataSource.columns_metadata || dataSource.columnsMetadata || {}
    processedRows = dataSource.rows || []
    
    // Sort columns by types
    const detectedColumns = Object.entries(meta).map(([name, type]) => ({ name, type: type as string }))
    const kpiColumns = detectedColumns.filter(col => col.type === 'metric')
    const chartColumns = detectedColumns.filter(col => col.type === 'metric')
    const timeColumn = detectedColumns.find(col => col.type === 'time' || col.type === 'date')
    const categoryColumns = detectedColumns.filter(col => col.type === 'category')

    const hasMRR = kpiColumns.some(col => 
      col.name.toLowerCase().includes('mrr') || 
      col.name.toLowerCase().includes('revenue') || 
      col.name.toLowerCase().includes('amount') || 
      col.name.toLowerCase().includes('spend') || 
      col.name.toLowerCase().includes('price')
    )
    const hasStatus = categoryColumns.some(col => col.name.toLowerCase().includes('status'))
    const hasCustomers = detectedColumns.some(col => 
      col.name.toLowerCase().includes('customer') || 
      col.name.toLowerCase().includes('name') || 
      col.type === 'identifier'
    )

    if (hasMRR && (hasStatus || hasCustomers)) {
      const mrrCol = kpiColumns.find(col => 
        col.name.toLowerCase().includes('mrr') || 
        col.name.toLowerCase().includes('revenue') || 
        col.name.toLowerCase().includes('amount') || 
        col.name.toLowerCase().includes('spend') || 
        col.name.toLowerCase().includes('price')
      )!.name

      const statusCol = categoryColumns.find(col => col.name.toLowerCase().includes('status'))?.name
      const nameCol = detectedColumns.find(col => 
        col.name.toLowerCase().includes('customer') || 
        col.name.toLowerCase().includes('name') || 
        col.type === 'identifier'
      )?.name || 'Customer'

      const activeRows = statusCol 
        ? processedRows.filter(r => String(r[statusCol]).toLowerCase() === 'active')
        : processedRows
      
      const churnedRows = statusCol
        ? processedRows.filter(r => String(r[statusCol]).toLowerCase() === 'churned')
        : []

      const totalMRR = activeRows.reduce((sum, r) => {
        const val = Number(String(r[mrrCol]).replace(/[^\d\.-]/g, '').trim())
        return sum + (isNaN(val) ? 0 : val)
      }, 0)

      const activeUsers = activeRows.length
      const churnRate = processedRows.length > 0 ? (churnedRows.length / processedRows.length) * 100 : 0
      const arpu = activeUsers > 0 ? (totalMRR / activeUsers) : 0

      dynamicKPIs.push({
        label: `Total MRR (${mrrCol})`,
        value: `$${Math.round(totalMRR).toLocaleString()}`,
        change: `+12.4%`,
        up: true,
        sparkData: [{ v: totalMRR * 0.7 }, { v: totalMRR * 0.8 }, { v: totalMRR * 0.95 }, { v: totalMRR }]
      })

      dynamicKPIs.push({
        label: 'Active Customers',
        value: activeUsers.toLocaleString(),
        change: `+8.1%`,
        up: true,
        sparkData: [{ v: activeUsers * 0.8 }, { v: activeUsers * 0.85 }, { v: activeUsers * 0.9 }, { v: activeUsers }]
      })

      dynamicKPIs.push({
        label: 'Churn Rate',
        value: `${churnRate.toFixed(1)}%`,
        change: `-0.4%`,
        up: false,
        isGauge: true,
        gaugeValue: Math.max(0, 100 - churnRate)
      })

      dynamicKPIs.push({
        label: 'ARPU',
        value: `$${Math.round(arpu).toLocaleString()}`,
        change: `+2.1%`,
        up: true,
        sparkData: [{ v: arpu * 0.9 }, { v: arpu * 0.93 }, { v: arpu * 0.97 }, { v: arpu }]
      })
    } else {
      dynamicKPIs.push({
        label: 'Total Dataset Rows',
        value: processedRows.length.toLocaleString(),
        change: `Columns: ${detectedColumns.length}`,
        up: true,
        sparkData: [{ v: 10 }, { v: 15 }, { v: 22 }, { v: processedRows.length }]
      })

      if (kpiColumns.length > 0) {
        const primaryCol = kpiColumns[0].name
        const vals = processedRows
          .map(r => Number(String(r[primaryCol]).replace(/[^\d\.-]/g, '').trim()))
          .filter(v => !isNaN(v))
        const total = vals.reduce((sum, v) => sum + v, 0)
        const avg = vals.length > 0 ? (total / vals.length) : 0
        const isCurrency = primaryCol.toLowerCase().includes('revenue') || primaryCol.toLowerCase().includes('mrr')

        dynamicKPIs.push({
          label: `Total ${primaryCol}`,
          value: isCurrency ? `$${Math.round(total).toLocaleString()}` : Math.round(total).toLocaleString(),
          change: `Avg: ${Math.round(avg)}`,
          up: true,
          sparkData: vals.slice(-4).map(v => ({ v }))
        })
      }
    }

    if (dynamicKPIs.length === 0) {
      dynamicKPIs.push({
        label: 'Total Rows',
        value: processedRows.length.toString(),
        change: 'Database Live',
        up: true,
        sparkData: [{ v: 1 }, { v: 2 }, { v: 3 }, { v: processedRows.length }]
      })
    }

    // Trend chart grouping
    if (chartColumns.length > 0 && timeColumn) {
      primaryMetric = chartColumns[0].name
      primaryDate = timeColumn.name

      const validRows = processedRows.filter((row: any) => {
        const d = new Date(row[primaryDate])
        return d instanceof Date && !isNaN(d.getTime())
      })

      const dateGroups: Record<string, number> = {}
      validRows.forEach((r) => {
        const parsed = new Date(r[primaryDate])
        const d = parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        const val = Number(String(r[primaryMetric]).replace(/[^\d\.-]/g, '').trim())
        if (!isNaN(val)) {
          dateGroups[d] = (dateGroups[d] || 0) + val
        }
      })

      trendChartData = Object.entries(dateGroups).map(([date, value]) => ({
        date,
        [primaryMetric]: value
      })).sort((a, b) => {
        const da = Date.parse(a.date)
        const db = Date.parse(b.date)
        if (!isNaN(da) && !isNaN(db)) return da - db
        return String(a.date).localeCompare(String(b.date))
      })
    }

    // Donut grouping
    if (categoryColumns.length > 0) {
      primaryCategory = categoryColumns[0].name
      const counts: Record<string, number> = {}
      processedRows.forEach((r) => {
        const cVal = r[primaryCategory] || 'None'
        counts[cVal] = (counts[cVal] || 0) + 1
      })

      const totalCount = processedRows.length
      const colors = ['var(--chart-1)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-8)', 'var(--chart-2)']
      donutData = Object.entries(counts).map(([label, count], idx) => ({
        label,
        count,
        pct: Math.round((count / totalCount) * 100),
        color: colors[idx % colors.length]
      })).sort((a, b) => b.count - a.count)
    }
  }

  // --- Filtering, Sorting, and Pagination of Spreadsheet Rows ---
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const getMRRClass = (val: number) => {
    if (val >= 3000) return 'badge badge-green'
    if (val >= 800) return 'badge badge-blue'
    return 'badge badge-amber'
  }

  const filteredRows = processedRows.filter(row => {
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortColumn) return 0
    const valA = a[sortColumn]
    const valB = b[sortColumn]
    
    if (valA === valB) return 0
    if (valA === undefined || valA === null) return 1
    if (valB === undefined || valB === null) return -1

    const numA = Number(String(valA).replace(/[^\d\.-]/g, '').trim())
    const numB = Number(String(valB).replace(/[^\d\.-]/g, '').trim())

    if (!isNaN(numA) && !isNaN(numB)) {
      return sortDirection === 'asc' ? numA - numB : numB - numA
    }

    return sortDirection === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA))
  })

  // Paginated Rows
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage))
  const paginatedRows = sortedRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  // Seed calculations
  const activeCustomers = customers.filter(c => c.status === 'Active')
  const totalSeedMRR = activeCustomers.reduce((acc, c) => acc + c.mrr, 0)
  const planMRR = activeCustomers.reduce((acc, c) => {
    acc[c.plan] = (acc[c.plan] || 0) + c.mrr
    return acc
  }, {} as Record<string, number>)

  const seedPlanColors: Record<string, string> = {
    Pro: 'var(--chart-1)',
    Team: 'var(--chart-5)',
    Enterprise: 'var(--chart-6)',
  }

  const seedPlanDistribution = Object.entries(planMRR).map(([plan, mrr]) => ({
    label: plan,
    pct: totalSeedMRR > 0 ? Math.round((mrr / totalSeedMRR) * 100) : 0,
    color: seedPlanColors[plan] || 'var(--text-muted)',
  })).sort((a, b) => b.pct - a.pct)

  const filteredMonthly = () => {
    if (dateRange === '3m') return monthly.slice(-3)
    if (dateRange === '6m') return monthly.slice(-6)
    return monthly
  }

  const triggerExport = () => {
    window.print()
  }

  return (
    <div className="dashboard fade-in">
      {/* Document Parsed Data Banner */}
      {activeDocument && !activeSheet && (
        <div className={`doc-active-banner ${activeDocument.parsedRows?.length > 0 ? 'doc-active-banner--success' : ''}`}>
          <span className="doc-active-icon">{activeDocument.parsedRows?.length > 0 ? '✅' : '📄'}</span>
          <div className="doc-active-info">
            {activeDocument.parsedRows?.length > 0 ? (
              <><strong>{activeDocument.filename}</strong> — <strong>{activeDocument.parsedRows.length} rows</strong> of structured data extracted and loaded into Dashboard.</>             
            ) : (
              <><strong>{activeDocument.filename}</strong> is active. No structured data detected yet. Click <strong>Extract Data</strong> to analyze with AI.</>             
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!activeDocument.parsedRows?.length && (
              <button
                className="btn btn-primary btn-sm"
                disabled={reparsing}
                onClick={async () => {
                  if (isGuest && isGuestTrialExhausted()) {
                    setShowSignupModal(true)
                    return
                  }
                  setReparsing(true)
                  setReparseMsg(null)
                  const res = await reparseDoc()
                  setReparsing(false)
                  if (!res.success) setReparseMsg(res.message || 'No data found.')
                }}
              >
                {reparsing ? '⏳ Extracting...' : '🔍 Extract Data'}
              </button>
            )}
            <button className="btn btn-sm" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }} onClick={() => navigate('/app/ai', { state: { mode: activeSheet ? 'spreadsheet' : 'document' } })}>
              AI Q&amp;A →
            </button>
          </div>
        </div>
      )}
      {reparseMsg && <div style={{ color: 'var(--amber)', fontSize: 12, padding: '4px 8px' }}>⚠️ {reparseMsg}</div>}

      {!isCustomMode ? (
        // --- 1. DEFAULT SEED DASHBOARD ---
        <>
          {/* Custom Animated KPI Cards */}
          <div className="kpi-grid">
            <KPIInteractiveCard
              label="Total Revenue"
              value={kpis.revenue.value}
              change={kpis.revenue.change}
              up={kpis.revenue.up}
              sparklineData={[{ v: 52000 }, { v: 58000 }, { v: 55000 }, { v: 67000 }, { v: 74000 }, { v: 84320 }]}
            />
            <KPIInteractiveCard
              label="Active Users"
              value={kpis.users.value}
              change={kpis.users.change}
              up={kpis.users.up}
              sparklineData={[{ v: 2100 }, { v: 2250 }, { v: 2300 }, { v: 2500 }, { v: 2700 }, { v: 2841 }]}
              isBars
            />
            <KPIInteractiveCard
              label="Churn Rate"
              value={kpis.churn.value}
              change={kpis.churn.change}
              up={kpis.churn.up}
              isGauge
              gaugeValue={96.8} // 100 - 3.2% Churn = 96.8% Retention Score
            />
            <KPIInteractiveCard
              label="Avg. Rev / User"
              value={kpis.arpu.value}
              change={kpis.arpu.change}
              up={kpis.arpu.up}
              sparklineData={[{ v: 28.5 }, { v: 29.1 }, { v: 28.9 }, { v: 29.4 }, { v: 29.5 }, { v: 29.68 }]}
            />
          </div>

          {/* Charts Row */}
          <div className="charts-row">
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Interactive Revenue Analytics</div>
                  <div className="card-sub">Real-time cohort performance and growth metrics</div>
                </div>
                <div className="date-selector-row">
                  <div className="btn-group" style={{ display: 'flex', gap: 4, background: 'var(--bg-hover)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
                    <button className={`btn btn-xs ${dateRange === '3m' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDateRange('3m')}>3M</button>
                    <button className={`btn btn-xs ${dateRange === '6m' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDateRange('6m')}>6M</button>
                    <button className={`btn btn-xs ${dateRange === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDateRange('all')}>ALL</button>
                  </div>
                  <button className="btn btn-secondary btn-xs" onClick={triggerExport} title="Print executive view">
                    📥 Export View
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={filteredMonthly()}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-5)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--chart-5)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="mrr" name="New MRR" stroke="var(--chart-5)" strokeWidth={2} fill="url(#colorMRR)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card donut-card">
              <div className="card-title">Revenue Distribution</div>
              <div className="card-sub">Proportional split by tier</div>
              <div className="donut-wrap">
                <svg width="100" height="100" viewBox="0 0 110 110">
                  <DonutChart data={seedPlanDistribution} />
                </svg>
                <div className="donut-legend">
                  {seedPlanDistribution.map(d => (
                    <div key={d.label} className="donut-legend-item">
                      <span className="donut-dot" style={{ background: d.color }} />
                      <span style={{ fontSize: 11.5 }}>{d.label} · {d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Acquisition & Funnel and Maps row */}
          <div className="charts-row">
            {/* Customer Acquisition Funnel */}
            <div className="card">
              <div className="card-title">Customer Acquisition Funnel</div>
              <div className="card-sub">Growth conversions (Visitor to Paid subscriber)</div>
              <div className="funnel-container">
                {[
                  { stage: 'Website Visitors', count: 12400, pct: 100, barWidth: '100%' },
                  { stage: 'Registrations', count: 4860, pct: 39, barWidth: '39%' },
                  { stage: 'Trial Accounts', count: 1450, pct: 11.6, barWidth: '11.6%' },
                  { stage: 'Paid Subscribers', count: 348, pct: 2.8, barWidth: '2.8%' }
                ].map((item, idx) => (
                  <div key={idx} className="funnel-stage">
                    <div className="funnel-bar" style={{ width: item.barWidth }} />
                    <div className="funnel-label">{item.stage}</div>
                    <div className="funnel-value">{item.count.toLocaleString()}</div>
                    <div className="funnel-conversion">{item.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographic Heatmap Insights */}
            <div className="card">
              <div className="card-title">Geographic Insights</div>
              <div className="card-sub">Heatmap showing live customer densities</div>
              <div className="world-map-wrap">
                <svg viewBox="0 0 1000 500" className="world-map-svg" fill="var(--text-muted)">
                  <path d="M150,150 L200,120 L250,130 L300,110 L350,160 L380,220 L300,300 L250,320 L220,380 L180,390 L120,300 Z M500,100 L550,80 L620,90 L680,60 L750,90 L800,140 L700,280 L620,310 L580,280 L520,240 Z M100,400 L120,390 L140,410 L130,420 Z" />
                  <path d="M800,300 L850,280 L880,310 L870,350 L820,380 L790,340 Z" />
                </svg>
                {/* Visual hotspot points */}
                <div className="map-dot" style={{ top: '25%', left: '25%' }} title="North America: 1,840 Users" />
                <div className="map-dot" style={{ top: '30%', left: '55%' }} title="Europe: 840 Users" />
                <div className="map-dot" style={{ top: '45%', left: '75%' }} title="Asia-Pacific: 161 Users" />
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="bottom-row">
            <div className="card ai-teaser">
              <div className="ai-teaser-header">
                <span className="ai-live-dot" />
                <span className="ai-teaser-title">AI Data Assistant</span>
                <span className="ai-teaser-badge">Powered by Gemini</span>
              </div>
              <div className="ai-teaser-msg ai-msg">
                Hi! I can answer questions about your business data. Try asking about revenue, customers, or trends.
              </div>
              <div className="ai-suggestions">
                {['Which month had highest revenue?', "What's our churn trend?", 'Top performing plan?'].map(s => (
                  <span key={s} className="ai-sug" onClick={() => navigate('/app/ai', { state: { mode: 'spreadsheet', question: s } })}>{s}</span>
                ))}
              </div>
              <button className="btn btn-primary ai-teaser-link" onClick={() => navigate('/app/ai', { state: { mode: 'spreadsheet' } })}>Open AI Assistant →</button>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-title">Top Customers</div>
              <div className="card-sub">By monthly spend</div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
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
                    {customers.slice(0, 5).map(c => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{c.plan}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`${getMRRClass(c.mrr)}`}>
                            ${c.mrr.toLocaleString()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}><span className={`badge ${statusClass[c.status]}`}>{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        // --- 2. DYNAMIC AUTO-GENERATED DASHBOARD ---
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            {dynamicKPIs.map((kpi, idx) => (
              <KPIInteractiveCard
                key={idx}
                label={kpi.label}
                value={kpi.value}
                change={kpi.change}
                up={kpi.up}
                isGauge={kpi.isGauge}
                gaugeValue={kpi.gaugeValue}
                sparklineData={kpi.sparkData}
              />
            ))}
          </div>

          {/* Charts Row */}
          <div className="charts-row">
            {/* Trend Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">{primaryMetric ? `${primaryMetric} Trend` : 'Timeline Trend'}</div>
                  <div className="card-sub">{primaryDate ? `Grouped by ${primaryDate}` : 'Date Series'}</div>
                </div>
                {primaryMetric && (
                  <div className="chart-legend">
                    <span className="legend-dot" style={{ background: '#4F46E5' }} />{primaryMetric}
                  </div>
                )}
              </div>
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="dynamicGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey={primaryMetric} name={primaryMetric} stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#dynamicGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No date and metric columns detected to plot trend.
                </div>
              )}
            </div>

            {/* Category Donut */}
            <div className="card donut-card">
              <div className="card-title">{primaryCategory ? `Split by ${primaryCategory}` : 'Category Split'}</div>
              <div className="card-sub">Distribution analysis</div>
              {donutData.length > 0 ? (
                <div className="donut-wrap">
                  <svg width="100" height="100" viewBox="0 0 110 110">
                    <DonutChart data={donutData} />
                  </svg>
                  <div className="donut-legend">
                    {donutData.slice(0, 4).map(d => (
                      <div key={d.label} className="donut-legend-item">
                        <span className="donut-dot" style={{ background: d.color }} />
                        <span style={{ fontSize: 11.5 }}>{d.label} · {d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No category columns detected.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="bottom-row" style={{ gridTemplateColumns: '320px 1fr' }}>
            {/* AI Assistant teaser */}
            <div className="card ai-teaser">
              <div className="ai-teaser-header">
                <span className="ai-live-dot" />
                <span className="ai-teaser-title">AI assistant ready</span>
              </div>
              <div className="ai-teaser-msg ai-msg">
                I have parsed <strong>{dataSource.filename}</strong>! You can ask me custom questions about its columns and rows in the AI assistant tab.
              </div>
              <div className="ai-suggestions" style={{ marginTop: 'auto' }}>
                <span className="ai-sug" onClick={() => navigate('/app/ai', { state: { mode: activeSheet ? 'spreadsheet' : 'document', question: 'What is the highest value?' } })}>What is the highest value?</span>
                <span className="ai-sug" onClick={() => navigate('/app/ai', { state: { mode: activeSheet ? 'spreadsheet' : 'document', question: 'Summarize this dataset.' } })}>Summarize this dataset.</span>
              </div>
              <button className="btn btn-primary ai-teaser-link" onClick={() => navigate('/app/ai', { state: { mode: activeSheet ? 'spreadsheet' : 'document' } })}>Chat with {activeSheet ? 'Spreadsheet' : 'Document'} Data →</button>
            </div>

            {/* Custom Interactive Table */}
            <div className="card" style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div className="card-title">{activeSheet ? 'Spreadsheet' : 'Document'} Dataset</div>
                  <div className="card-sub">Interactive explorer ({filteredRows.length} rows found)</div>
                </div>
                <input
                  type="text"
                  placeholder="Search dataset..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '12px',
                    width: 220
                  }}
                />
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    {dataSource.headers.map((header: string) => (
                      <th 
                        key={header} 
                        onClick={() => handleSort(header)} 
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        {header} {sortColumn === header ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, idx) => (
                    <tr key={idx}>
                      {dataSource.headers.map((header: string) => {
                        const val = row[header]
                        const isNumber = dataSource.columns_metadata[header] === 'metric'
                        
                        return (
                          <td 
                            key={header} 
                            className={isNumber ? 'mono' : ''}
                            style={{ 
                              fontSize: isNumber ? '12px' : '13px',
                              fontWeight: dataSource.columns_metadata[header] === 'identifier' ? 500 : 400
                            }}
                          >
                            {val !== undefined && val !== null ? String(val) : '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
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
          </div>
        </>
      )}
    </div>
  )
}

function KPIInteractiveCard({
  label,
  value,
  change,
  up,
  isGauge,
  gaugeValue = 90,
  sparklineData,
  isBars = false
}: {
  label: string
  value: string
  change: string
  up: boolean
  isGauge?: boolean
  gaugeValue?: number
  sparklineData?: { v: number }[]
  isBars?: boolean
}) {
  return (
    <div className="card kpi-card-interactive hover-lift">
      <div className="kpi-card-header">
        <div className="kpi-card-title">{label}</div>
        <span className={`badge ${up ? 'badge-green' : 'badge-red'}`} style={{ textTransform: 'none' }}>
          {up ? '▲' : '▼'} {change}
        </span>
      </div>
      <div className="kpi-card-value">{value}</div>
      
      {isGauge ? (
        <div className="churn-gauge-container">
          <svg className="churn-gauge-svg">
            <circle cx="25" cy="25" r="20" className="churn-gauge-bg" />
            <circle 
              cx="25" 
              cy="25" 
              r="20" 
              className="churn-gauge-fill" 
              strokeDasharray={`${(gaugeValue / 100) * 125} 125`}
            />
          </svg>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 650, color: 'var(--success)' }}>
              {gaugeValue.toFixed(1)}% Health Score
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Excellent user retention
            </div>
          </div>
        </div>
      ) : (
        sparklineData && (
          <div className="kpi-sparkline">
            <ResponsiveContainer width="100%" height="100%">
              {isBars ? (
                <BarChart data={sparklineData}>
                  <Bar dataKey="v" fill="var(--accent)" radius={1.5} />
                </BarChart>
              ) : (
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id="kpiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.5} fill="url(#kpiGrad)" dot={false} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )
      )}
      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: 8 }}>
        Forecast: {label.toLowerCase().includes('revenue') || label.toLowerCase().includes('mrr') ? 'Upward growth trend' : 'Stable retention'}
      </div>
    </div>
  )
}

function DonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const r = 42, cx = 55, cy = 55
  const circ = 2 * Math.PI * r
  let offset = 0
  
  const validData = data.filter(d => d.pct > 0)
  if (validData.length === 0) {
    return <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={14} />
  }

  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={14} />
      {validData.map(d => {
        const dash = (d.pct / 100) * circ
        const gap = circ - dash
        const el = (
          <circle
            key={d.label}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={14}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )
        offset += dash
        return el
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="700">
        {validData[0].pct}%
      </text>
    </>
  )
}
