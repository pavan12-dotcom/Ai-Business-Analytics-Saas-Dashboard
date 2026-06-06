import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, mapAuthError } from '../context/AuthContext'
import './Auth.css'

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

function validateEmail(v: string) {
  if (!v) return 'Email is required.'
  if (!EMAIL_RE.test(v)) return 'Please enter a valid email address.'
  return ''
}

function validatePassword(v: string) {
  if (!v) return 'Password is required.'
  return ''
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, loginAsGuest, isGuestTrialExhausted } = useAuth()
  const nav = useNavigate()

  const trialsExhausted = isGuestTrialExhausted()
  const shouldHighlightForgot = !!(serverError && (serverError.includes('Forgot Password') || serverError.includes('Incorrect email or password')))

  const errors = useMemo(() => ({
    email: validateEmail(email),
    password: validatePassword(password),
  }), [email, password])

  const isFormValid = !errors.email && !errors.password

  const blur = (field: keyof typeof touched) =>
    setTouched(t => ({ ...t, [field]: true }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (!isFormValid) return

    setServerError('')
    setLoading(true)
    const { error } = await signIn(email.trim().toLowerCase(), password)
    setLoading(false)
    if (error) {
      setServerError(mapAuthError(error) || 'An error occurred during sign in.')
    } else {
      nav('/app')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="logo-dot" />
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600 }}>SaaS Dashboard</span>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800 }}>AI-Powered Business Analytics</span>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your account</p>

        <form onSubmit={submit} className="auth-form" noValidate>
          {/* Email */}
          <div className="field">
            <label className="field-label">Email</label>
            <div className="field-input-wrap">
              <input
                id="login-email"
                className={`field-input${touched.email && errors.email ? ' input-error' : touched.email && !errors.email ? ' input-valid' : ''}`}
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (serverError) setServerError(''); }}
                onBlur={() => blur('email')}
                placeholder="you@company.com"
                autoComplete="email"
              />
              {touched.email && !errors.email && email && (
                <span className="field-check">✓</span>
              )}
            </div>
            {touched.email && errors.email && (
              <span className="field-error-msg">{errors.email}</span>
            )}
          </div>

          {/* Password */}
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="field-label">Password</label>
              <Link to="/forgot-password" id="forgot-password-link" className={`forgot-link${shouldHighlightForgot ? ' forgot-link-pulse' : ''}`}>
                Forgot Password?
              </Link>
            </div>
            <div className="field-input-wrap">
              <input
                id="login-password"
                className={`field-input field-input-pw${touched.password && errors.password ? ' input-error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); if (serverError) setServerError(''); }}
                onBlur={() => blur('password')}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword(s => !s)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {touched.password && errors.password && (
              <span className="field-error-msg">{errors.password}</span>
            )}
          </div>

          {/* Server error */}
          {serverError && <div className="auth-error">{serverError}</div>}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? <span className="auth-spinner" /> : 'Sign In →'}
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
              <div>💡 <strong>Demo mode:</strong> Try the app instantly without an account.</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Or bypass sign in completely:</div>
              <button
                type="button"
                className="btn btn-secondary btn-xs"
                onClick={() => { loginAsGuest(); nav('/app') }}
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
