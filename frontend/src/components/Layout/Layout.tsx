import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useAuth } from '../../context/AuthContext'
import { Sparkles, Zap, Check, X } from 'lucide-react'
import './Layout.css'

export default function Layout() {
  const { 
    showSignupModal, 
    setShowSignupModal, 
    signOut, 
    showProModal, 
    setShowProModal,
    showUpgradeModal,
    setShowUpgradeModal,
    showRenewalModal,
    setShowRenewalModal
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isDashboard = location.pathname === '/app' || location.pathname === '/app/'

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

  const handleUpgradeFromModal = () => {
    setShowUpgradeModal(false)
    navigate('/app/billing')
  }

  const handleRenewFromModal = () => {
    setShowRenewalModal(false)
    navigate('/app/billing')
  }

  return (
    <div className={`app-shell ${isDashboard ? 'is-dashboard' : ''}`}>
      {!isDashboard && <Sidebar />}
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

      {showUpgradeModal && (
        <div className="modal-overlay">
          <div className="pro-modal glass-card">
            <button className="pro-modal-close" onClick={() => setShowUpgradeModal(false)} aria-label="Close">
              <X size={18} />
            </button>

            <div className="pro-modal-badge" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.2))', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' }}>
              <Zap size={14} />
              <span>TRIAL ENDED</span>
            </div>

            <div className="pro-modal-icon" style={{ color: '#fbbf24', borderColor: 'rgba(245,158,11,0.25)', boxShadow: '0 0 30px rgba(245,158,11,0.15)' }}>
              <Sparkles size={32} />
            </div>

            <h2 className="pro-modal-title pro-modal-title--yellow">Your Free Trial Has Ended</h2>
            <p className="pro-modal-desc">
              Upgrade to Premium to continue using AI-powered analytics, file uploads, and assistant features.
            </p>

            <div className="pro-modal-features">
              {[
                'Unlimited file uploads',
                'Unlimited AI analyses',
                'Advanced revenue forecasting',
                'Full reports generation and downloads',
                'AI assistant queries',
              ].map((f) => (
                <div key={f} className="pro-modal-feature">
                  <Check size={14} className="pro-feature-check" style={{ color: '#fbbf24' }} />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div className="pro-modal-actions">
              <button
                className="btn btn-primary pro-modal-cta"
                onClick={handleUpgradeFromModal}
                style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444) !important', boxShadow: '0 4px 20px rgba(245,158,11,0.35)' }}
              >
                <Zap size={15} />
                Upgrade to Premium
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setShowUpgradeModal(false)}
                style={{ marginTop: 12, opacity: 0.7 }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenewalModal && (
        <div className="modal-overlay">
          <div className="pro-modal glass-card" style={{ borderColor: 'rgba(239,68,68,0.25)', boxShadow: '0 0 60px rgba(239,68,68,0.15), var(--shadow-lg)' }}>
            <button className="pro-modal-close" onClick={() => setShowRenewalModal(false)} aria-label="Close">
              <X size={18} />
            </button>

            <div className="pro-modal-badge" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.2))', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}>
              <Zap size={14} />
              <span>EXPIRED</span>
            </div>

            <div className="pro-modal-icon" style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.25)', boxShadow: '0 0 30px rgba(239,68,68,0.15)' }}>
              <X size={32} />
            </div>

            <h2 className="pro-modal-title pro-modal-title--red">Subscription Expired</h2>
            <p className="pro-modal-desc">
              Your Premium subscription has expired. Renew your plan to restore unlimited access to AI analysis, forecasting, and report exports.
            </p>

            <div className="pro-modal-actions">
              <button
                className="btn btn-primary pro-modal-cta"
                onClick={handleRenewFromModal}
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626) !important', boxShadow: '0 4px 20px rgba(239,68,68,0.35)' }}
              >
                <Zap size={15} />
                Renew Subscription
              </button>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setShowRenewalModal(false)}
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
