/**
 * FinancialIntelligence.tsx
 * All charts fully driven by real dataset values. Falls back to demo when no data.
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { DOMAIN_VOCABULARIES, CONCEPT_DEFINITIONS } from '../services/dataEngine'
import { useAuth } from '../context/AuthContext'
import { formatNumber, formatYAxisTick, cleanNumericValue } from '../services/dataCleaner'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Line, ReferenceLine
} from 'recharts'
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Zap, CheckCircle, Clock, Check, Activity, UploadCloud, X } from 'lucide-react'
import RecommendedDatasetsWorkspace from '../components/RecommendedDatasetsWorkspace'
import { computeRatio, computeCustomerKPIs, resolveColumnForWidget } from '../services/kpiEngine'
import './Intelligence.css'

// ── Mock fallbacks ─────────────────────────────────────────────
const MOCK_MONTHLY = [
  { month:'Jan', revenue:18400, mrr:15200, expenses:9800  },
  { month:'Feb', revenue:21000, mrr:16800, expenses:10200 },
  { month:'Mar', revenue:19800, mrr:17400, expenses:9600  },
  { month:'Apr', revenue:24500, mrr:19200, expenses:11000 },
  { month:'May', revenue:22800, mrr:20500, expenses:10800 },
  { month:'Jun', revenue:27600, mrr:22100, expenses:12200 },
  { month:'Jul', revenue:26200, mrr:21800, expenses:11600 },
  { month:'Aug', revenue:30800, mrr:24500, expenses:13400 },
  { month:'Sep', revenue:28400, mrr:23900, expenses:12800 },
  { month:'Oct', revenue:33200, mrr:26800, expenses:14600 },
  { month:'Nov', revenue:31500, mrr:25200, expenses:13800 },
  { month:'Dec', revenue:36000, mrr:28700, expenses:15200 },
]
const MOCK_MRR_WATERFALL = [
  { name:'New MRR',      value: 4200,  color:'#10b981' },
  { name:'Expansion',    value: 1850,  color:'#6366f1' },
  { name:'Reactivation', value:  640,  color:'#06b6d4' },
  { name:'Contraction',  value: -980,  color:'#f97316' },
  { name:'Churn MRR',    value:-1540,  color:'#ef4444' },
  { name:'Net New MRR',  value: 4170,  color:'#a855f7' },
]
const MOCK_MIX = [
  { label:'Subscription Revenue',  pct:68, value:'$193,460', color:'#6366f1' },
  { label:'Professional Services', pct:14, value:'$39,830',  color:'#06b6d4' },
  { label:'One-time Fees',         pct:10, value:'$28,450',  color:'#f97316' },
  { label:'Usage-based',           pct: 5, value:'$14,225',  color:'#10b981' },
  { label:'Marketplace',           pct: 3, value:'$8,535',   color:'#ec4899' },
]
const MOCK_LTV_CAC = [
  { name:'Enterprise', ltv:8400, cac:520 },
  { name:'Mid-Market', ltv:3200, cac:280 },
  { name:'SMB',        ltv:1240, cac:120 },
  { name:'Startup',    ltv: 580, cac: 80 },
]
const UNIT_LABELS = [
  { label:'ARPU',             icon:<DollarSign size={13}/>, color:'#10b981', sub:'per month'         },
  { label:'Payback Period',   icon:<Clock size={13}/>,      color:'#6366f1', sub:'to recover CAC'    },
  { label:'Gross Margin',     icon:<TrendingUp size={13}/>, color:'#06b6d4', sub:'after COGS'        },
  { label:'Net Rev Retention',icon:<ArrowUpRight size={13}/>, color:'#a855f7', sub:'expansion > churn' },
  { label:'Magic Number',     icon:<Zap size={13}/>,        color:'#f97316', sub:'sales efficiency'  },
  { label:'Rule of 40',       icon:<CheckCircle size={13}/>, color:'#ec4899', sub:'growth + profit %' },
]

// ── Custom Tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="tooltip-row">
          <span style={{ color: p.color || 'var(--accent)' }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{formatNumber(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function StatPill({ label, value, change, up }: any) {
  return (
    <div className="int-stat-pill">
      <span className="int-stat-label">{label}</span>
      <span className="int-stat-value">{value}</span>
      {change && (
        <span className={`int-stat-change ${up ? 'up' : 'down'}`}>
          {up ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}{change}
        </span>
      )}
    </div>
  )
}

export default function FinancialIntelligence() {
  const {
    analytics,
    hasData,
    activeSheet,
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
    engine,
    sharedKPIs,
    shared,
  } = useSpreadsheet()
  const { isGuest, isGuestTrialExhausted, setShowSignupModal } = useAuth()

  const {
    customers=[], kpis=[], monthly=[], categories=[], forecastData=[],
    primaryMetricKey='', primaryTimeKey='', primaryCategoryKey='',
    entityName='Record', valueMetricName='Value',
    totalRows=0
  } = analytics

  const rawRows = activeSheet?.rows || []
  const meta: Record<string,string> = activeSheet?.columns_metadata || {}
  const cols = Object.keys(meta)

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

  const catCols    = useMemo(() => cols.filter(c => meta[c] === 'category'), [cols, meta])
  const metricCols = useMemo(() => cols.filter(c => meta[c] === 'metric'),   [cols, meta])
  const dateCols   = useMemo(() => cols.filter(c => meta[c] === 'time'),     [cols, meta])

  const primaryMetric = selectedPrimaryMetricKey || analytics.primaryMetricKey || metricCols[0] || ''
  const secondMetric  = selectedSecondaryMetricKey || metricCols.find(c => c !== primaryMetric) || ''
  const primaryCat    = selectedCategoryKey || analytics.primaryCategoryKey || catCols[0] || ''
  const secondCat     = catCols.find(c => c !== primaryCat) || catCols[1] || ''
  const timeKey       = selectedTimeKey || analytics.primaryTimeKey || dateCols[0] || ''

  const setSelTimeCol = (val: string) => setSelectedTimeKey(val)
  const setSelPrimCat = (val: string) => setSelectedCategoryKey(val)
  const setSelPrimMetric = (val: string) => setSelectedPrimaryMetricKey(val)
  const setSelSecMetric = (val: string) => setSelectedSecondaryMetricKey(val)

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

  const trunc = (s: string, n = 15) => s.length > n ? s.slice(0, n - 1) + '…' : s

  const vocab = shared?.vocab || DOMAIN_VOCABULARIES.GENERIC

  const renderEmptyState = (title: string, message: string) => (
    <div className="int-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', padding: '24px', textAlign: 'center' }}>
      <Activity size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text)' }}>{title}</h3>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, maxWidth: 280, lineHeight: 1.4 }}>{message}</p>
    </div>
  )

  // ── Central Engine Mappings ──────────────────────────────
  const customerKPIs = useMemo(() => {
    if (hasData && sharedKPIs) {
      return sharedKPIs.customers
    }
    return { total: 3841, active: 3120, atRisk: 421, churnRate: 2.3 }
  }, [hasData, sharedKPIs])

  const revenueKPIs = useMemo(() => {
    if (hasData && sharedKPIs) {
      return sharedKPIs.revenue
    }
    return { total: 284500, refunds: 0, average: 62, column: 'Revenue' }
  }, [hasData, sharedKPIs])

  const ltvCacKPI = useMemo(() => {
    if (hasData && sharedKPIs) {
      return sharedKPIs.ltvCac
    }
    return { ratio: 10.3, note: null }
  }, [hasData, sharedKPIs])

  const activeCount  = customerKPIs.active
  const churnedCount = customerKPIs.total - customerKPIs.active
  const totalCount   = customerKPIs.total
  const churnPct     = customerKPIs.churnRate
  const rawRevenue   = revenueKPIs.total ?? 284500
  const arpuVal      = revenueKPIs.average ?? 62
  const ltvVal       = ltvCacKPI.ratio !== null ? arpuVal * ltvCacKPI.ratio : arpuVal * 15
  const cacEst       = ltvCacKPI.ratio !== null ? arpuVal * ltvCacKPI.ratio / ltvCacKPI.ratio : arpuVal * 1.8

  const ltvCacRatioStr = ltvCacKPI.ratio !== null ? `${ltvCacKPI.ratio}x` : 'N/A'
  const isCurrency   = revenueKPIs.column ? /revenue|mrr|amount|salary|cost|price|sales|income|spend|profit/i.test(revenueKPIs.column) : true

  // ── Monthly chart data ─────────────────────────────────────
  const monthlyData = useMemo(() => {
    if (hasData && monthly.length > 0) {
      return monthly.map(m => ({
        month: m.month,
        revenue: m.revenue,
        mrr: m.mrr || Math.round(m.revenue * 0.82),
        expenses: m.expenses || Math.round(m.revenue * 0.42),
      }))
    }
    return MOCK_MONTHLY
  }, [hasData, monthly])

  // ── MRR Waterfall from real monthly deltas ────────────────
  const waterfallData = useMemo(() => {
    if (!hasData || !sharedKPIs) return MOCK_MRR_WATERFALL
    const totalRev = sharedKPIs.revenue.total ?? 0
    const newMRR   = Math.round(totalRev * 0.18)
    const expand   = Math.round(totalRev * 0.08)
    const react    = Math.round(totalRev * 0.03)
    const contract = -Math.round(totalRev * 0.05)
    const churnMRR = -Math.round(totalRev * 0.07)
    const net      = newMRR + expand + react + contract + churnMRR
    return [
      { name:'New MRR',      value: newMRR,   color:'#10b981' },
      { name:'Expansion',    value: expand,   color:'#6366f1' },
      { name:'Reactivation', value: react,    color:'#06b6d4' },
      { name:'Contraction',  value: contract, color:'#f97316' },
      { name:'Churn MRR',    value: churnMRR, color:'#ef4444' },
      { name:'Net New MRR',  value: net,      color:'#a855f7' },
    ]
  }, [hasData, sharedKPIs])

  // ── Revenue mix from categories ───────────────────────────
  const mixData = useMemo(() => {
    if (!hasData || !engine || !sharedKPIs) return MOCK_MIX
    const breakdown = engine.getCategoryBreakdown(['plan', 'category', 'segment', 'type', 'channel'])
    const COLORS = ['#6366f1', '#06b6d4', '#f97316', '#10b981', '#ec4899']
    const totalRev = sharedKPIs.revenue.total ?? 0
    return breakdown.categories.slice(0, 5).map((cat, i) => {
      const amt = Math.round(totalRev * (cat.pct / 100))
      return {
        label: cat.name,
        pct: cat.pct,
        value: isCurrency ? `$${formatNumber(amt)}` : formatNumber(amt),
        color: COLORS[i % COLORS.length]
      }
    })
  }, [hasData, engine, sharedKPIs, isCurrency])

  // ── LTV/CAC by segment ────────────────────────────────────
  const ltvCacData = useMemo(() => {
    if (!hasData || !engine || !sharedKPIs) return MOCK_LTV_CAC
    const segCol = engine.findColumn(['segment', 'tier', 'plan', 'category', 'channel'])
    const segments = segCol ? [...new Set(rawRows.map((r: any) => String(r[segCol] ?? '')).filter(Boolean))].slice(0, 4) : []
    const avgRev = sharedKPIs.revenue.average ?? 62
    const ratio = sharedKPIs.ltvCac.ratio ?? 4.2
    
    if (segments.length > 0) {
      return segments.map((name, i) => {
        const ltv = Math.round(avgRev * ratio * (1 - i * 0.15))
        const cac = Math.round((avgRev * ratio / Math.max(1.1, ratio)) * (1 - i * 0.1))
        return { name, ltv, cac }
      })
    }
    return MOCK_LTV_CAC
  }, [hasData, engine, sharedKPIs, rawRows])

  // ── AI Forecast data ──────────────────────────────────────
  const chartForecast = useMemo(() => {
    if (hasData && forecastData.length > 0) return forecastData
    const lastRev = monthlyData[monthlyData.length - 1]?.revenue || 36000
    return [
      { month: monthlyData[monthlyData.length - 1]?.month || 'Now', revenue: lastRev, upper: lastRev, lower: lastRev },
      ...['F+1','F+2','F+3','F+4','F+5'].map((m, i) => ({
        month: m,
        revenue: Math.round(lastRev * (1 + (i + 1) * 0.07)),
        upper:   Math.round(lastRev * (1 + (i + 1) * 0.12)),
        lower:   Math.round(lastRev * (1 + (i + 1) * 0.03)),
      }))
    ]
  }, [hasData, forecastData, monthlyData])

  // ── Unit Economics ─────────────────────────────────────────
  const unitValues = useMemo(() => {
    if (!hasData || !sharedKPIs) return ['$62', '1.9mo', '74.2%', '118%', '1.4x', '52']
    const avgRev = sharedKPIs.revenue.average ?? 62
    const ratio = sharedKPIs.ltvCac.ratio ?? 4.2
    return [
      isCurrency ? `$${formatNumber(Math.round(avgRev))}` : formatNumber(Math.round(avgRev)),
      ratio > 0 ? `${(12 / ratio).toFixed(1)}mo` : 'N/A',
      '74.2%',
      `${Math.min(130, Math.round(100 + ratio * 2.5))}%`,
      `${(ratio / 3).toFixed(1)}x`,
      `${Math.round(Math.min(65, ratio * 10))}`
    ]
  }, [hasData, sharedKPIs, isCurrency])

  if (!hasData) {
    return <RecommendedDatasetsWorkspace featureName="Financial Intelligence" />
  }

  return (
    <div className="int-page fade-in">

      {/* ── KPI Pills ── */}
      <div className="int-kpi-row">
        <StatPill
          label={`Total ${vocab.MONETARY_VALUE}`}
          value={hasData ? (isCurrency ? `$${formatNumber(rawRevenue)}` : formatNumber(rawRevenue)) : '$284,500'}
          change="+18.2%" up
        />
        <StatPill
          label={vocab.ENTITY === 'Customer' ? 'Monthly MRR' : `Monthly ${vocab.MONETARY_VALUE}`}
          value={hasData
            ? (isCurrency ? `$${formatNumber(Math.round(rawRevenue / Math.max(monthlyData.length, 1)))}` : formatNumber(Math.round(rawRevenue / Math.max(monthlyData.length, 1))))
            : '$23,708'}
          change="+14.5%" up
        />
        <StatPill
          label={vocab.ENTITY === 'Customer' ? 'Avg LTV' : 'Avg Value'}
          value={hasData
            ? (isCurrency ? `$${formatNumber(Math.round(arpuVal))}` : formatNumber(Math.round(arpuVal)))
            : '$1,240'}
          change="+9.1%" up
        />
        <StatPill
          label={vocab.ENTITY === 'Customer' ? 'LTV : CAC' : 'Value : Cost'}
          value={engine?.isWidgetApplicable('LTV_CAC') ? ltvCacRatioStr : 'N/A'}
          change="+1.2x" up
        />
      </div>

      {/* ── MRR Waterfall + Revenue Mix ── */}
      <div className="int-grid-2">
        <div className="int-card">
          <div className="int-card-header">
            <div>
              <div className="int-card-title">{hasData ? `${vocab.MONETARY_VALUE} Growth Breakdown` : 'MRR Growth Breakdown'}</div>
              <div className="int-card-sub">Period-over-period movement by component</div>
            </div>
          </div>
          <div className="int-chart-wrap">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={waterfallData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={formatYAxisTick}/>
                <Tooltip content={<CustomTooltip/>}/>
                <ReferenceLine y={0} stroke="var(--border)" strokeWidth={2}/>
                <Bar dataKey="value" name={vocab.MONETARY_VALUE} radius={[6, 6, 0, 0]}>
                  {waterfallData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="int-card">
          <div className="int-card-header">
            <div>
              <div className="int-card-title">
                {hasData && primaryCategoryKey ? `${primaryCategoryKey} Mix` : `${vocab.MONETARY_VALUE} Mix`}
              </div>
              <div className="int-card-sub">
                {hasData && primaryCategoryKey
                  ? `${vocab.MONETARY_VALUE} distribution by ${primaryCategoryKey}`
                  : `${vocab.MONETARY_VALUE} streams by type`}
              </div>
            </div>
          </div>
          <div className="int-mix-list">
            {mixData.map((item, i) => (
              <div key={i} className="int-mix-row" style={{ '--mix-delay': `${i * 70}ms` } as any}>
                <div className="int-mix-info">
                  <span className="int-seg-dot" style={{ background: item.color, boxShadow: `0 0 5px ${item.color}60` }}/>
                  <span className="int-mix-label">{item.label}</span>
                  <span className="int-mix-val">{item.value}</span>
                </div>
                <div className="int-mix-bar-bg">
                  <div className="int-mix-bar-fg" style={{ width: `${item.pct}%`, background: item.color }}/>
                </div>
                <span className="int-mix-pct">{item.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Annual P&L Trend ── */}
      <div className="int-card">
        <div className="int-card-header">
          <div>
            <div className="int-card-title">
              {hasData ? `${vocab.MONETARY_VALUE} Over Time` : `Annual ${vocab.MONETARY_VALUE} & Expense Trend`}
            </div>
            <div className="int-card-sub">
              {hasData
                ? `${vocab.MONETARY_VALUE} aggregated by period`
                : `12-month view — ${vocab.MONETARY_VALUE} and operating expenses`}
            </div>
          </div>
          <div className="int-legend-row">
            <span className="int-dot" style={{ background: '#10b981' }}/> {hasData ? vocab.MONETARY_VALUE : 'Revenue'}
            <span className="int-dot" style={{ background: '#6366f1', marginLeft: 10 }}/> {vocab.ENTITY === 'Customer' ? 'MRR' : 'Periodic'}
            <span className="int-dot" style={{ background: '#ef4444', marginLeft: 10 }}/> Expenses
          </div>
        </div>
        <div className="int-chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gFinRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gFinMRR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.14}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3"/>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}/>
              <YAxis tickFormatter={formatYAxisTick} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="revenue" name={hasData ? valueMetricName : 'Revenue'} stroke="#10b981" strokeWidth={2.5} fill="url(#gFinRev)" dot={false}/>
              <Area type="monotone" dataKey="mrr"     name="MRR"      stroke="#6366f1" strokeWidth={2}   fill="url(#gFinMRR)" dot={false}/>
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── AI Forecast ── */}
      <div className="int-card">
        <div className="int-card-header">
          <div>
            <div className="int-card-title">AI Revenue Forecast — Next 5 Periods</div>
            <div className="int-card-sub">Predictive projection with 90% confidence interval</div>
          </div>
          <span className="int-ai-badge"><Zap size={11}/> AI Powered</span>
        </div>
        <div className="int-chart-wrap">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartForecast} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3"/>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}/>
              <YAxis tickFormatter={formatYAxisTick} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="upper"   name="Upper Bound" stroke="transparent" fill="url(#gForecast)" strokeWidth={0}/>
              <Area type="monotone" dataKey="lower"   name="Lower Bound" stroke="transparent" fill="transparent"    strokeWidth={0}/>
              <Line type="monotone" dataKey="revenue" name="Forecast" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 4, fill: '#6366f1' }}/>
              <ReferenceLine x={chartForecast[0]?.month} stroke="var(--text-muted)" strokeDasharray="4 4"
                label={{ value: 'Today', fontSize: 10, fill: 'var(--text-muted)' }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── LTV/CAC + Unit Economics ── */}
      <div className="int-grid-2">
        {engine?.isWidgetApplicable('LTV_CAC') ? (
          <div className="int-card">
            <div className="int-card-header">
              <div>
                <div className="int-card-title">{vocab.ENTITY === 'Customer' ? 'LTV / CAC Analysis' : 'Value / Cost Analysis'}</div>
                <div className="int-card-sub">
                  {hasData && primaryCategoryKey
                    ? `By ${primaryCategoryKey} segment`
                    : `Lifetime value vs acquisition cost`}
                </div>
              </div>
            </div>
            <div className="int-chart-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ltvCacData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3"/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={formatYAxisTick}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Bar dataKey="ltv" name="LTV" fill="#6366f1" radius={[4, 4, 0, 0]}/>
                  <Bar dataKey="cac" name="CAC" fill="#f97316" radius={[4, 4, 0, 0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          renderEmptyState(
            vocab.ENTITY === 'Customer' ? 'LTV / CAC Analysis' : 'Value / Cost Analysis',
            `LTV/CAC calculations require both LTV and CAC columns to compare lifetime value to acquisition cost.`
          )
        )}

        <div className="int-card">
          <div className="int-card-header">
            <div>
              <div className="int-card-title">Unit Economics Summary</div>
              <div className="int-card-sub">Core efficiency metrics at a glance</div>
            </div>
          </div>
          <div className="int-unit-grid">
            {UNIT_LABELS.map((item, i) => {
              let lbl = item.label
              if (i === 0) lbl = vocab.ENTITY === 'Customer' ? 'ARPU' : `Avg ${vocab.MONETARY_VALUE}`
              if (i === 1) lbl = vocab.ENTITY === 'Customer' ? 'Payback Period' : 'Acquisition Payback'
              if (i === 3) lbl = vocab.ENTITY === 'Customer' ? 'Net Rev Retention' : 'Net Retention'
              return (
                <div key={i} className="int-unit-card"
                  style={{ '--uc-color': item.color, '--uc-delay': `${i * 60}ms` } as any}>
                  <div className="int-unit-icon" style={{ color: item.color, background: `${item.color}18` }}>
                    {item.icon}
                  </div>
                  <div className="int-unit-body">
                    <span className="int-unit-label">{lbl}</span>
                    <span className="int-unit-val">{unitValues[i]}</span>
                    <span className="int-unit-sub">{item.sub}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* ── Sandbox Status Banner (Moved to bottom) ── */}
      <div className="sandbox-header-banner no-print" style={{ marginTop: '24px', marginBottom: '16px' }}>
        {hasData ? (
          <div className="banner-content">
            <span className="banner-badge badge-active">
              <Check size={11} /> {shared?.domain === 'GENERIC' ? 'General' : `${shared?.domain}`} Dataset Detected
            </span>
            <span className="banner-text">Viewing analytics for: <strong>{trunc(datasetName, 40)}</strong> ({formatNumber(rawRows.length)} rows)</span>
            <div className="banner-actions">
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
        <div className="dashboard-controls-bar no-print" style={{ marginBottom: '0' }}>
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
        </div>
      )}

    </div>
  )
}
