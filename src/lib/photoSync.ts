import { db } from '../db/db'
import { PHOTO_BUCKET, supabase } from './supabase'
import type { Photo } from '../types'

/**
 * As fotos não cabem no estado JSON (300 garrafas ≈ 70 MB): cada arquivo vai
 * para o Storage e o estado guarda só o caminho.
 */

function extensionFor(blob: Blob): string {
  if (blob.type === 'image/webp') return 'webp'
  if (blob.type === 'image/png') return 'png'
  return 'jpg'
}

/** O carimbo de criação evita colisão entre ids gerados em aparelhos diferentes. */
function pathFor(userId: string, photo: Photo, blob: Blob): string {
  return `${userId}/${photo.id}-${photo.createdAt}.${extensionFor(blob)}`
}

/** Sobe as fotos que ainda não têm arquivo na nuvem. Devolve quantas subiram. */
export async function uploadPendingPhotos(userId: string): Promise<number> {
  if (!supabase) return 0
  const pending = (await db.photos.toArray()).filter((p) => p.blob && !p.path)
  let sent = 0
  for (const photo of pending) {
    const blob = photo.blob!
    const path = pathFor(userId, photo, blob)
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: true })
    if (error) {
      console.error('[sync] upload da foto falhou', path, error.message)
      continue
    }
    await db.photos.update(photo.id!, { path })
    sent++
  }
  return sent
}

// Uma requisição por foto, mesmo que a tela peça a mesma foto várias vezes.
const inFlight = new Map<number, Promise<Blob | null>>()

/**
 * Garante o arquivo local da foto, baixando do Storage se necessário.
 * Chamada pela tela quando a foto aparece — nada é baixado em massa.
 */
export async function ensureBlob(photo: Photo): Promise<Blob | null> {
  if (photo.blob) return photo.blob
  if (!photo.path || !supabase || photo.id == null) return null

  const existing = inFlight.get(photo.id)
  if (existing) return existing

  const task = (async () => {
    const { data, error } = await supabase!.storage
      .from(PHOTO_BUCKET)
      .download(photo.path!)
    if (error || !data) {
      console.error('[sync] download da foto falhou', photo.path, error?.message)
      return null
    }
    await db.photos.update(photo.id!, { blob: data })
    return data
  })()

  inFlight.set(photo.id, task)
  try {
    return await task
  } finally {
    inFlight.delete(photo.id)
  }
}

/** Baixa tudo o que falta — usado antes de gerar um backup completo. */
export async function downloadAllPhotos(
  onProgress?: (done: number, total: number) => void
): Promise<{ ok: number; failed: number }> {
  const missing = (await db.photos.toArray()).filter((p) => !p.blob && p.path)
  let ok = 0
  let failed = 0
  for (const [i, photo] of missing.entries()) {
    const blob = await ensureBlob(photo)
    if (blob) ok++
    else failed++
    onProgress?.(i + 1, missing.length)
  }
  return { ok, failed }
}

/** Quantas fotos ainda estão só na nuvem. */
export async function countRemoteOnly(): Promise<number> {
  return (await db.photos.toArray()).filter((p) => !p.blob && p.path).length
}

/** Apaga da nuvem os arquivos que não pertencem mais a nenhuma foto. */
export async function purgeRemotePhotos(paths: string[]): Promise<void> {
  if (!supabase || paths.length === 0) return
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths)
  if (error) console.error('[sync] remoção de fotos falhou', error.message)
}
