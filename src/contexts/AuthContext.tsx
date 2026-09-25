import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('AuthProvider: Initializing auth')
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Got session', session ? 'User logged in' : 'No session')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch(error => {
      console.error('AuthProvider: Error getting session', error)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthProvider: Auth state changed', _event, session ? 'User logged in' : 'No session')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    console.log('AuthProvider: Signing in', email)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('AuthProvider: Sign in error', error)
    }
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    console.log('AuthProvider: Signing up', email)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error('AuthProvider: Sign up error', error)
    }
    return { error }
  }

  const signOut = async () => {
    console.log('AuthProvider: Signing out')
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}