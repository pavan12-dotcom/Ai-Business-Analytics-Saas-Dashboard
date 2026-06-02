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

export default function Sidebar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-dot" />
        InsightAI
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
