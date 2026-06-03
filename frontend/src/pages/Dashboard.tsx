// Dashboard.tsx
import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchKPIs, fetchRevenue, fetchCustomers } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid
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
          <span>${Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { activeSheet, activeDocument, reparseDoc } = useSpreadsheet()
  const navigate = useNavigate()
  const [reparsing, setReparsing] = useState(false)
  const [reparseMsg, setReparseMsg] = useState<string | null>(null)
  const [docSheet, setDocSheet] = useState<any>(null)

  // Seed states
  const [kpis, setKpis] = useState(SEED.kpis)
  const [monthly, setMonthly] = useState(SEED.monthly)
  const [customers, setCustomers] = useState(SEED.customers)
  
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

  // Sync docSheet state whenever activeDocument changes (parsedRows arrive after AI extraction)
  useEffect(() => {
    if (!activeSheet && activeDocument?.parsedRows?.length > 0) {
      console.log('[Dashboard] docSheet updated with', activeDocument.parsedRows.length, 'rows')
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
    
    // Only render KPI cards for metric columns
    const kpiColumns = detectedColumns.filter(col => col.type === 'metric')

    // Only render charts for metric columns grouped by time
    const chartColumns = detectedColumns.filter(col => col.type === 'metric')
    const timeColumn = detectedColumns.find(col => col.type === 'time' || col.type === 'date')
    
    const categoryColumns = detectedColumns.filter(col => col.type === 'category')

    // 1. Build KPI Cards (up to 4)
    // Check if this dataset behaves like a SaaS/Customer dataset
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
      // It's a SaaS/Customer dataset! Let's build SaaS KPI Cards
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
        change: `Active: ${activeUsers} · Total users: ${processedRows.length}`
      })

      dynamicKPIs.push({
        label: 'Active Customers',
        value: activeUsers.toLocaleString(),
        change: `Pending: ${processedRows.filter(r => statusCol && String(r[statusCol]).toLowerCase() === 'pending').length} · Total records: ${processedRows.length}`
      })

      dynamicKPIs.push({
        label: 'Churn Rate',
        value: `${churnRate.toFixed(1)}%`,
        change: `Churned: ${churnedRows.length} · Healthy SaaS: < 5%`
      })

      dynamicKPIs.push({
        label: 'Average Revenue / User',
        value: `$${Math.round(arpu).toLocaleString()}`,
        change: `ARPU calculation`
      })

    } else {
      // General dataset KPIs
      // 1. Total Rows
      dynamicKPIs.push({
        label: 'Total Rows',
        value: processedRows.length.toLocaleString(),
        change: `Cols: ${detectedColumns.length} · Metrics: ${kpiColumns.length}`
      })

      // 2. Main Metric (if any)
      if (kpiColumns.length > 0) {
        const primaryCol = kpiColumns[0].name
        const vals = processedRows
          .map(r => Number(String(r[primaryCol]).replace(/[^\d\.-]/g, '').trim()))
          .filter(v => !isNaN(v))
        const total = vals.reduce((sum, v) => sum + v, 0)
        const avg = vals.length > 0 ? (total / vals.length) : 0
        const max = vals.length > 0 ? vals.reduce((a, b) => Math.max(a, b), -Infinity) : 0

        const isCurrency = primaryCol.toLowerCase().includes('revenue') || 
                           primaryCol.toLowerCase().includes('mrr') || 
                           primaryCol.toLowerCase().includes('amount') || 
                           primaryCol.toLowerCase().includes('spend') || 
                           primaryCol.toLowerCase().includes('price')

        const formatVal = (num: number) => 
          isCurrency ? `$${Math.round(num).toLocaleString()}` : Math.round(num).toLocaleString()

        dynamicKPIs.push({
          label: `Total ${primaryCol}`,
          value: formatVal(total),
          change: `Avg: ${formatVal(avg)} · Max: ${formatVal(max)}`
        })

        // 3. Second Metric (if any)
        if (kpiColumns.length > 1) {
          const secondCol = kpiColumns[1].name
          const vals2 = processedRows
            .map(r => Number(String(r[secondCol]).replace(/[^\d\.-]/g, '').trim()))
            .filter(v => !isNaN(v))
          const total2 = vals2.reduce((sum, v) => sum + v, 0)
          const avg2 = vals2.length > 0 ? (total2 / vals2.length) : 0
          
          dynamicKPIs.push({
            label: `Total ${secondCol}`,
            value: formatVal(total2),
            change: `Avg: ${formatVal(avg2)} · Metrics: ${vals2.length}`
          })
        }
      }

      // 4. Unique Categories (if any category column exists)
      if (categoryColumns.length > 0) {
        const catCol = categoryColumns[0].name
        const uniqueVals = new Set(processedRows.map(r => r[catCol]).filter(Boolean))
        dynamicKPIs.push({
          label: `Unique ${catCol}s`,
          value: uniqueVals.size.toLocaleString(),
          change: `Primary category distribution`
        })
      }
    }

    // Fallback if no metrics/categories found at all
    if (dynamicKPIs.length === 0) {
      dynamicKPIs.push({
        label: 'Total Dataset Rows',
        value: processedRows.length.toString(),
        change: 'No metrics detected'
      })
    }

    // 2. Build Trend Chart
    if (chartColumns.length > 0 && timeColumn) {
      primaryMetric = chartColumns[0].name
      primaryDate = timeColumn.name

      // Before grouping, filter out invalid dates
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

    // 3. Build Donut Chart (first category header)
    if (categoryColumns.length > 0) {
      primaryCategory = categoryColumns[0].name
      const counts: Record<string, number> = {}
      processedRows.forEach((r) => {
        const cVal = r[primaryCategory] || 'None'
        counts[cVal] = (counts[cVal] || 0) + 1
      })

      const totalCount = processedRows.length
      const colors = ['var(--accent)', 'var(--teal)', 'var(--amber)', 'var(--green)', 'var(--red)', '#8b5cf6', '#ec4899']
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
    if (val >= 3000) return 'val-high'
    if (val >= 800) return 'val-medium'
    return 'val-low'
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

  // Seed metrics calculations
  const activeCustomers = customers.filter(c => c.status === 'Active')
  const totalSeedMRR = activeCustomers.reduce((acc, c) => acc + c.mrr, 0)
  const planMRR = activeCustomers.reduce((acc, c) => {
    acc[c.plan] = (acc[c.plan] || 0) + c.mrr
    return acc
  }, {} as Record<string, number>)

  const seedPlanColors: Record<string, string> = {
    Pro: 'var(--accent)',
    Team: 'var(--teal)',
    Enterprise: 'var(--amber)',
  }

  const seedPlanDistribution = Object.entries(planMRR).map(([plan, mrr]) => ({
    label: plan,
    pct: totalSeedMRR > 0 ? Math.round((mrr / totalSeedMRR) * 100) : 0,
    color: seedPlanColors[plan] || 'var(--muted)',
  })).sort((a, b) => b.pct - a.pct)

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
            <button className="btn btn-sm" style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)' }} onClick={() => navigate('/app/ai', { state: { mode: activeSheet ? 'spreadsheet' : 'document' } })}>
              AI Q&amp;A →
            </button>
          </div>
        </div>
      )}
      {reparseMsg && <div style={{ color: 'var(--amber)', fontSize: 12, padding: '4px 8px' }}>⚠️ {reparseMsg}</div>}

      {!isCustomMode ? (
        // --- 1. DEFAULT SEED DASHBOARD ---
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <KPICard label="Total Revenue" value={kpis.revenue.value} change={kpis.revenue.change} up={kpis.revenue.up} />
            <KPICard label="Active Users"  value={kpis.users.value}   change={kpis.users.change}   up={kpis.users.up} />
            <KPICard label="Churn Rate"    value={kpis.churn.value}   change={kpis.churn.change}   up={kpis.churn.up} />
            <KPICard label="Avg. Rev / User" value={kpis.arpu.value}  change={kpis.arpu.change}    up={kpis.arpu.up} />
          </div>

          {/* Charts */}
          <div className="charts-row">
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

            <div className="card donut-card">
              <div className="card-title">Revenue by Plan</div>
              <div className="card-sub">Current distribution</div>
              <div className="donut-wrap">
                <svg width="110" height="110" viewBox="0 0 110 110">
                  <DonutChart data={seedPlanDistribution} />
                </svg>
                <div className="donut-legend">
                  {seedPlanDistribution.map(d => (
                    <div key={d.label} className="donut-legend-item">
                      <span className="donut-dot" style={{ background: d.color }} />
                      <span>{d.label} · {d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="bottom-row">
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
                  <span key={s} className="ai-sug" onClick={() => navigate('/app/ai', { state: { mode: 'spreadsheet', question: s } })}>{s}</span>
                ))}
              </div>
              <button className="btn btn-primary ai-teaser-link" onClick={() => navigate('/app/ai', { state: { mode: 'spreadsheet' } })}>Open AI Assistant →</button>
            </div>

            <div className="card">
              <div className="card-title">Top Customers</div>
              <div className="card-sub">By monthly spend</div>
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
                      <td style={{ color: 'var(--muted)', fontSize: 13 }}>{c.plan}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`mono ${getMRRClass(c.mrr)}`}>
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
        </>
      ) : (
        // --- 2. DYNAMIC AUTO-GENERATED DASHBOARD ---
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            {dynamicKPIs.map((kpi, idx) => (
              <div className="kpi-card" key={idx}>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value">{kpi.value}</div>
                <div className="kpi-change" style={{ color: 'var(--muted)', fontSize: '11px' }}>
                  {kpi.change}
                </div>
              </div>
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
                    <span className="legend-dot" style={{ background: 'var(--accent)' }} />{primaryMetric}
                  </div>
                )}
              </div>
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="dynamicGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey={primaryMetric} name={primaryMetric} stroke="var(--accent)" strokeWidth={2} fill="url(#dynamicGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
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
                  <svg width="110" height="110" viewBox="0 0 110 110">
                    <DonutChart data={donutData} />
                  </svg>
                  <div className="donut-legend" style={{ maxHeight: 110, overflowY: 'auto' }}>
                    {donutData.slice(0, 4).map(d => (
                      <div key={d.label} className="donut-legend-item">
                        <span className="donut-dot" style={{ background: d.color }} />
                        <span style={{ fontSize: 11 }}>{d.label} · {d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
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
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg3)',
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
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
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

function DonutChart({ data }: { data: { label: string; pct: number; color: string }[] }) {
  const r = 42, cx = 55, cy = 55
  const circ = 2 * Math.PI * r
  let offset = 0
  
  // Guard for empty percentages
  const validData = data.filter(d => d.pct > 0)
  if (validData.length === 0) {
    return <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg3)" strokeWidth={18} />
  }

  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg3)" strokeWidth={18} />
      {validData.map(d => {
        const dash = (d.pct / 100) * circ
        const gap = circ - dash
        const el = (
          <circle
            key={d.label}
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
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="600">
        {validData[0].pct}%
      </text>
    </>
  )
}
