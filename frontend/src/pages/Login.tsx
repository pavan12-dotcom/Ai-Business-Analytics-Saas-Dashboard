import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, loginAsGuest, isGuestTrialExhausted } = useAuth()
  const nav = useNavigate()

  // Check if demo trials are already used up
  const trialsExhausted = isGuestTrialExhausted()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error)
    else nav('/app')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="logo-dot" />
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600 }}>SaaS Dashboard</span>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800 }}>AI-Powered Business Analytics</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your account</p>

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" required />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup" className="auth-link">Sign up free</Link>
        </p>

        <div className="auth-demo-note" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {trialsExhausted ? (
            <>
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
                textAlign: 'center',
                width: '100%'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f87171', marginBottom: 4 }}>
                  🔴 Demo Limit Reached
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  You've used all 2 free demo actions.<br />
                  Create a free account to keep going.
                </div>
              </div>
              <Link to="/signup" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', padding: '10px', fontSize: '13px', fontWeight: 700, marginTop: 4 }}>
                Create Free Account →
              </Link>
            </>
          ) : (
            <>
              <div>💡 <strong>Demo mode:</strong> Enter any email &amp; password to explore the app.</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Or bypass sign in completely:</div>
              <button 
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => { loginAsGuest(); nav('/app'); }}
                style={{ fontWeight: 600, color: 'var(--accent)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
              >
                See Demo Instant ⚡
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
