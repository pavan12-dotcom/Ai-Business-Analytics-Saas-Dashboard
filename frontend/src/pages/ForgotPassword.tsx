import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, mapAuthError } from '../context/AuthContext'
import { Check } from 'lucide-react'
import './Auth.css'

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

function validateEmail(v: string) {
  if (!v) return 'Email is required.'
  if (!EMAIL_RE.test(v)) return 'Please enter a valid email address.'
  return ''
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const emailError = useMemo(() => validateEmail(email), [email])
  const isFormValid = !emailError

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!isFormValid) return

    setServerError('')
    setSuccess(false)
    setLoading(true)
    const { error } = await resetPassword(email.trim().toLowerCase())
    setLoading(false)
    if (error) {
      setServerError(mapAuthError(error) || 'Failed to send password reset email.')
    } else {
      setSuccess(true)
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

        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-sub">Enter your email and we'll send you a link to reset your password</p>

        {success ? (
          <div className="auth-success-flow">
            <div className="auth-success">
              <Check size={14} style={{ marginRight: 6, flexShrink: 0 }} /> A password reset link has been sent to your email address. Please check your inbox.
            </div>
            <p style={{ marginTop: '20px', textAlign: 'center' }}>
              <Link to="/login" className="btn btn-primary auth-submit" style={{ display: 'inline-flex', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form" noValidate>
            {/* Email */}
            <div className="field">
              <label className="field-label">Email Address</label>
              <div className="field-input-wrap">
                <input
                  id="forgot-email"
                  className={`field-input${touched && emailError ? ' input-error' : touched && !emailError ? ' input-valid' : ''}`}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
                {touched && !emailError && email && (
                  <span className="field-check"><Check size={13} /></span>
                )}
              </div>
              {touched && emailError && (
                <span className="field-error-msg">{emailError}</span>
              )}
            </div>

            {/* Server error */}
            {serverError && <div className="auth-error">{serverError}</div>}

            <button
              id="forgot-submit"
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? <span className="auth-spinner" /> : 'Send Reset Link →'}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Remembered your password? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
