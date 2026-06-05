import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchDBStatus } from '../../services/api'
import {
  Bell,
  Shield,
  ChevronDown,
  Check,
  Trash2,
  ShieldAlert,
  Sparkles,
  UserCheck,
  AlertTriangle,
  Activity,
  Layers,
  Info
} from 'lucide-react'
import { logActivity } from '../../services/audit'
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
  const { user, userRole, setRole, isGuest, guestQueryCount } = useAuth()
  const title = titles[pathname] ?? 'Dashboard'

  const [dbStatus, setDbStatus] = useState<{ status: string; message: string }>({
    status: 'checking',
    message: 'Checking database connection...'
  })

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>(() => {
    const saved = localStorage.getItem('notifications')
    if (saved) return JSON.parse(saved)
    return [
      { id: '1', title: 'Revenue Milestone', desc: 'Projected ARR crossed $180k target milestone!', read: false, type: 'success', time: '10m ago' },
      { id: '2', title: 'Churn Alert', desc: 'Average churn rate decreased to 2.4% this week.', read: false, type: 'info', time: '1h ago' },
      { id: '3', title: 'Security Advisory', desc: 'New login detected from a new location.', read: true, type: 'warning', time: '5h ago' }
    ]
  })

  const [showNotifications, setShowNotifications] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)
  const roleRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications))
  }, [notifications])

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
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Listen for custom events
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
      setNotifications(prev => [newNotif, ...prev])
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
      setNotifications(prev => [newNotif, ...prev])
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

  // Notification Actions
  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    logActivity('Marked all notifications as read', user?.user_metadata?.name || 'User')
  }

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const deleteNotif = (id: string, title: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    logActivity(`Dismissed notification: ${title}`, user?.user_metadata?.name || 'User')
  }

  const getStatusBadge = () => {
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
        {isGuest && (
          <div 
            className="db-status-badge" 
            style={{ 
              background: 'rgba(99, 102, 241, 0.12)', 
              color: 'var(--accent)', 
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontWeight: 650,
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px'
            }}
          >
            <span className="db-dot dot-green" style={{ background: 'var(--accent)' }} />
            Demo: {Math.max(0, 2 - guestQueryCount)} Trials Left
          </div>
        )}
        {getStatusBadge()}

        {/* 1. INTERACTIVE ROLE SELECTOR (RBAC) */}
        <div className="role-switcher-wrap" ref={roleRef}>
          <button 
            className="role-selector-btn"
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            title="Set security role dynamically for RBAC testing"
          >
            {getRoleIcon(userRole)}
            <span className="role-btn-text">Role: {userRole}</span>
            <ChevronDown size={12} className={`arrow-icon ${showRoleDropdown ? 'open' : ''}`} />
          </button>

          {showRoleDropdown && (
            <div className="role-dropdown-menu glass-card">
              <div className="dropdown-section-title">Select User Role (RBAC)</div>
              {(['Admin', 'Manager', 'Analyst', 'Viewer'] as const).map(role => (
                <button
                  key={role}
                  className={`role-option-btn ${userRole === role ? 'active' : ''}`}
                  onClick={() => {
                    setRole(role)
                    setShowRoleDropdown(false)
                  }}
                >
                  <span className="option-icon-wrap">{getRoleIcon(role)}</span>
                  <div className="option-text-wrap">
                    <span className="option-name">{role}</span>
                    <span className="option-desc">
                      {role === 'Admin' && 'Full system capabilities'}
                      {role === 'Manager' && 'Can adjust billing, no security keys'}
                      {role === 'Analyst' && 'Data queries, no billing/settings'}
                      {role === 'Viewer' && 'Read-only access across platform'}
                    </span>
                  </div>
                  {userRole === role && <Check size={14} className="check-icon" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. NOTIFICATION CENTER */}
        <div className="notification-center-wrap" ref={notifRef}>
          <button 
            className={`notif-bell-btn ${unreadCount > 0 ? 'unread' : ''}`}
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
                {notifications.length === 0 ? (
                  <div className="notif-empty-state">No alerts in inbox</div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`notif-item ${n.read ? 'read' : 'unread'} ${n.type}`}
                      onClick={() => markRead(n.id)}
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
          {theme === 'light' ? '🌙' : '☀️'}
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
