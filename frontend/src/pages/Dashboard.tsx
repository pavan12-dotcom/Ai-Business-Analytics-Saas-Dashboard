import React, { useState, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import { useNavigate } from 'react-router-dom'
import { formatNumber, formatYAxisTick } from '../services/dataCleaner'
import { SAMPLE_DATASETS } from '../data/sampleDatasets'
import type { SampleDataset } from '../data/sampleDatasets'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid, LineChart, Line
} from 'recharts'
import {
  FolderOpen,
  AlertCircle,
  Loader2,
  Cpu,
  CheckCircle2,
  FileText,
  Layers,
  GitFork,
  Wand2,
  CalendarX
} from 'lucide-react'
import './Dashboard.css'


// ── Tooltip ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="tooltip-row">
          <span style={{ color: p.color || 'var(--accent)' }}>{p.name}</span>
          <span>{typeof p.value === 'number' ? formatNumber(p.value) : p.value}</span>
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
        gap: 6,
        color: 'var(--text-muted)',
        border: '1.5px dashed var(--border2)',
        borderRadius: 'var(--radius-sm)',
        background: 'rgba(99,102,241,0.02)',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600 }}>No data available</span>
      <span style={{ fontSize: 11.5, textAlign: 'center', maxWidth: 220 }}>
        Upload a CSV, Excel, or JSON file to generate insights.
      </span>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────
