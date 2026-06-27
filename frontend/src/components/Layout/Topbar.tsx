import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchDBStatus } from '../../services/api'
import { useRealtime } from '../../hooks/useRealtime'
import { useSpreadsheet } from '../../context/SpreadsheetContext'
import {
  Layers,
  AlertCircle,
  CheckCircle2,
  Moon,
  Sun,
  Menu,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { logActivity } from '../../services/audit'
import { formatNumber } from '../../services/dataCleaner'
import './Topbar.css'

const titles: Record<string, string> = {
  '/app': 'Dashboard Overview',
  '/app/analytics': 'Analytics Workspace',
  '/app/customers': 'Customer Intelligence',
  '/app/revenue': 'Financial Intelligence',
  '/app/ai': 'AI Analyst Copilot',
  '/app/reports': 'Executive Reports',
  '/app/billing': 'Subscription Health',
  '/app/settings': 'System Settings',
}

export default function Topbar({ onToggleSidebar, isDashboard }: { onToggleSidebar?: () => void; isDashboard?: boolean }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, isGuest, guestQueryCount, uploadCount } = useAuth()
  const { sheetNames, activeSheetName, selectSheet } = useSpreadsheet()
  const title = titles[pathname] ?? 'Dashboard'

  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  const [dbStatus, setDbStatus] = useState<{ status: string; message: string }>({
    status: 'checking',
    message: 'Checking database connection...'
  })

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  const { status: realtimeStatus } = useRealtime()

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    let active = true
    const check = () => {
      fetchDBStatus()
        .then((res) => {
          if (!active) return
          setDbStatus(res || { status: 'disabled', message: 'Offline Demo Mode' })
        })
        .catch((err) => {
          if (!active) return
          setDbStatus({ status: 'error', message: err.message || 'Connection failed' })
        })
    }

    check()
    const interval = setInterval(check, 30000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    logActivity(`Changed system theme to ${nextTheme}`, user?.user_metadata?.name || 'User')
  }

  const initials = (user?.user_metadata?.name as string || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const getStatusBadge = () => {
    if (realtimeStatus === 'live') {
      return (
        <div className="db-status-badge db-connected" title="Connected to Supabase Realtime" style={{ padding: '6px 10px' }}>
          <span className="db-dot dot-green" />
        </div>
      )
    }
    const { status, message } = dbStatus
    switch (status) {
      case 'connected':
      case 'empty_seeded':
        return (
          <div className="db-status-badge db-connected" title={message} style={{ padding: '6px 10px' }}>
            <span className="db-dot dot-green" />
          </div>
        )
      case 'no_tables':
        return (
          <div className="db-status-badge db-warning" title={message}>
            <span className="db-dot dot-red-pulse" />
            DB Action Required
          </div>
        )
      case 'disabled':
        return (
          <div className="db-status-badge db-disabled" title={message}>
            <span className="db-dot dot-amber" />
            Demo Mode (Offline)
          </div>
        )
      case 'checking':
        return (
          <div className="db-status-badge db-checking" title={message}>
            <span className="db-dot dot-gray" />
            Checking DB...
          </div>
        )
      default:
        return (
          <div className="db-status-badge db-error" title={message}>
            <span className="db-dot dot-red" />
            DB Error
          </div>
        )
    }
  }

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isDashboard && (
          <button
            className="sidebar-toggle-btn"
            onClick={onToggleSidebar}
            title="Open Navigation Menu"
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              transition: 'all 0.15s ease',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Menu size={16} />
          </button>
        )}
        <h1 className="topbar-title">{title}</h1>
      </div>
      <div className="topbar-right">
        {isGuest && (() => {
          const remainingTrials = Math.max(0, 5 - uploadCount)
          const remainingQuestions = Math.max(0, 11 - guestQueryCount)
          const isExhausted = remainingTrials === 0 || remainingQuestions === 0
          return (
            <div
              className="db-status-badge"
              style={{
                background: isExhausted
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'rgba(34, 197, 94, 0.12)',
                color: isExhausted ? '#f87171' : '#4ade80',
                border: isExhausted
                  ? '1px solid rgba(239, 68, 68, 0.35)'
                  : '1px solid rgba(34, 197, 94, 0.35)',
                fontWeight: 650,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                transition: 'all 0.3s ease'
              }}
            >
              <span
                className={isExhausted ? 'db-dot dot-red-pulse' : 'db-dot dot-green'}
                style={{ background: isExhausted ? '#f87171' : '#4ade80' }}
              />
              {isExhausted ? (
                <>
                  <AlertCircle size={12} style={{ color: '#f87171' }} /> Demo Limit Reached
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} style={{ color: '#4ade80' }} /> Demo: {remainingTrials} Trial{remainingTrials !== 1 ? 's' : ''} & {remainingQuestions} Q{remainingQuestions !== 1 ? 's' : ''} Left
                </>
              )}
            </div>
          )
        })()}

        {sheetNames.length > 1 && (
          <div className="global-sheet-selector-wrap" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={13} style={{ color: 'var(--text-muted)' }} />
            <select
              id="global-sheet-selector"
              value={activeSheetName}
              onChange={e => selectSheet(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border)',
                background: 'var(--bg2)',
                color: 'var(--text)',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
                height: 34,
                boxShadow: 'var(--shadow-sm)'
              }}
              title="Switch active Excel sheet"
            >
              {sheetNames.map(s => (
                <option key={s.name} value={s.name}>
                  {s.name} ({formatNumber(s.rowCount)} rows)
                </option>
              ))}
            </select>
          </div>
        )}

        {getStatusBadge()}

        {/* Fullscreen Toggler */}
        <button 
          className="theme-toggle-btn" 
          onClick={toggleFullscreen} 
          title={isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen'}
          style={{ cursor: 'pointer', outline: 'none' }}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {/* Theme Toggler */}
        <button 
          className="theme-toggle-btn" 
          onClick={toggleTheme} 
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        <div className="date-chip no-print">{dateStr}</div>
        <div 
          className="topbar-avatar no-print" 
          style={{ cursor: 'pointer' }} 
          onClick={() => navigate('/app/settings')} 
          title={user?.email}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
