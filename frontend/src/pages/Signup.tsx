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
  const { signUp } = useAuth()
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
        <div className="auth-logo"><span className="logo-dot" />InsightAI</div>
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

        <div className="auth-demo-note">
          💡 <strong>Demo mode:</strong> Sign up with any details to explore the full dashboard.
        </div>
      </div>
    </div>
  )
}