function KPICard({
  label, value, change, up, sparkData, outliersExcludedCount
}: {
  label: string; value: string; change: string; up: boolean; sparkData?: { v: number }[]; outliersExcludedCount?: number
}) {
  return (
    <div className="card kpi-card-interactive hover-lift">
      <div className="kpi-card-header">
        <div className="kpi-card-title">{label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className={`badge ${up ? 'badge-green' : 'badge-red'}`} style={{ textTransform: 'none' }}>
            {up ? '▲' : '▼'} {change}
          </span>
          {outliersExcludedCount !== undefined && outliersExcludedCount > 0 && (
            <span style={{
              background: 'rgba(245,158,11,0.12)',
              color: 'var(--warning)',
              padding: '2px 7px',
              borderRadius: '999px',
              fontSize: '10.5px',
              fontWeight: 600,
              textTransform: 'none',
              whiteSpace: 'nowrap'
            }}>
              ⚠️ {outliersExcludedCount} outliers excluded
            </span>
          )}
        </div>
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
      <div className="kpi-card-value" style={{ color: 'var(--text-muted)' }}>--</div>
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
        <h2 className="no-data-title">Start Your Analysis</h2>
        <p className="no-data-sub">Upload a dataset to generate AI-powered analytics.</p>
        <div className="no-data-formats">
          <span className="format-tag">CSV</span>
          <span className="format-tag">Excel</span>
          <span className="format-tag">JSON</span>
          <span className="format-tag">PDF</span>
        </div>
        <button className="btn btn-primary no-data-upload-btn" onClick={onUpload} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', margin: '0 auto' }}>
          <FolderOpen size={14} /> Upload Dataset
        </button>
        <div className="no-data-divider"><span>or try a sample</span></div>
        <div className="sample-cards">
          {SAMPLE_DATASETS.map(ds => (
            <button
              key={ds.id}
              className="sample-card"
              onClick={() => onSample(ds)}
            >
              <div className="sample-info">
                <div className="sample-name">
                  <span className="sample-name-icon">{ds.icon}</span>
                  <span>{ds.name}</span>
                </div>
                <div className="sample-desc">{ds.description}</div>
              </div>
              <span className="sample-tag" style={{ background: ds.tagColor + '15', color: ds.tagColor, borderColor: ds.tagColor + '30' }}>
                {ds.tag}
              </span>
            </button>
          ))}
        </div>
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
  const { activeSheet, activeDocument, reparseDoc, analytics, hasData, datasetName, loadSample, upload: ctxUpload, uploadDoc, sheetNames, activeSheetName, selectSheet } = useSpreadsheet()
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
  const [isDqOpen, setIsDqOpen] = useState(false)
  const [activeHighlightType, setActiveHighlightType] = useState<'duplicate' | 'duplicateId' | 'unparseableDate' | 'outlier' | 'nulls' | null>(null)
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
  const idKey = Object.entries(dataSource?.columns_metadata || {}).find(([_, type]) => type === 'identifier')?.[0] || ''

  const highlightedRows = useMemo(() => {
    const set = new Set<number>()
    if (!activeHighlightType) return set

    if (activeHighlightType === 'duplicate') {
      analytics.exactDuplicateRows?.forEach(idx => set.add(idx))
    } else if (activeHighlightType === 'duplicateId') {
      analytics.duplicateIdRows?.forEach(idx => set.add(idx))
    } else if (activeHighlightType === 'unparseableDate') {
      analytics.unparseableDateRows?.forEach(idx => set.add(idx))
    } else if (activeHighlightType === 'outlier') {
      analytics.outlierRows?.forEach(idx => set.add(idx))
    } else if (activeHighlightType === 'nulls') {
      const highNullCols = analytics.columnsWithHighNulls || []
      processedRows.forEach((row: any, idx: number) => {
        if (highNullCols.some(col => row[col] === null || row[col] === undefined || String(row[col]).trim() === '')) {
          set.add(idx)
        }
      })
    }
    return set
  }, [activeHighlightType, analytics, processedRows])

  const processedRowsWithIndex = useMemo(() => {
    return processedRows.map((row: any, idx: number) => ({ ...row, __originalIndex: idx }))
  }, [processedRows])

  const filteredRows = processedRowsWithIndex.filter((row: any) =>
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
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13,
          flexWrap: 'wrap', gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>Status: </span>
            <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>
              {isGuest ? 'Demo Mode' : subscription?.subscription_status === 'active' ? `${subscription.plan} Active` : 'Free Trial'}
            </span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
              {hasData ? `Dataset: ` : 'No dataset loaded'}
            </span>
            {hasData && <span style={{ fontWeight: 600, color: 'var(--accent2)' }}>{datasetName}</span>}

            {/* Sheet selector dropdown (only for multi-sheet Excel workbooks) */}
            {sheetNames.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Layers size={13} style={{ color: 'var(--text-muted)' }} />
                <select
                  id="sheet-selector"
                  value={activeSheetName}
                  onChange={e => selectSheet(e.target.value)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg2)',
                    color: 'var(--text)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                  title="Switch sheet"
                >
                  {sheetNames.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({formatNumber(s.rowCount)} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}
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

      {/* Collapsible Dataset Profile & Data Quality banner */}
      {hasData && (
        <div className="dq-banner-container" style={{
          margin: '16px 0',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          background: 'var(--bg2)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div className="dq-banner-header" 
            onClick={() => setIsDqOpen(!isDqOpen)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'var(--bg-hover)',
              cursor: 'pointer',
              userSelect: 'none',
              borderBottom: isDqOpen ? '1px solid var(--border)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>Dataset Profile & Data Quality Report</span>
              <span style={{
                fontSize: 11,
                background: 'var(--border)',
                color: 'var(--text-muted)',
                padding: '2px 8px',
                borderRadius: 999
              }}>
                {processedRows.length} rows · {analytics.columns.length} columns
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
              {isDqOpen ? 'Collapse ▲' : 'Expand Details ▼'}
            </div>
          </div>
          
          {/* Body */}
          {isDqOpen && (
            <div className="dq-banner-body" style={{
              padding: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 20,
              fontSize: 12.5,
              lineHeight: 1.5
            }}>
              {/* Left Side: Profile */}
              <div style={{ borderRight: '1px solid var(--border)', paddingRight: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📊</span> Dataset Profile
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div><strong>File Name:</strong> {analytics.datasetName || 'Uploaded File'}</div>
                  <div><strong>Structure:</strong> {processedRows.length} rows x {analytics.columns.length} columns ({analytics.datasetType} type)</div>
                  <div>
                    <strong>Detected Column Types:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {Object.entries(dataSource?.columns_metadata || {}).map(([colName, colType]) => (
                        <span key={colName} style={{
                          fontSize: 10,
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          padding: '1px 5px',
                          borderRadius: 4,
                          color: 'var(--text)'
                        }}>
                          {colName} ({String(colType).toUpperCase()})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Null % per column:</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '4px 8px', marginTop: 4 }}>
                      {Object.entries(analytics.nullPercentages || {}).map(([colName, pctVal]) => (
                        <React.Fragment key={colName}>
                          <span style={{ color: 'var(--text-muted)', textIndent: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{colName}</span>
                          <span style={{ textAlign: 'right', fontWeight: pctVal > 20 ? 600 : 400, color: pctVal > 20 ? 'var(--warning)' : 'var(--text)' }}>
                            {pctVal.toFixed(1)}% null
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Side: Data Quality (Clickable) */}
              <div>
                <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚠️</span> Data Quality Report <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-muted)' }}>(Click item to highlight rows)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Duplicates */}
                  <div 
                    onClick={() => setActiveHighlightType(h => h === 'duplicate' ? null : 'duplicate')}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      background: activeHighlightType === 'duplicate' ? 'rgba(245,158,11,0.15)' : 'var(--bg)',
                      border: activeHighlightType === 'duplicate' ? '1px solid var(--warning)' : '1px solid var(--border)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>⚠️ {analytics.exactDuplicatesCount} duplicate rows detected</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activeHighlightType === 'duplicate' ? 'Active (Highlighting)' : 'Click to highlight'}</span>
                  </div>
                  
                  {/* Duplicate IDs */}
                  {idKey && (
                    <div 
                      onClick={() => setActiveHighlightType(h => h === 'duplicateId' ? null : 'duplicateId')}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        background: activeHighlightType === 'duplicateId' ? 'rgba(239,68,68,0.12)' : 'var(--bg)',
                        border: activeHighlightType === 'duplicateId' ? '1px solid var(--red)' : '1px solid var(--border)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>⚠️ {analytics.duplicateIdsCount} duplicate IDs (different data)</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activeHighlightType === 'duplicateId' ? 'Active (Highlighting)' : 'Click to highlight'}</span>
                    </div>
                  )}
                  
                  {/* High Null columns */}
                  <div 
                    onClick={() => setActiveHighlightType(h => h === 'nulls' ? null : 'nulls')}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      background: activeHighlightType === 'nulls' ? 'rgba(245,158,11,0.12)' : 'var(--bg)',
                      border: activeHighlightType === 'nulls' ? '1px solid var(--warning)' : '1px solid var(--border)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>
                      ⚠️ {analytics.columnsWithHighNulls?.length || 0} columns with &gt;20% nulls
                      {analytics.columnsWithHighNulls?.length > 0 && ` (${analytics.columnsWithHighNulls.join(', ')})`}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activeHighlightType === 'nulls' ? 'Active (Highlighting)' : 'Click to highlight'}</span>
                  </div>
                  
                  {/* Unparseable dates */}
                  <div 
                    onClick={() => setActiveHighlightType(h => h === 'unparseableDate' ? null : 'unparseableDate')}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      background: activeHighlightType === 'unparseableDate' ? 'rgba(245,158,11,0.12)' : 'var(--bg)',
                      border: activeHighlightType === 'unparseableDate' ? '1px solid var(--warning)' : '1px solid var(--border)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>⚠️ {analytics.unparseableDatesCount} unparseable date values</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activeHighlightType === 'unparseableDate' ? 'Active (Highlighting)' : 'Click to highlight'}</span>
                  </div>
                  
                  {/* Outliers */}
                  <div 
                    onClick={() => setActiveHighlightType(h => h === 'outlier' ? null : 'outlier')}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      background: activeHighlightType === 'outlier' ? 'rgba(239,68,68,0.12)' : 'var(--bg)',
                      border: activeHighlightType === 'outlier' ? '1px solid var(--red)' : '1px solid var(--border)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span>⚠️ {analytics.outlierRows?.length || 0} outliers excluded from metrics</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activeHighlightType === 'outlier' ? 'Active (Highlighting)' : 'Click to highlight'}</span>
                  </div>
                  
                  {/* Success */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.25)'
                  }}>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                      ✅ {analytics.totalRows - (analytics.outlierRows?.length || 0)} rows successfully processed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                outliersExcludedCount={kpi.outliersExcludedCount}
              />
            )) : (
              <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                No metrics available for this dataset
              </div>
            )}
          </div>

          {/* ── Large Main Analytics Area ── */}
          <div className="main-analytics-area">
            {/* Trend chart */}
            <div className="card">
              <div className="card-header">
                <div style={{ flex: 1 }}>
                  <div className="card-title">
                    {primaryMetricKey ? `${primaryMetricKey} Over Time` : 'Revenue Trend'}
                  </div>
                  <div className="card-sub" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <span>Time-series analysis from your dataset</span>
                    {analytics.cleanedRowsCount > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: 'rgba(99,102,241,0.12)', color: 'var(--accent)',
                        padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 600
                      }}>
                        <Wand2 size={10} /> {analytics.cleanedRowsCount} rows cleaned
                      </span>
                    )}
                    {analytics.unparseableDatesCount > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: 'rgba(245,158,11,0.12)', color: 'var(--warning)',
                        padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 600
                      }}>
                        <CalendarX size={10} /> {analytics.unparseableDatesCount} unparseable dates
                      </span>
                    )}
                    {analytics.chartPointsExcludedCount > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: 'rgba(239,68,68,0.12)', color: 'var(--red)',
                        padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 600
                      }}>
                        ⚠️ {analytics.chartPointsExcludedCount} points excluded from chart (IQR outliers)
                      </span>
                    )}
                    {!analytics.primaryTimeKey && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: 'rgba(245,158,11,0.12)', color: 'var(--warning)',
                        padding: '1px 7px', borderRadius: 999, fontSize: 11, fontWeight: 600
                      }}>
                        ⚠️ No date column found, showing row sequence
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatYAxisTick} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" name={primaryMetricKey || 'Revenue'} stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    height: 320,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: 'var(--text-muted)',
                    border: '1.5px dashed var(--border2)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(99,102,241,0.02)',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Insufficient clean data to render chart</span>
                  {analytics.chartPointsExcludedCount > 0 && (
                    <span style={{ fontSize: 11.5, textAlign: 'center', maxWidth: 250 }}>
                      ({analytics.chartPointsExcludedCount} outlier points were excluded)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── AI Insights Panel ── */}
          <div className="ai-insights-panel-row">
            {/* AI teaser */}
            <div className="card ai-teaser ai-insights-panel">
              <div className="ai-insights-left">
                <div className="ai-teaser-header">
                  <span className="ai-live-dot" />
                  <span className="ai-teaser-title">AI Data Assistant</span>
                  <span className="ai-teaser-badge">Gemini</span>
                </div>
                <div className="ai-teaser-msg ai-msg" style={{ marginTop: 12 }}>
                  I've loaded <strong>{datasetName}</strong> ({formatNumber(analytics.totalRows)} rows).
                  Ask me anything about your data!
                </div>
              </div>
              <div className="ai-insights-right">
                <div className="ai-suggestions-label">Try asking:</div>
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
          </div>

          {/* ── Additional Dynamic Charts ── */}
          <div className="additional-charts-row">
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
                <div
                  style={{
                    height: 160,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: 'var(--text-muted)',
                    border: '1.5px dashed var(--border2)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(99,102,241,0.02)',
                    padding: 12,
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>No category column detected in this dataset</span>
                </div>
              )}
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
                        <tr key={idx} className={highlightedRows.has(row.__originalIndex) ? 'highlighted-row' : ''}>
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
