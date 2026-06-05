import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../context/AuthContext'
import { Sparkles } from 'lucide-react'
import './Layout.css'

export default function Layout() {
  const { showSignupModal, setShowSignupModal, signOut } = useAuth()
  const navigate = useNavigate()

  const handleAction = (path: string) => {
    signOut().then(() => {
      setShowSignupModal(false)
      navigate(path)
    })
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="shell-main">
        <Topbar />
        <div className="shell-content">
          <Outlet />
        </div>
      </div>

      {showSignupModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-icon-wrap">
              <Sparkles size={28} />
            </div>
            <h2 className="modal-title">Demo Trials Completed!</h2>
            <p className="modal-desc">
              You have successfully used your 2 free demo queries. Create a free account or sign in to continue querying spreadsheets, analyzing documents, and saving your analytical progress.
            </p>
            <div className="modal-actions">
              <button 
                className="btn btn-primary" 
                onClick={() => handleAction('/signup')}
                style={{ width: '100%', padding: '12px', fontSize: '14px' }}
              >
                Create Free Account
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleAction('/login')}
                style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: 4 }}
              >
                Sign In to Existing Account
              </button>
              <button 
                className="btn btn-ghost btn-xs" 
                onClick={() => setShowSignupModal(false)}
                style={{ marginTop: 12, textDecoration: 'underline' }}
              >
                Continue Browsing (Read Only)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
