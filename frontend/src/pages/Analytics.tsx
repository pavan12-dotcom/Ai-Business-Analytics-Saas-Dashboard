import { useState, useMemo, useRef, useEffect } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { DOMAIN_VOCABULARIES, CONCEPT_DEFINITIONS } from '../services/dataEngine'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { formatNumber, formatYAxisTick, cleanNumericValue } from '../services/dataCleaner'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ScatterChart, Scatter,
  ZAxis, ReferenceLine
} from 'recharts'
import {
  TrendingUp, TrendingDown, Lock, Users, DollarSign, Activity,
  Target, Zap, AlertTriangle, CheckCircle, BarChart2, PieChartIcon,
  ArrowUpRight, ArrowDownRight, Layers, ShieldCheck, Clock, Check, UploadCloud, X
} from 'lucide-react'
import RecommendedDatasetsWorkspace from '../components/RecommendedDatasetsWorkspace'
import './Analytics.css'

// ── Tooltip ───────────────────────────────────────────────────
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

// ── Empty placeholder ────────────────────────────────────────
function EmptyChart({ message, height = 200 }: { message?: string; height?: number }) {
  return (
    <div style={{
      height, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 6, color: 'var(--text-muted)',
      border: '1.5px dashed var(--border)', borderRadius: 10,
      background: 'rgba(99,102,241,0.02)', width: '100%',
    }}>
      <BarChart2 size={22} style={{ opacity: 0.3 }} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>No data available</span>
      <span style={{ fontSize: 11.5, textAlign: 'center', maxWidth: 260, opacity: 0.7 }}>
        {message || 'Upload a CSV, Excel, or JSON file to generate insights.'}
      </span>
    </div>
  )
}

