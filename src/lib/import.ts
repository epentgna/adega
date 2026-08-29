import { db, getSettings } from '../db/db'
import { formatCode, parseSeq } from './code'
import { savePhoto } from './photos'
import type { Cellar, Rating, Wine, WineType } from '../types'
import { WINE_TYPES } from '../types'

/**
 * Formato do arquivo que o Claude Code gera ao processar uma pasta de fotos.
 * É de propósito mais simples que o backup: um agente escreve isso à mão sem
 * precisar saber nada sobre ids ou IndexedDB.
 */
export interface ImportWine {
  /** Numeração já atribuída. Sem ela, o app numera na sequência. */
  codigo?: string
  fotos?: string[]
  nome?: string
  produtor?: string
  safra?: number | null
  tipo?: string
  uvas?: string[]
  pais?: string
  regiao?: string
  subRegiao?: string
  teorAlcoolico?: number | null
  volumeMl?: number | null
  adega?: string
  prateleira?: string
  posicao?: string
  garrafas?: number
  historia?: string
  notasDegustacao?: string
  harmonizacoes?: string[]
  guardaDe?: number | null
  guardaAte?: number | null
  temperatura?: string
  decantarMin?: number | null
  avaliacoes?: {
    fonte?: string
    nota?: number
    escala?: number
    votos?: number | null
    safra?: number | null
    url?: string | null
  }[]
  precoMercado?: number | null
  precoPago?: number | null
  descricaoCardapio?: string
  confianca?: number | null
  fontes?: string[]
  observacoes?: string
}

export interface ImportFile {
  app?: string
  formato?: string
  versao?: number
  vinhos: ImportWine[]
}

/** Uma foto disponível para o import, venha de onde vier. */
export interface NamedPhoto {
  name: string
  blob: Blob
}

export interface ImportPlan {
  wines: ImportWine[]
  /** Nome de arquivo (minúsculo) → conteúdo. */
  photos: Map<string, Blob>
  /** Fotos citadas no JSON que não estavam na seleção. */
  missingPhotos: string[]
  /** Fotos selecionadas que nenhum vinho cita. */
  unusedPhotos: string[]
  cellarsToCreate: string[]
}

export interface ImportResult {
  wines: number
  photos: number
  cellars: number
  /** Vinhos ignorados porque a numeração já existia no catálogo. */
  skipped: number
  firstCode: string
  lastCode: string
}

function baseName(path: string): string {
  return path.split('/').pop()!.toLowerCase()
}

export function parseImportFile(raw: unknown): ImportWine[] {
  const file = raw as ImportFile
  if (!file || !Array.isArray(file.vinhos)) {
    throw new Error(
      'Arquivo inválido: esperava um objeto com a lista "vinhos".'
    )
  }
  return file.vinhos
}

/** Cruza o JSON com as fotos escolhidas e diz o que vai acontecer. */
export async function planImport(
  wines: ImportWine[],
  files: NamedPhoto[]
): Promise<ImportPlan> {
  const photos = new Map<string, Blob>()
  for (const file of files) photos.set(baseName(file.name), file.blob)

  const cited = new Set<string>()
  const missingPhotos: string[] = []
  for (const wine of wines) {
    for (const name of wine.fotos ?? []) {
      const key = baseName(name)
      cited.add(key)
      if (!photos.has(key)) missingPhotos.push(name)
    }
  }

  const existing = new Set((await db.cellars.toArray()).map((c) => c.name))
  const wanted = new Set<string>()
  for (const wine of wines) {
    const name = wine.adega?.trim()
    if (name && !existing.has(name)) wanted.add(name)
  }

  return {
    wines,
    photos,
    missingPhotos,
    unusedPhotos: [...photos.keys()].filter((k) => !cited.has(k)),
    cellarsToCreate: [...wanted]
  }
}

function toType(value: string | undefined): WineType {
  const found = WINE_TYPES.find(
    (t) => t.toLowerCase() === (value ?? '').trim().toLowerCase()
  )
  return found ?? 'Tinto'
}

