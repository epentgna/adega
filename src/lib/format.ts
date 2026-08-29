import type { Rating, Wine } from '../types'

export function money(value: number | null | undefined, currency = 'BRL'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

export function dateBR(ts: number | null | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/** "2019" ou "s/ safra". */
export function vintageLabel(v: number | null): string {
  return v ? String(v) : 'S/ safra'
}

/** Aceita vírgula como separador decimal (2,5 → 2.5). */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Converte qualquer nota para a escala 0–100, para comparar fontes. */
export function normalizedScore(r: Rating): number {
  if (!r.scale) return 0
  return (r.score / r.scale) * 100
}

/** A nota mais "forte" do vinho: prioriza Vivino, senão a maior normalizada. */
export function headlineRating(w: Wine): Rating | null {
  if (!w.ratings?.length) return null
  const vivino = w.ratings.find((r) => /vivino/i.test(r.source))
  if (vivino) return vivino
  return [...w.ratings].sort((a, b) => normalizedScore(b) - normalizedScore(a))[0]
}

export function ratingLabel(r: Rating): string {
  const score =
    r.scale === 5 ? r.score.toFixed(1).replace('.', ',') : String(Math.round(r.score))
  return `${score}${r.scale === 5 ? '' : `/${r.scale}`}`
}

/** Só o número, para a carta: "4,7" ou "95". A escala fica implícita. */
export function ratingShort(r: Rating): string {
  return r.scale === 5
    ? r.score.toFixed(1).replace('.', ',')
    : String(Math.round(r.score))
}

export function grapesLabel(g: string[] | undefined): string {
  if (!g || g.length === 0) return '—'
  return g.join(' · ')
}

export function originLabel(w: Wine): string {
  return [w.region, w.country].filter(Boolean).join(', ') || '—'
}

/** Onde a garrafa está guardada. */
export function locationLabel(
  w: Wine,
  cellarName: string | undefined
): string {
  const parts = [cellarName, w.shelf, w.position].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Sem local'
}

export type Drinkability = 'jovem' | 'pronto' | 'passando' | 'desconhecido'

/** Onde a garrafa está na janela de guarda, comparando com o ano atual. */
export function drinkability(w: Wine): Drinkability {
  const year = new Date().getFullYear()
  if (w.drinkFrom && year < w.drinkFrom) return 'jovem'
  if (w.drinkTo && year > w.drinkTo) return 'passando'
  if (w.drinkFrom || w.drinkTo) return 'pronto'
  return 'desconhecido'
}

export const DRINKABILITY_LABEL: Record<Drinkability, string> = {
  jovem: 'Guardar',
  pronto: 'Pronto para beber',
  passando: 'Beber já',
  desconhecido: 'Sem janela'
}

/**
 * Sigla da fonte, para a carta não virar um paredão de texto.
 * As siglas conhecidas são fixas; o resto cai nas iniciais das palavras.
 */
const SIGLAS: Record<string, string> = {
  vivino: 'V',
  'robert parker': 'RP',
  'wine advocate': 'WA',
  'wine spectator': 'WS',
  'james suckling': 'JS',
  'wine enthusiast': 'WE',
  decanter: 'DC',
  'jeb dunnuck': 'JD',
  vinous: 'VN',
  'antonio galloni': 'AG',
  'tim atkin': 'TA',
  descorchados: 'DS',
  'guia penin': 'GP',
  'revista adega': 'RA',
  'wine-searcher': 'W-S',
  'gilbert & gaillard': 'GG',
  'falstaff': 'FS',
  // Sem estas, "Wine & Spirits" e "Wine Spectator" caem os dois em "WS".
  'wine & spirits': 'W&S',
  cellartracker: 'CT',
  'john gilman': 'JG',
  'jancis robinson': 'JR'
}

export function ratingInitials(source: string): string {
  // "Wine-Searcher (média de críticos)" casa por "wine-searcher".
  const base = source
    .split('(')[0]
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (SIGLAS[base]) return SIGLAS[base]
  // Descarta "&", "de", "da" e afins: senão "Wine & Spirits" vira "W&".
  const palavras = base
    .split(/[\s-]+/)
    .filter((p) => /^[a-z0-9]/.test(p) && !['de', 'da', 'do', 'the'].includes(p))
  return palavras
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Vivino primeiro — é a que se olha antes —, depois as maiores notas. */
export function sortedRatings(w: Wine): Rating[] {
  return [...(w.ratings ?? [])].sort((a, b) => {
    const av = /vivino/i.test(a.source) ? 1 : 0
    const bv = /vivino/i.test(b.source) ? 1 : 0
    if (av !== bv) return bv - av
    return normalizedScore(b) - normalizedScore(a)
  })
}
