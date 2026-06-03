import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

const nav = [
  { to: '/app', label: 'Dashboard',    icon: '▦', end: true },
  { to: '/app/analytics', label: 'Analytics',  icon: '◈' },
  { to: '/app/customers', label: 'Customers',  icon: '◎' },
  { to: '/app/revenue',   label: 'Revenue',    icon: '◇' },
]
const aiNav = [
  { to: '/app/ai',      label: 'AI Assistant', icon: '✦' },
  { to: '/app/reports', label: 'Reports',       icon: '⊞' },
]
const settingsNav = [
  { to: '/app/billing',  label: 'Billing',  icon: '💳' },
  { to: '/app/settings', label: 'Settings', icon: '⚙' },
]

import { useState } from 'react'
import { useSpreadsheet } from '../../context/SpreadsheetContext'

export default function Sidebar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const { activeSheet, upload, reset, activeDocument, uploadDoc, resetDoc } = useSpreadsheet()
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setError(null)
      setUploading(true)
      const res = await upload(e.target.files[0])
      setUploading(false)
      if (!res.success) {
        setError(res.error)
      }
    }
  }

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocError(null)
      setUploadingDoc(true)
      const res = await uploadDoc(e.target.files[0])
      setUploadingDoc(false)
      if (!res.success) setDocError(res.error)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-dot" />
        InsightAI
      </div>

      <div className="sidebar-upload-section">
        <input
          id="sidebar-file-input"
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {activeSheet ? (
          <div className="sidebar-sheet-active">
            <span className="sheet-badge" title={activeSheet.filename}>
              📄 {activeSheet.filename}
            </span>
            <button className="sheet-reset-btn" onClick={reset} title="Reset to Demo Data">
              ✕
            </button>
          </div>
        ) : (
          <div>
            <button 
              className="sidebar-upload-btn" 
              onClick={() => document.getElementById('sidebar-file-input')?.click()}
              disabled={uploading}
            >
              📁 {uploading ? 'Uploading...' : 'Upload Excel'}
            </button>
            <span className="sidebar-upload-tip">Max 2,000 rows (.xlsx, .xls)</span>
          </div>
        )}
        {error && <div className="sidebar-upload-error">{error}</div>}
      </div>

      {/* PDF / Document Upload */}
      <div className="sidebar-upload-section">
        <input
          id="sidebar-doc-input"
          type="file"
          accept=".pdf,.txt"
          onChange={handleDocChange}
          style={{ display: 'none' }}
        />
        {activeDocument ? (
          <div className="sidebar-sheet-active">
            <span className="sheet-badge" title={activeDocument.filename}>
              📄 {activeDocument.filename}
            </span>
            <button className="sheet-reset-btn" onClick={resetDoc} title="Remove Document">✕</button>
          </div>
        ) : (
          <div>
            <button
              className="sidebar-upload-btn sidebar-upload-btn--doc"
              onClick={() => document.getElementById('sidebar-doc-input')?.click()}
              disabled={uploadingDoc}
            >
              📄 {uploadingDoc ? 'Uploading...' : 'Upload PDF / TXT'}
            </button>
            <span className="sidebar-upload-tip">Max 20 pages / 10MB · SaaS data</span>
          </div>
        )}
        {docError && <div className="sidebar-upload-error">{docError}</div>}
      </div>

      <nav className="sidebar-nav">
        {nav.map(({ to, label, icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}

        <div className="sidebar-section-label">AI Tools</div>
        {aiNav.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}

        <div className="sidebar-section-label">Account</div>
        {settingsNav.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="plan-badge">
        <div className="plan-info">
          <span className="plan-name">Free Plan</span>
          <span className="plan-usage">80 / 100 AI queries</span>
        </div>
        <div className="plan-bar"><div className="plan-bar-fill" style={{ width: '80%' }} /></div>
        <button className="btn btn-primary btn-sm plan-upgrade-btn"
          onClick={() => navigate('/app/billing')}>
          Upgrade to Pro
        </button>
      </div>

      <button className="signout-btn" onClick={signOut}>
        <span>⎋</span> Sign out
      </button>
    </aside>
  )
}
