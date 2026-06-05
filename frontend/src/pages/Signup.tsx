import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, loginAsGuest } = useAuth()
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const { error } = await signUp(email, password, name)
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
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Start free — no credit card required</p>

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label className="field-label">Full Name</label>
            <input className="field-input" type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith" required />
          </div>
          <div className="field">
            <label className="field-label">Work Email</label>
            <input className="field-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" required />
          </div>
          <div className="field">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters" required />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>

        <div className="auth-demo-note" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div>💡 <strong>Demo mode:</strong> Sign up with any details to explore the full dashboard.</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Or bypass account creation:</div>
          <button 
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => { loginAsGuest(); nav('/app'); }}
            style={{ fontWeight: 600, color: 'var(--accent)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}
          >
            See Demo Instant ⚡
          </button>
        </div>
      </div>
    </div>
  )
}
