import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { User } from '@supabase/supabase-js'
import { logActivity } from '../services/audit'
import { fetchSubscription } from '../services/api'
import { useNavigate } from 'react-router-dom'

interface SubscriptionType {
  plan: string
  mrr: number
  status: string
  aiQueryCount: number
  aiQueryLimit: number
  analyses_used: number
  analyses_remaining: number
  subscription_status: 'demo' | 'trial' | 'active' | 'expired' | 'trial_exhausted'
  subscription_start: string | null
  subscription_end: string | null
  plan_type: 'free' | 'pro' | 'enterprise'
  remaining_days: number
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; session: any | null }>
  signOut: () => Promise<void>
  updateProfile: (metadata: { name?: string; orgName?: string; industry?: string; gemini_api_key?: string }) => Promise<{ error: string | null }>
  userRole: 'Admin' | 'Manager' | 'Analyst' | 'Viewer'
  setRole: (role: 'Admin' | 'Manager' | 'Analyst' | 'Viewer') => void
  subscription: SubscriptionType | null
  refreshSubscription: () => Promise<void>
  isGuest: boolean
  guestQueryCount: number
  incrementGuestQueryCount: () => void
  showSignupModal: boolean
  setShowSignupModal: (show: boolean) => void
  loginAsGuest: () => void
  uploadCount: number
  incrementUploadCount: () => void
  showProModal: boolean
  setShowProModal: (show: boolean) => void
  isGuestTrialExhausted: () => boolean
  isLocked: boolean
  showUpgradeModal: boolean
  setShowUpgradeModal: (show: boolean) => void
  showRenewalModal: boolean
  setShowRenewalModal: (show: boolean) => void
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setRoleState] = useState<'Admin' | 'Manager' | 'Analyst' | 'Viewer'>(() => {
    return (localStorage.getItem('user_role') as any) || 'Analyst'
  })

  const setRole = (role: 'Admin' | 'Manager' | 'Analyst' | 'Viewer') => {
    setRoleState(role)
    localStorage.setItem('user_role', role)
    logActivity(`Role switched to ${role}`, user?.user_metadata?.name || 'User')
  }

  const [showSignupModal, setShowSignupModal] = useState(false)
  // Unified demo usage counter (used by both guest uploads and AI queries)
  const [guestQueryCount, setGuestQueryCount] = useState<number>(() => {
    return Number(localStorage.getItem('demo_used') || '0')
  })

  const [uploadCount, setUploadCount] = useState<number>(() => {
    return Number(localStorage.getItem('demo_used') || '0')
  })
  const [showProModal, setShowProModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showRenewalModal, setShowRenewalModal] = useState(false)

  // Increment the unified demo_used counter (for guests: uploads + AI queries)
  const incrementUploadCount = () => {
    const current = Number(localStorage.getItem('demo_used') || '0')
    const nextCount = current + 1
    localStorage.setItem('demo_used', String(nextCount))
    setUploadCount(nextCount)
    setGuestQueryCount(nextCount)
    // After 2 free actions → guest sign-in gate
    if (nextCount >= 2 && localStorage.getItem('demo_guest_user') === 'true') {
      setShowSignupModal(true)
    }
    // After 5 total actions → Pro plan gate
    if (nextCount >= 5) {
      setShowProModal(true)
    }
  }

  const isGuestTrialExhausted = () => {
    return Number(localStorage.getItem('demo_used') || '0') >= 2
  }

  const isGuest = !!user?.user_metadata?.isGuest

  const loginAsGuest = () => {
    const fakeUser = {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'guest@demo.com',
      user_metadata: { name: 'Demo Guest', isGuest: true }
    } as unknown as User
    setUser(fakeUser)
    localStorage.setItem('demo_guest_user', 'true')
    // Initialize demo_used if not already set (preserve existing usage)
    if (!localStorage.getItem('demo_used')) {
      localStorage.setItem('demo_used', '0')
    }
    setGuestQueryCount(Number(localStorage.getItem('demo_used') || '0'))
    setShowSignupModal(false)
  }

  // incrementGuestQueryCount now delegates to the unified incrementUploadCount
  const incrementGuestQueryCount = () => {
    incrementUploadCount()
  }

  useEffect(() => {
    // Check for recovery/error hash on load and redirect if necessary
    const checkHashRedirect = () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const searchParams = new URLSearchParams(window.location.search)
      const isRecovery = hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery'
      const hasError = hashParams.get('error_description') || searchParams.get('error_description')
      
      if ((isRecovery || hasError) && window.location.pathname !== '/reset-password') {
        console.log('[AUTH] Hash recovery/error detected on load, redirecting to /reset-password')
        navigate('/reset-password' + window.location.search + window.location.hash)
      }
    }
    checkHashRedirect()

    let guestSessionId = localStorage.getItem('guest_session_id')
    if (!guestSessionId) {
      guestSessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('guest_session_id', guestSessionId)
    }

    // Check for demo mode (no real Supabase configured)
    const isDemoMode = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'

    if (isDemoMode) {
      const demoUser = localStorage.getItem('demo_user')
      if (demoUser) {
        setUser(JSON.parse(demoUser))
      } else {
        const isGuest = localStorage.getItem('demo_guest_user') === 'true'
        if (isGuest) {
          setUser({
            id: '00000000-0000-0000-0000-000000000000',
            email: 'guest@demo.com',
            user_metadata: { name: 'Demo Guest', isGuest: true }
          } as unknown as User)
        }
      }
      setLoading(false)
      return
    }

    const isGuest = localStorage.getItem('demo_guest_user') === 'true'
    if (isGuest) {
      setUser({
        id: '00000000-0000-0000-0000-000000000000',
        email: 'guest@demo.com',
        user_metadata: { name: 'Demo Guest', isGuest: true }
      } as unknown as User)
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[AUTH] PASSWORD_RECOVERY event detected, redirecting to /reset-password')
        navigate('/reset-password')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log(`[AUTH] Attempting sign-in for: ${email}`)
    const isDemoMode = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
    if (isDemoMode) {
      console.log(`[AUTH] Demo Mode active. Mocking sign-in success.`)
      const fakeUser = { id: 'demo-1', email, user_metadata: { name: 'Demo User' } } as unknown as User
      setUser(fakeUser)
      localStorage.setItem('demo_user', JSON.stringify(fakeUser))
      localStorage.removeItem('demo_guest_user')
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.warn(`[AUTH] Sign-in failed for ${email}: ${error.message}`)
    } else {
      console.log(`[AUTH] Sign-in successful for ${email}`)
      localStorage.removeItem('demo_guest_user')
      localStorage.removeItem('demo_user')
      localStorage.removeItem('demo_used')
      setGuestQueryCount(0)
      setUploadCount(0)
    }
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const lastRequest = Number(localStorage.getItem('last_signup_request') || '0')
    const now = Date.now()
    if (now - lastRequest < 60000) {
      const waitSecs = Math.ceil((60000 - (now - lastRequest)) / 1000)
      console.warn(`[AUTH] Signup rate-limit cooldown active. Waiting ${waitSecs}s`)
      return { error: `Please wait ${waitSecs} seconds before creating another account.`, session: null }
    }

    console.log(`[AUTH] Attempting sign-up for: ${email} (${name})`)
    const isDemoMode = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
    if (isDemoMode) {
      console.log(`[AUTH] Demo Mode active. Mocking sign-up success.`)
      const fakeUser = { id: 'demo-1', email, user_metadata: { name } } as unknown as User
      setUser(fakeUser)
      localStorage.setItem('demo_user', JSON.stringify(fakeUser))
      localStorage.setItem('last_signup_request', String(Date.now()))
      return { error: null, session: { user: fakeUser } }
    }
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    if (error) {
      console.warn(`[AUTH] Sign-up failed for ${email}: ${error.message}`)
    } else {
      console.log(`[AUTH] Sign-up completed for ${email}. Session established: ${!!data?.session}`)
      localStorage.setItem('last_signup_request', String(Date.now()))
      if (data?.session) {
        localStorage.removeItem('demo_guest_user')
        localStorage.removeItem('demo_user')
        localStorage.removeItem('demo_used')
        setGuestQueryCount(0)
        setUploadCount(0)
      }
    }
    return { error: error?.message ?? null, session: data?.session ?? null }
  }

  const signOut = async () => {
    console.log('[AUTH] User logout requested')
    localStorage.removeItem('demo_user')
    localStorage.removeItem('demo_guest_user')
    localStorage.removeItem('demo_used')
    setGuestQueryCount(0)
    setUploadCount(0)
    try {
      await supabase.auth.signOut()
      console.log('[AUTH] Supabase signOut successful')
    } catch (err) {
      console.warn('[AUTH] Supabase signOut failed or offline:', err)
    }
    setUser(null)
  }

  const updateProfile = async (metadata: { name?: string; orgName?: string; industry?: string; gemini_api_key?: string }) => {
    console.log('[AUTH] Updating user profile metadata')
    const isDemoMode = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
    if (isDemoMode) {
      if (user) {
        const updatedUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            ...metadata
          }
        } as unknown as User
        setUser(updatedUser)
        localStorage.setItem('demo_user', JSON.stringify(updatedUser))
      }
      return { error: null }
    }

    const { data, error } = await supabase.auth.updateUser({
      data: { ...metadata }
    })

    if (error) {
      console.warn('[AUTH] Profile update failed:', error.message)
      return { error: error.message }
    }
    if (data.user) {
      console.log('[AUTH] Profile update succeeded')
      setUser(data.user)
    }
    return { error: null }
  }

  const resetPassword = async (email: string) => {
    const lastRequest = Number(localStorage.getItem('last_reset_request') || '0')
    const now = Date.now()
    if (now - lastRequest < 60000) {
      const waitSecs = Math.ceil((60000 - (now - lastRequest)) / 1000)
      console.warn(`[AUTH] Password reset rate-limit cooldown active. Waiting ${waitSecs}s`)
      return { error: `Please wait ${waitSecs} seconds before requesting another reset email.` }
    }

    console.log(`[AUTH] Requesting password recovery link for: ${email}`)
    const isDemoMode = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
    if (isDemoMode) {
      console.log(`[AUTH] Demo Mode active. Mocking reset email success.`)
      localStorage.setItem('last_reset_request', String(Date.now()))
      return { error: null }
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })
    if (error) {
      console.warn(`[AUTH] Password reset request failed for ${email}: ${error.message}`)
    } else {
      console.log(`[AUTH] Password reset email queued for ${email}`)
      localStorage.setItem('last_reset_request', String(Date.now()))
    }
    return { error: error?.message ?? null }
  }

  const updatePassword = async (password: string) => {
    console.log('[AUTH] Submitting password update request')
    const isDemoMode = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
    if (isDemoMode) {
      console.log('[AUTH] Demo Mode active. Mocking password update success.')
      return { error: null }
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      console.warn('[AUTH] Password update failed:', error.message)
    } else {
      console.log('[AUTH] Password update completed successfully')
    }
    return { error: error?.message ?? null }
  }

  const [subscription, setSubscription] = useState<SubscriptionType | null>(null)

  const refreshSubscription = async () => {
    try {
      const subData = await fetchSubscription()
      setSubscription(subData)
      if (subData.subscription_status === 'trial_exhausted') {
        setShowUpgradeModal(true)
      } else if (subData.subscription_status === 'expired') {
        setShowRenewalModal(true)
      } else {
        setShowUpgradeModal(false)
        setShowRenewalModal(false)
      }
    } catch (err) {
      setSubscription({
        plan: 'Free',
        mrr: 0,
        status: 'Trial',
        aiQueryCount: 0,
        aiQueryLimit: 5,
        analyses_used: 0,
        analyses_remaining: 5,
        subscription_status: 'trial',
        subscription_start: null,
        subscription_end: null,
        plan_type: 'free',
        remaining_days: 0
      })
    }
  }

  const syncSubscription = async (userId: string, demoCount: number) => {
    try {
      const isDemoMode = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
      let token: string | null = null
      if (!isDemoMode) {
        const { data: { session } } = await supabase.auth.getSession()
        token = session?.access_token ?? null
      }

      const API_BASE = import.meta.env.VITE_API_URL || ''
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'X-Guest-ID': localStorage.getItem('guest_session_id') || ''
      }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_BASE}/api/data/subscription/init`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ demoCount })
      })
      if (response.ok) {
        const subData = await response.json()
        setSubscription(subData)
        if (subData.subscription_status === 'trial_exhausted') {
          setShowUpgradeModal(true)
        } else if (subData.subscription_status === 'expired') {
          setShowRenewalModal(true)
        } else {
          setShowUpgradeModal(false)
          setShowRenewalModal(false)
        }
      }
    } catch (err) {
      console.error('Failed to sync subscription details:', err)
    }
  }

  useEffect(() => {
    if (user) {
      if (user.id === '00000000-0000-0000-0000-000000000000') {
        refreshSubscription()
      } else {
        // Read unified demo_used counter and sync to backend
        const demoCount = Number(localStorage.getItem('demo_used') || '0')
        syncSubscription(user.id, demoCount).then(() => {
          // Clear demo usage after successful sync to avoid double-counting
          if (demoCount > 0) {
            localStorage.removeItem('demo_used')
            setUploadCount(0)
            setGuestQueryCount(0)
          }
        })
      }
    } else {
      setSubscription(null)
      setShowUpgradeModal(false)
      setShowRenewalModal(false)
    }
  }, [user])

  const isLocked = (isGuest && isGuestTrialExhausted()) || 
                   subscription?.subscription_status === 'trial_exhausted' || 
                   subscription?.subscription_status === 'expired'

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      userRole,
      setRole,
      subscription,
      refreshSubscription,
      isGuest,
      guestQueryCount,
      incrementGuestQueryCount,
      showSignupModal,
      setShowSignupModal,
      loginAsGuest,
      uploadCount,
      incrementUploadCount,
      showProModal,
      setShowProModal,
      isGuestTrialExhausted,
      isLocked,
      showUpgradeModal,
      setShowUpgradeModal,
      showRenewalModal,
      setShowRenewalModal,
      resetPassword,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

export function mapAuthError(msg: string | null): string | null {
  if (!msg) return null
  const lower = msg.toLowerCase()
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return "Incorrect email or password. If you signed up before our password update, please use 'Forgot Password' to reset your password."
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return "An account with this email already exists. Try signing in, or use 'Forgot Password' if you have forgotten your password."
  }
  if (lower.includes('email not confirmed')) {
    return "Please check your inbox and confirm your email before signing in."
  }
  if (lower.includes('password should be at least 6 characters') || lower.includes('should be at least 6 characters')) {
    return "Password must be at least 8 characters."
  }
  if (lower.includes('disabled') || lower.includes('banned')) {
    return "This account has been disabled. Please contact support."
  }
  if (lower.includes('expired') || lower.includes('invalid token') || lower.includes('jwt expired')) {
    return "The link is invalid or has expired. Please request a new recovery link."
  }
  return msg
}

