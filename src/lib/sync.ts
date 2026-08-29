import type { RealtimeChannel } from '@supabase/supabase-js'
import { STATE_TABLE, supabase } from './supabase'
import { db } from '../db/db'
import { applySyncBundle, buildSyncBundle, type SyncBundle } from './export'
import { flushRemoteDeletions, uploadPendingPhotos } from './photoSync'

// De quem é o estado que está neste navegador agora.
const OWNER_KEY = 'adega:ownerId'
function getOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY)
  } catch {
    return null
  }
}
function setOwner(id: string) {
  try {
    localStorage.setItem(OWNER_KEY, id)
  } catch {
    /* ignore */
  }
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

/**
 * Quando o aparelho tem catálogo próprio e a nuvem também tem, nenhum dos dois
 * pode ser descartado sem você mandar. O PepTrack sobrescreve o local nesse
 * caso; aqui isso apagaria centenas de garrafas catalogadas.
 */
export interface SyncConflict {
  localWines: number
  remoteWines: number
  remoteUpdatedAt: string
}

interface Snapshot {
  status: SyncStatus
  lastSyncedAt: number | null
  conflict: SyncConflict | null
  photosPending: number
  error: string | null
}

let status: SyncStatus = 'idle'
let lastSyncedAt: number | null = null
let conflict: SyncConflict | null = null
let photosPending = 0
let error: string | null = null

const listeners = new Set<() => void>()
let snapshot: Snapshot = {
  status,
  lastSyncedAt,
  conflict,
  photosPending,
  error
}

export function subscribeSync(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}
export function getSyncState(): Snapshot {
  return snapshot
}
function notify() {
  snapshot = { status, lastSyncedAt, conflict, photosPending, error }
  listeners.forEach((l) => l())
}
function setStatus(s: SyncStatus, message: string | null = null) {
  status = s
  error = message
  notify()
}

let userId: string | null = null
let applyingRemote = false
let pushTimer: ReturnType<typeof setTimeout> | null = null
let lastRemoteUpdatedAt: string | null = null
let channel: RealtimeChannel | null = null
let pendingRemote: { bundle: SyncBundle; updatedAt: string } | null = null

const dataTables = () => [
  db.wines,
  db.cellars,
  db.consumption,
  db.photos,
  db.settings
]

let hooksRegistered = false
function registerHooks() {
  if (hooksRegistered) return
  hooksRegistered = true
  const trigger = () => {
    if (userId && !applyingRemote && !conflict) schedulePush()
  }
  for (const table of dataTables()) {
    table.hook('creating', () => trigger())
    table.hook('updating', () => trigger())
    table.hook('deleting', () => trigger())
  }
}

/** Quão recente é o estado deste aparelho. */
async function computeLocalStamp(): Promise<number> {
  const [wines, photos, lastLog] = await Promise.all([
    db.wines.toArray(),
    db.photos.toArray(),
    db.consumption.orderBy('drankAt').last()
  ])
  let m = 0
  for (const w of wines) m = Math.max(m, w.updatedAt, w.createdAt)
  for (const p of photos) m = Math.max(m, p.createdAt)
  if (lastLog) m = Math.max(m, lastLog.drankAt)
  return m
}

function schedulePush() {
  setStatus('syncing')
  if (pushTimer) clearTimeout(pushTimer)
  // 2s: agrupa a rajada de edições de um formulário num envio só.
  pushTimer = setTimeout(() => void pushNow(), 2000)
}

async function pushNow() {
  if (!supabase || !userId || conflict) return
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  try {
    setStatus('syncing')

    // Fotos apagadas enquanto não havia sessão saem agora da nuvem.
    await flushRemoteDeletions()

    // As fotos vão primeiro: o estado precisa sair com os caminhos já gravados.
    const sent = await uploadPendingPhotos(userId)
    photosPending = 0
    if (sent) notify()

    const bundle = await buildSyncBundle()
    const updatedAt = new Date().toISOString()
    const { error: err } = await supabase
      .from(STATE_TABLE)
      .upsert({ user_id: userId, data: bundle, updated_at: updatedAt })
    if (err) throw err

    lastRemoteUpdatedAt = updatedAt
    lastSyncedAt = Date.now()
    setStatus('synced')
  } catch (e) {
    console.error('[sync] push falhou', e)
    setStatus('error', e instanceof Error ? e.message : String(e))
  }
}

async function applyRemote(bundle: SyncBundle, updatedAt: string) {
  applyingRemote = true
  try {
    await applySyncBundle(bundle)
    lastRemoteUpdatedAt = updatedAt
    lastSyncedAt = Date.now()
    setStatus('synced')
  } catch (e) {
    console.error('[sync] apply falhou', e)
    setStatus('error', e instanceof Error ? e.message : String(e))
  } finally {
    applyingRemote = false
  }
}

function subscribeRealtime(uid: string) {
  if (!supabase) return
  if (channel) {
    void supabase.removeChannel(channel)
    channel = null
  }
  channel = supabase
    .channel(`adega_state_${uid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: STATE_TABLE,
        filter: `user_id=eq.${uid}`
      },
      (payload) => {
        // O aviso serve só de gatilho: o estado de 300 rótulos passa do limite
        // de payload do realtime, então buscamos a linha em vez de ler `new`.
        const row = payload.new as { updated_at?: string } | undefined
        if (row?.updated_at && row.updated_at === lastRemoteUpdatedAt) return
        void resyncFromRemote()
      }
    )
    .subscribe()
}

async function fetchRemote(): Promise<{ bundle: SyncBundle; updatedAt: string } | null> {
  if (!supabase || !userId) return null
  const { data, error: err } = await supabase
    .from(STATE_TABLE)
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (err) throw err
  if (!data?.data || !data.updated_at) return null
  return {
    bundle: data.data as SyncBundle,
    updatedAt: data.updated_at as string
  }
}

/** Puxa o estado da nuvem se estiver mais recente que o local. */
export async function resyncFromRemote() {
  if (!supabase || !userId || conflict) return
  try {
    const remote = await fetchRemote()
    if (!remote) return
    if (remote.updatedAt === lastRemoteUpdatedAt) return
    const incoming = Date.parse(remote.updatedAt)
    const known = lastRemoteUpdatedAt ? Date.parse(lastRemoteUpdatedAt) : 0
    if (incoming > known) await applyRemote(remote.bundle, remote.updatedAt)
  } catch (e) {
    console.error('[sync] resync falhou', e)
    setStatus('error', e instanceof Error ? e.message : String(e))
  }
}

/** Envia imediatamente o que estiver pendente (ao minimizar o app). */
export function flushPush() {
  if (pushTimer) void pushNow()
}

/** Ação manual do botão "Sincronizar agora". */
export async function resyncNow() {
  if (!userId) return
  await pushNow()
  await resyncFromRemote()
}

/** Resolve o conflito de primeira entrada, escolhendo qual lado sobrevive. */
export async function resolveConflict(keep: 'local' | 'remote'): Promise<void> {
  if (!conflict || !userId) return
  const pending = pendingRemote
  conflict = null
  pendingRemote = null
  notify()

  if (keep === 'remote' && pending) {
    await applyRemote(pending.bundle, pending.updatedAt)
  } else {
    await pushNow()
  }
  setOwner(userId)
  subscribeRealtime(userId)
}

let lifecycleBound = false
function bindLifecycle() {
  if (lifecycleBound || typeof document === 'undefined') return
  lifecycleBound = true
  document.addEventListener('visibilitychange', () => {
    if (!userId) return
    if (document.visibilityState === 'visible') void resyncFromRemote()
    else flushPush()
  })
  window.addEventListener('pagehide', () => flushPush())
  window.addEventListener('online', () => {
    if (userId) void resyncFromRemote()
  })
}

export async function startSync(uid: string) {
  if (!supabase) return
  registerHooks()
  bindLifecycle()
  userId = uid
  conflict = null
  pendingRemote = null
  setStatus('syncing')

  // Entrou sessão: o que ficou pendente de apagar na nuvem sai agora.
  const apagadas = await flushRemoteDeletions()
  if (apagadas > 0) {
    console.info(`[sync] ${apagadas} foto(s) pendentes foram apagadas da nuvem.`)
  }

  try {
    const remote = await fetchRemote()
    const ownsLocal = getOwner() === uid
    const localWines = await db.wines.count()

    if (!remote) {
      // Nuvem vazia: o que está aqui vira o estado da conta. Nunca apagamos
      // o catálogo local só porque a conta é nova.
      await pushNow()
    } else if (ownsLocal) {
      // Mesma conta de antes: vence quem tem o estado mais recente.
      const remoteStamp = Date.parse(remote.updatedAt)
      const localStamp = await computeLocalStamp()
      if (remoteStamp >= localStamp) await applyRemote(remote.bundle, remote.updatedAt)
      else await pushNow()
    } else if (localWines === 0) {
      // Aparelho novo (ou zerado): recebe o catálogo da conta.
      await applyRemote(remote.bundle, remote.updatedAt)
    } else {
      // Os dois lados têm catálogo e não sabemos qual é o certo: pergunta.
      pendingRemote = remote
      conflict = {
        localWines,
        remoteWines: remote.bundle.wines?.length ?? 0,
        remoteUpdatedAt: remote.updatedAt
      }
      setStatus('idle')
      notify()
      return
    }

    setOwner(uid)
    subscribeRealtime(uid)
  } catch (e) {
    console.error('[sync] start falhou', e)
    setStatus('error', e instanceof Error ? e.message : String(e))
  }
}

export async function stopSync() {
  userId = null
  conflict = null
  pendingRemote = null
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  if (channel && supabase) {
    void supabase.removeChannel(channel)
    channel = null
  }
  lastRemoteUpdatedAt = null
  lastSyncedAt = null
  setStatus('idle')
}