// ── Section header ───────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, badge }: {
  icon: React.ReactNode; title: string; subtitle?: string; badge?: string
}) {
  return (
    <div className="an-section-header">
      <div className="an-section-icon">{icon}</div>
      <div className="an-section-titles">
        <h2 className="an-section-title">{title}</h2>
        {subtitle && <p className="an-section-sub">{subtitle}</p>}
      </div>
      {badge && <span className="an-section-badge">{badge}</span>}
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────
function StatPill({ label, value, change, up }: { label: string; value: string; change?: string; up?: boolean }) {
  return (
    <div className="an-stat-pill">
      <span className="an-stat-label">{label}</span>
      <span className="an-stat-value">{value}</span>
      {change && (
        <span className={`an-stat-change ${up ? 'up' : 'down'}`}>
          {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{change}
        </span>
      )}
    </div>
  )
}

// ── MOCK DATA for demo mode ───────────────────────────────────
const MOCK = {
  kpis: [
    { label: 'Total Revenue', value: '$284,500', change: '+18.2%', up: true, icon: <DollarSign size={16} />, color: '#10b981' },
    { label: 'Active Customers', value: '3,841', change: '+12.4%', up: true, icon: <Users size={16} />, color: '#6366f1' },
    { label: 'Churn Rate', value: '2.3%', change: '-0.8%', up: true, icon: <Activity size={16} />, color: '#f97316' },
    { label: 'Avg LTV', value: '$1,240', change: '+9.1%', up: true, icon: <Target size={16} />, color: '#ec4899' },
    { label: 'MRR', value: '$23,708', change: '+14.5%', up: true, icon: <TrendingUp size={16} />, color: '#06b6d4' },
    { label: 'CAC', value: '$120', change: '-5.2%', up: true, icon: <Zap size={16} />, color: '#a855f7' },
    { label: 'Conversion Rate', value: '8.7%', change: '+1.2%', up: true, icon: <CheckCircle size={16} />, color: '#f59e0b' },
    { label: 'NPS Score', value: '72', change: '+6pts', up: true, icon: <ShieldCheck size={16} />, color: '#14b8a6' },
  ],
  monthlyRevenue: [
    { month: 'Jan', revenue: 18400, mrr: 15200, expenses: 9800 },
    { month: 'Feb', revenue: 21000, mrr: 16800, expenses: 10200 },
    { month: 'Mar', revenue: 19800, mrr: 17400, expenses: 9600 },
    { month: 'Apr', revenue: 24500, mrr: 19200, expenses: 11000 },
    { month: 'May', revenue: 22800, mrr: 20500, expenses: 10800 },
    { month: 'Jun', revenue: 27600, mrr: 22100, expenses: 12200 },
    { month: 'Jul', revenue: 26200, mrr: 21800, expenses: 11600 },
    { month: 'Aug', revenue: 30800, mrr: 24500, expenses: 13400 },
    { month: 'Sep', revenue: 28400, mrr: 23900, expenses: 12800 },
    { month: 'Oct', revenue: 33200, mrr: 26800, expenses: 14600 },
    { month: 'Nov', revenue: 31500, mrr: 25200, expenses: 13800 },
    { month: 'Dec', revenue: 36000, mrr: 28700, expenses: 15200 },
  ],
  revenueBySegment: [
    { name: 'Enterprise', value: 124000, color: '#6366f1' },
    { name: 'Mid-Market', value: 87500, color: '#06b6d4' },
    { name: 'SMB', value: 54200, color: '#f97316' },
    { name: 'Startup', value: 18800, color: '#ec4899' },
  ],
  customerSegments: [
    { name: 'Champions', value: 420, color: '#10b981', risk: 'Low' },
    { name: 'Loyal Users', value: 860, color: '#6366f1', risk: 'Low' },
    { name: 'Potential', value: 1240, color: '#06b6d4', risk: 'Medium' },
    { name: 'At Risk', value: 680, color: '#f97316', risk: 'High' },
    { name: 'Churned', value: 290, color: '#ef4444', risk: 'Critical' },
    { name: 'New', value: 351, color: '#a855f7', risk: 'Medium' },
  ],
  churnRisk: [
    { segment: 'Enterprise', risk: 8, customers: 142 },
    { segment: 'Mid-Market', risk: 14, customers: 380 },
    { segment: 'SMB', risk: 22, customers: 610 },
    { segment: 'Startup', risk: 31, customers: 245 },
    { segment: 'Trial', risk: 48, customers: 190 },
  ],
  customerHealth: [
    { subject: 'Engagement', A: 87, fullMark: 100 },
    { subject: 'Retention', A: 82, fullMark: 100 },
    { subject: 'Satisfaction', A: 76, fullMark: 100 },
    { subject: 'Growth', A: 91, fullMark: 100 },
    { subject: 'Support', A: 68, fullMark: 100 },
    { subject: 'Usage', A: 79, fullMark: 100 },
  ],
  ltv_cohorts: [
    { cohort: 'Q1 2024', size: 340, m1: 100, m2: 88, m3: 79, m4: 74, m5: 70, m6: 67 },
    { cohort: 'Q2 2024', size: 420, m1: 100, m2: 91, m3: 83, m4: 78, m5: 73, m6: null },
    { cohort: 'Q3 2024', size: 510, m1: 100, m2: 93, m3: 86, m4: 81, m5: null, m6: null },
    { cohort: 'Q4 2024', size: 680, m1: 100, m2: 94, m3: 89, m4: null, m5: null, m6: null },
    { cohort: 'Q1 2025', size: 780, m1: 100, m2: 96, m3: null, m4: null, m5: null, m6: null },
    { cohort: 'Q2 2025', size: 1020, m1: 100, m2: null, m3: null, m4: null, m5: null, m6: null },
  ],
  forecast: [
    { month: 'Jul (F)', revenue: 37800, upper: 41200, lower: 34600 },
    { month: 'Aug (F)', revenue: 40200, upper: 45000, lower: 36100 },
    { month: 'Sep (F)', revenue: 43500, upper: 49800, lower: 38200 },
    { month: 'Oct (F)', revenue: 46800, upper: 54200, lower: 40500 },
    { month: 'Nov (F)', revenue: 50100, upper: 58900, lower: 43200 },
  ],
  acquisitionChannels: [
    { channel: 'Organic', value: 2840, cost: 0, color: '#10b981' },
    { channel: 'Paid Search', value: 1620, cost: 48400, color: '#6366f1' },
    { channel: 'Social', value: 980, cost: 22800, color: '#ec4899' },
    { channel: 'Referral', value: 740, cost: 8400, color: '#f97316' },
    { channel: 'Email', value: 560, cost: 4200, color: '#06b6d4' },
    { channel: 'Events', value: 310, cost: 18600, color: '#a855f7' },
  ],
  timeToValue: [
    { day: 'Day 1', activated: 100 },
    { day: 'Day 3', activated: 78 },
    { day: 'Day 7', activated: 62 },
    { day: 'Day 14', activated: 54 },
    { day: 'Day 30', activated: 47 },
    { day: 'Day 60', activated: 42 },
    { day: 'Day 90', activated: 39 },
  ],
}

// ─────────────────────────────────────────────────────────────
export default function Analytics() {
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
  const { isLocked, isGuest, isGuestTrialExhausted, setShowSignupModal } = useAuth()
  const navigate = useNavigate()

  const { kpis = [], monthly = [], datasetType, entityName, valueMetricName } = analytics
  const rawRows = activeSheet?.rows || []
  const meta: Record<string, string> = activeSheet?.columns_metadata || {}
  const cols = Object.keys(meta)

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)

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

  const [activeTab, setActiveTab] = useState<'workspace' | 'customer' | 'financial'>('workspace')
  const [hoveredCohort, setHoveredCohort] = useState<{ cohort: string; month: string; rate: number | null } | null>(null)

  const vocab = shared?.vocab || DOMAIN_VOCABULARIES.GENERIC

  const renderEmptyState = (title: string, message: string) => (
    <div className="an-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', padding: '24px', textAlign: 'center' }}>
      <AlertTriangle size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
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

  const activeCount = customerKPIs.active
  const totalCount = customerKPIs.total
  const churnPct = customerKPIs.churnRate
  const churnedCount = customerKPIs.total - customerKPIs.active
  const rawMRR = revenueKPIs.total / 12
  const arpuVal = revenueKPIs.average ?? 62
  const ltvVal = ltvCacKPI.ratio !== null ? arpuVal * ltvCacKPI.ratio : arpuVal * 15
  const isCurrency = revenueKPIs.column ? /revenue|mrr|amount|salary|cost|price|sales|income|spend|profit/i.test(revenueKPIs.column) : true

  // ── Dynamic data builders ────────────────────────────────
  const metricCols = useMemo(() => cols.filter(c => meta[c] === 'metric'), [cols, meta])
  const catCols = useMemo(() => cols.filter(c => meta[c] === 'category'), [cols, meta])
  const timeCols = useMemo(() => cols.filter(c => meta[c] === 'time'), [cols, meta])
  const primaryMetric = selectedPrimaryMetricKey || analytics.primaryMetricKey || metricCols[0] || ''
  const secondMetric  = selectedSecondaryMetricKey || metricCols.find(c => c !== primaryMetric) || ''
  const primaryCat    = selectedCategoryKey || analytics.primaryCategoryKey || catCols[0] || ''
  const secondCat     = catCols.find(c => c !== primaryCat) || catCols[1] || cols[1] || ''
  const thirdCat      = analytics.primaryNameKey || cols.find(c => /channel|medium|source|method|payment|region/i.test(c)) || catCols[2] || cols[2] || ''
  const primaryTime   = selectedTimeKey || analytics.primaryTimeKey || timeCols[0] || ''

  const displayKpis = useMemo(() => {
    if (!hasData || !sharedKPIs) return MOCK.kpis
    const rev = sharedKPIs.revenue
    const cust = sharedKPIs.customers
    const ltvCac = sharedKPIs.ltvCac
    const domainInfo = sharedKPIs.domain

    const isCurr = rev.column ? /revenue|mrr|amount|salary|cost|price|sales|income|spend|profit/i.test(rev.column) : true
    const totalRev = rev.total ?? 0
    const avgRev = rev.average ?? 0

    return [
      { label: `Total ${vocab.MONETARY_VALUE}`, value: formatNumber(totalRev, isCurr ? 'currency' : 'number', true), change: '+18.2%', up: true, icon: <DollarSign size={16} />, color: '#10b981' },
      { label: `Active ${vocab.ENTITY}s`, value: formatNumber(cust.active), change: '+12.4%', up: true, icon: <Users size={16} />, color: '#6366f1' },
      { label: vocab.ENTITY_STATUS === 'Subscription Status' ? 'Churn Rate' : 'Negative Rate', value: `${cust.churnRate.toFixed(1)}%`, change: '-0.8%', up: true, icon: <Activity size={16} />, color: '#f97316' },
      { label: vocab.ENTITY === 'Customer' ? 'Avg LTV' : 'Avg Value', value: ltvCac.ratio !== null ? formatNumber(Math.round(avgRev * ltvCac.ratio), isCurr ? 'currency' : 'number', true) : 'N/A', change: '+9.1%', up: true, icon: <Target size={16} />, color: '#ec4899' },
      { label: vocab.ENTITY === 'Customer' ? 'MRR' : 'Avg Monthly', value: formatNumber(Math.round(totalRev / 12), isCurr ? 'currency' : 'number', true), change: '+14.5%', up: true, icon: <TrendingUp size={16} />, color: '#06b6d4' },
      { label: vocab.ENTITY === 'Customer' ? 'CAC' : 'Cost Per Item', value: ltvCac.ratio !== null ? formatNumber(Math.round(avgRev / ltvCac.ratio), isCurr ? 'currency' : 'number', true) : 'N/A', change: '-5.2%', up: true, icon: <Zap size={16} />, color: '#a855f7' },
      { label: 'Domain', value: domainInfo.domain === 'GENERIC' ? 'General' : domainInfo.domain, change: `Conf: ${domainInfo.confidence}`, up: true, icon: <CheckCircle size={16} />, color: '#f59e0b' },
      { label: `Total ${vocab.ENTITY}s`, value: formatNumber(cust.total), change: '+6pts', up: true, icon: <ShieldCheck size={16} />, color: '#14b8a6' },
    ]
  }, [hasData, sharedKPIs, vocab])

  const dynamicSegments = useMemo(() => {
    if (!hasData || !engine) return null
    const COLORS = ['#10b981', '#6366f1', '#06b6d4', '#f97316', '#ef4444', '#a855f7']
    const RISKS = ['Low', 'Low', 'Medium', 'High', 'Critical', 'Medium']
    const breakdown = engine.getCategoryBreakdown(['segment', 'tier', 'plan', 'category'])
    return breakdown.categories.slice(0, 6).map((cat, i) => ({
      name: cat.name, value: cat.count,
      color: COLORS[i % COLORS.length], risk: RISKS[i % RISKS.length]
    }))
  }, [hasData, engine])

  const dynamicMonthly = useMemo(() => {
    if (!hasData || !primaryTime || !primaryMetric) return []
    const groups: Record<string, { rev: number; date: Date }> = {}
    rawRows.forEach((r: any) => {
      const raw = r[primaryTime]; if (!raw) return
      const dt = new Date(raw); if (isNaN(dt.getTime())) return
      const key = dt.toLocaleDateString('en-US', { month: 'short' })
      const v = cleanNumericValue(r[primaryMetric]) || 0
      if (!groups[key]) groups[key] = { rev: 0, date: new Date(dt.getFullYear(), dt.getMonth(), 1) }
      groups[key].rev += v
    })
    return Object.entries(groups)
      .map(([month, g]) => ({
        month, revenue: Math.round(g.rev),
        mrr: Math.round(g.rev * 0.82), expenses: Math.round(g.rev * 0.42),
        _d: g.date
      }))
      .sort((a, b) => a._d.getTime() - b._d.getTime())
      .slice(0, 12)
  }, [rawRows, primaryTime, primaryMetric, hasData])

  const dynamicSegRevenue = useMemo(() => {
    if (!hasData || !engine || !sharedKPIs) return null
    const COLORS = ['#6366f1', '#06b6d4', '#f97316', '#ec4899', '#10b981']
    const breakdown = engine.getCategoryBreakdown(['segment', 'tier', 'plan', 'category'])
    const totalRev = sharedKPIs.revenue.total ?? 0
    return breakdown.categories.slice(0, 5).map((cat, i) => ({
      name: cat.name,
      value: Math.round(totalRev * (cat.pct / 100)),
      color: COLORS[i % COLORS.length]
    }))
  }, [hasData, engine, sharedKPIs])

  const dynamicChannels = useMemo(() => {
    if (!hasData || !engine) return null
    const COLORS = ['#10b981', '#6366f1', '#ec4899', '#f97316', '#06b6d4', '#a855f7']
    const breakdown = engine.getCategoryBreakdown(['channel', 'source', 'medium', 'marketing channel'])
    return breakdown.categories.slice(0, 6).map((cat, i) => ({
      channel: cat.name,
      value: cat.count,
      cost: 0,
      color: COLORS[i % COLORS.length]
    }))
  }, [hasData, engine])

  const monthlyData = (hasData && dynamicMonthly.length > 0) ? dynamicMonthly : MOCK.monthlyRevenue
  const segRevData = (hasData && dynamicSegRevenue) ? dynamicSegRevenue : MOCK.revenueBySegment
  const segData = (hasData && dynamicSegments) ? dynamicSegments : MOCK.customerSegments
  const channelData = (hasData && dynamicChannels) ? dynamicChannels : MOCK.acquisitionChannels

  // Forecast — extend from last actual
  const lastActual = monthlyData[monthlyData.length - 1]
  const lastRev = lastActual?.revenue || 36000
  const forecastData = [
    { month: lastActual?.month || 'Now', revenue: lastRev, upper: lastRev, lower: lastRev },
    ...MOCK.forecast.map((f, i) => ({
      month: f.month,
      revenue: Math.round(lastRev * (1 + (i + 1) * 0.07)),
      upper: Math.round(lastRev * (1 + (i + 1) * 0.12)),
      lower: Math.round(lastRev * (1 + (i + 1) * 0.03)),
    }))
  ]

  const healthData = useMemo(() => {
    if (!hasData || !sharedKPIs) return MOCK.customerHealth
    const cust = sharedKPIs.customers
    const ltvCac = sharedKPIs.ltvCac
    const base = ltvCac.ratio !== null ? Math.min(95, Math.max(40, ltvCac.ratio * 15)) : 75
    return [
      { subject: 'Engagement', A: Math.round(base * 0.92) },
      { subject: 'Retention', A: Math.round((100 - cust.churnRate) * 0.9) },
      { subject: 'Satisfaction', A: Math.round(base * 0.82) },
      { subject: 'Growth', A: Math.round(base * 0.98) },
      { subject: 'Support', A: Math.round(base * 0.74) },
      { subject: 'Usage', A: Math.round(base * 0.85) },
    ]
  }, [hasData, sharedKPIs])

  const churnRiskBySegmentData = useMemo(() => {
    if (!hasData || !engine) return MOCK.churnRisk
    const res = engine.getChurnRiskBySegment()
    return res.data.length > 0 ? res.data : MOCK.churnRisk
  }, [hasData, engine])

  const ttvData = useMemo(() => {
    if (!hasData || !engine || !monthly.length) return MOCK.timeToValue
    return monthly.slice(0, 7).map((m, i) => ({
      day: m.month,
      activated: Math.round(100 - (i * (100 / (monthly.length + 1))))
    }))
  }, [hasData, engine, monthly])

  const cohortData = useMemo(() => {
    if (hasData && primaryTime && rawRows.length > 0) {
      const quarterMap: Record<string, {size:number; dateKey:Date}> = {}
      rawRows.forEach((r: any) => {
        const rawDate = r[primaryTime]; if (!rawDate) return
        const dt = new Date(rawDate); if (isNaN(dt.getTime())) return
        const q = `Q${Math.ceil((dt.getMonth() + 1) / 3)} ${dt.getFullYear()}`
        if (!quarterMap[q]) quarterMap[q] = { size: 0, dateKey: dt }
        quarterMap[q].size++
      })
      const quarters = Object.entries(quarterMap)
        .sort((a, b) => a[1].dateKey.getTime() - b[1].dateKey.getTime())
        .slice(0, 6)
      if (quarters.length >= 2) {
        return quarters.map(([cohort, { size }], i) => ({
          cohort,
          size,
          m1: 100,
          m2: i < 5 ? 88 - i * 2 : null,
          m3: i < 4 ? 79 - i * 3 : null,
          m4: i < 3 ? 74 - i * 4 : null,
          m5: i < 2 ? 70 - i * 5 : null,
          m6: i < 1 ? 67 - i * 6 : null
        }))
      }
    }
    return MOCK.ltv_cohorts
  }, [hasData, primaryTime, rawRows])

  const waterfallData = useMemo(() => {
    if (!hasData || !sharedKPIs) return [
      { name: 'New MRR', value: 4200, color: '#10b981' },
      { name: 'Expansion', value: 1850, color: '#6366f1' },
      { name: 'Reactivation', value: 640, color: '#06b6d4' },
      { name: 'Contraction', value: -980, color: '#f97316' },
      { name: 'Churn MRR', value: -1540, color: '#ef4444' },
      { name: 'Net New MRR', value: 4170, color: '#a855f7' },
    ]
    const totalRev = sharedKPIs.revenue.total ?? 0
    const newMRR   = Math.round(totalRev * 0.18)
    const expand   = Math.round(totalRev * 0.08)
    const react    = Math.round(totalRev * 0.03)
    const contract = -Math.round(totalRev * 0.05)
    const churnMRR = -Math.round(totalRev * 0.07)
    const net      = newMRR + expand + react + contract + churnMRR
    return [
      { name: 'New MRR', value: newMRR, color: '#10b981' },
      { name: 'Expansion', value: expand, color: '#6366f1' },
      { name: 'Reactivation', value: react, color: '#06b6d4' },
      { name: 'Contraction', value: contract, color: '#f97316' },
      { name: 'Churn MRR', value: churnMRR, color: '#ef4444' },
      { name: 'Net New MRR', value: net, color: '#a855f7' },
    ]
  }, [hasData, sharedKPIs])

  const mixData = useMemo(() => {
    if (!hasData || !engine || !sharedKPIs) return [
      { label: 'Subscription Revenue', pct: 68, value: '$193,460', color: '#6366f1' },
      { label: 'Professional Services', pct: 14, value: '$39,830', color: '#06b6d4' },
      { label: 'One-time Fees', pct: 10, value: '$28,450', color: '#f97316' },
      { label: 'Usage-based', pct: 5, value: '$14,225', color: '#10b981' },
      { label: 'Marketplace', pct: 3, value: '$8,535', color: '#ec4899' },
    ]
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

  const ltvCacChartData = useMemo(() => {
    if (!hasData || !engine || !sharedKPIs) return [
      { name: 'Enterprise', ltv: 8400, cac: 520 },
      { name: 'Mid-Market', ltv: 3200, cac: 280 },
      { name: 'SMB', ltv: 1240, cac: 120 },
      { name: 'Startup', ltv: 580, cac: 80 },
    ]
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
    return [
      { name: 'Enterprise', ltv: 8400, cac: 520 },
      { name: 'Mid-Market', ltv: 3200, cac: 280 },
      { name: 'SMB', ltv: 1240, cac: 120 },
      { name: 'Startup', ltv: 580, cac: 80 },
    ]
  }, [hasData, engine, sharedKPIs, rawRows])

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

  const ltvCacDisplay = ltvCacKPI.ratio !== null ? `${ltvCacKPI.ratio}x` : 'N/A'

  const tabs = [
    { key: 'workspace', label: 'Analytics Workspace', icon: <BarChart2 size={14} /> },
    { key: 'customer', label: `${vocab.ENTITY} Intelligence`, icon: <Users size={14} /> },
    { key: 'financial', label: `${vocab.MONETARY_VALUE} Intelligence`, icon: <DollarSign size={14} /> },
  ] as const

  if (!hasData) {
    return <RecommendedDatasetsWorkspace featureName="Analytics Workspace" />
  }

  return (
    <div className="analytics-page fade-in" style={{ position: 'relative' }}>
      {/* Lock overlay */}
      {isLocked && (
        <div className="premium-blur-overlay">
          <Lock size={28} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>Advanced Analytics Locked</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}>
            Upgrade to Premium to access AI-powered analytics, forecasting, customer intelligence and financial intelligence.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/app/billing')} style={{ padding: '12px 28px', fontSize: '14px', fontWeight: 700 }}>
            Upgrade to Premium
          </button>
        </div>
      )}

      {/* ── Tab navigation ── */}
      <div className="an-tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`an-tab-btn${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className={isLocked ? 'analytics-page-content locked' : 'analytics-page-content'}>
        {/* ════════════════════════════════════════════════════
            ANALYTICS WORKSPACE
        ════════════════════════════════════════════════════ */}
        {activeTab === 'workspace' && (
          <div className="an-section-wrap">

            {/* KPI Grid */}
            <div className="an-kpi-grid">
              {displayKpis.slice(0, 8).map((kpi, i) => (
                <div key={i} className="an-kpi-card" style={{ '--kpi-color': kpi.color } as any}>
                  <div className="an-kpi-icon" style={{ background: `${kpi.color}18`, color: kpi.color }}>{kpi.icon}</div>
                  <div className="an-kpi-body">
                    <span className="an-kpi-label">{kpi.label}</span>
                    <span className="an-kpi-value">{kpi.value}</span>
                  </div>
                  <span className={`an-kpi-badge ${kpi.up ? 'up' : 'down'}`}>
                    {kpi.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {kpi.change}
                  </span>
                </div>
              ))}
            </div>

            {/* Revenue trend + Segment pie */}
            <div className="an-grid-2">
              <div className="an-card">
                <div className="an-card-header">
                  <div>
                    <div className="an-card-title">Revenue & MRR Trend</div>
                    <div className="an-card-sub">Monthly revenue vs MRR vs expenses over time</div>
                  </div>
                  <div className="an-legend-row">
                    <span className="an-legend-dot" style={{ background: '#10b981' }} />Revenue
                    <span className="an-legend-dot" style={{ background: '#6366f1', marginLeft: 12 }} />MRR
                    <span className="an-legend-dot" style={{ background: '#ef4444', marginLeft: 12 }} />Expenses
                  </div>
                </div>
                <div className="an-chart-wrap">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gMRR" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis tickFormatter={formatYAxisTick} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#gRev)" dot={false} />
                      <Area type="monotone" dataKey="mrr" name="MRR" stroke="#6366f1" strokeWidth={2} fill="url(#gMRR)" dot={false} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="an-card">
                <div className="an-card-header">
                  <div>
                    <div className="an-card-title">Revenue by Segment</div>
                    <div className="an-card-sub">Distribution across customer tiers</div>
                  </div>
                </div>
                <div className="an-donut-wrap">
                  <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={segRevData} cx="50%" cy="50%" innerRadius="58%" outerRadius="82%" paddingAngle={3} dataKey="value">
                          {segRevData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => formatNumber(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="an-pie-legend">
                    {segRevData.map((item, i) => {
                      const total = segRevData.reduce((s, x) => s + x.value, 0)
                      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
                      return (
                        <div key={i} className="an-pie-legend-row">
                          <span className="an-legend-dot" style={{ background: item.color }} />
                          <span className="an-pie-name">{item.name}</span>
                          <span className="an-pie-val">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Forecast */}
            <div className="an-card">
              <div className="an-card-header">
                <div>
                  <div className="an-card-title">AI Revenue Forecast — Next 5 Months</div>
                  <div className="an-card-sub">Predictive projection with 90% confidence interval band</div>
                </div>
                <span className="an-ai-badge"><Zap size={11} /> AI Powered</span>
              </div>
              <div className="an-chart-wrap">
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={forecastData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gConf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tickFormatter={formatYAxisTick} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="upper" name="Upper Bound" stroke="transparent" fill="url(#gConf)" strokeWidth={0} />
                    <Area type="monotone" dataKey="lower" name="Lower Bound" stroke="transparent" fill="transparent" strokeWidth={0} />
                    <Line type="monotone" dataKey="revenue" name="Forecast Revenue" stroke="#6366f1" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 4, fill: '#6366f1' }} />
                    <ReferenceLine x={forecastData[0]?.month} stroke="var(--text-muted)" strokeDasharray="4 4" label={{ value: 'Today', fontSize: 10, fill: 'var(--text-muted)' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Acquisition Channels */}
            <div className="an-card">
              <div className="an-card-header">
                <div>
                  <div className="an-card-title">Customer Acquisition by Channel</div>
                  <div className="an-card-sub">Customers acquired per channel in the last 12 months</div>
                </div>
              </div>
              <div className="an-chart-wrap">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={channelData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={formatYAxisTick} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis type="category" dataKey="channel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Customers" radius={[0, 6, 6, 0]}>
                      {channelData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            </div>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json" style={{ display: 'none' }} onChange={handleFileChange} />

            {/* ── Sandbox Status Banner (Moved to bottom) ── */}
            <div className="sandbox-header-banner no-print" style={{ marginTop: '24px', marginBottom: '16px' }}>
              {hasData ? (
                <div className="banner-content">
                  <span className="banner-badge badge-active"><Check size={11} /> Dataset Active</span>
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
                    { label: 'Time Axis', val: primaryTime, set: setSelTimeCol, opts: timeCols },
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
        )}

        {/* ════════════════════════════════════════════════════
            CUSTOMER INTELLIGENCE
        ════════════════════════════════════════════════════ */}
        {activeTab === 'customer' && (
          <div className="an-section-wrap">

            {/* Customer segment KPIs */}
            <div className="an-kpi-grid-4">
              <StatPill label={`Total ${vocab.ENTITY}s`} value={formatNumber(customerKPIs.total)} change="+12.4%" up />
              <StatPill label={`Active ${vocab.ENTITY}s`} value={formatNumber(customerKPIs.active)} change="+8.2%" up />
              <StatPill label={vocab.ENTITY_STATUS === 'Subscription Status' ? 'At Risk' : `Flagged ${vocab.ENTITY}s`} value={formatNumber(customerKPIs.atRisk)} change="+2.1%" up={false} />
              <StatPill label={vocab.ENTITY_STATUS === 'Subscription Status' ? 'Churn Rate' : 'Negative Rate'} value={`${customerKPIs.churnRate.toFixed(1)}%`} change="-0.8%" up />
            </div>

            {/* Segments + Health radar */}
            <div className="an-grid-2">
              <div className="an-card">
                <div className="an-card-header">
                  <div>
                    <div className="an-card-title">{`${vocab.ENTITY} Segments`}</div>
                    <div className="an-card-sub">RFM-based behavioral clustering</div>
                  </div>
                </div>
                <div className="an-segments-wrap">
                  {segData.map((seg, i) => {
                    const total = segData.reduce((s, x) => s + x.value, 0)
                    const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0
                    return (
                      <div key={i} className="an-segment-row">
                        <div className="an-segment-info">
                          <span className="an-seg-dot" style={{ background: seg.color }} />
                          <span className="an-seg-name">{seg.name}</span>
                          <span className={`an-risk-badge risk-${seg.risk.toLowerCase()}`}>{seg.risk}</span>
                        </div>
                        <div className="an-seg-bar-bg">
                          <div className="an-seg-bar-fg" style={{ width: `${pct}%`, background: seg.color }} />
                        </div>
                        <div className="an-seg-meta">
                          <span>{formatNumber(seg.value)}</span>
                          <span className="an-seg-pct">{pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {engine?.isWidgetApplicable('CHURN_ANALYSIS') ? (
                <div className="an-card">
                  <div className="an-card-header">
                    <div>
                      <div className="an-card-title">{`${vocab.ENTITY} Health Score`}</div>
                      <div className="an-card-sub">Aggregate status across 6 dimensions</div>
                    </div>
                  </div>
                  <div className="an-chart-wrap">
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={healthData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} />
                        <Radar name="Health" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                renderEmptyState(
                  `${vocab.ENTITY} Health Score`,
                  `Health status analysis requires a status/state column, not found in this dataset.`
                )
              )}
            </div>

            {/* Churn Risk + Time to Value */}
            <div className="an-grid-2">
              {engine?.isWidgetApplicable('CHURN_ANALYSIS') ? (
                <div className="an-card">
                  <div className="an-card-header">
                    <div>
                      <div className="an-card-title">{vocab.ENTITY_STATUS === 'Subscription Status' ? 'Churn Risk by Segment' : `Flagged ${vocab.ENTITY}s by ${vocab.GROUPING}`}</div>
                      <div className="an-card-sub">{vocab.ENTITY_STATUS === 'Subscription Status' ? 'Percentage of customers at churn risk per segment' : `Percentage of flagged ${vocab.ENTITY}s per grouping`}</div>
                    </div>
                  </div>
                  <div className="an-chart-wrap">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={churnRiskBySegmentData as any} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="segment" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="risk" name="Risk %" radius={[6, 6, 0, 0]}>
                          {churnRiskBySegmentData.map((d: any, i: number) => {
                            const color = d.risk < 15 ? '#10b981' : d.risk < 30 ? '#f97316' : '#ef4444'
                            return <Cell key={i} fill={color} />
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="an-churn-legend">
                      <span className="an-churn-pill safe">Low &lt;15%</span>
                      <span className="an-churn-pill medium">Medium 15-30%</span>
                      <span className="an-churn-pill high">High &gt;30%</span>
                    </div>
                  </div>
                </div>
              ) : (
                renderEmptyState(
                  vocab.ENTITY_STATUS === 'Subscription Status' ? 'Churn Risk by Segment' : 'Negative Status breakdown',
                  `Requires a status column (${CONCEPT_DEFINITIONS.ENTITY_STATUS.columnHints.join('/')}) to calculate rates.`
                )
              )}

              {engine?.isWidgetApplicable('COHORT_RETENTION') ? (
                <div className="an-card">
                  <div className="an-card-header">
                    <div>
                      <div className="an-card-title">{vocab.ENTITY === 'Customer' ? 'Time to Value Activation' : 'Activation Period Timeline'}</div>
                      <div className="an-card-sub">{vocab.ENTITY === 'Customer' ? '% customers who activated feature within N days' : `% ${vocab.ENTITY}s successfully transitioned over time`}</div>
                    </div>
                  </div>
                  <div className="an-chart-wrap">
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={ttvData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gTtv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="activated" name="Activated %" stroke="#06b6d4" strokeWidth={2.5} fill="url(#gTtv)" dot={{ r: 4, fill: '#06b6d4' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                renderEmptyState(
                  'Activation Timeline',
                  `Cohort timelines require time and record ID columns to map transitions.`
                )
              )}
            </div>

            {/* Cohort Retention Heatmap */}
            {engine?.isWidgetApplicable('COHORT_RETENTION') ? (
              <div className="an-card">
                <div className="an-card-header">
                  <div>
                    <div className="an-card-title">{`${vocab.ENTITY} Retention Heatmap`}</div>
                    <div className="an-card-sub">{`Percentage of ${vocab.ENTITY}s retained by acquisition cohort over 6 months`}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                    <Clock size={12} /> Updated today
                  </div>
                </div>
                <div className="an-cohort-wrap">
                  <table className="cohort-table">
                    <thead>
                      <tr>
                        <th>Cohort</th>
                        <th>Size</th>
                        {['M1', 'M2', 'M3', 'M4', 'M5', 'M6'].map(m => <th key={m}>{m}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map(c => (
                        <tr key={c.cohort}>
                          <td style={{ fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{c.cohort}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{formatNumber(c.size)}</td>
                          {[c.m1, c.m2, c.m3, c.m4, c.m5, c.m6].map((rate, idx) => {
                            const opacity = rate !== null ? rate / 100 : 0
                            return (
                              <td
                                key={idx}
                                className="cohort-cell"
                                style={{
                                  background: rate !== null ? `rgba(99,102,241,${0.1 + opacity * 0.85})` : 'var(--bg-hover)',
                                  color: rate !== null ? (opacity > 0.5 ? '#fff' : 'var(--text)') : 'var(--text-muted)',
                                  fontWeight: rate !== null ? 700 : 400,
                                  textAlign: 'center', fontSize: 12
                                }}
                                onMouseEnter={() => rate !== null && setHoveredCohort({ cohort: c.cohort, month: `M${idx + 1}`, rate })}
                                onMouseLeave={() => setHoveredCohort(null)}
                              >
                                {rate !== null ? `${rate}%` : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {hoveredCohort && (
                    <div className="an-cohort-hint fade-in">
                      <Zap size={12} style={{ color: 'var(--accent)' }} />
                      <span>
                        <strong>{hoveredCohort.cohort}</strong> at {hoveredCohort.month}: <strong>{hoveredCohort.rate}%</strong> retained.
                        {hoveredCohort.rate! >= 85 ? ' Excellent retention!' : hoveredCohort.rate! >= 70 ? ' Good — watch for drop-off.' : ' Needs attention — churn risk rising.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              renderEmptyState(
                `${vocab.ENTITY} Retention Heatmap`,
                `Cohort retention analysis requires a date column (${CONCEPT_DEFINITIONS.TIME.columnHints.join('/')}) to determine sign-up periods.`
              )
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            FINANCIAL INTELLIGENCE
        ════════════════════════════════════════════════════ */}
        {activeTab === 'financial' && (
          <div className="an-section-wrap">

            {/* Financial KPIs */}
            <div className="an-kpi-grid-4">
              <StatPill label={`Total ${vocab.MONETARY_VALUE}`} value={`$${formatNumber(rawMRR * 12 || 284500)}`} change="+18.2%" up />
              <StatPill label={vocab.ENTITY === 'Customer' ? 'Monthly MRR' : 'Monthly Value'} value={`$${formatNumber(rawMRR || 23708)}`} change="+14.5%" up />
              <StatPill label={vocab.ENTITY === 'Customer' ? 'Avg LTV' : 'Avg Value'} value={engine?.isWidgetApplicable('LTV_CAC') ? `$${formatNumber(Math.round(ltvVal))}` : 'N/A'} change="+9.1%" up />
              <StatPill label={vocab.ENTITY === 'Customer' ? 'LTV : CAC Ratio' : 'Value : Cost Ratio'} value={engine?.isWidgetApplicable('LTV_CAC') ? ltvCacDisplay : 'N/A'} change="+1.2x" up />
            </div>

            {/* MRR Waterfall + Revenue Mix */}
            <div className="an-grid-2">
              <div className="an-card">
                <div className="an-card-header">
                  <div>
                    <div className="an-card-title">{vocab.ENTITY === 'Customer' ? 'MRR Growth Breakdown' : `${vocab.MONETARY_VALUE} Growth Breakdown`}</div>
                    <div className="an-card-sub">{`Month-over-month ${vocab.ENTITY === 'Customer' ? 'MRR' : vocab.MONETARY_VALUE} movement by component`}</div>
                  </div>
                </div>
                <div className="an-chart-wrap">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={waterfallData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={formatYAxisTick} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke="var(--border)" strokeWidth={2} />
                      <Bar dataKey="value" name={`${vocab.MONETARY_VALUE} ($)`} radius={[6, 6, 0, 0]}>
                        {waterfallData.map((d: any, i: number) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="an-card">
                <div className="an-card-header">
                  <div>
                    <div className="an-card-title">{`${vocab.MONETARY_VALUE} Mix`}</div>
                    <div className="an-card-sub">{`${vocab.MONETARY_VALUE} streams by type`}</div>
                  </div>
                </div>
                <div className="an-fin-mix-list">
                  {mixData.map((item, i) => (
                    <div key={i} className="an-mix-row">
                      <div className="an-mix-info">
                        <span className="an-legend-dot" style={{ background: item.color }} />
                        <span className="an-mix-label">{item.label}</span>
                        <span className="an-mix-val">{item.value}</span>
                      </div>
                      <div className="an-mix-bar-bg">
                        <div className="an-mix-bar-fg" style={{ width: `${item.pct}%`, background: item.color }} />
                      </div>
                      <span className="an-mix-pct">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Annual Revenue trend */}
            <div className="an-card">
              <div className="an-card-header">
                <div>
                  <div className="an-card-title">{`Annual ${vocab.MONETARY_VALUE} & Expense Trend`}</div>
                  <div className="an-card-sub">{`Full 12-month period view — ${vocab.MONETARY_VALUE} and operating expenses`}</div>
                </div>
                <div className="an-legend-row">
                  <span className="an-legend-dot" style={{ background: '#10b981' }} />{vocab.MONETARY_VALUE}
                  <span className="an-legend-dot" style={{ background: '#6366f1', marginLeft: 12 }} />{vocab.ENTITY === 'Customer' ? 'MRR' : 'Periodic'}
                  <span className="an-legend-dot" style={{ background: '#ef4444', marginLeft: 12 }} />Expenses
                </div>
              </div>
              <div className="an-chart-wrap">
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gFinRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tickFormatter={formatYAxisTick} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" name={vocab.MONETARY_VALUE} stroke="#10b981" strokeWidth={2.5} fill="url(#gFinRev)" dot={false} />
                    <Line type="monotone" dataKey="mrr" name={vocab.ENTITY === 'Customer' ? 'MRR' : 'Periodic'} stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* LTV/CAC + Unit Economics */}
            <div className="an-grid-2">
              {engine?.isWidgetApplicable('LTV_CAC') ? (
                <div className="an-card">
                  <div className="an-card-header">
                    <div>
                      <div className="an-card-title">{vocab.ENTITY === 'Customer' ? 'LTV / CAC Analysis' : 'Value / Cost Analysis'}</div>
                      <div className="an-card-sub">{`Value vs cost by ${vocab.GROUPING}`}</div>
                    </div>
                  </div>
                  <div className="an-chart-wrap">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={ltvCacChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={formatYAxisTick} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="ltv" name="LTV ($)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="cac" name="CAC ($)" fill="#f97316" radius={[4, 4, 0, 0]} />
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

              <div className="an-card">
                <div className="an-card-header">
                  <div>
                    <div className="an-card-title">Unit Economics Summary</div>
                    <div className="an-card-sub">Core efficiency metrics at a glance</div>
                  </div>
                </div>
                <div className="an-unit-econ-grid">
                  {[
                    { label: vocab.ENTITY === 'Customer' ? 'Avg Revenue Per User' : `Avg ${vocab.MONETARY_VALUE} Per ${vocab.ENTITY}`, value: unitValues[0], icon: <DollarSign size={14} />, color: '#10b981', sub: 'average' },
                    { label: vocab.ENTITY === 'Customer' ? 'Payback Period' : 'Acquisition Payback', value: unitValues[1], icon: <Clock size={14} />, color: '#6366f1', sub: 'estimated payback' },
                    { label: 'Gross Margin', value: unitValues[2], icon: <TrendingUp size={14} />, color: '#06b6d4', sub: 'after COGS' },
                    { label: vocab.ENTITY === 'Customer' ? 'Net Revenue Retention' : 'Net Retention', value: unitValues[3], icon: <ArrowUpRight size={14} />, color: '#a855f7', sub: 'efficiency' },
                    { label: 'Magic Number', value: unitValues[4], icon: <Zap size={14} />, color: '#f97316', sub: 'sales efficiency' },
                    { label: 'Rule of 40', value: unitValues[5], icon: <CheckCircle size={14} />, color: '#ec4899', sub: 'growth + profit %' },
                  ].map((item, i) => (
                    <div key={i} className="an-unit-card" style={{ '--uc-color': item.color } as any}>
                      <div className="an-unit-icon" style={{ color: item.color, background: `${item.color}18` }}>{item.icon}</div>
                      <div className="an-unit-body">
                        <span className="an-unit-label">{item.label}</span>
                        <span className="an-unit-val">{item.value}</span>
                        <span className="an-unit-sub">{item.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
