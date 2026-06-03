import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
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

  const initials = (user?.user_metadata?.name as string || user?.email || 'U')
    .split(' ')
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">
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
