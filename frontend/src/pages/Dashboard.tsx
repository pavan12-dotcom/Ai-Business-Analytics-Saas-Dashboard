import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { formatNumber, cleanNumericValue } from '../services/dataCleaner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, PieChart, Pie
} from 'recharts'
import {
  UploadCloud, TrendingUp, TrendingDown, Database, Layers,
  Filter, X, ChevronDown, ChevronUp, Maximize2, Minimize2, Check,
  Activity, ArrowUpRight, ArrowDownRight, FileText
} from 'lucide-react'
import './Dashboard.css'

// Premium color palettes matching mockup
const CHART_COLORS = ['#f97316', '#06b6d4', '#a855f7', '#ec4899', '#10b981']

// ── Smart value formatter ─────────────────────────────────────
const fmtVal = (v: number, isCurrency = false) => {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) {
    const val = v / 1_000_000
    const rounded = Math.round(val * 10) / 10
    const str = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)
    return (isCurrency ? '$' : '') + str + 'M'
  }
  if (abs >= 1_000) {
    const val = v / 1_000
    const rounded = Math.round(val * 10) / 10
    const str = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)
    return (isCurrency ? '$' : '') + str + 'K'
  }
  return isCurrency ? '$' + v.toFixed(2) : v.toLocaleString()
}

// ── Mock dataset representing the screenshot visual state ──────
const MOCK_MOCKUP_DATA = {
  kpi1: { label: 'Sessions', val: '856', change: '-12%', up: false, color: '#f97316' },
  kpi2: { label: 'Users', val: '523', change: '+23%', up: true, color: '#ec4899' },
  kpi3: { label: 'Time spent', val: '9.56', change: '+8%', up: true, color: '#06b6d4' },
  sparkline1: [{ val: 40 }, { val: 45 }, { val: 35 }, { val: 48 }, { val: 42 }, { val: 38 }, { val: 30 }, { val: 26 }],
  sparkline2: [{ val: 20 }, { val: 28 }, { val: 35 }, { val: 42 }, { val: 48 }, { val: 56 }, { val: 68 }, { val: 80 }],
  sparkline3: [{ val: 12 }, { val: 18 }, { val: 15 }, { val: 22 }, { val: 20 }, { val: 24 }, { val: 26 }, { val: 29 }],
  devices: [
    { name: 'Desktop', value: 305, pct: 49, color: '#f97316' },
    { name: 'Mobile', value: 158, pct: 36, color: '#06b6d4' },
    { name: 'Tablet', value: 65, pct: 15, color: '#a855f7' }
  ],
  devicesTotal: 545,
  realtime: [
    { label: 'Online visitors', value: 545, max: 685, progress: 79 },
    { label: 'New visitors', value: 421, max: 568, progress: 74 },
    { label: 'Sessions', value: 984, max: 1256, progress: 78 },
    { label: 'Page views', value: 134, max: 287, progress: 46 }
  ],
  traffic: [
    { month: 'Jan', line1: 300, line2: 200 },
    { month: 'Feb', line1: 420, line2: 310 },
    { month: 'Mar', line1: 380, line2: 290 },
    { month: 'Apr', line1: 500, line2: 400 },
    { month: 'May', line1: 450, line2: 360 },
    { month: 'Jun', line1: 600, line2: 480 },
    { month: 'Jul', line1: 580, line2: 440 },
    { month: 'Aug', line1: 680, line2: 520 },
    { month: 'Sep', line1: 620, line2: 490 },
    { month: 'Oct', line1: 750, line2: 580 },
    { month: 'Nov', line1: 700, line2: 550 },
    { month: 'Dec', line1: 850, line2: 680 }
  ],
  pages: [
    { path: 'Homepage', value: '59 085', progress: 100 },
    { path: 'Catalog', value: '58 325', progress: 98 },
    { path: 'Products', value: '51 187', progress: 86 },
    { path: 'Gallery', value: '49 258', progress: 83 },
    { path: 'Video', value: '38 567', progress: 65 },
    { path: 'Reservation', value: '28 845', progress: 48 },
    { path: 'Monitoring', value: '15 353', progress: 26 },
    { path: 'News', value: '7 586', progress: 12 },
    { path: 'Blog', value: '4 120', progress: 7 }
  ],
  social: [
    { name: 'Youtube', value: 710, pct: 45, color: '#ef4444' },
    { name: 'Instagram', value: 316, pct: 20, color: '#ec4899' },
    { name: 'LinkedIn', value: 237, pct: 15, color: '#06b6d4' },
    { name: 'Facebook', value: 174, pct: 11, color: '#3b5998' },
    { name: 'Twitter', value: 142, pct: 9, color: '#1da1f2' }
  ],
  timeOnSite: [
    { day: '30 Jan', val: 8 },
    { day: '31 Jan', val: 10 },
    { day: '1 Feb', val: 7 },
    { day: '2 Feb', val: 9 },
    { day: '3 Feb', val: 12 },
    { day: '4 Feb', val: 14 },
    { day: '5 Feb', val: 11 },
    { day: '6 Feb', val: 15 },
    { day: '7 Feb', val: 13 },
    { day: '8 Feb', val: 16 },
    { day: '9 Feb', val: 12.51 }, // highlighted bar
    { day: '10 Feb', val: 14 },
    { day: '11 Feb', val: 11 },
    { day: '12 Feb', val: 13 }
  ]
}

