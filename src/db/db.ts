import Dexie, { type Table } from 'dexie'
import type { Cellar, ConsumptionLog, Photo, Settings, Wine } from '../types'

export class AdegaDB extends Dexie {
  wines!: Table<Wine, number>
  photos!: Table<Photo, number>
  cellars!: Table<Cellar, number>
  consumption!: Table<ConsumptionLog, number>
  settings!: Table<Settings, number>

  constructor() {
    super('adega')
    this.version(1).stores({
      // `code` é único: é a numeração da adega.
      wines:
        '++id, &code, seq, name, producer, country, region, type, vintage, cellarId, shelf, status, inMenu, favorite, updatedAt',
      photos: '++id, wineId',
      cellars: '++id, name',
      consumption: '++id, wineId, drankAt',
      settings: '++id'
    })
  }
}

export const db = new AdegaDB()

const SETTINGS_ID = 1

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  ownerName: '',
  currency: 'BRL',
  codePrefix: 'AD',
  codeDigits: 4,
  apiKey: '',
  model: 'claude-opus-5',
  webSearch: true,
  menuTitle: 'Carta de Vinhos',
  menuSubtitle: '',
  menuShowPrices: false,
  autoRepoImport: true,
  onboarded: false
}

/** Garante o registro de configurações. Idempotente. */
export async function ensureSeed(): Promise<void> {
  const existing = await db.settings.get(SETTINGS_ID)
  if (!existing) await db.settings.add(DEFAULT_SETTINGS)
}

export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get(SETTINGS_ID)
  return s ?? DEFAULT_SETTINGS
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: SETTINGS_ID })
}

/** Apaga tudo (vinhos, fotos, adegas, histórico) e recomeça. */
export async function wipeDatabase(): Promise<void> {
  // Com a sincronização ligada, o estado vazio vai para a nuvem de qualquer
  // jeito; sem isto, os arquivos das fotos ficariam órfãos lá. Import dinâmico
  // para não criar ciclo entre o banco e a camada de sincronização.
  const { purgeRemotePhotos, remotePathsOf } = await import('../lib/photoSync')
  await purgeRemotePhotos(await remotePathsOf(await db.photos.toArray()))
  await db.delete()
  await db.open()
  await ensureSeed()
}
