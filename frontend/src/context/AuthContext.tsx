import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { User } from '@supabase/supabase-js'
import { logActivity } from '../services/audit'
import { fetchSubscription } from '../services/api'

interface SubscriptionType {
  plan: string
  mrr: number
  status: string
  aiQueryCount: number
  aiQueryLimit: number
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
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
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setRoleState] = useState<'Admin' | 'Manager' | 'Analyst' | 'Viewer'>(() => {
    return (localStorage.getItem('user_role') as any) || 'Admin'
  })

  const setRole = (role: 'Admin' | 'Manager' | 'Analyst' | 'Viewer') => {
    setRoleState(role)
    localStorage.setItem('user_role', role)
    logActivity(`Role switched to ${role}`, user?.user_metadata?.name || 'User')
  }

  const [showSignupModal, setShowSignupModal] = useState(false)
  const [guestQueryCount, setGuestQueryCount] = useState<number>(() => {
    return Number(localStorage.getItem('demo_query_count') || '0')
  })

  const isGuest = !!user?.user_metadata?.isGuest

  const loginAsGuest = () => {
    const fakeUser = {
      id: 'demo-guest',
      email: 'guest@demo.com',
      user_metadata: { name: 'Demo Guest', isGuest: true }
    } as unknown as User
    setUser(fakeUser)
    localStorage.setItem('demo_guest_user', 'true')
    localStorage.setItem('demo_query_count', '0')
    setGuestQueryCount(0)
    setShowSignupModal(false)
  }

  const incrementGuestQueryCount = () => {
    const nextCount = guestQueryCount + 1
    localStorage.setItem('demo_query_count', String(nextCount))
    setGuestQueryCount(nextCount)
  }

  useEffect(() => {
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
            id: 'demo-guest',
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
        id: 'demo-guest',
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const isDemoMode = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
    if (isDemoMode) {
      const fakeUser = { id: 'demo-1', email, user_metadata: { name: 'Demo User' } } as unknown as User
      setUser(fakeUser)
      localStorage.setItem('demo_user', JSON.stringify(fakeUser))
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const isDemoMode = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
    if (isDemoMode) {
      const fakeUser = { id: 'demo-1', email, user_metadata: { name } } as unknown as User
      setUser(fakeUser)
      localStorage.setItem('demo_user', JSON.stringify(fakeUser))
      return { error: null }
    }
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    localStorage.removeItem('demo_user')
    localStorage.removeItem('demo_guest_user')
    localStorage.removeItem('demo_query_count')
    setGuestQueryCount(0)
    await supabase.auth.signOut()
    setUser(null)
  }

  const updateProfile = async (metadata: { name?: string; orgName?: string; industry?: string; gemini_api_key?: string }) => {
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

    if (error) return { error: error.message }
    if (data.user) {
      setUser(data.user)
    }
    return { error: null }
  }

  const [subscription, setSubscription] = useState<SubscriptionType | null>(null)

  const refreshSubscription = async () => {
    try {
      const subData = await fetchSubscription()
      setSubscription(subData)
    } catch (err) {
      setSubscription({
        plan: 'Free',
        mrr: 0,
        status: 'Active',
        aiQueryCount: 0,
        aiQueryLimit: 100
      })
    }
  }

  useEffect(() => {
    if (user) {
      refreshSubscription()
    } else {
      setSubscription(null)
    }
  }, [user])

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
      loginAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
