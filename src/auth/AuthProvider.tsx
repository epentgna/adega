import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { APP_URL, supabase, supabaseConfigured } from '../lib/supabase'
import { startSync, stopSync } from '../lib/sync'

interface AuthContextValue {
  configured: boolean
  ready: boolean
  session: Session | null
  user: User | null
  signInGoogle: () => Promise<{ error?: string }>
  signInEmail: (email: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  configured: false,
  ready: true,
  session: null,
  user: null,
  signInGoogle: async () => ({}),
  signInEmail: async () => ({}),
  signOut: async () => {}
})

export function useAuth() {
  return useContext(AuthContext)
}

/**
 * O login é opcional: sem conta o Adega funciona inteiro, só não sincroniza.
 * É o contrário do PepTrack, onde a sessão é obrigatória.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      setReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const uid = session?.user?.id
  useEffect(() => {
    if (uid) void startSync(uid)
    else void stopSync()
  }, [uid])

  const value: AuthContextValue = {
    configured: supabaseConfigured,
    ready,
    session,
    user: session?.user ?? null,
    signInGoogle: async () => {
      if (!supabase) return { error: 'Sincronização não configurada.' }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: APP_URL }
      })
      return { error: error?.message }
    },
    signInEmail: async (email: string) => {
      if (!supabase) return { error: 'Sincronização não configurada.' }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: APP_URL }
      })
      return { error: error?.message }
    },
    signOut: async () => {
      await supabase?.auth.signOut()
    }
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
