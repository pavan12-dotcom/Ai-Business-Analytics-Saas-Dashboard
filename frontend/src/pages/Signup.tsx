import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, mapAuthError } from '../context/AuthContext'
import { Eye, EyeOff, Zap, Lightbulb, Check } from 'lucide-react'
import './Auth.css'

// ── Validators ────────────────────────────────────────────────
const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

function validateEmail(v: string) {
  if (!v) return 'Email is required.'
  if (!EMAIL_RE.test(v)) return 'Please enter a valid email address.'
  return ''
}

function validatePassword(v: string) {
  if (!v) return 'Password is required.'
  if (v.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(v)) return 'Must include at least one uppercase letter.'
  if (!/[a-z]/.test(v)) return 'Must include at least one lowercase letter.'
  if (!/[0-9]/.test(v)) return 'Must include at least one number.'
  return ''
}

function validateConfirm(p: string, c: string) {
  if (!c) return 'Please confirm your password.'
  if (p !== c) return 'Passwords do not match.'
  return ''
}

function validateName(v: string) {
  if (!v.trim()) return 'Full name is required.'
  return ''
}

// ── Password strength ─────────────────────────────────────────
function getStrength(v: string): { score: number; label: string; color: string } {
  let s = 0
  if (v.length >= 8) s++
  if (/[A-Z]/.test(v)) s++
  if (/[a-z]/.test(v)) s++
  if (/[0-9]/.test(v)) s++
  if (/[^a-zA-Z0-9]/.test(v)) s++
  if (s <= 2) return { score: s, label: 'Weak', color: 'var(--red)' }
  if (s === 3) return { score: s, label: 'Fair', color: 'var(--amber)' }
  if (s === 4) return { score: s, label: 'Good', color: '#60a5fa' }
  return { score: s, label: 'Strong', color: 'var(--green)' }
}

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [successEmailConfirmation, setSuccessEmailConfirmation] = useState(false)

  // Track whether user has blurred each field (to show errors only after touching)
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false })

  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp, loginAsGuest } = useAuth()
  const nav = useNavigate()

  // Derived validation errors
  const errors = useMemo(() => ({
    name: validateName(name),
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: validateConfirm(password, confirmPassword),
  }), [name, email, password, confirmPassword])

  const isFormValid = !errors.name && !errors.email && !errors.password && !errors.confirmPassword

  const strength = useMemo(() => getStrength(password), [password])

  const blur = (field: keyof typeof touched) =>
    setTouched(t => ({ ...t, [field]: true }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Mark all fields touched so errors show
    setTouched({ name: true, email: true, password: true, confirmPassword: true })
    if (!isFormValid) return

    setServerError('')
    setLoading(true)
    const { error, session } = await signUp(email.trim().toLowerCase(), password, name.trim())
    setLoading(false)
    if (error) {
      setServerError(mapAuthError(error) || 'An error occurred during signup.')
    } else {
      if (!session) {
        setSuccessEmailConfirmation(true)
      } else {
        nav('/app')
      }
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

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Start free — no credit card required</p>

        {successEmailConfirmation ? (
          <div className="auth-success-flow" style={{ marginTop: '16px' }}>
            <div className="auth-success">
              <Check size={14} style={{ marginRight: 6, flexShrink: 0 }} /> Verification link sent! If an account exists for <strong>{email}</strong>, you will receive a verification link. Please check your inbox or try signing in.
            </div>
            <div style={{ marginTop: '24px' }}>
              <Link to="/login" className="btn btn-primary auth-submit" style={{ display: 'inline-flex', textDecoration: 'none' }}>
                Go to Sign In →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form" noValidate>
            {/* Full Name */}
            <div className="field">
              <label className="field-label">Full Name</label>
              <div className="field-input-wrap">
                <input
                  id="signup-name"
                  className={`field-input${touched.name && errors.name ? ' input-error' : touched.name && !errors.name ? ' input-valid' : ''}`}
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); if (serverError) setServerError(''); }}
                  onBlur={() => blur('name')}
                  placeholder="Jane Smith"
                  autoComplete="name"
                />
                {touched.name && !errors.name && name && (
                  <span className="field-check"><Check size={13} /></span>
                )}
              </div>
              {touched.name && errors.name && (
                <span className="field-error-msg">{errors.name}</span>
              )}
            </div>

            {/* Work Email */}
            <div className="field">
              <label className="field-label">Work Email</label>
              <div className="field-input-wrap">
                <input
                  id="signup-email"
                  className={`field-input${touched.email && errors.email ? ' input-error' : touched.email && !errors.email ? ' input-valid' : ''}`}
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (serverError) setServerError(''); }}
                  onBlur={() => blur('email')}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
                {touched.email && !errors.email && email && (
                  <span className="field-check"><Check size={13} /></span>
                )}
              </div>
              {touched.email && errors.email && (
                <span className="field-error-msg">{errors.email}</span>
              )}
            </div>

            {/* Password */}
            <div className="field">
              <label className="field-label">Password</label>
              <div className="field-input-wrap">
                <input
                  id="signup-password"
                  className={`field-input field-input-pw${touched.password && errors.password ? ' input-error' : touched.password && !errors.password ? ' input-valid' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (serverError) setServerError(''); }}
                  onBlur={() => blur('password')}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="pw-toggle"
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="pw-strength-bar-wrap">
                  <div className="pw-strength-track">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className="pw-strength-seg"
                        style={{ background: i <= strength.score ? strength.color : 'var(--border2)' }}
                      />
                    ))}
                  </div>
                  <span className="pw-strength-label" style={{ color: strength.color }}>{strength.label}</span>
                </div>
              )}

              {/* Requirement checklist */}
              {(touched.password || password.length > 0) && (
                <div className="pw-requirements">
                  {[
                    { ok: password.length >= 8,       text: 'At least 8 characters' },
                    { ok: /[A-Z]/.test(password),     text: 'One uppercase letter (A–Z)' },
                    { ok: /[a-z]/.test(password),     text: 'One lowercase letter (a–z)' },
                    { ok: /[0-9]/.test(password),     text: 'One number (0–9)' },
                  ].map(r => (
                    <div key={r.text} className={`pw-req-item${r.ok ? ' ok' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {r.ok ? (
                        <Check size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
                      ) : (
                        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', border: '1px solid var(--text-muted)', marginLeft: 3, marginRight: 3, flexShrink: 0 }} />
                      )}
                      {r.text}
                    </div>
                  ))}
                </div>
              )}

              {touched.password && errors.password && !password.length && (
                <span className="field-error-msg">{errors.password}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div className="field">
              <label className="field-label">Confirm Password</label>
              <div className="field-input-wrap">
                <input
                  id="signup-confirm-password"
                  className={`field-input field-input-pw${touched.confirmPassword && errors.confirmPassword ? ' input-error' : touched.confirmPassword && !errors.confirmPassword && confirmPassword ? ' input-valid' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); if (serverError) setServerError(''); }}
                  onBlur={() => blur('confirmPassword')}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
                {touched.confirmPassword && !errors.confirmPassword && confirmPassword && (
                  <span className="field-check"><Check size={13} /></span>
                )}
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <span className="field-error-msg">{errors.confirmPassword}</span>
              )}
            </div>

            {/* Server error */}
            {serverError && <div className="auth-error">{serverError}</div>}

            <button
              id="signup-submit"
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                'Create Account →'
              )}
            </button>

            {/* Validation hint before first submit */}
            {!isFormValid && !touched.name && !touched.email && !touched.password && !touched.confirmPassword && (
              <p className="auth-hint">Fill in your details above to continue.</p>
            )}
          </form>
        )}

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>

        <div className="auth-demo-note" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lightbulb size={14} style={{ color: 'var(--accent)' }} />
            <span><strong>Demo mode:</strong> Try the app instantly without an account.</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={() => { loginAsGuest(); nav('/app') }}
            style={{ fontWeight: 600, color: 'var(--accent)', background: 'var(--bg-hover)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            See Demo Instant <Zap size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}
