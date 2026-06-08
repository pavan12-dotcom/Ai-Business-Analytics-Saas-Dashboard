import { useState, useEffect } from 'react'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import * as XLSX from 'xlsx'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { formatNumber, formatYAxisTick } from '../services/dataCleaner'
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  Award,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Layers,
  Lock,
  AlertCircle
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  LabelList
} from 'recharts'
import './Reports.css'

const statusClass: Record<string, string> = {
  Active: 'badge-green',
  Passed: 'badge-green',
  Compliant: 'badge-green',
  InStock: 'badge-green',
  High: 'badge-green',
  Paid: 'badge-green',
  Success: 'badge-green',
  Inactive: 'badge-gray',
  Failed: 'badge-red',
  Churned: 'badge-red',
  LowStock: 'badge-red',
  Out: 'badge-red',
  Pending: 'badge-yellow',
  Low: 'badge-yellow',
  Readmitted: 'badge-yellow',
}

export default function Reports() {
  const { analytics, hasData } = useSpreadsheet()
  const { isLocked } = useAuth()
  const navigate = useNavigate()

  const { customers = [], monthly = [], kpis = [], categories = [], aiInsights, datasetType, entityName, valueMetricName } = analytics

  const [currentPage, setCurrentPage] = useState(1)
  const [activeTemplate, setActiveTemplate] = useState<'executive' | 'category' | 'ledger'>('executive')
  const rowsPerPage = 7

  useEffect(() => {
    setCurrentPage(1)
  }, [customers])

  const totalRev = monthly.reduce((s, m) => s + m.revenue, 0)
  const totalMRR = monthly.reduce((s, m) => s + m.mrr, 0)
  const averageMRR = monthly.length > 0 ? Math.round(totalMRR / monthly.length) : 0

  const totalPages = Math.max(1, Math.ceil(customers.length / rowsPerPage))
  const paginatedCustomers = customers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  // Exporters
  const exportToCSV = () => {
    if (isLocked) {
      alert("Reports export is locked on the free trial. Please upgrade to Pro.")
      return
    }
    if (!hasData) return
    const headers = ['ID', 'Entity Name', 'Reference / Email', 'Primary Category', 'Metric Value', 'Status']
    const csvContent = [
      headers.join(','),
      ...customers.map(c => [c.id, `"${c.name}"`, c.email, c.plan, c.mrr, c.status].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `${activeTemplate}_report_export.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToExcel = () => {
    if (isLocked) {
      alert("Reports export is locked on the free trial. Please upgrade to Pro.")
      return
    }
    if (!hasData) return
    const ws = XLSX.utils.json_to_sheet(customers)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'DataRecords')
    XLSX.writeFile(wb, `${activeTemplate}_metrics_sheet.xlsx`)
  }

  const getTemplateTitle = () => {
    if (activeTemplate === 'executive') return 'Executive Data Audit Summary'
    if (activeTemplate === 'category') return 'Dimensional Category Breakdown'
    return 'Detailed Data Records Ledger'
  }

  return (
    <div className="reports-page fade-in">
      {/* Header */}
      <div className="reports-header no-print">
        <div>
          <div className="reports-page-title">Dynamic Reports Center</div>
          <div className="reports-page-sub">Compile and export audited analytical ledgers</div>
        </div>
        <div className="reports-actions">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={exportToCSV}
            disabled={isLocked || !hasData}
            style={isLocked || !hasData ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <Download size={13} style={{ marginRight: 6 }} />
            Export CSV
          </button>
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={exportToExcel}
            disabled={isLocked || !hasData}
            style={isLocked || !hasData ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <Download size={13} style={{ marginRight: 6 }} />
            Excel Sheet
          </button>
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => {
              if (isLocked) {
                alert("PDF report printing is locked on the free trial. Please upgrade to Pro.")
                return
              }
              window.print()
            }}
            disabled={isLocked || !hasData}
            style={isLocked || !hasData ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            <Printer size={13} style={{ marginRight: 6 }} />
            Print Report (PDF)
          </button>
        </div>
      </div>

      {/* Template selection tabs */}
      <div className="reports-template-selector no-print">
        <button
          className={`template-tab-btn ${activeTemplate === 'executive' ? 'active' : ''}`}
          onClick={() => setActiveTemplate('executive')}
          disabled={!hasData}
        >
          <Award size={14} />
          Executive Summary
        </button>
        <button
          className={`template-tab-btn ${activeTemplate === 'category' ? 'active' : ''}`}
          onClick={() => setActiveTemplate('category')}
          disabled={!hasData}
        >
          <Layers size={14} />
          Category Breakdown
        </button>
        <button
          className={`template-tab-btn ${activeTemplate === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTemplate('ledger')}
          disabled={!hasData}
        >
          <FileText size={14} />
          Audited Ledger
        </button>
      </div>

      {/* Print Only Header */}
      <div className="print-only-header">
        <h1>{getTemplateTitle()}</h1>
        <p>Universal AI Analytics Engine Report · Generated on {new Date().toLocaleDateString()}</p>
        <hr />
      </div>

      {!hasData ? (
        <div className="card no-print" style={{
          padding: '60px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: 12,
          marginTop: 20
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text)' }}>No reports available</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 450, margin: 0, lineHeight: 1.6 }}>
            Upload a dataset to generate AI-powered analytics.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/app')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            Go to Dashboard
          </button>
        </div>
      ) : (
        <>
          {/* ────────────────── 1. EXECUTIVE SUMMARY TEMPLATE ────────────────── */}
          {activeTemplate === 'executive' && (
            <div className="template-content-area premium-locked-container">
              {isLocked && (
                <div className="premium-blur-overlay" style={{ zIndex: 10 }}>
                  <div className="lock-icon-wrap" style={{ width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h5 className="lock-title">Executive Summary Locked</h5>
                  <p className="lock-desc">Your free trial has ended. Upgrade to Premium to view performance audits.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/billing')}>Upgrade to Pro</button>
                </div>
              )}
              <div style={isLocked ? { width: '100%', display: 'flex', flexDirection: 'column', gap: 20, filter: 'blur(5px)', pointerEvents: 'none' } : { width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* KPIs */}
                <div className="report-summary">
                  {kpis.slice(0, 4).map((kpi, idx) => (
                    <div key={idx} className="report-metric glass-card">
                      <div className="report-metric-label">{kpi.label}</div>
                      <div className="report-metric-val">{kpi.value}</div>
                      <span className={`report-metric-change ${kpi.up ? 'green' : 'amber'}`}>{kpi.change}</span>
                    </div>
                  ))}
                </div>

                <div className="reports-grid">
                  {/* Trend chart */}
                  <div className="card glass-card">
                    <div className="card-title">{valueMetricName} Growth Profile</div>
                    <div className="card-sub" style={{ marginBottom: 12 }}>Time-series progress view</div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} />
                        <YAxis tickFormatter={formatYAxisTick} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} />
                        <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }} />
                        <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]}>
                          <LabelList position="top" formatter={(v: any) => formatNumber(Number(v), /revenue|mrr|acv|amount|price|sales|income|spend|profit|earn|salary|wage|cost|treatment/i.test(valueMetricName), true)} style={{ fill: 'var(--text-muted)', fontSize: 9, fontWeight: 500 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* AI Findings */}
                  <div className="card glass-card">
                    <div className="card-title">Audited Findings &amp; Observations</div>
                    <div className="card-sub" style={{ marginBottom: 16 }}>Engineered Insight Metrics</div>
                    <div className="audit-list">
                      {aiInsights.keyFindings.map((finding, idx) => (
                        <div key={idx} className="audit-item compliant">
                          <div className="audit-body">
                            <div className="audit-title">Audit Flag #{idx + 1}</div>
                            <div className="audit-desc">{finding}</div>
                          </div>
                          <span className="audit-badge status-pass">COMPLIANT</span>
                        </div>
                      ))}
                      {aiInsights.anomalies.map((anomaly, idx) => (
                        <div key={idx} className="audit-item audited">
                          <div className="audit-body">
                            <div className="audit-title">Variance Flag #{idx + 1}</div>
                            <div className="audit-desc">{anomaly}</div>
                          </div>
                          <span className="audit-badge status-active">AUDITED</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────── 2. CATEGORY BREAKDOWN TEMPLATE ────────────────── */}
          {activeTemplate === 'category' && (
            <div className="template-content-area premium-locked-container">
              {isLocked && (
                <div className="premium-blur-overlay" style={{ zIndex: 10 }}>
                  <div className="lock-icon-wrap" style={{ width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h5 className="lock-title">Category Analysis Locked</h5>
                  <p className="lock-desc">Your free trial has ended. Upgrade to Premium to view category breakdowns.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/billing')}>Upgrade to Pro</button>
                </div>
              )}
              <div style={isLocked ? { width: '100%', display: 'flex', flexDirection: 'column', gap: 20, filter: 'blur(5px)', pointerEvents: 'none' } : { width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                <div className="reports-grid">
                  {/* Category Trend chart */}
                  <div className="card glass-card">
                    <div className="card-title">Dimensional Segment Strengths</div>
                    <div className="card-sub" style={{ marginBottom: 12 }}>Visual representation of category counts</div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={categories} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} />
                        <YAxis tickFormatter={formatYAxisTick} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} />
                        <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }} />
                        <Bar dataKey="count" fill="var(--chart-5)" radius={[4, 4, 0, 0]}>
                          <LabelList position="top" formatter={(v: any) => formatNumber(Number(v), false, true)} style={{ fill: 'var(--text-muted)', fontSize: 9, fontWeight: 500 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Recommendations */}
                  <div className="card glass-card">
                    <div className="card-title">Recommendations Matrix</div>
                    <div className="card-sub" style={{ marginBottom: 16 }}>AI Engineered Directives</div>
                    <div className="investor-kpis-list">
                      {aiInsights.recommendations.map((rec, idx) => (
                        <div key={idx} className="investor-kpi-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '12px' }}>
                          <div>
                            <div className="ik-label" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>Directive #{idx + 1}</div>
                            <div className="ik-sub" style={{ fontSize: '12.5px', marginTop: '4px', lineHeight: 1.5 }}>{rec}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────── 3. DETAILED LEDGER TEMPLATE ────────────────── */}
          {activeTemplate === 'ledger' && (
            <div className="template-content-area premium-locked-container">
              {isLocked && (
                <div className="premium-blur-overlay" style={{ zIndex: 10 }}>
                  <div className="lock-icon-wrap" style={{ width: 54, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h5 className="lock-title">Audited Ledger Locked</h5>
                  <p className="lock-desc">Your free trial has ended. Upgrade to Premium to view detailed data ledgers.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/billing')}>Upgrade to Pro</button>
                </div>
              )}
              <div style={isLocked ? { width: '100%', display: 'flex', flexDirection: 'column', gap: 20, filter: 'blur(5px)', pointerEvents: 'none' } : { width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                <div className="reports-grid">
                  {/* Monthly ledger summary */}
                  <div className="card glass-card">
                    <div className="card-title">Time-series Ledger Summary</div>
                    <div className="card-sub" style={{ marginBottom: 12 }}>Time-block performance status</div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Period Group</th>
                          <th>Aggregate Sum</th>
                          <th>Average Value</th>
                          <th>Month growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.map((m, i) => {
                          const prev = i > 0 ? monthly[i - 1].revenue : null
                          const diff = prev ? m.revenue - prev : 0
                          const isCurrency = /revenue|mrr|acv|amount|price|sales|income|spend|profit|earn|salary|wage|cost|treatment/i.test(valueMetricName)
                          const formatVal = (v: number) => formatNumber(v, isCurrency)
                          return (
                            <tr key={m.month}>
                              <td>{m.month}</td>
                              <td className="mono">{formatVal(m.revenue)}</td>
                              <td className="mono">{formatVal(m.mrr)}</td>
                              <td className={diff >= 0 ? 'tag-up' : 'tag-down'}>
                                {prev ? `${diff >= 0 ? '+' : ''}${formatVal(diff)}` : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Customer ledger */}
                  <div className="card glass-card">
                    <div className="card-title">{entityName} Registry List</div>
                    <div className="card-sub" style={{ marginBottom: 12 }}>Chronological ledger directory</div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{entityName}</th>
                          <th>Category</th>
                          <th style={{ textAlign: 'right' }}>{valueMetricName}</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCustomers.map(c => (
                          <tr key={c.id}>
                            <td>{c.name}</td>
                            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.plan}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>
                              {formatNumber(c.mrr, /revenue|mrr|acv|amount|price|sales|income|spend|profit|earn|salary|wage|cost|treatment/i.test(valueMetricName))}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${statusClass[c.status] || 'badge-green'}`}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {customers.length > rowsPerPage && (
                      <div className="table-pagination">
                        <span className="pagination-info">
                          Page {currentPage} of {totalPages} ({customers.length} total)
                        </span>
                        <div className="pagination-buttons">
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft size={12} />
                            Prev
                          </button>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
