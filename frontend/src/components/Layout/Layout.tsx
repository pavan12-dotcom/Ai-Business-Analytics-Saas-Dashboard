import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../context/AuthContext'
import { Sparkles, Zap, Check, X } from 'lucide-react'
import './Layout.css'

export default function Layout() {
  const { showSignupModal, setShowSignupModal, signOut, showProModal, setShowProModal } = useAuth()
  const navigate = useNavigate()

  const handleAction = async (path: string) => {
    try {
      await signOut()
    } catch (err) {
      console.warn('Sign out failed:', err)
    }
    setShowSignupModal(false)
    navigate(path)
  }

  const handleUpgradeToPro = () => {
    setShowProModal(false)
    navigate('/app/billing')
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

      {showProModal && (
        <div className="modal-overlay">
          <div className="pro-modal glass-card">
            <button className="pro-modal-close" onClick={() => setShowProModal(false)} aria-label="Close">
              <X size={18} />
            </button>

            <div className="pro-modal-badge">
              <Zap size={14} />
              <span>PRO</span>
            </div>

            <div className="pro-modal-icon">
              <Sparkles size={32} />
            </div>

            <h2 className="pro-modal-title">You've Hit Your Free Limit</h2>
            <p className="pro-modal-desc">
              You've used <strong>5 free actions</strong> (AI queries + file uploads) on the Free plan. Upgrade to <strong>Pro</strong> for unlimited queries, unlimited file uploads, and priority support.
            </p>

            <div className="pro-modal-features">
              {[
                'Unlimited file uploads',
                'Unlimited AI queries',
                'Advanced revenue analytics',
                'Priority support',
                'Team collaboration (up to 5 seats)',
              ].map((f) => (
                <div key={f} className="pro-modal-feature">
                  <Check size={14} className="pro-feature-check" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div className="pro-modal-price">
              <span className="pro-price-amount">$29</span>
              <span className="pro-price-period">/month</span>
            </div>

            <div className="pro-modal-actions">
              <button
                className="btn btn-primary pro-modal-cta"
                onClick={handleUpgradeToPro}
              >
                <Zap size={15} />
                Upgrade to Pro — $29/mo
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setShowProModal(false)}
                style={{ marginTop: 12, opacity: 0.7 }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
