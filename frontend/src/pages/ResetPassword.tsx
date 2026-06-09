import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, mapAuthError } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import { Eye, EyeOff, Check, Circle } from 'lucide-react'
import './Auth.css'

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

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState({ password: false, confirmPassword: false })
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const { updatePassword, signOut } = useAuth()
  const nav = useNavigate()

  useEffect(() => {
    let active = true
    let unsubscribeFn: (() => void) | null = null
    let timer: any = null

    const checkRecoverySession = async () => {
      // Parse URL hash or search params for redirect/auth errors
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const searchParams = new URLSearchParams(window.location.search)
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description')
      
      if (errorDescription) {
        const decodedError = decodeURIComponent(errorDescription.replace(/\+/g, ' '))
        console.warn(`[AUTH] Recovery flow URL error: ${decodedError}`)
        if (active) {
          setServerError(mapAuthError(decodedError) || decodedError)
          setHasSession(false)
        }
        return
      }

      const isDemoMode = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
      if (isDemoMode) {
        if (active) setHasSession(true)
        return
      }
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!active) return

      if (session) {
        setHasSession(true)
      } else {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
          if (currentSession && active) {
            setHasSession(true)
          }
        })
        unsubscribeFn = () => subscription.unsubscribe()
        
        timer = setTimeout(async () => {
          const { data: { session: finalSession } } = await supabase.auth.getSession()
          if (active) {
            if (!finalSession) {
              setHasSession(false)
            } else {
              setHasSession(true)
            }
          }
        }, 1500)
      }
    }
    
    checkRecoverySession()

    return () => {
      active = false
      if (unsubscribeFn) unsubscribeFn()
      if (timer) clearTimeout(timer)
    }
  }, [])

  const errors = useMemo(() => ({
    password: validatePassword(password),
    confirmPassword: validateConfirm(password, confirmPassword),
  }), [password, confirmPassword])

  const isFormValid = !errors.password && !errors.confirmPassword
  const strength = useMemo(() => getStrength(password), [password])

  const blur = (field: keyof typeof touched) =>
    setTouched(t => ({ ...t, [field]: true }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ password: true, confirmPassword: true })
    if (!isFormValid) return

    setServerError('')
    setSuccess(false)
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) {
      setServerError(mapAuthError(error) || 'Failed to reset your password.')
    } else {
      setSuccess(true)
      try {
        await signOut()
      } catch (err) {
        console.warn('Sign out after successful password update failed:', err)
      }
      setTimeout(() => {
        nav('/login')
      }, 3000)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="logo-dot" />
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 600 }}>AI Data Dashboard</span>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800 }}>AI-Powered Business Analytics</span>
        </div>

        <h1 className="auth-title">Create New Password</h1>
        <p className="auth-sub">Please enter a new 8+ character password</p>

        {hasSession === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div className="auth-spinner" style={{ borderTopColor: 'var(--accent)', width: '32px', height: '32px', borderWidth: '3px' }} />
          </div>
        ) : hasSession === false ? (
          <div className="auth-error-flow" style={{ marginTop: '16px' }}>
            <div className="auth-error" style={{ marginBottom: '20px' }}>
              {serverError || 'This recovery link is invalid or has expired. Password reset links are single-use.'}
            </div>
            <Link to="/forgot-password" className="btn btn-primary auth-submit" style={{ display: 'inline-flex', textDecoration: 'none' }}>
              Request New Reset Link →
            </Link>
          </div>
        ) : success ? (
          <div className="auth-success-flow">
            <div className="auth-success">
              <Check size={14} style={{ marginRight: 6, flexShrink: 0 }} /> Password reset successfully! Redirecting you to sign in page...
            </div>
            <p style={{ marginTop: '20px', textAlign: 'center' }}>
              <Link to="/login" className="btn btn-primary auth-submit" style={{ display: 'inline-flex', textDecoration: 'none' }}>
                Go to Sign In Now
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form" noValidate>
            {/* New Password */}
            <div className="field">
              <label className="field-label">New Password</label>
              <div className="field-input-wrap">
                <input
                  id="reset-password"
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
                    <div key={r.text} className={`pw-req-item${r.ok ? ' ok' : ''}`}>
                      <span className="pw-req-dot">{r.ok ? <Check size={11} /> : <Circle size={11} />}</span>
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
              <label className="field-label">Confirm New Password</label>
              <div className="field-input-wrap">
                <input
                  id="reset-confirm-password"
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
              id="reset-submit"
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading || !isFormValid}
            >
              {loading ? <span className="auth-spinner" /> : 'Update Password →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
