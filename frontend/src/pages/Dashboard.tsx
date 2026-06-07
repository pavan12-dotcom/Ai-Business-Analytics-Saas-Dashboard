import { useState, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { useNavigate } from 'react-router-dom'
import { SAMPLE_DATASETS } from '../data/sampleDatasets'
import type { SampleDataset } from '../data/sampleDatasets'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, LineChart, Line
} from 'recharts'
import {
  LayoutDashboard,
  FolderOpen,
  AlertCircle,
  Rocket,
  Loader2,
  Cpu,
  CheckCircle2,
  FileText,
  ShoppingCart,
  BarChart3,
  Coins,
  Users2,
  GraduationCap,
  Stethoscope,
  Package,
  Megaphone
} from 'lucide-react'
import './Dashboard.css'

const getDatasetIcon = (id: string) => {
  const iconProps = { size: 22, style: { minWidth: 22, opacity: 0.85 } }
  switch (id) {
    case 'retail': return <ShoppingCart {...iconProps} style={{ color: 'var(--indigo)' }} />
    case 'sales': return <BarChart3 {...iconProps} style={{ color: 'var(--teal)' }} />
    case 'finance': return <Coins {...iconProps} style={{ color: 'var(--amber)' }} />
    case 'hr': return <Users2 {...iconProps} style={{ color: 'var(--pink)' }} />
    case 'education': return <GraduationCap {...iconProps} style={{ color: 'var(--purple)' }} />
    case 'healthcare': return <Stethoscope {...iconProps} style={{ color: 'var(--red)' }} />
    case 'inventory': return <Package {...iconProps} style={{ color: 'var(--blue)' }} />
    case 'marketing': return <Megaphone {...iconProps} style={{ color: 'var(--green)' }} />
    default: return null
  }
}


// ── Tooltip ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="tooltip-row">
          <span style={{ color: p.color || 'var(--accent)' }}>{p.name}</span>
          <span>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Empty chart placeholder ────────────────────────────────────
function EmptyChart({ height = 200 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: 'var(--text-muted)',
        border: '1.5px dashed var(--border2)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(99,102,241,0.02)',
      }}
    >
      <LayoutDashboard size={28} style={{ color: 'var(--accent)', opacity: 0.8 }} />
      <span style={{ fontSize: 13, fontWeight: 600 }}>No data available</span>
      <span style={{ fontSize: 11.5, textAlign: 'center', maxWidth: 220 }}>
        Upload a CSV, Excel, or JSON file to generate insights.
      </span>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────
