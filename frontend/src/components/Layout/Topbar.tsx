import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchDBStatus, markNotificationRead as apiMarkRead, clearNotifications as apiClear } from '../../services/api'
import { useRealtime } from '../../hooks/useRealtime'
import { useSpreadsheet } from '../../context/SpreadsheetContext'
import {
  Bell,
  Shield,
  Check,
  Trash2,
  ShieldAlert,
  Sparkles,
  UserCheck,
  AlertTriangle,
  Activity,
  Layers,
  Info,
  AlertCircle,
  CheckCircle2,
  Moon,
  Sun
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

export default function Topbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, userRole, setRole, isGuest, guestQueryCount, uploadCount } = useAuth()
  const { sheetNames, activeSheetName, selectSheet } = useSpreadsheet()
  const title = titles[pathname] ?? 'Dashboard'

  const [dbStatus, setDbStatus] = useState<{ status: string; message: string }>({
    status: 'checking',
    message: 'Checking database connection...'
  })

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  // Live notifications from Supabase Realtime
  const { notifications: liveNotifications, unreadCount: liveUnread, markNotificationRead: rtMarkRead, status: realtimeStatus } = useRealtime()

  // Local UI-only notifications (from window events like file upload)
  const [localNotifs, setLocalNotifs] = useState<any[]>(() => {
    const saved = localStorage.getItem('local_notifications')
    if (saved) return JSON.parse(saved)
    return []
  })

  // Merge live DB notifs + local UI events
  const allNotifications = [
    ...localNotifs,
    ...liveNotifications.map(n => ({
      id: `rt_${n.id}`,
      title: n.title,
      desc: n.message,
      read: n.read,
      type: n.type === 'revenue' ? 'success' : n.type === 'churn' ? 'warning' : 'info',
      time: n.timestamp,
      isRealtime: true,
      rtId: n.id,
    }))
  ]

  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const roleRef = useRef<HTMLDivElement>(null)
  const [bellPing, setBellPing] = useState(false)
  const prevUnreadRef = useRef(0)

  useEffect(() => {
    localStorage.setItem('local_notifications', JSON.stringify(localNotifs))
  }, [localNotifs])

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  // Listen for click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Bell ping animation on new unread
  useEffect(() => {
    const totalUnread = allNotifications.filter(n => !n.read).length
    if (totalUnread > prevUnreadRef.current && prevUnreadRef.current !== 0) {
      setBellPing(true)
      setTimeout(() => setBellPing(false), 2000)
    }
    prevUnreadRef.current = totalUnread
  }, [allNotifications])

  // Listen for custom events from file uploads / reports
  useEffect(() => {
    const handleSpreadsheetUploaded = (e: Event) => {
      const detail = (e as any).detail || { filename: 'revenue.xlsx' }
      const newNotif = {
        id: Math.random().toString(36).substring(2, 9),
        title: 'File Uploaded',
        desc: `Spreadsheet "${detail.filename}" uploaded and parsed successfully.`,
        read: false,
        type: 'success',
        time: 'Just now'
      }
      setLocalNotifs(prev => [newNotif, ...prev])
    }

    const handleReportGenerated = (e: Event) => {
      const detail = (e as any).detail || { name: 'CEO Dashboard' }
      const newNotif = {
        id: Math.random().toString(36).substring(2, 9),
        title: 'Report Compiled',
        desc: `Exported "${detail.name}" report deck to PDF layout.`,
        read: false,
        type: 'info',
        time: 'Just now'
      }
      setLocalNotifs(prev => [newNotif, ...prev])
    }

    window.addEventListener('spreadsheet_uploaded', handleSpreadsheetUploaded)
    window.addEventListener('report_generated', handleReportGenerated)
    return () => {
      window.removeEventListener('spreadsheet_uploaded', handleSpreadsheetUploaded)
      window.removeEventListener('report_generated', handleReportGenerated)
    }
  }, [])

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

  const unreadCount = allNotifications.filter(n => !n.read).length

  const markAllRead = () => {
    setLocalNotifs(prev => prev.map(n => ({ ...n, read: true })))
    liveNotifications.forEach(n => {
      if (!n.read) {
        rtMarkRead(n.id)
        apiMarkRead(n.id).catch(() => {})
      }
    })
    logActivity('Marked all notifications as read', user?.user_metadata?.name || 'User')
  }

  const markRead = (n: any) => {
    if (n.isRealtime) {
      rtMarkRead(n.rtId)
      apiMarkRead(n.rtId).catch(() => {})
    } else {
      setLocalNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
  }

  const deleteNotif = (id: string, title: string) => {
    setLocalNotifs(prev => prev.filter(n => n.id !== id))
    logActivity(`Dismissed notification: ${title}`, user?.user_metadata?.name || 'User')
  }

  const getStatusBadge = () => {
    // Use realtime status when available
    if (realtimeStatus === 'live') {
      return (
        <div className="db-status-badge db-connected" title="Connected to Supabase Realtime">
          <span className="db-dot dot-green" />
          Live ● Realtime
        </div>
      )
    }
    const { status, message } = dbStatus
    switch (status) {
      case 'connected':
      case 'empty_seeded':
        return (
          <div className="db-status-badge db-connected" title={message}>
            <span className="db-dot dot-green" />
            Live DB
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

  // Get current role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <Shield size={13} />
      case 'Manager': return <Layers size={13} />
      case 'Analyst': return <Activity size={13} />
      default: return <Info size={13} />
    }
  }

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
        {isGuest && (() => {
          const remaining = Math.max(0, 2 - uploadCount)
          const isExhausted = remaining === 0
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
                  <CheckCircle2 size={12} style={{ color: '#4ade80' }} /> Demo: {remaining} Free Action{remaining !== 1 ? 's' : ''} Left
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

        {/* 1. ROLE SWITCHER (RBAC) */}
        <div className="role-switcher-wrap" ref={roleRef}>
          <button 
            className="role-selector-btn" 
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            title="Switch Access Role"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {getRoleIcon(userRole)}
            <span className="role-btn-text">Role: {userRole}</span>
            <span className={`arrow-icon ${showRoleDropdown ? 'open' : ''}`} style={{ fontSize: '9px', marginLeft: '2px', opacity: 0.7 }}>▼</span>
          </button>

          {showRoleDropdown && (
            <div className="role-dropdown-menu">
              <div className="dropdown-section-title">Select Access Role</div>
              {[
                { name: 'Admin', desc: 'Full privileges including API settings & seat control' },
                { name: 'Manager', desc: 'Configure profiles and view logs. API overrides locked' },
                { name: 'Analyst', desc: 'Default seat. Standard dashboard & analysis features' },
                { name: 'Viewer', desc: 'Read-only dashboard. Analysis actions restricted' }
              ].map(role => (
                <button
                  key={role.name}
                  className={`role-option-btn ${userRole === role.name ? 'active' : ''}`}
                  onClick={() => {
                    setRole(role.name as any)
                    setShowRoleDropdown(false)
                  }}
                >
                  <div className="option-icon-wrap">{getRoleIcon(role.name as any)}</div>
                  <div className="option-text-wrap">
                    <span className="option-name">{role.name}</span>
                    <span className="option-desc">{role.desc}</span>
                  </div>
                  {userRole === role.name && <Check className="check-icon" size={12} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. NOTIFICATION CENTER */}
        <div className="notification-center-wrap" ref={notifRef}>
          <button 
            className={`notif-bell-btn ${unreadCount > 0 ? 'unread' : ''} ${bellPing ? 'bell-ping' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notification Center"
          >
            <Bell size={16} />
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notif-dropdown-menu glass-card">
              <div className="notif-header">
                <span className="notif-header-title">Notifications</span>
                {unreadCount > 0 && (
                  <button className="mark-all-read-btn" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div className="notif-list">
                {allNotifications.length === 0 ? (
                  <div className="notif-empty-state">No alerts in inbox</div>
                ) : (
                  allNotifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`notif-item ${n.read ? 'read' : 'unread'} ${n.type}`}
                      onClick={() => markRead(n)}
                    >
                      <div className="notif-dot-column">
                        <span className="notif-type-dot" />
                      </div>
                      <div className="notif-body">
                        <div className="notif-title-row">
                          <span className="notif-item-title">{n.title}</span>
                          <span className="notif-time">{n.time}</span>
                        </div>
                        <p className="notif-desc">{n.desc}</p>
                      </div>
                      {!n.isRealtime && (
                        <button 
                          className="notif-dismiss-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotif(n.id, n.title)
                          }}
                          title="Dismiss"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
