import type { Cellar, Wine } from '../types'
import { drinkability, headlineRating, normalizedScore } from './format'

export interface CellarStats {
  bottles: number
  labels: number
  value: number
  valueKnown: number
  ready: number
  aging: number
  past: number
  byType: [string, number][]
  byCountry: [string, number][]
  topRated: Wine[]
}

export function computeStats(wines: Wine[]): CellarStats {
  const inStock = wines.filter((w) => w.status === 'estoque' && w.quantity > 0)
  const byType = new Map<string, number>()
  const byCountry = new Map<string, number>()
  let bottles = 0
  let value = 0
  let valueKnown = 0
  let ready = 0
  let aging = 0
  let past = 0

  for (const w of inStock) {
    bottles += w.quantity
    byType.set(w.type, (byType.get(w.type) ?? 0) + w.quantity)
    if (w.country) byCountry.set(w.country, (byCountry.get(w.country) ?? 0) + w.quantity)
    const unit = w.marketPrice ?? w.purchasePrice
    if (unit !== null) {
      value += unit * w.quantity
      valueKnown += w.quantity
    }
    const d = drinkability(w)
    if (d === 'pronto') ready += w.quantity
    else if (d === 'jovem') aging += w.quantity
    else if (d === 'passando') past += w.quantity
  }

  const desc = (a: [string, number], b: [string, number]) => b[1] - a[1]

  return {
    bottles,
    labels: inStock.length,
    value,
    valueKnown,
    ready,
    aging,
    past,
    byType: [...byType.entries()].sort(desc),
    byCountry: [...byCountry.entries()].sort(desc),
    topRated: [...inStock]
      .filter((w) => headlineRating(w))
      .sort(
        (a, b) =>
          normalizedScore(headlineRating(b)!) - normalizedScore(headlineRating(a)!)
      )
      .slice(0, 5)
  }
}

export interface ShelfOccupancy {
  cellar: Cellar
  shelves: { name: string; bottles: number; labels: number; capacity: number | null }[]
  /** Garrafas numa prateleira que não existe mais nesta adega — é problema. */
  unplaced: number
  /** Garrafas sem prateleira definida — não é problema, só falta indicar. */
  noShelf: number
}

/** Ocupação por prateleira, para o mapa da adega. */
export function occupancy(cellars: Cellar[], wines: Wine[]): ShelfOccupancy[] {
  const inStock = wines.filter((w) => w.status === 'estoque' && w.quantity > 0)
  return cellars.map((cellar) => {
    const mine = inStock.filter((w) => w.cellarId === cellar.id)
    const shelves = cellar.shelves.map((name) => {
      const here = mine.filter((w) => w.shelf === name)
      return {
        name,
        bottles: here.reduce((n, w) => n + w.quantity, 0),
        labels: here.length,
        capacity: cellar.capacityPerShelf
      }
    })
    const known = new Set(cellar.shelves)
    const soma = (lista: Wine[]) => lista.reduce((n, w) => n + w.quantity, 0)
    return {
      cellar,
      shelves,
      unplaced: soma(mine.filter((w) => w.shelf !== '' && !known.has(w.shelf))),
      noShelf: soma(mine.filter((w) => w.shelf === ''))
    }
  })
}
