import { db } from '../db/db'
import type { Photo } from '../types'

const MAX_EDGE = 1400
const QUALITY = 0.82

/**
 * Redimensiona e recomprime a foto antes de guardar. Uma foto de iPhone
 * (~4 MB) vira ~120 KB, então 300+ vinhos cabem folgados no IndexedDB.
 */
export async function compressImage(
  file: Blob
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível neste navegador.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  // Safari só ganhou WebP no canvas no iOS 14; JPEG é o plano B.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', QUALITY)
  )
  if (blob && blob.type === 'image/webp') return { blob, width, height }

  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY)
  )
  if (!jpeg) throw new Error('Não foi possível processar a imagem.')
  return { blob: jpeg, width, height }
}

export async function savePhoto(
  file: Blob,
  kind: Photo['kind'],
  wineId: number | null
): Promise<number> {
  const { blob, width, height } = await compressImage(file)
  return db.photos.add({
    wineId,
    blob,
    kind,
    width,
    height,
    createdAt: Date.now()
  })
}

export async function deletePhoto(id: number): Promise<void> {
  revokeUrl(id)
  await db.photos.delete(id)
}

/** Remove as fotos órfãs (capturadas mas nunca vinculadas a um vinho). */
export async function purgeOrphanPhotos(): Promise<number> {
  const orphans = await db.photos.where('wineId').equals(-1).toArray()
  const stale = orphans.filter((p) => Date.now() - p.createdAt > 60 * 60 * 1000)
  await Promise.all(stale.map((p) => deletePhoto(p.id!)))
  return stale.length
}

// Cache de object URLs: recriar a URL a cada render pisca a imagem e vaza
// memória. Uma URL por id, revogada quando a foto é apagada.
const urlCache = new Map<number, string>()

export function photoUrl(photo: Photo): string {
  const cached = photo.id != null ? urlCache.get(photo.id) : undefined
  if (cached) return cached
  const url = URL.createObjectURL(photo.blob)
  if (photo.id != null) urlCache.set(photo.id, url)
  return url
}

export function revokeUrl(id: number): void {
  const url = urlCache.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(id)
  }
}

export async function getPhoto(id: number): Promise<Photo | undefined> {
  return db.photos.get(id)
}

/** Base64 puro (sem o prefixo data:), como a API de visão espera. */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export function mediaType(blob: Blob): 'image/webp' | 'image/jpeg' | 'image/png' {
  if (blob.type === 'image/webp') return 'image/webp'
  if (blob.type === 'image/png') return 'image/png'
  return 'image/jpeg'
}
