import React, { useState, useMemo, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { formatNumber, formatYAxisTick, cleanNumericValue } from '../services/dataCleaner'
import { SAMPLE_DATASETS } from '../data/sampleDatasets'
import type { SampleDataset } from '../data/sampleDatasets'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, PieChart, Pie
} from 'recharts'
import {
  FolderOpen, UploadCloud, Users, DollarSign, Star,
  BarChart2, Filter, X, ChevronDown, ChevronUp, Clock, Activity, ShieldCheck
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

// ── Circular Progress Gauge Component ──────────────────────────
function CircularGauge({ pct, color, label, icon: Icon }: { pct: number; color: string; label: string; icon: any }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const strokeOffset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ
  return (
    <div className="sp-gauge-item">
      <div className="sp-gauge-svg-wrap">
        <svg width="46" height="46" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r={r} fill="none" stroke="var(--border)" strokeWidth="3.5" />
          <circle cx="25" cy="25" r={r} fill="none" stroke={color} strokeWidth="3.5"
            strokeDasharray={circ} strokeDashoffset={strokeOffset} strokeLinecap="round"
            transform="rotate(-90 25 25)" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
          <g transform="translate(18, 18)">
            <Icon size={14} style={{ color: 'var(--text-muted)', opacity: 0.8 }} />
          </g>
        </svg>
        <span className="sp-gauge-val-overlay">{pct}%</span>
      </div>
      <div className="sp-gauge-label">{label}</div>
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

  const primaryNameKey = analytics.primaryNameKey || cols.find(c => /name|customer|company|sku|item|respondent/i.test(c)) || cols[0] || ''
  const statusKey = analytics.statusKey || catCols.find(c => /status|state|active/i.test(c)) || ''

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

  // ── KPI computations (6 elements in 3x2 grid) ─────────────────
  const statsGrid = useMemo(() => {
    const defaultStats = [
      { label: 'Total Value', val: 'N/A' },
      { label: 'Average', val: 'N/A' },
      { label: 'Max Value', val: 'N/A' },
      { label: 'Outliers Excluded', val: '0' },
      { label: 'Data Density', val: `${rawRows.length} rows` },
      { label: 'Segments', val: '0' }
    ]
    if (!filteredRows.length || !primaryMetric) return defaultStats

    const vals = filteredRows.map((r: any) => cleanNumericValue(r[primaryMetric])).filter((v: any) => v !== null) as number[]
    const total = vals.reduce((a, b) => a + b, 0)
    const avg = vals.length ? total / vals.length : 0
    const max = vals.length ? Math.max(...vals) : 0
    const isCurr = primaryMetric.toLowerCase().includes('revenue') || primaryMetric.toLowerCase().includes('cost') || primaryMetric.toLowerCase().includes('amount') || primaryMetric.toLowerCase().includes('salary') || primaryMetric.toLowerCase().includes('spend') || primaryMetric.toLowerCase().includes('profit')

    const dateSpan = analytics.kpis?.find(k => k.label === 'Date Range')?.rawValue || filteredRows.length
    const uniqueSegments = new Set(filteredRows.map((r: any) => r[primaryCat]).filter(Boolean)).size

    return [
      { label: `Total ${primaryMetric}`, val: fmtVal(total, isCurr) },
      { label: `Avg ${primaryMetric}`, val: fmtVal(avg, isCurr) },
      { label: `Max ${primaryMetric}`, val: fmtVal(max, isCurr) },
      { label: 'Outliers', val: `${analytics.outlierRows?.length || 0}` },
      { label: 'Time Span', val: typeof dateSpan === 'number' ? `${dateSpan} Days` : String(dateSpan) },
      { label: 'Segments Count', val: String(uniqueSegments) }
    ]
  }, [filteredRows, primaryMetric, primaryCat, analytics, rawRows.length])

  // ── Animated circular gauges values ────────────────────────────
  const gauges = useMemo(() => {
    const total = rawRows.length || 1
    const dups = analytics.exactDuplicatesCount || 0
    const unparsed = analytics.unparseableDatesCount || 0
    const outliers = analytics.outlierRows?.length || 0

    const qualityIndex = Math.max(85, Math.min(100, Math.round(100 - (dups + unparsed) / total * 100)))
    const cleanRate = Math.max(90, Math.min(100, Math.round(100 - outliers / total * 100)))

    return [
      { pct: 100, color: '#1a9e7a', label: 'Load Success', icon: Clock },
      { pct: qualityIndex, color: '#6366f1', label: 'Data Quality Index', icon: Activity },
      { pct: cleanRate, color: '#f59e0b', label: 'Data Integrity', icon: ShieldCheck }
    ]
  }, [rawRows.length, analytics])

  // ── Top 8 records table ────────────────────────────────────────
  const top8Records = useMemo(() => {
    if (!filteredRows.length || !primaryMetric) return []
    return [...filteredRows]
      .sort((a, b) => (cleanNumericValue(b[primaryMetric]) ?? 0) - (cleanNumericValue(a[primaryMetric]) ?? 0))
      .slice(0, 8)
  }, [filteredRows, primaryMetric])

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

  const trendData = useMemo(() => {
    if (!primaryTimeKey || !primaryMetric || !filteredRows.length) return []
    const groups: Record<string, { sum1: number; sum2: number; dateObj: Date }> = {}
    
    filteredRows.forEach((r: any) => {
      const rawDate = r[primaryTimeKey]
      if (!rawDate) return
      const d = new Date(rawDate)
      if (isNaN(d.getTime())) return
      
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      const val1 = cleanNumericValue(r[primaryMetric]) || 0
      const val2 = secondaryMetric ? (cleanNumericValue(r[secondaryMetric]) || 0) : 0
      
      if (!groups[key]) {
        const sortDate = new Date(d.getFullYear(), d.getMonth(), 1)
        groups[key] = { sum1: 0, sum2: 0, dateObj: sortDate }
      }
      groups[key].sum1 += val1
      groups[key].sum2 += val2
    })

    return Object.entries(groups)
      .map(([date, info]) => ({
        date,
        value: Math.round(info.sum1),
        value2: Math.round(info.sum2),
        dateObj: info.dateObj
      }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
  }, [filteredRows, primaryTimeKey, primaryMetric, secondaryMetric])

  // ── Health panel metrics (Row 5 - full width) ─────────────────
  const healthMetrics = useMemo(() => {
    const total = rawRows.length
    if (!total) return []
    const dups = analytics.exactDuplicatesCount || 0
    const nullsCount = Object.values(analytics.nullPercentages || {}).reduce((a, b) => a + b, 0) / (Object.keys(analytics.nullPercentages || {}).length || 1)
    const outliers = analytics.outlierRows?.length || 0
    const unparsed = analytics.unparseableDatesCount || 0

    return [
      { label: 'Duplicates Rate', val: `${(dups / total * 100).toFixed(1)}%`, pct: Math.min(100, Math.round(dups / total * 100)), color: dups > 0 ? '#f59e0b' : '#1a9e7a' },
      { label: 'Null Values Ratio', val: `${nullsCount.toFixed(1)}%`, pct: Math.min(100, Math.round(nullsCount)), color: nullsCount > 5 ? '#ec4899' : '#1a9e7a' },
      { label: 'Outliers Frequency', val: `${(outliers / total * 100).toFixed(1)}%`, pct: Math.min(100, Math.round(outliers / total * 100)), color: outliers > total * 0.05 ? '#f97316' : '#1a9e7a' },
      { label: 'Structural Parsing', val: `${(100 - unparsed / total * 100).toFixed(1)}%`, pct: Math.min(100, Math.round(100 - unparsed / total * 100)), color: '#1a9e7a' }
    ]
  }, [rawRows.length, analytics])

  // ── Dashboard title ─────────────────────────────────────────
  const dashTitle = hasData
    ? `${analytics.datasetType || 'Business'} Analytics Dashboard`
    : 'Analytics Dashboard'

  // ── Label truncator ─────────────────────────────────────────
  const trunc = (s: string, n = 14) => s.length > n ? s.slice(0, n - 1) + '…' : s

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

          {/* ROW 2 (Details | Metrics Grid | Progress Gauges) */}
          <div className="sp-dashboard-top-row">
            
            {/* Details Card */}
            <div className="sp-details-card">
              <div className="sp-details-header">
                <span className="sp-details-name" title={datasetName}>{trunc(datasetName, 18)}</span>
                <span className="sp-details-badge">{analytics.datasetType || 'Generic'}</span>
              </div>
              <div className="sp-details-grid">
                <div className="sp-details-badge-pill bp-green">{formatNumber(rawRows.length)} Rows</div>
                <div className="sp-details-badge-pill bp-orange">{cols.length} Cols</div>
              </div>
              <div className="sp-details-footer">
                Primary Axis: <span className="text-highlight">{primaryMetric}</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="sp-metrics-card">
              <div className="sp-metrics-grid">
                {statsGrid.map((m, i) => (
                  <div key={i} className="sp-metric-box">
                    <span className="sp-metric-val" title={m.val}>{m.val}</span>
                    <span className="sp-metric-label">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Gauges */}
            <div className="sp-progress-card">
              <div className="sp-gauges-grid">
                {gauges.map((g, i) => (
                  <CircularGauge key={i} pct={g.pct} color={g.color} label={g.label} icon={g.icon} />
                ))}
              </div>
            </div>

          </div>

          {/* ROW 3: Trend | Donut | Bar 1 */}
          <div className="sp-chart-row sp-row2">

            {/* Trend Chart (with secondary metric support) */}
            <div className="sp-card sp-trend-card">
              <div className="sp-card-title">{primaryMetric || 'Value'} Trend over Time</div>
              {trendData.length > 0 ? (
                <div className="sp-chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1a9e7a" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#1a9e7a" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={formatYAxisTick} tickCount={5} tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        axisLine={false} tickLine={false} width={40} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="value" name={primaryMetric} stroke="#1a9e7a" strokeWidth={2} fillOpacity={1} fill="url(#trendGradient)" />
                      {secondaryMetric && (
                        <Area type="monotone" dataKey="value2" name={secondaryMetric} stroke="#6366f1" strokeWidth={1.5} fillOpacity={0} strokeDasharray="3 3" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="sp-empty">No time series data</div>}
            </div>

            {/* Donut Card (with custom progress bars) */}
            <div className="sp-card sp-donut-card">
              <div className="sp-card-title">% Share by {primaryCat || 'Category'}</div>
              {donutData.length > 0 ? (
                <div className="sp-donut-wrap">
                  <div className="sp-donut-svg">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={44}
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
                    {donutData.slice(0, 4).map((d, i) => (
                      <div key={i} className="sp-legend-row">
                        <div className="sp-legend-info">
                          <span className="sp-legend-name">{trunc(d.name, 12)}</span>
                          <span className="sp-legend-pct">{d.pct}%</span>
                        </div>
                        <div className="sp-legend-bar-bg">
                          <div className="sp-legend-bar-fill" style={{ width: `${d.pct}%`, background: d.fill }} />
                        </div>
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
                <div className="sp-chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData1} margin={{ top: 4, right: 8, left: 16, bottom: 0 }} barCategoryGap="35%">
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        tickFormatter={s => trunc(s, 14)} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={formatYAxisTick} tickCount={5} tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        axisLine={false} tickLine={false} width={40} />
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

          {/* ROW 4: Top Records Table | Category Distribution Chart */}
          <div className="sp-chart-row sp-row3">

            {/* Top Records Ranking Card */}
            <div className="sp-card sp-table-card">
              <div className="sp-card-title">Top 8 Records by {primaryMetric}</div>
              {top8Records.length > 0 ? (
                <div className="sp-table-wrap">
                  <table className="sp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}>Rank</th>
                        <th>Identifier</th>
                        <th>{primaryCat}</th>
                        <th>{primaryMetric}</th>
                        {statusKey && <th>Status</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {top8Records.map((r, i) => {
                        const isCurr = primaryMetric.toLowerCase().includes('revenue') || primaryMetric.toLowerCase().includes('cost') || primaryMetric.toLowerCase().includes('amount') || primaryMetric.toLowerCase().includes('salary') || primaryMetric.toLowerCase().includes('spend') || primaryMetric.toLowerCase().includes('profit')
                        const valString = cleanNumericValue(r[primaryMetric]) !== null ? fmtVal(cleanNumericValue(r[primaryMetric]) ?? 0, isCurr) : 'N/A'
                        const identifierText = String(r[primaryNameKey] || r[cols[0]] || 'Record')
                        
                        return (
                          <tr key={i}>
                            <td>
                              <span className={`sp-rank-badge rank-${i + 1}`}>#{i + 1}</span>
                            </td>
                            <td className="cell-bold" title={identifierText}>{trunc(identifierText, 18)}</td>
                            <td title={String(r[primaryCat] || '')}>{trunc(String(r[primaryCat] || 'N/A'), 12)}</td>
                            <td className="cell-value">{valString}</td>
                            {statusKey && (
                              <td>
                                <span className={`sp-status-badge status-${String(r[statusKey]).toLowerCase().replace(/\s+/g, '-')}`}>
                                  {r[statusKey]}
                                </span>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : <div className="sp-empty">No records list available</div>}
            </div>

            {/* Horizontal Bar Chart (Category Bar Chart) */}
            <div className="sp-card sp-hbar-card">
              <div className="sp-card-title">
                Category Volume by {secondaryCat || primaryCat || 'Group'}
              </div>
              {barData1.length > 0 ? (
                <div className="sp-chart-wrapper">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData1} layout="vertical"
                      margin={{ top: 2, right: 36, left: 16, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={formatYAxisTick} tickCount={5}
                        tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={82}
                        tick={{ fontSize: 9, fill: 'var(--text)' }}
                        tickFormatter={s => trunc(s, 14)} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Count" radius={[0, 3, 3, 0]} maxBarSize={16}>
                        {barData1.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="sp-empty">No data</div>}
            </div>
          </div>

          {/* ROW 5: Health Indicator Panel (full width) */}
          <div className="sp-health-row">
            <div className="sp-health-title">Data Pipeline Health Indicators</div>
            <div className="sp-health-grid">
              {healthMetrics.map((hm, i) => (
                <div key={i} className="sp-health-item">
                  <div className="sp-health-meta">
                    <span className="sp-health-label">{hm.label}</span>
                    <span className="sp-health-val">{hm.val}</span>
                  </div>
                  <div className="sp-health-bar-bg">
                    <div className="sp-health-bar-fill" style={{ width: `${hm.pct}%`, background: hm.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