export default function Dashboard() {
  const {
    activeSheet,
    analytics,
    hasData,
    datasetName,
    reset,
    upload,
    uploadDoc,
    selectedTimeKey,
    setSelectedTimeKey,
    selectedCategoryKey,
    setSelectedCategoryKey,
    selectedPrimaryMetricKey,
    setSelectedPrimaryMetricKey,
    selectedSecondaryMetricKey,
    setSelectedSecondaryMetricKey,
  } = useSpreadsheet()
  const { isGuest, isGuestTrialExhausted, setShowSignupModal } = useAuth()
  
  const fileRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [filterState, setFilterState] = useState<Record<string, Set<string>>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)

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
    const res = isPdf ? await uploadDoc(file) : await upload(file)
    setUploading(false)
    if (!res.success) setUploadErr(res.error || 'Upload failed')
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Raw data selectors ──
  const rawRows = activeSheet?.rows || []
  const meta: Record<string, string> = activeSheet?.columns_metadata || {}
  const cols = Object.keys(meta)

  const setSelTimeCol = (val: string) => setSelectedTimeKey(val)
  const setSelPrimCat = (val: string) => setSelectedCategoryKey(val)
  const setSelPrimMetric = (val: string) => setSelectedPrimaryMetricKey(val)
  const setSelSecMetric = (val: string) => setSelectedSecondaryMetricKey(val)

  const catCols    = useMemo(() => cols.filter(c => meta[c] === 'category'), [cols, meta])
  const metricCols = useMemo(() => cols.filter(c => meta[c] === 'metric'),   [cols, meta])
  const dateCols   = useMemo(() => cols.filter(c => meta[c] === 'time'),     [cols, meta])

  const primaryMetric = selectedPrimaryMetricKey || analytics.primaryMetricKey || metricCols[0] || ''
  const secondMetric  = selectedSecondaryMetricKey || metricCols.find(c => c !== primaryMetric) || ''
  const primaryCat    = selectedCategoryKey || analytics.primaryCategoryKey || catCols[0] || ''
  const secondCat     = catCols.find(c => c !== primaryCat) || catCols[1] || ''
  const timeKey       = selectedTimeKey || analytics.primaryTimeKey || dateCols[0] || ''

  // ── Filter options ──
  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {}
    catCols.forEach(col => {
      const uniq = [...new Set(rawRows.map((r: any) => String(r[col] ?? '')))].filter(Boolean).sort() as string[]
      if (uniq.length >= 2 && uniq.length <= 30) opts[col] = uniq
    })
    return opts
  }, [catCols, rawRows])

  // ── Filtered rows ──
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

  // ── Aggregate helpers ──
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
  }

  // ── Dynamic Dynamic Mappings if User Uploaded Custom Data ──
  const dynamicKpis = useMemo(() => {
    if (!hasData || !primaryMetric) return null
    const vals = filteredRows.map((r: any) => cleanNumericValue(r[primaryMetric])).filter((v: any) => v !== null) as number[]
    const total = vals.reduce((a, b) => a + b, 0)
    const avg = vals.length ? total / vals.length : 0
    const segs = new Set(filteredRows.map((r: any) => r[primaryCat]).filter(Boolean)).size
    const isCurr = /revenue|cost|amount|salary|spend|profit/i.test(primaryMetric)
    
    // Build sparklines from actual rows
    const chunk = Math.max(1, Math.floor(vals.length / 8))
    const getSpark = (startOffset = 0) => {
      return Array.from({ length: 8 }).map((_, idx) => {
        const offsetIdx = startOffset + idx * chunk
        return { val: vals[offsetIdx] !== undefined ? vals[offsetIdx] : avg }
      })
    }

    return {
      kpi1: { label: `Total ${primaryMetric}`, val: fmtVal(total, isCurr), change: '+12%', up: true, color: '#f97316' },
      kpi2: { label: `Average ${primaryMetric}`, val: fmtVal(avg, isCurr), change: '+23%', up: true, color: '#ec4899' },
      kpi3: { label: `Segments`, val: String(segs), change: '+8%', up: true, color: '#06b6d4' },
      spark1: getSpark(0),
      spark2: getSpark(Math.floor(vals.length * 0.3)),
      spark3: getSpark(Math.floor(vals.length * 0.6))
    }
  }, [filteredRows, primaryMetric, primaryCat, hasData])

  const dynamicDevices = useMemo(() => {
    if (!hasData || !primaryCat) return null
    const aggregated = agg(filteredRows, primaryCat, primaryMetric, 'sum')
    const totalVal = aggregated.reduce((s, x) => s + x.value, 0)
    
    // Distribute into 3 slices: Desktop/Mobile/Tablet representations
    const desktopSlice = aggregated[0] || { name: 'Primary Group', value: 0 }
    const mobileSlice = aggregated[1] || { name: 'Secondary Group', value: 0 }
    const tabletSlice = aggregated.slice(2).reduce((sum, x) => sum + x.value, 0)

    const dTotal = desktopSlice.value + mobileSlice.value + tabletSlice
    const getPct = (v: number) => dTotal > 0 ? Math.round((v / dTotal) * 100) : 0

    return {
      total: fmtVal(totalVal),
      list: [
        { name: desktopSlice.name, value: desktopSlice.value, pct: getPct(desktopSlice.value), color: '#f97316' },
        { name: mobileSlice.name, value: mobileSlice.value, pct: getPct(mobileSlice.value), color: '#06b6d4' },
        { name: 'Others', value: tabletSlice, pct: getPct(tabletSlice), color: '#a855f7' }
      ]
    }
  }, [filteredRows, primaryCat, primaryMetric, hasData])

  const dynamicRealtime = useMemo(() => {
    if (!hasData || !primaryCat) return null
    const items = agg(filteredRows, primaryCat, primaryMetric, 'count').slice(0, 4)
    const maxVal = Math.max(...items.map(i => i.value), 1)
    return items.map(item => ({
      label: item.name,
      value: item.value,
      max: maxVal + Math.round(maxVal * 0.2),
      progress: Math.round((item.value / maxVal) * 100)
    }))
  }, [filteredRows, primaryCat, primaryMetric, hasData])

  const dynamicTraffic = useMemo(() => {
    if (!hasData || !timeKey || !primaryMetric) return []
    const groups: Record<string, { s1: number; s2: number; d: Date }> = {}
    filteredRows.forEach((r: any) => {
      const raw = r[timeKey]; if (!raw) return
      const dt = new Date(raw); if (isNaN(dt.getTime())) return
      const key = dt.toLocaleDateString('en-US', { month: 'short' })
      const v1 = cleanNumericValue(r[primaryMetric]) || 0
      const v2 = secondMetric ? (cleanNumericValue(r[secondMetric]) || 0) : 0
      if (!groups[key]) groups[key] = { s1: 0, s2: 0, d: new Date(dt.getFullYear(), dt.getMonth(), 1) }
      groups[key].s1 += v1; groups[key].s2 += v2
    })
    return Object.entries(groups)
      .map(([month, g]) => ({ month, line1: Math.round(g.s1), line2: Math.round(g.s2), _d: g.d }))
      .sort((a, b) => a._d.getTime() - b._d.getTime())
      .slice(0, 12)
  }, [filteredRows, timeKey, primaryMetric, secondMetric, hasData])

  const dynamicPages = useMemo(() => {
    if (!hasData || !primaryCat) return []
    const items = agg(filteredRows, primaryCat, primaryMetric, 'sum').slice(0, 8)
    const maxVal = Math.max(...items.map(i => i.value), 1)
    return items.map(item => ({
      path: item.name,
      value: formatNumber(item.value),
      progress: Math.round((item.value / maxVal) * 100)
    }))
  }, [filteredRows, primaryCat, primaryMetric, hasData])

  const dynamicSocial = useMemo(() => {
    if (!hasData || !primaryCat) return []
    const items = agg(filteredRows, primaryCat, '', 'count').slice(0, 5)
    const totalCount = items.reduce((s, x) => s + x.value, 0)
    return items.map((item, idx) => ({
      name: item.name,
      value: item.value,
      pct: totalCount > 0 ? Math.round((item.value / totalCount) * 100) : 0,
      color: CHART_COLORS[idx % CHART_COLORS.length]
    }))
  }, [filteredRows, primaryCat, hasData])

  const dynamicTimeOnSite = useMemo(() => {
    if (!hasData || !timeKey || !primaryMetric) return []
    const grouped = agg(filteredRows.slice(-30), timeKey, primaryMetric, 'sum').slice(0, 14)
    return grouped.map(g => ({
      day: g.name.substring(0, 10),
      val: g.value
    }))
  }, [filteredRows, timeKey, primaryMetric, hasData])

  // Truncate path/label strings
  const trunc = (s: string, n = 15) => s.length > n ? s.slice(0, n - 1) + '…' : s

  // ── Render mappings ──
  const kpiCard1 = dynamicKpis ? dynamicKpis.kpi1 : MOCK_MOCKUP_DATA.kpi1
  const kpiCard2 = dynamicKpis ? dynamicKpis.kpi2 : MOCK_MOCKUP_DATA.kpi2
  const kpiCard3 = dynamicKpis ? dynamicKpis.kpi3 : MOCK_MOCKUP_DATA.kpi3
  const spark1 = dynamicKpis ? dynamicKpis.spark1 : MOCK_MOCKUP_DATA.sparkline1
  const spark2 = dynamicKpis ? dynamicKpis.spark2 : MOCK_MOCKUP_DATA.sparkline2
  const spark3 = dynamicKpis ? dynamicKpis.spark3 : MOCK_MOCKUP_DATA.sparkline3

  const devicesList = dynamicDevices ? dynamicDevices.list : MOCK_MOCKUP_DATA.devices
  const devicesTotalLabel = dynamicDevices ? dynamicDevices.total : MOCK_MOCKUP_DATA.devicesTotal

  const realtimeList = dynamicRealtime || MOCK_MOCKUP_DATA.realtime
  const trafficChart = dynamicTraffic.length > 0 ? dynamicTraffic : MOCK_MOCKUP_DATA.traffic
  const pagesList = dynamicPages.length > 0 ? dynamicPages : MOCK_MOCKUP_DATA.pages
  const socialList = dynamicSocial.length > 0 ? dynamicSocial : MOCK_MOCKUP_DATA.social
  const timeOnSiteList = dynamicTimeOnSite.length > 0 ? dynamicTimeOnSite : MOCK_MOCKUP_DATA.timeOnSite

  return (
    <div className={`dashboard-shell fade-in${isFullscreen ? ' fs-active' : ''}`} ref={rootRef}>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* ── Main Dashboard Body (Dynamic Grid Layout) ── */}
      <div className="dashboard-grid-layout">
        
        {/* Optional Inner Filter Sidebar (Slides in only when user has data loaded) */}
        {hasData && Object.keys(filterOptions).length > 0 && (
          <aside className="dashboard-filter-sidebar no-print">
            <div className="filter-sidebar-header">
              <Filter size={11} />
              <span>COLUMNS FILTERS</span>
            </div>
            <div className="filters-list-container">
              {Object.entries(filterOptions).map(([col, options]) => {
                const chosen = filterState[col] || new Set()
                const isOpen = !collapsed[col]
                const visible = isOpen ? options : options.slice(0, 4)
                return (
                  <div key={col} className="filter-group-item">
                    <div className="filter-group-title" onClick={() => setCollapsed(p => ({ ...p, [col]: !p[col] }))}>
                      <span>{col}</span>
                      {isOpen ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                    </div>
                    {isOpen && (
                      <div className="filter-options-group">
                        {visible.map(val => {
                          const active = chosen.has(val)
                          return (
                            <label key={val} className={`filter-checkbox-row ${active ? 'active' : ''}`}>
                              <input type="checkbox" checked={active} onChange={() => toggleFilter(col, val)} />
                              <span className="checkbox-custom-indicator" />
                              <span className="checkbox-custom-label">{trunc(val, 16)}</span>
                            </label>
                          )
                        })}
                        {options.length > 4 && (
                          <button className="filters-show-more-btn" onClick={() => setCollapsed(p => ({ ...p, [col]: !p[col] }))}>
                            {isOpen ? 'Show less' : `+${options.length - 4} more`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>
        )}

        <div className="dashboard-content-main">
          {/* ════ ROW 1: 3 KPI cards + Devices Donut ════ */}
          <div className="dashboard-row row-kpis-devices">
            
            {/* KPI Card 1 */}
            <div className="kpi-card-mockup" style={{ '--accent-c': kpiCard1.color } as any}>
              <div className="kpi-card-header">
                <span className="kpi-title">{kpiCard1.label}</span>
                <span className={`kpi-change-tag ${kpiCard1.up ? 'tag-up' : 'tag-down'}`}>
                  {kpiCard1.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  <span>{kpiCard1.change}</span>
                </span>
              </div>
              <div className="kpi-value">{kpiCard1.val}</div>
              <div className="kpi-sparkline-wrap">
                <ResponsiveContainer width="100%" height={24}>
                  <AreaChart data={spark1} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <defs>
                      <linearGradient id="grad-spark1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={kpiCard1.color} stopOpacity={0.12}/>
                        <stop offset="95%" stopColor={kpiCard1.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="val" stroke={kpiCard1.color} strokeWidth={1.5} fill="url(#grad-spark1)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* KPI Card 2 */}
            <div className="kpi-card-mockup" style={{ '--accent-c': kpiCard2.color } as any}>
              <div className="kpi-card-header">
                <span className="kpi-title">{kpiCard2.label}</span>
                <span className={`kpi-change-tag ${kpiCard2.up ? 'tag-up' : 'tag-down'}`}>
                  {kpiCard2.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  <span>{kpiCard2.change}</span>
                </span>
              </div>
              <div className="kpi-value">{kpiCard2.val}</div>
              <div className="kpi-sparkline-wrap">
                <ResponsiveContainer width="100%" height={24}>
                  <AreaChart data={spark2} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <defs>
                      <linearGradient id="grad-spark2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={kpiCard2.color} stopOpacity={0.12}/>
                        <stop offset="95%" stopColor={kpiCard2.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="val" stroke={kpiCard2.color} strokeWidth={1.5} fill="url(#grad-spark2)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* KPI Card 3 */}
            <div className="kpi-card-mockup" style={{ '--accent-c': kpiCard3.color } as any}>
              <div className="kpi-card-header">
                <span className="kpi-title">{kpiCard3.label}</span>
                <span className={`kpi-change-tag ${kpiCard3.up ? 'tag-up' : 'tag-down'}`}>
                  {kpiCard3.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  <span>{kpiCard3.change}</span>
                </span>
              </div>
              <div className="kpi-value">{kpiCard3.val}</div>
              <div className="kpi-sparkline-wrap">
                <ResponsiveContainer width="100%" height={24}>
                  <AreaChart data={spark3} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                    <defs>
                      <linearGradient id="grad-spark3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={kpiCard3.color} stopOpacity={0.12}/>
                        <stop offset="95%" stopColor={kpiCard3.color} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="val" stroke={kpiCard3.color} strokeWidth={1.5} fill="url(#grad-spark3)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Devices Donut Chart Card */}
            <div className="devices-donut-card">
              <div className="devices-card-header">
                <span className="devices-title">Devices</span>
                <span className="devices-sub-title">Today</span>
              </div>
              <div className="devices-donut-container">
                <div className="donut-chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={devicesList}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="85%"
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {devicesList.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Absolute Label */}
                  <div className="donut-center-label">
                    <span className="donut-label-total">Total</span>
                    <span className="donut-label-count">{devicesTotalLabel}</span>
                  </div>
                </div>
                {/* Donut Legend */}
                <div className="donut-legend-wrap">
                  {devicesList.map((item, idx) => (
                    <div key={idx} className="donut-legend-row">
                      <span className="legend-dot" style={{ background: item.color }} />
                      <span className="legend-name">{trunc(item.name, 12)}</span>
                      <span className="legend-val">{item.value} / {item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ════ ROW 2: Real-time List + Site Traffic Chart + Pages List ════ */}
          <div className="dashboard-row row-middle-charts">
            
            {/* Real-time Data Card */}
            <div className="realtime-data-card">
              <div className="card-header-mockup">
                <span className="card-title-mockup">Real-time Data</span>
              </div>
              <div className="realtime-rows-list">
                {realtimeList.map((item, idx) => (
                  <div key={idx} className="realtime-item-row">
                    <div className="realtime-item-labels">
                      <span className="realtime-label-name">{trunc(item.label, 20)}</span>
                      <span className="realtime-label-val">{item.value}</span>
                    </div>
                    <div className="realtime-bar-outer">
                      <div className="realtime-bar-inner" style={{ width: `${item.progress}%`, background: '#6366f1' }} />
                      <span className="realtime-bar-max">max {item.max}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Site Traffic Curved Double Line Area Chart */}
            <div className="site-traffic-card">
              <div className="card-header-mockup">
                <span className="card-title-mockup">Site traffic</span>
                <div className="traffic-legend-chips">
                  <span className="traffic-legend-chip"><span className="dot dot-blue" /> New visitor</span>
                  <span className="traffic-legend-chip"><span className="dot dot-purple" /> Returning visitor</span>
                </div>
              </div>
              <div className="traffic-chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trafficGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="trafficGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.12}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tickCount={6} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                    <Area type="monotone" dataKey="line1" stroke="#06b6d4" strokeWidth={2} fill="url(#trafficGrad1)" dot={false} />
                    <Area type="monotone" dataKey="line2" stroke="#8b5cf6" strokeWidth={2} fill="url(#trafficGrad2)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pages List Card */}
            <div className="pages-list-card">
              <div className="card-header-mockup">
                <span className="card-title-mockup">Pages</span>
                <span className="pages-card-sub">Last month</span>
              </div>
              <div className="pages-rows-list">
                {pagesList.map((page, idx) => (
                  <div key={idx} className="page-item-row">
                    <div className="page-path-col">
                      <div className="page-path-bar" style={{ width: `${page.progress}%` }} />
                      <span className="page-path-name">{trunc(page.path, 18)}</span>
                    </div>
                    <span className="page-volume-count">{page.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ════ ROW 3: Social Donut Chart + Middle Time on Site Bar Chart ════ */}
          <div className="dashboard-row row-bottom-charts">
            
            {/* Social Traffic Card */}
            <div className="social-traffic-card">
              <div className="card-header-mockup">
                <span className="card-title-mockup">Traffic from social</span>
                <span className="social-card-sub">Last week</span>
              </div>
              <div className="social-donut-wrap">
                <div className="social-pie-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={socialList}
                        cx="50%"
                        cy="50%"
                        innerRadius="50%"
                        outerRadius="80%"
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {socialList.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="social-center-label">
                    <span className="social-label-total">Total</span>
                    <span className="social-label-value">1578</span>
                  </div>
                </div>
                {/* Social Legend */}
                <div className="social-legend-col">
                  {socialList.map((item, idx) => (
                    <div key={idx} className="social-legend-row">
                      <span className="legend-dot" style={{ background: item.color }} />
                      <span className="legend-name">{trunc(item.name, 12)}</span>
                      <span className="legend-val">{item.value} / {item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Time on Site Column Chart */}
            <div className="middle-time-card">
              <div className="card-header-mockup">
                <span className="card-title-mockup">Middle time on site</span>
                <span className="time-card-sub">Last 14 days</span>
              </div>
              <div className="time-bar-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeOnSiteList} margin={{ top: 20, right: 10, left: -25, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                      {timeOnSiteList.map((item, i) => {
                        // Highlight the 12.51 min item like the mockup (or 11th item index 10)
                        const isHighlighted = i === 10 || item.val === 12.51
                        return <Cell key={i} fill={isHighlighted ? '#8b5cf6' : 'rgba(139, 92, 246, 0.25)'} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Floating Mockup Tooltip Overlay */}
                {!hasData && (
                  <div className="floating-mockup-tooltip">
                    <span className="tooltip-value">12.51</span>
                    <span className="tooltip-label">min</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── Sandbox Status Banner (Moved to bottom) ── */}
      <div className="sandbox-header-banner no-print">
        {hasData ? (
          <div className="banner-content">
            <span className="banner-badge badge-active"><Check size={11} /> Dataset Active</span>
            <span className="banner-text">Viewing analytics for: <strong>{trunc(datasetName, 40)}</strong> ({formatNumber(rawRows.length)} rows)</span>
            <div className="banner-actions">
              {activeFilterCount > 0 && (
                <button className="clear-filters-btn" onClick={clearAll} title="Clear all active column filters">
                  <X size={11} /> Clear {activeFilterCount} Filter{activeFilterCount !== 1 ? 's' : ''}
                </button>
              )}
              <button className="banner-change-btn" onClick={handleUploadClick}>
                Change Dataset
              </button>
              <button className="banner-reset-btn" onClick={reset} title="Reset dashboard back to mockup demo mode">
                Reset Demo
              </button>
            </div>
          </div>
        ) : (
          <div className="banner-content">
            <span className="banner-badge badge-demo"><Activity size={11} /> Live Demo Mode</span>
            <span className="banner-text">Showing premium pre-seeded mockup metrics. Upload your own Excel/CSV file to visualize custom data.</span>
            <button className="banner-upload-btn btn btn-primary" onClick={handleUploadClick}>
              <UploadCloud size={13} style={{ marginRight: 6 }} /> Upload Dataset
            </button>
          </div>
        )}
      </div>

      {/* ── Sub-header / Filters Panel Toggle (Moved to bottom) ── */}
      {hasData && (
        <div className="dashboard-controls-bar no-print">
          <div className="controls-grid">
            {[
              { label: 'Time Axis', val: timeKey, set: setSelTimeCol, opts: dateCols },
              { label: 'Category Group', val: primaryCat, set: setSelPrimCat, opts: catCols },
              { label: 'Primary Metric', val: primaryMetric, set: setSelPrimMetric, opts: metricCols },
              { label: 'Secondary Metric', val: secondMetric, set: setSelSecMetric, opts: metricCols },
            ].map(({ label, val, set, opts }) => (
              <div key={label} className="control-dropdown-item">
                <span className="control-item-lbl">{label}</span>
                <select value={val} onChange={e => set(e.target.value)}>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  {opts.length === 0 && <option value="">None</option>}
                </select>
              </div>
            ))}
          </div>
          <button className="fullscreen-toggle-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      )}
    </div>
  )
}
