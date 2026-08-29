import type { Wine } from '../types'
import { drinkability, headlineRating, normalizedScore } from './format'

export interface Filters {
  query: string
  types: string[]
  countries: string[]
  grapes: string[]
  cellarId: number | 'todas'
  shelf: string | 'todas'
  onlyReady: boolean
  onlyFavorites: boolean
  onlyInMenu: boolean
  includeConsumed: boolean
  minScore: number | null
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  types: [],
  countries: [],
  grapes: [],
  cellarId: 'todas',
  shelf: 'todas',
  onlyReady: false,
  onlyFavorites: false,
  onlyInMenu: false,
  includeConsumed: false,
  minScore: null
}

export function activeFilterCount(f: Filters): number {
  let n = 0
  n += f.types.length ? 1 : 0
  n += f.countries.length ? 1 : 0
  n += f.grapes.length ? 1 : 0
  n += f.cellarId !== 'todas' ? 1 : 0
  n += f.shelf !== 'todas' ? 1 : 0
  n += f.onlyReady ? 1 : 0
  n += f.onlyFavorites ? 1 : 0
  n += f.onlyInMenu ? 1 : 0
  n += f.includeConsumed ? 1 : 0
  n += f.minScore !== null ? 1 : 0
  return n
}

export type SortKey =
  | 'code'
  | 'recent'
  | 'name'
  | 'score'
  | 'vintage'
  | 'price'
  | 'location'

export const SORT_LABEL: Record<SortKey, string> = {
  code: 'Número',
  recent: 'Recentes',
  name: 'Nome',
  score: 'Nota',
  vintage: 'Safra',
  price: 'Preço',
  location: 'Local'
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Busca por qualquer campo textual, incluindo o código da garrafa. */
function matchesQuery(w: Wine, q: string): boolean {
  if (!q) return true
  const haystack = norm(
    [
      w.code,
      w.name,
      w.producer,
      w.country,
      w.region,
      w.subregion,
      w.shelf,
      w.position,
      w.vintage ? String(w.vintage) : '',
      w.grapes.join(' '),
      w.pairings.join(' '),
      w.tastingNotes ?? '',
      w.myNotes ?? ''
    ].join(' ')
  )
  // Todos os termos precisam bater: "malbec 2019" acha o cruzamento.
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

export function applyFilters(wines: Wine[], f: Filters): Wine[] {
  return wines.filter((w) => {
    if (!f.includeConsumed && w.status !== 'estoque') return false
    if (!matchesQuery(w, f.query)) return false
    if (f.types.length && !f.types.includes(w.type)) return false
    if (f.countries.length && !f.countries.includes(w.country)) return false
    if (f.grapes.length && !f.grapes.some((g) => w.grapes.includes(g))) return false
    if (f.cellarId !== 'todas' && w.cellarId !== f.cellarId) return false
    if (f.shelf !== 'todas' && w.shelf !== f.shelf) return false
    if (f.onlyReady && drinkability(w) === 'jovem') return false
    if (f.onlyFavorites && !w.favorite) return false
    if (f.onlyInMenu && !w.inMenu) return false
    if (f.minScore !== null) {
      const r = headlineRating(w)
      if (!r || normalizedScore(r) < f.minScore) return false
    }
    return true
  })
}

export function sortWines(wines: Wine[], key: SortKey): Wine[] {
  const copy = [...wines]
  switch (key) {
    case 'code':
      return copy.sort((a, b) => a.seq - b.seq)
    case 'recent':
      return copy.sort((a, b) => b.createdAt - a.createdAt)
    case 'name':
      return copy.sort((a, b) =>
        `${a.producer} ${a.name}`.localeCompare(`${b.producer} ${b.name}`, 'pt-BR')
      )
    case 'score':
      return copy.sort((a, b) => {
        const ra = headlineRating(a)
        const rb = headlineRating(b)
        return (rb ? normalizedScore(rb) : -1) - (ra ? normalizedScore(ra) : -1)
      })
    case 'vintage':
      return copy.sort((a, b) => (b.vintage ?? 0) - (a.vintage ?? 0))
    case 'price':
      return copy.sort(
        (a, b) =>
          (b.marketPrice ?? b.purchasePrice ?? 0) -
          (a.marketPrice ?? a.purchasePrice ?? 0)
      )
    case 'location':
      return copy.sort(
        (a, b) =>
          (a.cellarId ?? 0) - (b.cellarId ?? 0) ||
          a.shelf.localeCompare(b.shelf, 'pt-BR') ||
          a.seq - b.seq
      )
  }
}

/** Valores distintos que existem no acervo, para montar os filtros. */
export function facets(wines: Wine[]) {
  const countries = new Map<string, number>()
  const grapes = new Map<string, number>()
  const types = new Map<string, number>()
  for (const w of wines) {
    if (w.country) countries.set(w.country, (countries.get(w.country) ?? 0) + 1)
    types.set(w.type, (types.get(w.type) ?? 0) + 1)
    for (const g of w.grapes) grapes.set(g, (grapes.get(g) ?? 0) + 1)
  }
  const byCount = (a: [string, number], b: [string, number]) =>
    b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')
  return {
    countries: [...countries.entries()].sort(byCount),
    grapes: [...grapes.entries()].sort(byCount),
    types: [...types.entries()].sort(byCount)
  }
}
