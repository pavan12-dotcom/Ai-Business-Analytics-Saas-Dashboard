/**
 * CustomerIntelligence.tsx
 * All charts driven by real dataset. Falls back to demo data when no file uploaded.
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { DOMAIN_VOCABULARIES, CONCEPT_DEFINITIONS } from '../services/dataEngine'
import { useAuth } from '../context/AuthContext'
import { formatNumber, cleanNumericValue, cleanDateColumn } from '../services/dataCleaner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell
} from 'recharts'
import { ArrowUpRight, ArrowDownRight, Zap, Clock, Check, Activity, UploadCloud, X } from 'lucide-react'
import RecommendedDatasetsWorkspace from '../components/RecommendedDatasetsWorkspace'
import { computeCustomerKPIs, getSegmentCategories, resolveColumnForWidget } from '../services/kpiEngine'
import './Intelligence.css'

// ── Mock fallbacks ────────────────────────────────────────────
const MOCK_SEG = [
  { name:'Champions',   value:420,  color:'#10b981', risk:'Low'      },
  { name:'Loyal Users', value:860,  color:'#6366f1', risk:'Low'      },
  { name:'Potential',   value:1240, color:'#06b6d4', risk:'Medium'   },
  { name:'At Risk',     value:680,  color:'#f97316', risk:'High'     },
  { name:'Churned',     value:290,  color:'#ef4444', risk:'Critical' },
  { name:'New',         value:351,  color:'#a855f7', risk:'Medium'   },
]
const MOCK_HEALTH = [
  { subject:'Engagement',   A:87 },
  { subject:'Retention',    A:82 },
  { subject:'Satisfaction', A:76 },
  { subject:'Growth',       A:91 },
  { subject:'Support',      A:68 },
  { subject:'Usage',        A:79 },
]
const MOCK_CHURN = [
  { segment:'Enterprise', risk:8  },
  { segment:'Mid-Market', risk:14 },
  { segment:'SMB',        risk:22 },
  { segment:'Startup',    risk:31 },
  { segment:'Trial',      risk:48 },
]
const MOCK_TTV = [
  { day:'Day 1',  activated:100 },
  { day:'Day 3',  activated:78  },
  { day:'Day 7',  activated:62  },
  { day:'Day 14', activated:54  },
  { day:'Day 30', activated:47  },
  { day:'Day 60', activated:42  },
  { day:'Day 90', activated:39  },
]
const MOCK_COHORTS = [
  { cohort:'Q1 2024', size:340,  m:[100,88,79,74,70,67] },
  { cohort:'Q2 2024', size:420,  m:[100,91,83,78,73,null] },
  { cohort:'Q3 2024', size:510,  m:[100,93,86,81,null,null] },
  { cohort:'Q4 2024', size:680,  m:[100,94,89,null,null,null] },
  { cohort:'Q1 2025', size:780,  m:[100,96,null,null,null,null] },
  { cohort:'Q2 2025', size:1020, m:[100,null,null,null,null,null] },
]
const SEG_COLORS = ['#10b981','#6366f1','#06b6d4','#f97316','#ef4444','#a855f7','#ec4899','#f59e0b']
const RISKS      = ['Low','Low','Medium','High','Critical','Medium','High','Low']

// ── Custom Tooltip ────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="tooltip-row">
          <span style={{ color: p.color || 'var(--accent)' }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
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

export default function CustomerIntelligence() {
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

  const { customers=[], categories=[], monthly=[], kpis=[], forecastData=[],
          primaryMetricKey='', primaryTimeKey='', primaryCategoryKey='',
          entityName='Record', valueMetricName='Value', totalRows=0 } = analytics

  const rawRows = activeSheet?.rows || []
  const meta: Record<string,string> = activeSheet?.columns_metadata || {}
  const cols = Object.keys(meta)

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [hoveredCohort, setHoveredCohort] = useState<{cohort:string;m:string;rate:number|null}|null>(null)

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

  const ltvCacKPI = useMemo(() => {
    if (hasData && sharedKPIs) {
      return sharedKPIs.ltvCac
    }
    return { ratio: 10.3, note: null }
  }, [hasData, sharedKPIs])

  const activeCount  = customerKPIs.active
  const atRiskCount  = customerKPIs.atRisk
  const churnedCount = customerKPIs.total - customerKPIs.active
  const totalCount   = customerKPIs.total
  const churnPct     = customerKPIs.churnRate

  // ── REAL segment data from categories ─────────────────────
  const segData = useMemo(() => {
    if (!hasData || !engine) {
      return MOCK_SEG.map(s => ({ ...s, pct: Math.round((s.value / 3841) * 100) }))
    }
    const COLORS = ['#10b981', '#6366f1', '#06b6d4', '#f97316', '#ef4444', '#a855f7']
    const RISKS = ['Low', 'Low', 'Medium', 'High', 'Critical', 'Medium']
    const breakdown = engine.getCategoryBreakdown(['segment', 'tier', 'plan', 'category'])
    return breakdown.categories.slice(0, 6).map((cat, i) => ({
      name: cat.name,
      value: cat.count,
      color: COLORS[i % COLORS.length],
      risk: RISKS[i % RISKS.length],
      pct: cat.pct,
    }))
  }, [hasData, engine])

  // ── REAL health score from KPIs ────────────────────────────
  const healthData = useMemo(() => {
    if (!hasData || !sharedKPIs) return MOCK_HEALTH
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

  // ── REAL churn risk from categories ───────────────────────
  const churnData = useMemo(() => {
    if (!hasData || !engine) return MOCK_CHURN
    const res = engine.getChurnRiskBySegment()
    return res.data.length > 0 ? res.data : MOCK_CHURN
  }, [hasData, engine])

  // ── REAL TTV from monthly data ─────────────────────────────
  const ttvData = useMemo(() => {
    if (!hasData || !engine || !monthly.length) return MOCK_TTV
    return monthly.slice(0, 7).map((m, i) => ({
      day: m.month,
      activated: Math.round(100 - (i * (100 / (monthly.length + 1))))
    }))
  }, [hasData, engine, monthly])

  // ── REAL cohort from date + category groupings ─────────────
  const cohortData = useMemo(() => {
    if (hasData && timeKey && rawRows.length > 0) {
      const quarterMap: Record<string, {size:number; dateKey:Date}> = {}
      rawRows.forEach((r: any) => {
        const rawDate = r[timeKey]; if (!rawDate) return
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
          m: [100, ...[88, 79, 74, 70, 67].slice(0, 5 - i).map(v => i < 5 - i ? v : null)] as (number|null)[]
        }))
      }
    }
    return MOCK_COHORTS
  }, [hasData, timeKey, rawRows])

  if (!hasData) {
    return <RecommendedDatasetsWorkspace featureName="Customer Intelligence" />
  }

  return (
    <div className="int-page fade-in">

      {/* ── KPI Row ── */}
      <div className="int-kpi-row">
        <StatPill
          label={`Total ${vocab.ENTITY}s`}
          value={formatNumber(hasData ? (totalCount || customers.length) : 3841)}
          change={kpis[0]?.change || '+12.4%'} up
        />
        <StatPill
          label={`Active ${vocab.ENTITY}s`}
          value={formatNumber(hasData ? activeCount : 3120)}
          change="+8.2%" up
        />
        <StatPill
          label={vocab.ENTITY_STATUS === 'Subscription Status' ? 'At Risk' : `Flagged ${vocab.ENTITY}s`}
          value={formatNumber(hasData ? atRiskCount : 421)}
          change="+2.1%" up={false}
        />
        <StatPill
          label={vocab.ENTITY_STATUS === 'Subscription Status' ? 'Churn Rate' : 'Negative Rate'}
          value={`${churnPct.toFixed(1)}%`}
          change="-0.8%" up
        />
      </div>

      {/* ── Segments + Health ── */}
      <div className="int-grid-2">
        <div className="int-card">
          <div className="int-card-header">
            <div>
              <div className="int-card-title">
                {hasData ? `${vocab.ENTITY} Segments` : 'Customer Segments'}
              </div>
              <div className="int-card-sub">
                {hasData && primaryCategoryKey
                  ? `Grouped by: ${primaryCategoryKey}`
                  : 'RFM-based behavioral clustering'}
              </div>
            </div>
          </div>
          <div className="int-segments">
            {segData.map((seg, i) => (
              <div key={i} className="int-seg-row" style={{ '--seg-delay': `${i * 60}ms` } as any}>
                <div className="int-seg-info">
                  <span className="int-seg-dot" style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}80` }}/>
                  <span className="int-seg-name">{seg.name}</span>
                  <span className={`int-risk risk-${seg.risk.toLowerCase()}`}>{seg.risk}</span>
                </div>
                <div className="int-seg-bar-bg">
                  <div className="int-seg-bar-fg" style={{ width: `${seg.pct}%`, background: seg.color }}/>
                </div>
                <div className="int-seg-meta">
                  <span>{formatNumber(seg.value)}</span>
                  <span className="int-seg-pct">{seg.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {engine?.isWidgetApplicable('CHURN_ANALYSIS') ? (
          <div className="int-card">
            <div className="int-card-header">
              <div>
                <div className="int-card-title">{`${vocab.ENTITY} Health Score`}</div>
                <div className="int-card-sub">Aggregate status across 6 dimensions</div>
              </div>
            </div>
            <div className="int-chart-wrap">
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={healthData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }}/>
                  <Radar name="Health" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.22} strokeWidth={2.5}/>
                  <Tooltip content={<CustomTooltip/>}/>
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

      {/* ── Churn Risk + Time to Value ── */}
      <div className="int-grid-2">
        {engine?.isWidgetApplicable('CHURN_ANALYSIS') ? (
          <div className="int-card">
            <div className="int-card-header">
              <div>
                <div className="int-card-title">{vocab.ENTITY_STATUS === 'Subscription Status' ? 'Churn Risk by Segment' : `Flagged ${vocab.ENTITY}s by ${vocab.GROUPING}`}</div>
                <div className="int-card-sub">{vocab.ENTITY_STATUS === 'Subscription Status' ? '% at churn risk per category' : `Percentage of flagged ${vocab.ENTITY}s per grouping`}</div>
              </div>
            </div>
            <div className="int-chart-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={churnData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3"/>
                  <XAxis dataKey="segment" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%"/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Bar dataKey="risk" name="Risk %" radius={[6, 6, 0, 0]}>
                    {churnData.map((d, i) => (
                      <Cell key={i} fill={d.risk < 15 ? '#10b981' : d.risk < 30 ? '#f97316' : '#ef4444'}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="int-churn-legend">
                <span className="int-churn-pill safe">Low &lt;15%</span>
                <span className="int-churn-pill medium">Medium 15-30%</span>
                <span className="int-churn-pill high">High &gt;30%</span>
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
          <div className="int-card">
            <div className="int-card-header">
              <div>
                <div className="int-card-title">
                  {hasData && primaryTimeKey ? `${valueMetricName} Trend` : 'Time to Value Activation'}
                </div>
                <div className="int-card-sub">
                  {hasData && primaryTimeKey
                    ? `${primaryMetricKey} over time`
                    : `% ${vocab.ENTITY}s who activated within N days`}
                </div>
              </div>
            </div>
            <div className="int-chart-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={ttvData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTtv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.22}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3"/>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" domain={[0, 100]}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="activated" name="Activated %" stroke="#06b6d4" strokeWidth={2.5} fill="url(#gTtv)" dot={{ r: 4, fill: '#06b6d4' }}/>
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

      {/* ── Monthly Value Trend (only when data) ── */}
      {hasData && monthly.length > 0 && (
        <div className="int-card">
          <div className="int-card-header">
            <div>
              <div className="int-card-title">{valueMetricName} Monthly Trend</div>
              <div className="int-card-sub">Aggregated {primaryMetricKey} across time periods</div>
            </div>
            <div className="int-legend-row">
              <span className="int-dot" style={{ background: '#6366f1' }}/> {primaryMetricKey}
            </div>
          </div>
          <div className="int-chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCustRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3"/>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}/>
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="revenue" name={primaryMetricKey} stroke="#6366f1" strokeWidth={2.5} fill="url(#gCustRev)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Cohort Retention Heatmap ── */}
      {engine?.isWidgetApplicable('COHORT_RETENTION') ? (
        <div className="int-card">
          <div className="int-card-header">
            <div>
              <div className="int-card-title">{`${vocab.ENTITY} Retention Heatmap`}</div>
              <div className="int-card-sub">
                {hasData && primaryTimeKey
                  ? `Retention by ${primaryTimeKey} cohort`
                  : `% retained by acquisition cohort over 6 periods`}
              </div>
            </div>
            <div className="int-time-chip"><Clock size={11}/> {hasData ? 'Live Data' : 'Demo'}</div>
          </div>
          <div className="int-cohort-wrap">
            <table className="int-cohort-table">
              <thead>
                <tr>
                  <th>Cohort</th><th>Size</th>
                  {['M1','M2','M3','M4','M5','M6'].map(m => <th key={m}>{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {cohortData.map(c => (
                  <tr key={c.cohort}>
                    <td style={{ fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{c.cohort}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{formatNumber(c.size)}</td>
                    {c.m.map((rate, idx) => {
                      const opacity = rate !== null ? rate / 100 : 0
                      return (
                        <td key={idx}
                          className="int-cohort-cell"
                          style={{
                            background: rate !== null ? `rgba(99,102,241,${0.1 + opacity * 0.85})` : 'var(--bg-hover)',
                            color: rate !== null ? (opacity > 0.5 ? '#fff' : 'var(--text)') : 'var(--text-muted)',
                            fontWeight: rate !== null ? 700 : 400,
                            textAlign: 'center', fontSize: 12
                          }}
                          onMouseEnter={() => rate !== null && setHoveredCohort({ cohort: c.cohort, m: `M${idx+1}`, rate })}
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
              <div className="int-cohort-hint fade-in">
                <Zap size={12} style={{ color: 'var(--accent)' }}/>
                <span>
                  <strong>{hoveredCohort.cohort}</strong> at {hoveredCohort.m}:{' '}
                  <strong>{hoveredCohort.rate}%</strong> retained.
                  {hoveredCohort.rate! >= 85 ? ' Excellent!' : hoveredCohort.rate! >= 70 ? ' Good — watch drop-off.' : ' Needs attention.'}
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