function KPICard({
  label, value, change, up, sparkData
}: {
  label: string; value: string; change: string; up: boolean; sparkData?: { v: number }[]
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
      {sparkData && sparkData.length > 0 ? (
        <div className="kpi-sparkline">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id="kpiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={1.5} fill="url(#kpiGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="kpi-sparkline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No trend data</span>
        </div>
      )}
    </div>
  )
}

// ── Empty KPI Card ─────────────────────────────────────────────
function EmptyKPICard({ label }: { label: string }) {
  return (
    <div className="card kpi-card-interactive" style={{ opacity: 0.5 }}>
      <div className="kpi-card-header">
        <div className="kpi-card-title">{label}</div>
      </div>
      <div className="kpi-card-value" style={{ color: 'var(--text-muted)' }}>—</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>No data available</div>
    </div>
  )
}

// ── Donut SVG ─────────────────────────────────────────────────
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

// ── Upload/No-data section ─────────────────────────────────────
function NoDataState({ onSample, onUpload }: { onSample: (ds: SampleDataset) => void; onUpload: () => void }) {
  return (
    <div className="no-data-state">
      {/* Hero upload box */}
      <div className="no-data-hero card">
        <Rocket size={42} className="glow-icon" style={{ color: 'var(--accent)', marginBottom: 12, filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.4))' }} />
        <h2 className="no-data-title">Start Your Analysis</h2>
        <p className="no-data-sub">Upload a dataset to generate AI-powered analytics.</p>
        <div className="no-data-formats">
          <span className="format-tag">CSV</span>
          <span className="format-tag">Excel</span>
          <span className="format-tag">JSON</span>
          <span className="format-tag">PDF</span>
        </div>
        <button className="btn btn-primary no-data-upload-btn" onClick={onUpload} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', margin: '0 auto' }}>
          <FolderOpen size={16} /> Upload Dataset
        </button>
        <div className="no-data-divider"><span>or try a sample</span></div>
        <div className="sample-cards">
          {SAMPLE_DATASETS.map(ds => (
            <button
              key={ds.id}
              className="sample-card"
              onClick={() => onSample(ds)}
            >
              <span className="sample-icon">{getDatasetIcon(ds.id)}</span>
              <div className="sample-info">
                <div className="sample-name">{ds.name}</div>
                <div className="sample-desc">{ds.description}</div>
              </div>
              <span className="sample-tag" style={{ background: ds.tagColor + '22', color: ds.tagColor, borderColor: ds.tagColor + '44' }}>
                {ds.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Empty KPI row */}
      <div className="kpi-grid">
        {['Total Revenue', 'Total Records', 'Categories', 'Growth Rate'].map(label => (
          <EmptyKPICard key={label} label={label} />
        ))}
      </div>

      {/* Empty charts */}
      <div className="charts-row">
        <div className="card">
          <div className="card-title">Revenue Trend</div>
          <div className="card-sub">Upload data to generate time-series chart</div>
          <div style={{ marginTop: 16 }}><EmptyChart height={200} /></div>
        </div>
        <div className="card donut-card">
          <div className="card-title">Category Distribution</div>
          <div className="card-sub">Breakdown by segment</div>
          <div style={{ marginTop: 16 }}><EmptyChart height={160} /></div>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const { activeSheet, activeDocument, reparseDoc, analytics, hasData, datasetName, loadSample, upload: ctxUpload, uploadDoc } = useSpreadsheet()
  const navigate = useNavigate()
  const { user, subscription, isGuest, uploadCount, isLocked, setShowSignupModal, isGuestTrialExhausted } = useAuth()
  const [reparsing, setReparsing] = useState(false)
  const [reparseMsg, setReparseMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const handleSample = (ds: SampleDataset) => {
    loadSample(ds)
  }

  const handleUploadClick = () => {
    if (isGuest && isGuestTrialExhausted()) {
      setShowSignupModal(true)
      return
    }
    fileRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadErr(null)
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
    const res = isPdf ? await uploadDoc(file) : await ctxUpload(file)
    setUploading(false)
    if (!res.success) setUploadErr(res.error || 'Upload failed')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSort = (col: string) => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortColumn(col); setSortDirection('asc') }
    setCurrentPage(1)
  }

  // ── Derived analytics values ───────────────────────────────
  const { kpis, monthly, categories, forecastData, primaryMetricKey, primaryCategoryKey } = analytics
  const dataSource = activeSheet || (activeDocument?.parsedRows?.length > 0 ? {
    headers: Object.keys(activeDocument.columnsMetadata || {}),
    columns_metadata: activeDocument.columnsMetadata || {},
    rows: activeDocument.parsedRows,
    filename: activeDocument.filename,
  } : null)

  const processedRows = dataSource?.rows || []
  const filteredRows = processedRows.filter((row: any) =>
    Object.values(row).some(v => String(v).toLowerCase().includes(searchQuery.toLowerCase()))
  )
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortColumn) return 0
    const va = a[sortColumn], vb = b[sortColumn]
    const na = Number(String(va).replace(/[^\d.\-]/g, '')), nb = Number(String(vb).replace(/[^\d.\-]/g, ''))
    if (!isNaN(na) && !isNaN(nb)) return sortDirection === 'asc' ? na - nb : nb - na
    return sortDirection === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
  })
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage))
  const paginatedRows = sortedRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  const donutData = categories.map(c => ({ label: c.label, pct: c.pct, color: c.color }))

  return (
    <div className="dashboard fade-in">
      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Subscription lock banner */}
      {isLocked && (
        <div className="subscription-lock-banner" style={{
          background: subscription?.subscription_status === 'expired'
            ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.15))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))',
          border: subscription?.subscription_status === 'expired' ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={20} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                {subscription?.subscription_status === 'expired' ? 'Subscription Expired' : 'Free Trial Ended'}
              </h4>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                {subscription?.subscription_status === 'expired'
                  ? 'Renew your plan to restore unlimited access.'
                  : 'Upgrade to Premium to continue using AI-powered analytics.'}
              </p>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/billing')}>
            {subscription?.subscription_status === 'expired' ? 'Renew Subscription' : 'Upgrade to Pro'}
          </button>
        </div>
      )}

      {/* Status bar */}
      {!isLocked && (
        <div className="subscription-status-bar" style={{
          background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 'var(--radius)', padding: '10px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Status: </span>
            <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>
              {isGuest ? 'Demo Mode' : subscription?.subscription_status === 'active' ? `${subscription.plan} Active` : 'Free Trial'}
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 16 }}>
              {hasData ? `Dataset: ` : 'No dataset loaded'}
            </span>
            {hasData && <span style={{ fontWeight: 600, color: 'var(--accent2)' }}>{datasetName}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {hasData && (
              <button className="btn btn-secondary btn-xs" onClick={handleUploadClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <FolderOpen size={13} /> Change Dataset
              </button>
            )}
            {(!subscription || subscription.subscription_status === 'trial') && (
              <button className="btn btn-secondary btn-xs" onClick={() => navigate('/app/billing')}>
                Upgrade to Premium
              </button>
            )}
          </div>
        </div>
      )}

      {/* Doc banner */}
      {activeDocument && !activeSheet && (
        <div className={`doc-active-banner ${activeDocument.parsedRows?.length > 0 ? 'doc-active-banner--success' : ''}`}>
          <span className="doc-active-icon">
            {activeDocument.parsedRows?.length > 0 ? (
              <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
            ) : (
              <FileText size={16} style={{ color: 'var(--accent)' }} />
            )}
          </span>
          <div className="doc-active-info">
            {activeDocument.parsedRows?.length > 0 ? (
              <><strong>{activeDocument.filename}</strong> — <strong>{activeDocument.parsedRows.length} rows</strong> extracted.</>
            ) : (
              <><strong>{activeDocument.filename}</strong> uploaded. Click <strong>Extract Data</strong> to analyze.</>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!activeDocument.parsedRows?.length && (
              <button className="btn btn-primary btn-sm" disabled={reparsing}
                onClick={async () => {
                  if (isGuest && isGuestTrialExhausted()) { setShowSignupModal(true); return }
                  setReparsing(true); setReparseMsg(null)
                  const res = await reparseDoc()
                  setReparsing(false)
                  if (!res.success) setReparseMsg(res.message || 'No data found.')
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {reparsing ? (
                  <>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Extracting...
                  </>
                ) : (
                  <>
                    <Cpu size={13} /> Extract Data
                  </>
                )}
              </button>
            )}
            <button className="btn btn-sm" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              onClick={() => navigate('/app/ai', { state: { mode: 'document' } })}>
              AI Q&amp;A →
            </button>
          </div>
        </div>
      )}
      {reparseMsg && (
        <div style={{ color: 'var(--amber)', fontSize: 12, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={14} /> {reparseMsg}
        </div>
      )}
      {uploadErr && (
        <div style={{ color: 'var(--red)', fontSize: 12, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={14} /> {uploadErr}
        </div>
      )}
      {uploading && (
        <div style={{ color: 'var(--accent2)', fontSize: 12, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Uploading dataset...
        </div>
      )}

      {/* ── No data state ── */}
      {!hasData ? (
        <NoDataState onSample={handleSample} onUpload={handleUploadClick} />
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="kpi-grid">
            {kpis.length > 0 ? kpis.slice(0, 4).map((kpi, idx) => (
              <KPICard
                key={idx}
                label={kpi.label}
                value={kpi.value}
                change={kpi.change}
                up={kpi.up}
                sparkData={kpi.sparkData}
              />
            )) : (
              ['Total Revenue', 'Total Records', 'Categories', 'Growth Rate'].map(l => (
                <EmptyKPICard key={l} label={l} />
              ))
            )}
          </div>

          {/* ── Charts Row ── */}
          <div className="charts-row">
            {/* Trend chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    {primaryMetricKey ? `${primaryMetricKey} Over Time` : 'Revenue Trend'}
                  </div>
                  <div className="card-sub">Time-series analysis from your dataset</div>
                </div>
              </div>
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" name={primaryMetricKey || 'Revenue'} stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ marginTop: 16 }}><EmptyChart height={200} /></div>
              )}
            </div>

            {/* Category donut */}
            <div className="card donut-card">
              <div className="card-title">
                {primaryCategoryKey ? `Split by ${primaryCategoryKey}` : 'Category Distribution'}
              </div>
              <div className="card-sub">Breakdown by segment</div>
              {donutData.length > 0 ? (
                <div className="donut-wrap">
                  <svg width="100" height="100" viewBox="0 0 110 110">
                    <DonutChart data={donutData} />
                  </svg>
                  <div className="donut-legend">
                    {donutData.slice(0, 5).map(d => (
                      <div key={d.label} className="donut-legend-item">
                        <span className="donut-dot" style={{ background: d.color }} />
                        <span style={{ fontSize: 11.5 }}>{d.label} · {d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 16 }}><EmptyChart height={160} /></div>
              )}
            </div>
          </div>

          {/* ── Bottom Row: AI + Table ── */}
          <div className="bottom-row">
            {/* AI teaser */}
            <div className="card ai-teaser">
              <div className="ai-teaser-header">
                <span className="ai-live-dot" />
                <span className="ai-teaser-title">AI Data Assistant</span>
                <span className="ai-teaser-badge">Gemini</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                <div className="ai-teaser-msg ai-msg">
                  I've loaded <strong>{datasetName}</strong> ({analytics.totalRows.toLocaleString()} rows).
                  Ask me anything about your data!
                </div>
                <div className="ai-suggestions">
                  {[
                    `What is the total ${primaryMetricKey || 'value'}?`,
                    'Which category has the most records?',
                    'Summarize this dataset.',
                  ].map(s => (
                    <span key={s} className="ai-sug"
                      onClick={() => navigate('/app/ai', { state: { mode: activeSheet ? 'spreadsheet' : 'document', question: s } })}>
                      {s}
                    </span>
                  ))}
                </div>
                <button className="btn btn-primary ai-teaser-link"
                  onClick={() => navigate('/app/ai', { state: { mode: activeSheet ? 'spreadsheet' : 'document' } })}>
                  Open AI Assistant →
                </button>
              </div>
            </div>

            {/* Dataset table */}
            <div className="card" style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div className="card-title">Dataset Explorer</div>
                  <div className="card-sub">{filteredRows.length} rows · {analytics.columns.length} columns</div>
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, width: 180 }}
                />
              </div>

              {analytics.columns.length > 0 ? (
                <>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {analytics.columns.map(col => (
                          <th key={col} onClick={() => handleSort(col)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            {col} {sortColumn === col ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRows.length > 0 ? paginatedRows.map((row, idx) => (
                        <tr key={idx}>
                          {analytics.columns.map(col => (
                            <td key={col}
                              className={dataSource?.columns_metadata?.[col] === 'metric' ? 'mono' : ''}
                              style={{ fontWeight: dataSource?.columns_metadata?.[col] === 'identifier' ? 500 : 400 }}>
                              {row[col] !== undefined && row[col] !== null ? String(row[col]) : '—'}
                            </td>
                          ))}
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={analytics.columns.length} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                            No records found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-xs" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</button>
                      <button className="btn btn-secondary btn-xs" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No records found. Upload data to populate this table.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
