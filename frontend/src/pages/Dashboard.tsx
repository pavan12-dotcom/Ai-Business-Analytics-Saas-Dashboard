import React, { useState, useMemo, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { formatNumber, formatYAxisTick, cleanNumericValue } from '../services/dataCleaner'
import { SAMPLE_DATASETS } from '../data/sampleDatasets'
import type { SampleDataset } from '../data/sampleDatasets'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, PieChart, Pie, Legend
} from 'recharts'
import {
  FolderOpen, AlertCircle, Loader2, UploadCloud,
  Users, DollarSign, Star, TrendingUp, Activity,
  BarChart2, RefreshCw, Filter, X, ChevronDown, ChevronUp
} from 'lucide-react'
import './Dashboard.css'

// ── Chart colour palette ──────────────────────────────────────
const COLORS = [
  '#1a9e7a','#2db896','#f59e0b','#6366f1','#ec4899',
  '#14b8a6','#f97316','#8b5cf6','#06b6d4','#10b981'
]

// ── Smart formatters ──────────────────────────────────────────
const fmtVal = (v: number, isCurrency = false) => {
  if (Math.abs(v) >= 1_000_000) return (isCurrency ? '$' : '') + (v / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1_000) return (isCurrency ? '$' : '') + (v / 1_000).toFixed(1) + 'K'
  return isCurrency ? '$' + v.toFixed(2) : v.toLocaleString()
}

