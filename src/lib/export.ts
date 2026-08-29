import { db, getSettings, updateSettings } from '../db/db'
import type { Cellar, ConsumptionLog, Photo, Settings, Wine } from '../types'
import { blobToBase64 } from './photos'
import { ensureBlob } from './photoSync'

export interface Bundle {
  app: 'adega'
  version: 1
  exportedAt: string
  withPhotos: boolean
  settings: Omit<Settings, 'apiKey'>
  wines: Wine[]
  cellars: Cellar[]
  consumption: ConsumptionLog[]
  photos?: {
    id: number
    wineId: number | null
    kind: string
    width: number
    height: number
    createdAt: number
    type: string
    data: string
  }[]
  /** Fotos que não puderam ser embutidas (nuvem fora do ar, por exemplo). */
  missingPhotos?: number
}

/**
 * Monta o backup. A chave da API nunca vai junto — sai do aparelho no
 * arquivo e você não quer isso.
 */
export async function buildExport(withPhotos: boolean): Promise<Bundle> {
  const [settings, wines, cellars, consumption] = await Promise.all([
    getSettings(),
    db.wines.toArray(),
    db.cellars.toArray(),
    db.consumption.toArray()
  ])
  const { apiKey: _omit, ...safeSettings } = settings

  const bundle: Bundle = {
    app: 'adega',
    version: 1,
    exportedAt: new Date().toISOString(),
    withPhotos,
    settings: safeSettings,
    wines,
    cellars,
    consumption
  }

  if (withPhotos) {
    const photos = await db.photos.toArray()
    bundle.photos = []
    for (const p of photos) {
      // Foto que só existe na nuvem precisa descer antes de entrar no arquivo.
      const blob = p.blob ?? (await ensureBlob(p))
      if (!blob) {
        bundle.missingPhotos = (bundle.missingPhotos ?? 0) + 1
        continue
      }
      bundle.photos.push({
        id: p.id!,
        wineId: p.wineId,
        kind: p.kind,
        width: p.width,
        height: p.height,
        createdAt: p.createdAt,
        type: blob.type || 'image/jpeg',
        data: await blobToBase64(blob)
      })
    }
  }
  return bundle
}

/** Baixa o backup e devolve quantas fotos ficaram de fora, se alguma. */
export async function downloadBackup(withPhotos: boolean): Promise<number> {
  const bundle = await buildExport(withPhotos)
  const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' })
  const stamp = new Date().toISOString().slice(0, 10)
  triggerDownload(blob, `adega-${stamp}${withPhotos ? '-com-fotos' : ''}.json`)
  return bundle.missingPhotos ?? 0
}

