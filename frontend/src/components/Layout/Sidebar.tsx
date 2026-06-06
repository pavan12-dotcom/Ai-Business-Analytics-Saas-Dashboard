import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

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
  const { signOut, subscription, isGuest, uploadCount, isLocked } = useAuth()
  const navigate = useNavigate()
  const { activeSheet, upload, reset, activeDocument, uploadDoc, resetDoc, analytics, hasData } = useSpreadsheet()
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const entityLabel = !hasData ? 'Customers' : (analytics.entityName === 'Record' ? 'Records' : `${analytics.entityName}s`)

  let valueLabel = 'Revenue'
  if (hasData) {
    switch (analytics.datasetType) {
      case 'Sales':
        valueLabel = 'Revenue'
        break
      case 'Finance':
        valueLabel = 'Financials'
        break
      case 'HR':
        valueLabel = 'Compensation'
        break
      case 'Healthcare':
        valueLabel = 'Treatment Costs'
        break
      case 'Education':
        valueLabel = 'Grades & Attendance'
        break
      case 'Inventory':
        valueLabel = 'Inventory Value'
        break
      case 'Marketing':
        valueLabel = 'Ad Spend'
        break
      default:
        valueLabel = 'Value Metrics'
    }
  }

  const dynamicNav = [
    { to: '/app', label: 'Dashboard',    icon: '▦', end: true },
    { to: '/app/analytics', label: 'Analytics',  icon: '◈' },
    { to: '/app/customers', label: entityLabel,  icon: '◎' },
    { to: '/app/revenue',   label: valueLabel,    icon: '◇' },
  ]

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
      <div className="sidebar-logo" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="logo-dot" />
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 600 }}>SaaS Dashboard</span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.3 }}>AI-Powered Business Analytics</span>
      </div>

      <div className="sidebar-upload-section">
        <input
          id="sidebar-file-input"
          type="file"
          accept=".xlsx, .xls, .csv, .json"
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
              onClick={() => {
                if (isLocked) {
                  alert("Your free trial has ended or subscription has expired. Please upgrade or renew to upload files.");
                  return;
                }
                document.getElementById('sidebar-file-input')?.click();
              }}
              disabled={uploading || isLocked}
              style={isLocked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              📁 {uploading ? 'Uploading...' : 'Upload Dataset'}
            </button>
            <span className="sidebar-upload-tip">Max 2,000 rows (.xlsx, .xls, .csv, .json)</span>
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
              onClick={() => {
                if (isLocked) {
                  alert("Your free trial has ended or subscription has expired. Please upgrade or renew to upload files.");
                  return;
                }
                document.getElementById('sidebar-doc-input')?.click();
              }}
              disabled={uploadingDoc || isLocked}
              style={isLocked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              📄 {uploadingDoc ? 'Uploading...' : 'Upload PDF / TXT'}
            </button>
            <span className="sidebar-upload-tip">Max 20 pages / 10MB · SaaS data</span>
          </div>
        )}
        {docError && <div className="sidebar-upload-error">{docError}</div>}
      </div>

      <nav className="sidebar-nav">
        {dynamicNav.map(({ to, label, icon, end }) => (
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
          <span className="plan-name">
            {isGuest ? 'Demo Access' : 
             subscription?.subscription_status === 'trial_exhausted' ? 'Trial Exhausted' :
             subscription?.subscription_status === 'expired' ? 'Expired' :
             subscription?.plan === 'Pro' ? 'Pro Plan' :
             subscription?.plan === 'Enterprise' ? 'Enterprise' : 'Free Trial'}
          </span>
          <span className="plan-usage">
            {isGuest ? `${Math.min(2, uploadCount)}/2 free` :
             subscription?.subscription_status === 'trial_exhausted' ? '0/5 free' :
             subscription?.subscription_status === 'expired' ? '0 days left' :
             subscription?.subscription_status === 'active' ? 'Unlimited' :
             `${subscription ? (5 - subscription.analyses_used) : 5}/5 remaining`}
          </span>
        </div>
        <div className="plan-bar">
          <div 
            className="plan-bar-fill" 
            style={{ 
              width: `${
                isGuest ? Math.min(100, (uploadCount / 2) * 100) :
                subscription?.subscription_status === 'trial_exhausted' ? 100 :
                subscription?.subscription_status === 'expired' ? 100 :
                subscription?.subscription_status === 'active' ? 100 :
                Math.min(100, ((subscription?.analyses_used || 0) / 5) * 100)
              }%`,
              background: (subscription?.subscription_status === 'trial_exhausted' || subscription?.subscription_status === 'expired')
                ? 'var(--red)'
                : 'linear-gradient(90deg, var(--accent), var(--teal))'
            }} 
          />
        </div>
        
        {isGuest && (
          <button className="btn btn-primary btn-sm plan-upgrade-btn" onClick={() => navigate('/signup')}>
            Sign Up
          </button>
        )}
        {!isGuest && subscription?.subscription_status === 'trial' && (
          <button className="btn btn-primary btn-sm plan-upgrade-btn" onClick={() => navigate('/app/billing')}>
            Upgrade to Pro
          </button>
        )}
        {!isGuest && subscription?.subscription_status === 'trial_exhausted' && (
          <button className="btn btn-primary btn-sm plan-upgrade-btn" onClick={() => navigate('/app/billing')} style={{ background: 'var(--accent)' }}>
            Upgrade to Pro
          </button>
        )}
        {!isGuest && subscription?.subscription_status === 'expired' && (
          <button className="btn btn-primary btn-sm plan-upgrade-btn" onClick={() => navigate('/app/billing')} style={{ background: 'var(--red)', borderColor: 'var(--red)' }}>
            Renew Subscription
          </button>
        )}
        {!isGuest && subscription?.subscription_status === 'active' && subscription?.plan === 'Pro' && (
          <button className="btn btn-secondary btn-sm plan-upgrade-btn" onClick={() => navigate('/app/billing')}>
            Manage / Upgrade
          </button>
        )}
        {!isGuest && subscription?.subscription_status === 'active' && subscription?.plan === 'Enterprise' && (
          <span style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', display: 'block', marginTop: '4px' }}>
            ✓ Premium Unlocked
          </span>
        )}
      </div>

      <button className="signout-btn" onClick={signOut}>
        <span>⎋</span> Sign out
      </button>
    </aside>
  )
}
