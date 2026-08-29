import { db } from '../db/db'
import type { Cellar, Wine } from '../types'
import type { WineDraft } from './enrich'

export function emptyWine(): Wine {
  const now = Date.now()
  return {
    code: '',
    seq: 0,
    name: '',
    producer: '',
    country: '',
    region: '',
    subregion: '',
    vintage: null,
    type: 'Tinto',
    grapes: [],
    abv: null,
    volumeMl: 750,
    cellarId: null,
    shelf: '',
    position: '',
    quantity: 1,
    status: 'estoque',
    ratings: [],
    myRating: null,
    myNotes: '',
    favorite: false,
    tastingNotes: '',
    body: null,
    pairings: [],
    drinkFrom: null,
    drinkTo: null,
    servingTempC: '',
    decantMin: null,
    purchasePrice: null,
    purchasedAt: null,
    purchasedFrom: '',
    marketPrice: null,
    inMenu: true,
    menuNote: '',
    menuPrice: null,
    photoIds: [],
    createdAt: now,
    updatedAt: now
  }
}

/**
 * Aplica a ficha vinda da IA por cima do rascunho, sem sobrescrever o que
 * você já digitou à mão — o que você escreveu ganha da IA.
 */
export function applyDraft(wine: Wine, draft: WineDraft): Wine {
  const keep = <T>(mine: T, theirs: T, isEmpty: (v: T) => boolean): T =>
    isEmpty(mine) ? theirs : mine
  const emptyStr = (v: string | undefined) => !v || v.trim() === ''
  const emptyNum = (v: number | null) => v === null

  return {
    ...wine,
    name: keep(wine.name, draft.name, emptyStr),
    producer: keep(wine.producer, draft.producer, emptyStr),
    country: keep(wine.country, draft.country, emptyStr),
    region: keep(wine.region, draft.region, emptyStr),
    subregion: keep(wine.subregion ?? '', draft.subregion, emptyStr),
    vintage: keep(wine.vintage, draft.vintage, emptyNum),
    type: draft.type && wine.type === 'Tinto' ? draft.type : wine.type,
    grapes: wine.grapes.length ? wine.grapes : draft.grapes,
    abv: keep(wine.abv, draft.abv, emptyNum),
    volumeMl: wine.volumeMl === 750 && draft.volumeMl ? draft.volumeMl : wine.volumeMl,
    tastingNotes: keep(wine.tastingNotes ?? '', draft.tastingNotes, emptyStr),
    body: wine.body ?? draft.body,
    pairings: wine.pairings.length ? wine.pairings : draft.pairings,
    drinkFrom: keep(wine.drinkFrom, draft.drinkFrom, emptyNum),
    drinkTo: keep(wine.drinkTo, draft.drinkTo, emptyNum),
    servingTempC: keep(wine.servingTempC ?? '', draft.servingTempC, emptyStr),
    decantMin: keep(wine.decantMin ?? null, draft.decantMin, emptyNum),
    // Avaliações da IA substituem as antigas da IA, mas mantêm as suas.
    ratings: [
      ...wine.ratings.filter((r) => r.origin === 'manual'),
      ...draft.ratings
    ],
    marketPrice: keep(wine.marketPrice, draft.marketPrice, emptyNum),
    menuNote: keep(wine.menuNote ?? '', draft.menuNote, emptyStr),
    enrichment: {
      status: 'ok',
      model: draft.model,
      at: Date.now(),
      confidence: draft.confidence,
      sources: draft.sources,
      notes: draft.notes
    },
    updatedAt: Date.now()
  }
}

export async function saveWine(wine: Wine): Promise<number> {
  const record = { ...wine, updatedAt: Date.now() }
  if (record.id) {
    await db.wines.put(record)
    return record.id
  }
  const { id: _drop, ...fresh } = record
  return db.wines.add(fresh as Wine)
}

/** Apaga o vinho e as fotos dele. */
export async function deleteWine(id: number): Promise<void> {
  const wine = await db.wines.get(id)
  if (!wine) return
  await db.photos.where('wineId').equals(id).delete()
  await db.wines.delete(id)
}

/** Registra o consumo de uma garrafa e baixa o estoque. */
export async function drinkBottle(
  wine: Wine,
  entry: { occasion?: string; withWhom?: string; rating: number | null; notes?: string }
): Promise<void> {
  const remaining = Math.max(0, wine.quantity - 1)
  await db.transaction('rw', db.wines, db.consumption, async () => {
    await db.consumption.add({
      wineId: wine.id!,
      wineCode: wine.code,
      wineName: `${wine.producer} ${wine.name}`.trim(),
      drankAt: Date.now(),
      occasion: entry.occasion,
      withWhom: entry.withWhom,
      rating: entry.rating,
      notes: entry.notes
    })
    await db.wines.update(wine.id!, {
      quantity: remaining,
      status: remaining === 0 ? 'consumido' : wine.status,
      inMenu: remaining === 0 ? false : wine.inMenu,
      myRating: entry.rating ?? wine.myRating,
      updatedAt: Date.now()
    })
  })
}

export function cellarName(
  cellars: Cellar[] | undefined,
  id: number | null
): string | undefined {
  if (id == null) return undefined
  return cellars?.find((c) => c.id === id)?.name
}