function base64ToBlob(data: string, type: string): Blob {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

/** Restaura um backup, substituindo tudo o que está no aparelho. */
export async function importBundle(bundle: Bundle): Promise<void> {
  if (bundle?.app !== 'adega') throw new Error('Este arquivo não é um backup da Adega.')

  await db.transaction(
    'rw',
    db.wines,
    db.cellars,
    db.consumption,
    db.photos,
    db.settings,
    async () => {
      await Promise.all([
        db.wines.clear(),
        db.cellars.clear(),
        db.consumption.clear(),
        db.photos.clear()
      ])
      if (bundle.cellars?.length) await db.cellars.bulkAdd(bundle.cellars)
      if (bundle.wines?.length) await db.wines.bulkAdd(bundle.wines)
      if (bundle.consumption?.length) await db.consumption.bulkAdd(bundle.consumption)
      if (bundle.photos?.length) {
        await db.photos.bulkAdd(
          bundle.photos.map((p) => ({
            id: p.id,
            wineId: p.wineId,
            blob: base64ToBlob(p.data, p.type),
            kind: p.kind as 'rotulo' | 'contra' | 'garrafa' | 'outro',
            width: p.width,
            height: p.height,
            createdAt: p.createdAt
          }))
        )
      }
    }
  )

  // A chave da API que já está aqui continua valendo.
  if (bundle.settings) {
    const { apiKey: _drop, id: _id, ...rest } = bundle.settings as Settings
    await updateSettings(rest)
  }
}

/** Uma linha por vinho, para abrir no Excel/Numbers. */
export function toCSV(wines: Wine[], cellarNames: Map<number, string>): string {
  const head = [
    'Codigo',
    'Nome',
    'Produtor',
    'Safra',
    'Tipo',
    'Uvas',
    'Pais',
    'Regiao',
    'Adega',
    'Prateleira',
    'Posicao',
    'Garrafas',
    'Nota Vivino',
    'Outras notas',
    'Minha nota',
    'Preco compra',
    'Preco mercado',
    'Guarda',
    'Status'
  ]
  const rows = wines.map((w) => [
    w.code,
    w.name,
    w.producer,
    w.vintage ?? '',
    w.type,
    w.grapes.join(' | '),
    w.country,
    w.region,
    (w.cellarId != null ? cellarNames.get(w.cellarId) : '') ?? '',
    w.shelf,
    w.position ?? '',
    w.quantity,
    w.ratings.find((r) => /vivino/i.test(r.source))?.score ?? '',
    w.ratings
      .filter((r) => !/vivino/i.test(r.source))
      .map((r) => `${r.source} ${r.score}/${r.scale}`)
      .join(' | '),
    w.myRating ?? '',
    w.purchasePrice ?? '',
    w.marketPrice ?? '',
    [w.drinkFrom, w.drinkTo].filter(Boolean).join('–'),
    w.status
  ])

  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // Ponto e vírgula: é o que o Excel em pt-BR espera.
  return [head, ...rows].map((r) => r.map(escape).join(';')).join('\n')
}

export function downloadCSV(csv: string, filename: string): void {
  // BOM para o Excel entender os acentos.
  triggerDownload(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename)
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// --- Estado sincronizado ----------------------------------------------------
// O backup em arquivo carrega as fotos em base64; o estado que vai para a
// nuvem carrega só o caminho de cada foto no Storage.

export interface PhotoMeta {
  id: number
  wineId: number | null
  kind: Photo['kind']
  width: number
  height: number
  createdAt: number
  path?: string
}

export interface SyncBundle {
  app: 'adega'
  version: 1
  wines: Wine[]
  cellars: Cellar[]
  consumption: ConsumptionLog[]
  photos: PhotoMeta[]
  settings: Omit<Settings, 'apiKey' | 'id'>
}

export async function buildSyncBundle(): Promise<SyncBundle> {
  const [settings, wines, cellars, consumption, photos] = await Promise.all([
    getSettings(),
    db.wines.toArray(),
    db.cellars.toArray(),
    db.consumption.toArray(),
    db.photos.toArray()
  ])
  const { apiKey: _omit, id: _id, ...safeSettings } = settings
  return {
    app: 'adega',
    version: 1,
    wines,
    cellars,
    consumption,
    settings: safeSettings,
    photos: photos.map((p) => ({
      id: p.id!,
      wineId: p.wineId,
      kind: p.kind,
      width: p.width,
      height: p.height,
      createdAt: p.createdAt,
      path: p.path
    }))
  }
}

/**
 * Substitui o estado local pelo da nuvem, preservando os arquivos de foto que
 * este aparelho já tem — só o que falta é baixado depois, sob demanda.
 */
export async function applySyncBundle(bundle: SyncBundle): Promise<void> {
  if (bundle?.app !== 'adega') throw new Error('Estado remoto inválido.')

  const localBlobs = new Map<string, Blob>()
  for (const p of await db.photos.toArray()) {
    if (p.blob) localBlobs.set(`${p.id}:${p.createdAt}`, p.blob)
  }

  await db.transaction(
    'rw',
    db.wines,
    db.cellars,
    db.consumption,
    db.photos,
    async () => {
      await Promise.all([
        db.wines.clear(),
        db.cellars.clear(),
        db.consumption.clear(),
        db.photos.clear()
      ])
      if (bundle.cellars?.length) await db.cellars.bulkAdd(bundle.cellars)
      if (bundle.wines?.length) await db.wines.bulkAdd(bundle.wines)
      if (bundle.consumption?.length) await db.consumption.bulkAdd(bundle.consumption)
      if (bundle.photos?.length) {
        await db.photos.bulkAdd(
          bundle.photos.map((p) => ({
            id: p.id,
            wineId: p.wineId,
            blob: localBlobs.get(`${p.id}:${p.createdAt}`),
            path: p.path,
            kind: p.kind,
            width: p.width,
            height: p.height,
            createdAt: p.createdAt
          }))
        )
      }
    }
  )

  if (bundle.settings) await updateSettings(bundle.settings)
}