// ── Custom tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="sp-tooltip">
      <div className="sp-tooltip-label">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="sp-tooltip-row">
          <span className="sp-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name || p.dataKey}</span>
          <strong>{typeof p.value === 'number' ? fmtVal(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Upload / Sample screen ────────────────────────────────────
function UploadScreen({ onSample, onUpload }: { onSample: (d: SampleDataset) => void; onUpload: () => void }) {
  return (
    <div className="sp-upload-screen">
      <div className="sp-upload-box">
        <div className="sp-upload-icon"><UploadCloud size={36} /></div>
        <h2>Drop your dataset to begin</h2>
        <p>The dashboard will automatically adapt to your data — charts, KPIs and filters update instantly.</p>
        <div className="sp-fmt-row">
          {['CSV', 'Excel', 'JSON', 'PDF'].map(f => <span key={f} className="sp-fmt-chip">{f}</span>)}
        </div>
        <button className="btn btn-primary sp-upload-btn" onClick={onUpload}>
          <FolderOpen size={14} /> Upload Dataset
        </button>
        <div className="sp-or"><span>or try a sample</span></div>
        <div className="sp-sample-grid">
          {SAMPLE_DATASETS.map(ds => (
            <button key={ds.id} className="sp-sample-chip" onClick={() => onSample(ds)}
              style={{ '--chip-color': ds.tagColor } as any}>
              <span className="sp-chip-icon">{ds.icon}</span>
              <div>
                <div className="sp-chip-name">{ds.name}</div>
                <div className="sp-chip-rows">{ds.description.split(' ').slice(0,2).join(' ')} rows</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { activeSheet, analytics, hasData, datasetName, loadSample, upload: ctxUpload, uploadDoc } = useSpreadsheet()
  const { isGuest, isGuestTrialExhausted, setShowSignupModal } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [filterState, setFilterState] = useState<Record<string, Set<string>>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const handleUploadClick = () => {
    if (isGuest && isGuestTrialExhausted()) { setShowSignupModal(true); return }
    fileRef.current?.click()
  }
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setUploadErr(null)
    const isPdf = file.name.toLowerCase().endsWith('.pdf')
    const res = isPdf ? await uploadDoc(file) : await ctxUpload(file)
    setUploading(false)
    if (!res.success) setUploadErr(res.error || 'Upload failed')
    if (fileRef.current) fileRef.current.value = ''
  }
  const handleSample = (ds: SampleDataset) => { loadSample(ds); setFilterState({}) }

  // ── Raw rows ────────────────────────────────────────────────
  const rawRows = activeSheet?.rows || []
  const meta: Record<string, string> = activeSheet?.columns_metadata || {}
  const cols = Object.keys(meta)

  // ── Local Selectors State ──────────────────────────────────
  const [selectedPrimaryMetric, setSelectedPrimaryMetric] = useState<string>('')
  const [selectedSecondaryMetric, setSelectedSecondaryMetric] = useState<string>('')
  const [selectedPrimaryCat, setSelectedPrimaryCat] = useState<string>('')
  const [selectedSecondaryCat, setSelectedSecondaryCat] = useState<string>('')
  const [selectedTertiaryCat, setSelectedTertiaryCat] = useState<string>('')
  const [selectedTimeCol, setSelectedTimeCol] = useState<string>('')

  // Reset selected columns when columns change
  const [lastColsKey, setLastColsKey] = useState('')
  const currentColsKey = cols.join(',')
  if (currentColsKey !== lastColsKey) {
    setLastColsKey(currentColsKey)
    setSelectedPrimaryMetric('')
    setSelectedSecondaryMetric('')
    setSelectedPrimaryCat('')
    setSelectedSecondaryCat('')
    setSelectedTertiaryCat('')
    setSelectedTimeCol('')
  }

  // ── Detect column roles ─────────────────────────────────────
  const catCols = useMemo(() =>
    cols.filter(c => meta[c] === 'category'),
    [cols, meta]
  )
  const metricCols = useMemo(() =>
    cols.filter(c => meta[c] === 'metric'),
    [cols, meta]
  )
  const dateCols = useMemo(() =>
    cols.filter(c => meta[c] === 'time'),
    [cols, meta]
  )

  const primaryMetric = selectedPrimaryMetric || analytics.primaryMetricKey || metricCols[0] || ''
  const secondaryMetric = selectedSecondaryMetric || metricCols.find(c => c !== primaryMetric) || ''
  const primaryCat = selectedPrimaryCat || analytics.primaryCategoryKey || catCols[0] || ''
  const secondaryCat = selectedSecondaryCat || catCols.find(c => c !== primaryCat) || catCols[1] || ''
  const tertiaryCat = selectedTertiaryCat || catCols.find(c => c !== primaryCat && c !== secondaryCat) || catCols[2] || ''
  const primaryTimeKey = selectedTimeCol || analytics.primaryTimeKey || dateCols[0] || ''

  // ── Build filter options (unique values per category col) ───
  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {}
    catCols.forEach(col => {
      const uniq = [...new Set(rawRows.map((r: any) => String(r[col] ?? '')))]
        .filter(Boolean).sort() as string[]
      if (uniq.length >= 2 && uniq.length <= 30) opts[col] = uniq
    })
    return opts
  }, [catCols, rawRows])

  // ── Filtered rows ───────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!rawRows.length) return []
    return rawRows.filter((row: any) => {
      return Object.entries(filterState).every(([col, chosen]) => {
        if (!chosen.size) return true
        return chosen.has(String(row[col] ?? ''))
      })
    })
  }, [rawRows, filterState])

  const toggleFilter = (col: string, val: string) => {
    setFilterState(prev => {
      const next = { ...prev }
      const cur = new Set(next[col] || [])
      cur.has(val) ? cur.delete(val) : cur.add(val)
      next[col] = cur
      return next
    })
  }

  const clearAll = () => setFilterState({})
  const activeFilterCount = Object.values(filterState).reduce((s, v) => s + v.size, 0)

  // ── KPI computations ───────────────────────────────────────
  const kpis = useMemo(() => {
    const totalRows = filteredRows.length
    if (!totalRows) return []
    const result = []

    // KPI 1: total rows / entity count
    result.push({
      icon: Users,
      color: '#1a9e7a',
      bg: '#1a9e7a18',
      label: `Total ${analytics.entityName || 'Records'}`,
      value: fmtVal(totalRows),
      sub: `of ${fmtVal(rawRows.length)} total`
    })

    // KPI 2: sum of primary metric
    if (primaryMetric) {
      const sum = filteredRows.reduce((s: number, r: any) => {
        const v = cleanNumericValue(r[primaryMetric])
        return s + (v ?? 0)
      }, 0)
      const avg = sum / totalRows
      const isCurr = sum > 1000
      result.push({
        icon: DollarSign,
        color: '#6366f1',
        bg: '#6366f118',
        label: `Total ${primaryMetric}`,
        value: fmtVal(sum, isCurr),
        sub: `Avg ${fmtVal(avg, isCurr)}`
      })
    }

    // KPI 3: avg of second metric or avg of primary
    const targetMetric = secondaryMetric || primaryMetric
    if (targetMetric) {
      const vals = filteredRows.map((r: any) => cleanNumericValue(r[targetMetric])).filter((v: number | null) => v !== null) as number[]
      const avg = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0
      result.push({
        icon: Star,
        color: '#f59e0b',
        bg: '#f59e0b18',
        label: `Avg ${targetMetric}`,
        value: fmtVal(avg),
        sub: `from ${fmtVal(vals.length)} values`
      })
    }

    return result
  }, [filteredRows, primaryMetric, secondaryMetric, analytics.entityName, rawRows.length])

  // ── Aggregate helper ────────────────────────────────────────
  const aggregateBy = (rows: any[], groupCol: string, valueCol: string, mode: 'sum' | 'count' = 'sum') => {
    if (!groupCol) return []
    const map: Record<string, number> = {}
    rows.forEach((r: any) => {
      const key = String(r[groupCol] ?? 'Unknown')
      if (!key || key === 'undefined') return
      if (mode === 'count') {
        map[key] = (map[key] || 0) + 1
      } else {
        const v = valueCol ? cleanNumericValue(r[valueCol]) : null
        map[key] = (map[key] || 0) + (v ?? 0)
      }
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }

  // ── Chart data ──────────────────────────────────────────────
  const donutData = useMemo(() => {
    const agg = aggregateBy(filteredRows, primaryCat, '', 'count')
    const total = agg.reduce((s, d) => s + d.value, 0)
    return agg.map((d, i) => ({ ...d, pct: total > 0 ? Math.round(d.value / total * 100) : 0, fill: COLORS[i % COLORS.length] }))
  }, [filteredRows, primaryCat])

  const barData1 = useMemo(() =>
    aggregateBy(filteredRows, primaryCat, primaryMetric, 'sum'),
    [filteredRows, primaryCat, primaryMetric]
  )

  const barData2 = useMemo(() =>
    aggregateBy(filteredRows, secondaryCat || primaryCat, secondaryMetric, secondaryMetric ? 'sum' : 'count'),
    [filteredRows, secondaryCat, primaryCat, secondaryMetric]
  )

  const hBarData2 = useMemo(() =>
    aggregateBy(filteredRows, tertiaryCat || secondaryCat || primaryCat, '', 'count'),
    [filteredRows, tertiaryCat, secondaryCat, primaryCat]
  )

  const trendData = useMemo(() => {
    if (!primaryTimeKey || !primaryMetric || !filteredRows.length) return []
    const groups: Record<string, { sum: number; count: number; dateObj: Date }> = {}
    
    filteredRows.forEach((r: any) => {
      const rawDate = r[primaryTimeKey]
      if (!rawDate) return
      const d = new Date(rawDate)
      if (isNaN(d.getTime())) return
      
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      const val = cleanNumericValue(r[primaryMetric]) || 0
      
      if (!groups[key]) {
        const sortDate = new Date(d.getFullYear(), d.getMonth(), 1)
        groups[key] = { sum: 0, count: 0, dateObj: sortDate }
      }
      groups[key].sum += val
      groups[key].count += 1
    })

    return Object.entries(groups)
      .map(([date, info]) => ({
        date,
        value: Math.round(info.sum),
        count: info.count,
        dateObj: info.dateObj
      }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
  }, [filteredRows, primaryTimeKey, primaryMetric])

  // ── Dashboard title ─────────────────────────────────────────
  const dashTitle = hasData
    ? `${analytics.datasetType || 'Business'} Analytics Dashboard`
    : 'Analytics Dashboard'

  // ── Label truncator ─────────────────────────────────────────
  const trunc = (s: string, n = 12) => s.length > n ? s.slice(0, n - 1) + '…' : s

  if (!hasData) {
    return (
      <>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
        <UploadScreen onSample={handleSample} onUpload={handleUploadClick} />
      </>
    )
  }

  return (
    <div className="sp-root fade-in">
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* ── Top Header Bar ────────────────────────────────── */}
      <div className="sp-header">
        <div className="sp-header-left">
          <BarChart2 size={18} style={{ color: '#fff' }} />
          <span className="sp-header-title">{dashTitle}</span>
        </div>
        <div className="sp-header-right">
          {activeFilterCount > 0 && (
            <button className="sp-clear-btn" onClick={clearAll}>
              <X size={11} /> Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
            </button>
          )}
          <span className="sp-header-meta">{formatNumber(filteredRows.length)} / {formatNumber(rawRows.length)} rows</span>
          <button className="sp-change-btn" onClick={handleUploadClick}>
            <FolderOpen size={12} /> Change Dataset
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="sp-body">

        {/* LEFT FILTER PANEL */}
        <aside className="sp-sidebar">
          <div className="sp-sidebar-heading">
            <Filter size={12} />
            <span>Filters</span>
          </div>

          {Object.keys(filterOptions).length === 0 && (
            <p className="sp-no-filters">No categorical columns detected</p>
          )}

          {Object.entries(filterOptions).map(([col, options]) => {
            const chosen = filterState[col] || new Set()
            const isCollapsed = collapsed[col]
            const visible = isCollapsed ? options.slice(0, 4) : options
            return (
              <div key={col} className="sp-filter-group">
                <div className="sp-filter-group-title"
                  onClick={() => setCollapsed(p => ({ ...p, [col]: !p[col] }))}>
                  <span>{col}</span>
                  {isCollapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                </div>
                <div className="sp-filter-options">
                  {visible.map(val => {
                    const active = chosen.has(val)
                    return (
                      <label key={val} className={`sp-filter-chip ${active ? 'sp-chip-active' : ''}`}>
                        <input type="checkbox" checked={active}
                          onChange={() => toggleFilter(col, val)} />
                        <span className="sp-chip-check" />
                        <span className="sp-chip-label">{val}</span>
                      </label>
                    )
                  })}
                  {options.length > 4 && (
                    <button className="sp-show-more"
                      onClick={() => setCollapsed(p => ({ ...p, [col]: !p[col] }))}>
                      {isCollapsed ? `Show ${options.length - 4} more…` : 'Show less'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </aside>

        {/* MAIN CONTENT */}
        <main className="sp-main">

          {/* Controls Bar */}
          <div className="sp-controls-bar">
            <div className="sp-control-item">
              <span className="sp-control-label">Time Axis:</span>
              <select className="sp-control-select" value={primaryTimeKey} onChange={e => setSelectedTimeCol(e.target.value)}>
                {dateCols.map(c => <option key={c} value={c}>{c}</option>)}
                {dateCols.length === 0 && <option value="">No Date Column</option>}
              </select>
            </div>
            <div className="sp-control-item">
              <span className="sp-control-label">Primary Group:</span>
              <select className="sp-control-select" value={primaryCat} onChange={e => setSelectedPrimaryCat(e.target.value)}>
                {catCols.map(c => <option key={c} value={c}>{c}</option>)}
                {catCols.length === 0 && <option value="">No Group Column</option>}
              </select>
            </div>
            <div className="sp-control-item">
              <span className="sp-control-label">Secondary Group:</span>
              <select className="sp-control-select" value={secondaryCat} onChange={e => setSelectedSecondaryCat(e.target.value)}>
                {catCols.map(c => <option key={c} value={c}>{c}</option>)}
                {catCols.length === 0 && <option value="">No Group Column</option>}
              </select>
            </div>
            <div className="sp-control-item">
              <span className="sp-control-label">Tertiary Group:</span>
              <select className="sp-control-select" value={tertiaryCat} onChange={e => setSelectedTertiaryCat(e.target.value)}>
                {catCols.map(c => <option key={c} value={c}>{c}</option>)}
                {catCols.length === 0 && <option value="">No Group Column</option>}
              </select>
            </div>
            <div className="sp-control-item">
              <span className="sp-control-label">Value Metric:</span>
              <select className="sp-control-select" value={primaryMetric} onChange={e => setSelectedPrimaryMetric(e.target.value)}>
                {metricCols.map(c => <option key={c} value={c}>{c}</option>)}
                {metricCols.length === 0 && <option value="">No Metric Column</option>}
              </select>
            </div>
            <div className="sp-control-item">
              <span className="sp-control-label">Secondary Metric:</span>
              <select className="sp-control-select" value={secondaryMetric} onChange={e => setSelectedSecondaryMetric(e.target.value)}>
                {metricCols.map(c => <option key={c} value={c}>{c}</option>)}
                {metricCols.length === 0 && <option value="">No Metric Column</option>}
              </select>
            </div>
          </div>

          {/* ROW 1: KPI Cards */}
          <div className="sp-kpi-row">
            {kpis.map((k, i) => (
              <div key={i} className="sp-kpi-card" style={{ '--kpi-color': k.color, '--kpi-bg': k.bg } as any}>
                <div className="sp-kpi-icon-wrap">
                  <k.icon size={20} style={{ color: k.color }} />
                </div>
                <div className="sp-kpi-body">
                  <div className="sp-kpi-value">{k.value}</div>
                  <div className="sp-kpi-label">{k.label}</div>
                  <div className="sp-kpi-sub">{k.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ROW 2: Trend | Donut | Bar1 */}
          <div className="sp-chart-row sp-row2">

            {/* Trend Chart */}
            <div className="sp-card sp-trend-card">
              <div className="sp-card-title">{primaryMetric || 'Value'} Trend over Time</div>
              {trendData.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1a9e7a" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#1a9e7a" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={s => fmtVal(s)} tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        axisLine={false} tickLine={false} width={36} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="value" name={primaryMetric} stroke="#1a9e7a" strokeWidth={2} fillOpacity={1} fill="url(#trendGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="sp-empty">No time series data</div>}
            </div>

            {/* Donut */}
            <div className="sp-card sp-donut-card">
              <div className="sp-card-title">% by {primaryCat || 'Category'}</div>
              {donutData.length > 0 ? (
                <div className="sp-donut-wrap">
                  <div className="sp-donut-svg">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={32}
                          outerRadius={52}
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="sp-donut-legend">
                    {donutData.slice(0, 5).map((d, i) => (
                      <div key={i} className="sp-legend-item">
                        <span className="sp-legend-dot" style={{ background: d.fill }} />
                        <span className="sp-legend-name">{trunc(d.name, 14)}</span>
                        <span className="sp-legend-pct">{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="sp-empty">No data</div>}
            </div>

            {/* Bar Chart 1 */}
            <div className="sp-card sp-bar-card">
              <div className="sp-card-title">{primaryMetric || 'Value'} by {primaryCat || 'Category'}</div>
              {barData1.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData1} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        tickFormatter={s => trunc(s, 9)} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={s => fmtVal(s)} tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        axisLine={false} tickLine={false} width={36} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name={primaryMetric} radius={[3, 3, 0, 0]} maxBarSize={32}>
                        {barData1.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="sp-empty">No data</div>}
            </div>
          </div>

          {/* ROW 3: Bar2 | H-Bar2 */}
          <div className="sp-chart-row sp-row3">

            {/* Bar Chart 2 */}
            <div className="sp-card sp-bar-card">
              <div className="sp-card-title">
                {secondaryMetric || 'Count'} by {secondaryCat || primaryCat || 'Category'}
              </div>
              {barData2.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData2} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="35%">
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        tickFormatter={s => trunc(s, 9)} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={s => fmtVal(s)} tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        axisLine={false} tickLine={false} width={36} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name={secondaryMetric || 'Count'} radius={[3, 3, 0, 0]} maxBarSize={32}>
                        {barData2.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="sp-empty">No data</div>}
            </div>

            {/* H-Bar 2 */}
            <div className="sp-card sp-hbar-card">
              <div className="sp-card-title">
                Count by {tertiaryCat || secondaryCat || primaryCat || 'Group'}
              </div>
              {hBarData2.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hBarData2} layout="vertical"
                      margin={{ top: 2, right: 36, left: 0, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={s => fmtVal(s)}
                        tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={82}
                        tick={{ fontSize: 9, fill: 'var(--text)' }}
                        tickFormatter={s => trunc(s, 12)} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Count" radius={[0, 3, 3, 0]} maxBarSize={16}>
                        {hBarData2.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="sp-empty">No data</div>}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
