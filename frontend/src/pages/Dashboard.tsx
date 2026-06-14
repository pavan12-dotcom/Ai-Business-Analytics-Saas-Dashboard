import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
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
  FolderOpen, UploadCloud, TrendingUp, Database, Layers,
  BarChart2, Filter, X, ChevronDown, ChevronUp, Maximize2, Minimize2
} from 'lucide-react'
import './Dashboard.css'

// ── Palette ───────────────────────────────────────────────────
const COLORS = [
  '#1a9e7a','#6366f1','#f59e0b','#ec4899',
  '#14b8a6','#f97316','#8b5cf6','#06b6d4','#10b981','#2dd4bf'
]

// ── Smart value formatter ─────────────────────────────────────
const fmtVal = (v: number, isCurrency = false) => {
  if (Math.abs(v) >= 1_000_000) return (isCurrency ? '$' : '') + (v / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(v) >= 1_000)     return (isCurrency ? '$' : '') + (v / 1_000).toFixed(1) + 'K'
  return isCurrency ? '$' + v.toFixed(2) : v.toLocaleString()
}

// ── Tooltip ───────────────────────────────────────────────────
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

// ── Upload Screen ─────────────────────────────────────────────
function UploadScreen({ onSample, onUpload }: { onSample: (d: SampleDataset) => void; onUpload: () => void }) {
  return (
    <div className="sp-upload-screen">
      <div className="sp-upload-box">
        <div className="sp-upload-icon"><UploadCloud size={34} /></div>
        <h2>Drop your dataset to begin</h2>
        <p>The dashboard automatically adapts to your data — charts, KPIs and filters update instantly.</p>
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
                <div className="sp-chip-rows">{ds.description.split(' ').slice(0, 2).join(' ')} rows</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { activeSheet, analytics, hasData, datasetName, loadSample, upload: ctxUpload, uploadDoc } = useSpreadsheet()
  const { isGuest, isGuestTrialExhausted, setShowSignupModal } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [filterState, setFilterState] = useState<Record<string, Set<string>>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Track native fullscreen change (e.g. user presses Esc)
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await rootRef.current?.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }, [])

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

  // ── Raw data ────────────────────────────────────────────────
  const rawRows = activeSheet?.rows || []
  const meta: Record<string, string> = activeSheet?.columns_metadata || {}
  const cols = Object.keys(meta)

  // ── Column selectors ────────────────────────────────────────
  const [selPrimMetric, setSelPrimMetric] = useState('')
  const [selSecMetric,  setSelSecMetric]  = useState('')
  const [selPrimCat,    setSelPrimCat]    = useState('')
  const [selTimeCol,    setSelTimeCol]    = useState('')

  // Reset when dataset changes
  const [lastKey, setLastKey] = useState('')
  const curKey = cols.join(',')
  if (curKey !== lastKey) {
    setLastKey(curKey)
    setSelPrimMetric(''); setSelSecMetric(''); setSelPrimCat(''); setSelTimeCol('')
  }

  const catCols    = useMemo(() => cols.filter(c => meta[c] === 'category'), [cols, meta])
  const metricCols = useMemo(() => cols.filter(c => meta[c] === 'metric'),   [cols, meta])
  const dateCols   = useMemo(() => cols.filter(c => meta[c] === 'time'),     [cols, meta])

  const primaryMetric = selPrimMetric || analytics.primaryMetricKey || metricCols[0] || ''
  const secondMetric  = selSecMetric  || metricCols.find(c => c !== primaryMetric) || ''
  const primaryCat    = selPrimCat    || analytics.primaryCategoryKey || catCols[0] || ''
  const secondCat     = catCols.find(c => c !== primaryCat) || catCols[1] || ''
  const timeKey       = selTimeCol    || analytics.primaryTimeKey || dateCols[0] || ''

  // ── Filter options ──────────────────────────────────────────
  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {}
    catCols.forEach(col => {
      const uniq = [...new Set(rawRows.map((r: any) => String(r[col] ?? '')))].filter(Boolean).sort() as string[]
      if (uniq.length >= 2 && uniq.length <= 30) opts[col] = uniq
    })
    return opts
  }, [catCols, rawRows])

  // ── Filtered rows ───────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!rawRows.length) return []
    return rawRows.filter((row: any) =>
      Object.entries(filterState).every(([col, chosen]) =>
        !chosen.size || chosen.has(String(row[col] ?? ''))
      )
    )
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

  // ── KPIs (3 cards) ──────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!filteredRows.length || !primaryMetric) return [
      { label: 'Total Value', val: '—', icon: TrendingUp,  color: '#1a9e7a', bg: 'rgba(26,158,122,0.1)' },
      { label: 'Avg per Record', val: '—', icon: Database, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
      { label: 'Segments',     val: '—', icon: Layers,     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    ]
    const vals = filteredRows.map((r: any) => cleanNumericValue(r[primaryMetric])).filter((v: any) => v !== null) as number[]
    const total = vals.reduce((a, b) => a + b, 0)
    const avg   = vals.length ? total / vals.length : 0
    const segs  = new Set(filteredRows.map((r: any) => r[primaryCat]).filter(Boolean)).size
    const isCurr = /revenue|cost|amount|salary|spend|profit/i.test(primaryMetric)
    return [
      { label: `Total ${primaryMetric}`, val: fmtVal(total, isCurr), icon: TrendingUp, color: '#1a9e7a', bg: 'rgba(26,158,122,0.1)' },
      { label: `Avg ${primaryMetric}`,   val: fmtVal(avg,   isCurr), icon: Database,   color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
      { label: 'Unique Segments',        val: String(segs),           icon: Layers,     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    ]
  }, [filteredRows, primaryMetric, primaryCat])

  // ── Aggregate helper ────────────────────────────────────────
  const agg = (rows: any[], groupCol: string, valCol: string, mode: 'sum'|'count' = 'sum') => {
    if (!groupCol) return []
    const map: Record<string, number> = {}
    rows.forEach((r: any) => {
      const k = String(r[groupCol] ?? 'Unknown')
      if (!k || k === 'undefined') return
      map[k] = (map[k] || 0) + (mode === 'count' ? 1 : (cleanNumericValue(r[valCol]) ?? 0))
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }

  // ── Chart data ──────────────────────────────────────────────
  const barData = useMemo(() => agg(filteredRows, primaryCat, primaryMetric, 'sum'), [filteredRows, primaryCat, primaryMetric])
  const hbarData = useMemo(() => agg(filteredRows, secondCat || primaryCat, primaryMetric, 'sum'), [filteredRows, secondCat, primaryCat, primaryMetric])

  const donutData = useMemo(() => {
    const d = agg(filteredRows, primaryCat, '', 'count')
    const tot = d.reduce((s, x) => s + x.value, 0)
    return d.map((x, i) => ({ ...x, pct: tot > 0 ? Math.round(x.value / tot * 100) : 0, fill: COLORS[i % COLORS.length] }))
  }, [filteredRows, primaryCat])

  const trendData = useMemo(() => {
    if (!timeKey || !primaryMetric || !filteredRows.length) return []
    const groups: Record<string, { s1: number; s2: number; d: Date }> = {}
    filteredRows.forEach((r: any) => {
      const raw = r[timeKey]; if (!raw) return
      const dt = new Date(raw); if (isNaN(dt.getTime())) return
      const key = dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      const v1 = cleanNumericValue(r[primaryMetric]) || 0
      const v2 = secondMetric ? (cleanNumericValue(r[secondMetric]) || 0) : 0
      if (!groups[key]) groups[key] = { s1: 0, s2: 0, d: new Date(dt.getFullYear(), dt.getMonth(), 1) }
      groups[key].s1 += v1; groups[key].s2 += v2
    })
    return Object.entries(groups)
      .map(([date, g]) => ({ date, value: Math.round(g.s1), value2: Math.round(g.s2), _d: g.d }))
      .sort((a, b) => a._d.getTime() - b._d.getTime())
  }, [filteredRows, timeKey, primaryMetric, secondMetric])

  const trunc = (s: string, n = 12) => s.length > n ? s.slice(0, n - 1) + '…' : s
  const dashTitle = hasData ? `${analytics.datasetType || 'Business'} Analytics` : 'Analytics Dashboard'

  if (!hasData) {
    return (
      <>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
        <UploadScreen onSample={handleSample} onUpload={handleUploadClick} />
      </>
    )
  }

  return (
    <div className={`sp-root fade-in${isFullscreen ? ' sp-fullscreen' : ''}`} ref={rootRef}>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sp-header">
        <div className="sp-header-left">
          <BarChart2 size={17} style={{ color: '#fff' }} />
          <span className="sp-header-title">{dashTitle}</span>
          <span className="sp-header-ds">{trunc(datasetName, 22)}</span>
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
          <button className="sp-fs-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}>
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="sp-body">

        {/* Sidebar */}
        <aside className="sp-sidebar">
          <div className="sp-sidebar-hd"><Filter size={11} /><span>Filters</span></div>
          {Object.keys(filterOptions).length === 0 && (
            <p className="sp-no-filters">No categorical columns</p>
          )}
          {Object.entries(filterOptions).map(([col, options]) => {
            const chosen = filterState[col] || new Set()
            const isOpen = !collapsed[col]
            const visible = isOpen ? options : options.slice(0, 4)
            return (
              <div key={col} className="sp-fg">
                <div className="sp-fg-title" onClick={() => setCollapsed(p => ({ ...p, [col]: !p[col] }))}>
                  <span>{col}</span>
                  {isOpen ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                </div>
                <div className="sp-fo">
                  {visible.map(val => {
                    const active = chosen.has(val)
                    return (
                      <label key={val} className={`sp-fc ${active ? 'sp-fc-on' : ''}`}>
                        <input type="checkbox" checked={active} onChange={() => toggleFilter(col, val)} />
                        <span className="sp-fcheck" />
                        <span className="sp-flabel">{val}</span>
                      </label>
                    )
                  })}
                  {options.length > 4 && (
                    <button className="sp-show-more"
                      onClick={() => setCollapsed(p => ({ ...p, [col]: !p[col] }))}>
                      {isOpen ? 'Show less' : `+${options.length - 4} more`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </aside>

        {/* Main */}
        <main className="sp-main">

          {/* Controls strip */}
          <div className="sp-controls">
            {[
              { label: 'Time Axis', val: timeKey, set: setSelTimeCol, opts: dateCols },
              { label: 'Category', val: primaryCat, set: setSelPrimCat, opts: catCols },
              { label: 'Primary Metric', val: primaryMetric, set: setSelPrimMetric, opts: metricCols },
              { label: 'Secondary Metric', val: secondMetric, set: setSelSecMetric, opts: metricCols },
            ].map(({ label, val, set, opts }) => (
              <div key={label} className="sp-ctrl-item">
                <span className="sp-ctrl-lbl">{label}</span>
                <select className="sp-ctrl-sel" value={val} onChange={e => set(e.target.value)}>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  {opts.length === 0 && <option value="">None</option>}
                </select>
              </div>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="sp-kpi-row">
            {kpis.map((k, i) => (
              <div key={i} className="sp-kpi" style={{ '--kc': k.color, '--kb': k.bg } as any}>
                <div className="sp-kpi-icon"><k.icon size={20} /></div>
                <div className="sp-kpi-body">
                  <div className="sp-kpi-val">{k.val}</div>
                  <div className="sp-kpi-lbl">{k.label}</div>
                </div>
                <div className="sp-kpi-rows">{formatNumber(filteredRows.length)}<span>rows</span></div>
              </div>
            ))}
          </div>

          {/* Chart Row 1: Trend + Donut */}
          <div className="sp-row sp-row1">

            {/* Trend Area */}
            <div className="sp-card sp-trend">
              <div className="sp-card-hd">
                <span className="sp-card-title">{primaryMetric || 'Value'} Trend</span>
                {secondMetric && <span className="sp-card-sub">vs {secondMetric}</span>}
              </div>
              {trendData.length > 0 ? (
                <div className="sp-cw">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 6, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1a9e7a" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#1a9e7a" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={formatYAxisTick} tickCount={5} width={46}
                        tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="value" name={primaryMetric}
                        stroke="#1a9e7a" strokeWidth={2} fill="url(#g1)" fillOpacity={1} />
                      {secondMetric && (
                        <Area type="monotone" dataKey="value2" name={secondMetric}
                          stroke="#6366f1" strokeWidth={1.5} fill="url(#g2)" fillOpacity={1} strokeDasharray="4 4" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="sp-empty">No time-series data available</div>}
            </div>

            {/* Donut */}
            <div className="sp-card sp-donut">
              <div className="sp-card-hd">
                <span className="sp-card-title">Share by {primaryCat || 'Category'}</span>
              </div>
              {donutData.length > 0 ? (
                <div className="sp-donut-inner">
                  <div className="sp-donut-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} cx="50%" cy="50%"
                          innerRadius="40%" outerRadius="80%"
                          dataKey="value" paddingAngle={3}>
                          {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="sp-donut-legend">
                    {donutData.slice(0, 5).map((d, i) => (
                      <div key={i} className="sp-dl-row">
                        <span className="sp-dl-dot" style={{ background: d.fill }} />
                        <span className="sp-dl-name">{trunc(d.name, 16)}</span>
                        <span className="sp-dl-pct">{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="sp-empty">No data</div>}
            </div>
          </div>

          {/* Chart Row 2: Bar + Horizontal Bar */}
          <div className="sp-row sp-row2">

            {/* Vertical Bar */}
            <div className="sp-card sp-bar">
              <div className="sp-card-hd">
                <span className="sp-card-title">{primaryMetric} by {primaryCat || 'Category'}</span>
              </div>
              {barData.length > 0 ? (
                <div className="sp-cw">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 6, right: 10, left: 10, bottom: 0 }} barCategoryGap="38%">
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                        tickFormatter={s => trunc(s, 13)} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={formatYAxisTick} tickCount={5} width={46}
                        tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name={primaryMetric} radius={[4, 4, 0, 0]} maxBarSize={36}>
                        {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="sp-empty">No data</div>}
            </div>

            {/* Horizontal Bar */}
            <div className="sp-card sp-hbar">
              <div className="sp-card-hd">
                <span className="sp-card-title">Volume by {secondCat || primaryCat || 'Group'}</span>
              </div>
              {hbarData.length > 0 ? (
                <div className="sp-cw">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hbarData} layout="vertical"
                      margin={{ top: 4, right: 16, left: 4, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="4 4" />
                      <XAxis type="number" tickFormatter={formatYAxisTick} tickCount={4}
                        tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={88}
                        tick={{ fontSize: 9, fill: 'var(--text)' }}
                        tickFormatter={s => trunc(s, 14)} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name={primaryMetric} radius={[0, 4, 4, 0]} maxBarSize={18}>
                        {hbarData.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
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
