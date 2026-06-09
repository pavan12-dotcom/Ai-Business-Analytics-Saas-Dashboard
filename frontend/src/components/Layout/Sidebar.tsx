import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Sparkles,
  Layers,
  CreditCard,
  Settings,
  LayoutDashboard,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  X,
  FolderOpen,
  LogOut,
  Loader2,
  Check
} from 'lucide-react'
import './Sidebar.css'

const aiNav = [
  { to: '/app/ai',      label: 'AI Assistant', icon: <Sparkles size={16} /> },
  { to: '/app/reports', label: 'Reports',       icon: <Layers size={16} /> },
]
const settingsNav = [
  { to: '/app/billing',  label: 'Billing',  icon: <CreditCard size={16} /> },
  { to: '/app/settings', label: 'Settings', icon: <Settings size={16} /> },
]

import { useSpreadsheet } from '../../context/SpreadsheetContext'

export default function Sidebar() {
  const { signOut, subscription, isGuest, uploadCount, guestQueryCount, isLocked } = useAuth()
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
    { to: '/app', label: 'Dashboard',    icon: <LayoutDashboard size={16} />, end: true },
    { to: '/app/analytics', label: 'Analytics',  icon: <TrendingUp size={16} /> },
    { to: '/app/customers', label: entityLabel,  icon: <Users size={16} /> },
    { to: '/app/revenue',   label: valueLabel,    icon: <DollarSign size={16} /> },
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
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', fontWeight: 600 }}>AI Data Dashboard</span>
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
              <FileText size={13} style={{ marginRight: 4 }} /> {activeSheet.filename}
            </span>
            <button className="sheet-reset-btn" onClick={reset} title="Reset to Demo Data">
              <X size={12} />
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
              {uploading ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} /> Uploading...
                </>
              ) : (
                <>
                  <FolderOpen size={14} style={{ marginRight: 6 }} /> Upload Dataset
                </>
              )}
            </button>
            <span className="sidebar-upload-tip">Max 10,000 rows (Excel) / 2,000 rows (CSV, JSON)</span>
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
              <FileText size={13} style={{ marginRight: 4 }} /> {activeDocument.filename}
            </span>
            <button className="sheet-reset-btn" onClick={resetDoc} title="Remove Document">
              <X size={12} />
            </button>
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
              {uploadingDoc ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} /> Uploading...
                </>
              ) : (
                <>
                  <FileText size={14} style={{ marginRight: 6 }} /> Upload PDF / TXT
                </>
              )}
            </button>
            <span className="sidebar-upload-tip">Max 20 pages / 10MB · Structured data</span>
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
            {isGuest ? `${uploadCount}/5 trials · ${guestQueryCount}/11 Qs` :
             subscription?.subscription_status === 'trial_exhausted' ? '0 trials' :
             subscription?.subscription_status === 'expired' ? '0 days left' :
             subscription?.subscription_status === 'active' ? 'Unlimited' :
             `${subscription ? subscription.analyses_remaining : 10}/${subscription ? subscription.trials_limit : 10} trials remaining`}
          </span>
        </div>
        <div className="plan-bar">
          <div 
            className="plan-bar-fill" 
            style={{ 
              width: `${
                isGuest ? Math.min(100, Math.max((uploadCount / 5) * 100, (guestQueryCount / 11) * 100)) :
                subscription?.subscription_status === 'trial_exhausted' ? 100 :
                subscription?.subscription_status === 'expired' ? 100 :
                subscription?.subscription_status === 'active' ? 100 :
                Math.min(100, (((subscription?.analyses_used || 0) / (subscription?.trials_limit || 10)) * 100))
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
          <span style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: '4px' }}>
            <Check size={11} /> Premium Unlocked
          </span>
        )}
      </div>

      <button className="signout-btn" onClick={signOut}>
        <LogOut size={14} style={{ marginRight: 6 }} /> Sign out
      </button>
    </aside>
  )
}
