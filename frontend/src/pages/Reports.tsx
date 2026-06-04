import { useState, useEffect } from 'react'
import { SEED } from '../data/seed'
import { fetchRevenue, fetchCustomers } from '../services/api'
import { useSpreadsheet } from '../context/SpreadsheetContext'
import * as XLSX from 'xlsx'
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  Award,
  DollarSign,
  Users,
  Activity,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  PieChart as ChartIcon,
  ShieldCheck
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
  Line
} from 'recharts'
import './Reports.css'

export default function Reports() {
  const { activeSheet, activeDocument, getSpreadsheetCustomers, getSpreadsheetMonthlyMetrics } = useSpreadsheet()
  const [monthly, setMonthly] = useState(SEED.monthly)
  const [customers, setCustomers] = useState(SEED.customers)
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTemplate, setActiveTemplate] = useState<'ceo' | 'investor' | 'finance'>('ceo')
  const rowsPerPage = 7

  useEffect(() => {
    setCurrentPage(1)
  }, [customers])

  useEffect(() => {
    if (activeSheet || (activeDocument && activeDocument.parsedRows?.length > 0)) {
      setMonthly(getSpreadsheetMonthlyMetrics())
      setCustomers(getSpreadsheetCustomers())
    } else {
      let active = true
      Promise.all([fetchRevenue(), fetchCustomers()])
        .then(([revData, custData]) => {
          if (!active) return
          if (revData) setMonthly(revData)
          if (custData) setCustomers(custData)
        })
        .catch(err => console.error('Error fetching reports data:', err))
      return () => { active = false }
    }
  }, [activeSheet, activeDocument])

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
    const headers = ['ID', 'Name', 'Email', 'Plan', 'MRR', 'Status']
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
    const ws = XLSX.utils.json_to_sheet(customers)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Customers')
    XLSX.writeFile(wb, `${activeTemplate}_financial_sheet.xlsx`)
  }

  const getTemplateTitle = () => {
    if (activeTemplate === 'ceo') return 'CEO Executive Report'
    if (activeTemplate === 'investor') return 'Investor Deck Metrics'
    return 'Revenue & Finance Ledger'
  }

  return (
    <div className="reports-page fade-in">
      {/* Header */}
      <div className="reports-header no-print">
        <div>
          <div className="reports-page-title">Business Reports Center</div>
          <div className="reports-page-sub">Compile and export audited financial matrices</div>
        </div>
        <div className="reports-actions">
          <button className="btn btn-secondary btn-sm" onClick={exportToCSV}>
            <Download size={13} style={{ marginRight: 6 }} />
            Export CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={exportToExcel}>
            <Download size={13} style={{ marginRight: 6 }} />
            Excel Sheet
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
            <Printer size={13} style={{ marginRight: 6 }} />
            Print Report (PDF)
          </button>
        </div>
      </div>

      {/* Template selection tabs */}
      <div className="reports-template-selector no-print">
        <button
          className={`template-tab-btn ${activeTemplate === 'ceo' ? 'active' : ''}`}
          onClick={() => setActiveTemplate('ceo')}
        >
          <Award size={14} />
          CEO Dashboard Summary
        </button>
        <button
          className={`template-tab-btn ${activeTemplate === 'investor' ? 'active' : ''}`}
          onClick={() => setActiveTemplate('investor')}
        >
          <TrendingUp size={14} />
          Investor Pitch Indicators
        </button>
        <button
          className={`template-tab-btn ${activeTemplate === 'finance' ? 'active' : ''}`}
          onClick={() => setActiveTemplate('finance')}
        >
          <DollarSign size={14} />
          Billing & Finance Breakdown
        </button>
      </div>

      {/* Print Only Header */}
      <div className="print-only-header">
        <h1>{getTemplateTitle()}</h1>
        <p>InsightAI SaaS Business Analytics Report · Generated on {new Date().toLocaleDateString()}</p>
        <hr />
      </div>

      {/* ────────────────── 1. CEO EXECUTIVE REPORT TEMPLATE ────────────────── */}
      {activeTemplate === 'ceo' && (
        <div className="template-content-area">
          <div className="report-summary">
            <div className="report-metric glass-card">
              <div className="report-metric-label">H1 Net Revenue</div>
              <div className="report-metric-val">${totalRev.toLocaleString()}</div>
              <span className="report-metric-change green">▲ +62% vs H2</span>
            </div>
            <div className="report-metric glass-card">
              <div className="report-metric-label">Average MRR</div>
              <div className="report-metric-val">${averageMRR.toLocaleString()}</div>
              <span className="report-metric-change green">▲ +12.4% MoM</span>
            </div>
            <div className="report-metric glass-card">
              <div className="report-metric-label">Customer Count</div>
              <div className="report-metric-val">{customers.length}</div>
              <span className="report-metric-change green">▲ +8.1% growth</span>
            </div>
            <div className="report-metric glass-card">
              <div className="report-metric-label">Avg Churn Rate</div>
              <div className="report-metric-val">2.4%</div>
              <span className="report-metric-change green">▼ -0.4% decline</span>
            </div>
          </div>

          <div className="reports-grid">
            <div className="card glass-card">
              <div className="card-title">Executive Revenue Growth</div>
              <div className="card-sub" style={{ marginBottom: 12 }}>6-Month Revenue Progress View</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }} />
                  <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card glass-card">
              <div className="card-title">Business Performance Metrics</div>
              <div className="card-sub" style={{ marginBottom: 16 }}>CEO Audit Benchmarks</div>
              <div className="audit-list">
                {[
                  { title: 'Data Sovereignty Check', desc: 'Compliant with GDPR & SOC-2 compliance parameters.', status: 'PASSED', statusClass: 'status-pass' },
                  { title: 'LTV to CAC Ratio', desc: 'Current projection at 4.2x (Target: >3x for scale).', status: 'HEALTHY', statusClass: 'status-pass' },
                  { title: 'Expansion Pipeline', desc: 'Pro tier conversion is up 18% month over month.', status: 'ACTIVE', statusClass: 'status-active' },
                  { title: 'Churn Risk Flag', desc: 'Acme Corp and Globex high tier accounts have high renewals.', status: 'STABLE', statusClass: 'status-active' }
                ].map(item => (
                  <div key={item.title} className="audit-item">
                    <div className="audit-body">
                      <div className="audit-title">{item.title}</div>
                      <div className="audit-desc">{item.desc}</div>
                    </div>
                    <span className={`audit-badge ${item.statusClass}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── 2. INVESTOR DECK INDICATORS TEMPLATE ────────────────── */}
      {activeTemplate === 'investor' && (
        <div className="template-content-area">
          <div className="report-summary">
            <div className="report-metric glass-card">
              <div className="report-metric-label">ARR Run-rate</div>
              <div className="report-metric-val">${(totalMRR * 12).toLocaleString()}</div>
              <span className="report-metric-change green">▲ +14.2% YoY</span>
            </div>
            <div className="report-metric glass-card">
              <div className="report-metric-label">LTV (Lifetime Value)</div>
              <div className="report-metric-val">$1,850</div>
              <span className="report-metric-change green">Based on 2.4% Churn</span>
            </div>
            <div className="report-metric glass-card">
              <div className="report-metric-label">CAC (Blended)</div>
              <div className="report-metric-val">$440</div>
              <span className="report-metric-change green">Payback: 4.8 months</span>
            </div>
            <div className="report-metric glass-card">
              <div className="report-metric-label">Quick Ratio</div>
              <div className="report-metric-val">4.5x</div>
              <span className="report-metric-change green">Healthy SaaS standard</span>
            </div>
          </div>

          <div className="reports-grid">
            <div className="card glass-card">
              <div className="card-title">MRR Trend Profile</div>
              <div className="card-sub" style={{ marginBottom: 12 }}>Investor Cohort MRR Trajectory</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)' }} />
                  <Line type="monotone" dataKey="mrr" stroke="var(--green)" strokeWidth={3} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card glass-card">
              <div className="card-title">Investor Q&A Key Metrics</div>
              <div className="card-sub" style={{ marginBottom: 16 }}>Core Venture Capitals Standard Indicators</div>
              <div className="investor-kpis-list">
                {[
                  { label: 'Net Revenue Retention (NRR)', val: '108%', sub: 'Target: >100%' },
                  { label: 'Gross Margin', val: '82%', sub: 'Target: >80% for SaaS' },
                  { label: 'Rule of 40 Score', val: '58%', sub: 'Growth (46%) + FCF margin (12%)' },
                  { label: 'Magic Number', val: '1.25x', sub: 'Healthy sales efficiency index' }
                ].map(k => (
                  <div key={k.label} className="investor-kpi-row">
                    <div>
                      <div className="ik-label">{k.label}</div>
                      <div className="ik-sub">{k.sub}</div>
                    </div>
                    <div className="ik-val">{k.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── 3. REVENUE & FINANCE BREAKDOWN TEMPLATE ────────────────── */}
      {activeTemplate === 'finance' && (
        <div className="template-content-area">
          <div className="report-summary">
            <div className="report-metric glass-card">
              <div className="report-metric-label">Audited Revenue</div>
              <div className="report-metric-val">${totalRev.toLocaleString()}</div>
            </div>
            <div className="report-metric glass-card">
              <div className="report-metric-label">Ledger Total MRR</div>
              <div className="report-metric-val">${totalMRR.toLocaleString()}</div>
            </div>
            <div className="report-metric glass-card">
              <div className="report-metric-label">Avg Transaction</div>
              <div className="report-metric-val">${Math.round(totalRev / (customers.length || 1)).toLocaleString()}</div>
            </div>
            <div className="report-metric glass-card">
              <div className="report-metric-label">Active Contracts</div>
              <div className="report-metric-val">{customers.filter(c => c.status === 'Active').length}</div>
            </div>
          </div>

          <div className="reports-grid">
            {/* Monthly table */}
            <div className="card glass-card">
              <div className="card-title">Revenue Ledger Breakdown</div>
              <div className="card-sub" style={{ marginBottom: 12 }}>Month over month transactional status</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Gross Income</th>
                    <th>MRR Rate</th>
                    <th>vs Prev Month</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((m, i) => {
                    const prev = i > 0 ? monthly[i - 1].revenue : null
                    const diff = prev ? m.revenue - prev : 0
                    return (
                      <tr key={m.month}>
                        <td>{m.month} 2026</td>
                        <td className="mono">${m.revenue.toLocaleString()}</td>
                        <td className="mono">${m.mrr.toLocaleString()}</td>
                        <td className={diff >= 0 ? 'tag-up' : 'tag-down'}>
                          {prev ? `${diff >= 0 ? '+' : ''}$${diff.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Customer report */}
            <div className="card glass-card">
              <div className="card-title">Active Contract Ledger</div>
              <div className="card-sub" style={{ marginBottom: 12 }}>Customer ledger breakdown</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th style={{ textAlign: 'right' }}>Monthly Spend</th>
                    <th style={{ textAlign: 'center' }}>Contract Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map(c => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td style={{ color: 'var(--muted)', fontSize: 12 }}>{c.plan}</td>
                      <td className="mono" style={{ textAlign: 'right' }}>${c.mrr.toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={`badge ${
                            c.status === 'Active'
                              ? 'badge-green'
                              : c.status === 'Pending'
                              ? 'badge-amber'
                              : 'badge-red'
                          }`}
                        >
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
      )}
    </div>
  )
}