function toRatings(list: ImportWine['avaliacoes']): Rating[] {
  if (!Array.isArray(list)) return []
  const out: Rating[] = []
  for (const r of list) {
    const source = (r?.fonte ?? '').trim()
    const score = typeof r?.nota === 'number' ? r.nota : null
    const scale = typeof r?.escala === 'number' ? r.escala : null
    if (!source || score === null || !scale) continue
    if (score < 0 || score > scale) continue
    out.push({
      source,
      score,
      scale,
      votes: r.votos ?? null,
      vintage: r.safra ?? null,
      url: r.url ?? null,
      origin: 'ia'
    })
  }
  return out
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function int(v: unknown): number | null {
  const n = num(v)
  return n === null ? null : Math.round(n)
}

/**
 * Grava o catálogo importado. As fotos são comprimidas aqui, no navegador,
 * usando o mesmo caminho da câmera — nada precisa ser preparado no computador.
 */
export async function runImport(
  plan: ImportPlan,
  options: { replace: boolean },
  onProgress?: (done: number, total: number, label: string) => void
): Promise<ImportResult> {
  const settings = await getSettings()

  if (options.replace) {
    await db.transaction('rw', db.wines, db.photos, db.consumption, async () => {
      await Promise.all([db.wines.clear(), db.photos.clear(), db.consumption.clear()])
    })
  }

  // Adegas citadas que ainda não existem entram com as prateleiras usadas.
  const cellars = await db.cellars.toArray()
  const byName = new Map<string, Cellar>(cellars.map((c) => [c.name, c]))
  let created = 0

  for (const wine of plan.wines) {
    const name = wine.adega?.trim()
    if (!name) continue
    if (!byName.has(name)) {
      const cellar: Cellar = {
        name,
        location: '',
        shelves: [],
        capacityPerShelf: null
      }
      cellar.id = await db.cellars.add(cellar)
      byName.set(name, cellar)
      created++
    }
    const shelf = wine.prateleira?.trim()
    const cellar = byName.get(name)!
    if (shelf && !cellar.shelves.includes(shelf)) {
      cellar.shelves = [...cellar.shelves, shelf]
      await db.cellars.update(cellar.id!, { shelves: cellar.shelves })
    }
  }

  // Numeração já usada: uma garrafa que chega com código repetido é a mesma
  // garrafa chegando de novo, não uma nova.
  const taken = new Set((await db.wines.toArray()).map((w) => w.code))
  const last = await db.wines.orderBy('seq').last()
  let seq = (last?.seq ?? 0) + 1

  let savedPhotos = 0
  let skipped = 0
  let firstCode = ''
  let lastCode = ''
  const total = plan.wines.length

  for (const [i, entry] of plan.wines.entries()) {
    const given = entry.codigo?.trim()
    if (given && taken.has(given)) {
      skipped++
      onProgress?.(i, total, `${given} · já estava no catálogo`)
      continue
    }

    const code = given || formatCode(settings.codePrefix, settings.codeDigits, seq)
    // Com código vindo pronto, a sequência continua a partir do maior número.
    const codeSeq = given ? (parseSeq(given) ?? seq) : seq
    taken.add(code)
    onProgress?.(i, total, `${code} · ${entry.nome ?? entry.produtor ?? 'sem nome'}`)

    const cellar = entry.adega ? byName.get(entry.adega.trim()) : undefined
    const now = Date.now()

    const wine: Wine = {
      code,
      seq: codeSeq,
      name: (entry.nome ?? '').trim(),
      producer: (entry.produtor ?? '').trim(),
      country: (entry.pais ?? '').trim(),
      region: (entry.regiao ?? '').trim(),
      subregion: (entry.subRegiao ?? '').trim(),
      vintage: int(entry.safra),
      type: toType(entry.tipo),
      grapes: (entry.uvas ?? []).map((g) => g.trim()).filter(Boolean),
      abv: num(entry.teorAlcoolico),
      volumeMl: int(entry.volumeMl) ?? 750,
      cellarId: cellar?.id ?? null,
      shelf: (entry.prateleira ?? '').trim(),
      position: (entry.posicao ?? '').trim(),
      quantity: Math.max(1, int(entry.garrafas) ?? 1),
      status: 'estoque',
      ratings: toRatings(entry.avaliacoes),
      myRating: null,
      myNotes: '',
      favorite: false,
      story: (entry.historia ?? '').trim(),
      tastingNotes: (entry.notasDegustacao ?? '').trim(),
      body: null,
      pairings: (entry.harmonizacoes ?? []).map((p) => p.trim()).filter(Boolean),
      drinkFrom: int(entry.guardaDe),
      drinkTo: int(entry.guardaAte),
      servingTempC: (entry.temperatura ?? '').trim(),
      decantMin: int(entry.decantarMin),
      purchasePrice: num(entry.precoPago),
      purchasedAt: null,
      purchasedFrom: '',
      marketPrice: num(entry.precoMercado),
      inMenu: true,
      menuNote: (entry.descricaoCardapio ?? '').trim(),
      menuPrice: null,
      photoIds: [],
      enrichment: {
        status: 'ok',
        model: 'Claude Code (lote)',
        at: now,
        confidence: num(entry.confianca),
        sources: entry.fontes ?? [],
        notes: entry.observacoes ?? ''
      },
      createdAt: now,
      updatedAt: now
    }

    const { id: _drop, ...fresh } = wine
    const wineId = await db.wines.add(fresh as Wine)

    const photoIds: number[] = []
    for (const nameRef of entry.fotos ?? []) {
      const file = plan.photos.get(baseName(nameRef))
      if (!file) continue
      try {
        photoIds.push(
          await savePhoto(file, photoIds.length === 0 ? 'rotulo' : 'contra', wineId)
        )
        savedPhotos++
      } catch (err) {
        console.error('[import] foto falhou', nameRef, err)
      }
    }
    if (photoIds.length) await db.wines.update(wineId, { photoIds })

    if (!firstCode) firstCode = code
    lastCode = code
    seq = Math.max(seq, codeSeq) + 1
  }

  onProgress?.(total, total, 'Concluído')

  return {
    wines: plan.wines.length - skipped,
    photos: savedPhotos,
    cellars: created,
    skipped,
    firstCode,
    lastCode
  }
}
