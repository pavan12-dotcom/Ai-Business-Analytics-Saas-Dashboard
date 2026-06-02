import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for demo mode (no real Supabase configured)
    const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || 
                       import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'

    if (isDemoMode) {
      const demoUser = localStorage.getItem('demo_user')
      if (demoUser) setUser(JSON.parse(demoUser))
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
    const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || 
                       import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
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
    const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || 
                       import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co'
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
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
