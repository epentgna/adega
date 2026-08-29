import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Mesmo projeto Supabase do PepTrack: o login Google já está configurado lá.
// A "publishable key" é feita para ficar no cliente — a proteção real vem das
// políticas RLS, que amarram cada linha ao auth.uid() do dono.
const SUPABASE_URL = 'https://infgemqgrcbwzqtatrpk.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mPVAcG3RPEYqJA8Vr7CSFQ_YYTZjiag'

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
  : null

/** Tabela com o estado (sem fotos) e bucket com os arquivos das fotos. */
export const STATE_TABLE = 'adega_state'
export const PHOTO_BUCKET = 'adega-fotos'

/** URL de retorno do login (no GitHub Pages o app vive em /adega/). */
export const APP_URL =
  typeof window !== 'undefined'
    ? window.location.origin + import.meta.env.BASE_URL
    : '/'
