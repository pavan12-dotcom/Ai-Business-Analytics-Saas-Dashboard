import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchDBStatus } from '../../services/api'
import './Topbar.css'

const titles: Record<string, string> = {
  '/app': 'Dashboard Overview',
  '/app/analytics': 'Analytics',
  '/app/customers': 'Customers',
  '/app/revenue': 'Revenue',
  '/app/ai': 'AI Assistant',
  '/app/reports': 'Reports',
  '/app/billing': 'Billing & Plans',
  '/app/settings': 'Settings',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const title = titles[pathname] ?? 'Dashboard'

  const [dbStatus, setDbStatus] = useState<{ status: string; message: string }>({
    status: 'checking',
    message: 'Checking database connection...'
  })

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

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
    const { status, message } = dbStatus
    switch (status) {
      case 'connected':
      case 'empty_seeded':
        return (
          <div className="db-status-badge db-connected" title={message}>
            <span className="db-dot dot-green" />
            Live Database
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
            DB Connection Error
          </div>
        )
    }
  }

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
        {getStatusBadge()}
        <button 
          className="theme-toggle-btn" 
          onClick={toggleTheme} 
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            cursor: 'pointer',
            color: 'var(--text)',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.2s ease',
          }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <div className="date-chip">{dateStr}</div>
        <div 
          className="topbar-avatar" 
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
