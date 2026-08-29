import type { Wine } from '../types'

/**
 * Famílias de prato para o filtro do cardápio. Cada garrafa traz a
 * harmonização escrita com as palavras de quem cadastrou ("Cordeiro", "Bife de
 * chorizo", "Carne vermelha grelhada"), então o filtro casa por palavra-chave
 * em vez de exigir texto idêntico.
 */
export interface FoodFamily {
  id: string
  label: string
  keywords: string[]
}

export const FOOD_FAMILIES: FoodFamily[] = [
  {
    id: 'carne',
    label: 'Carne vermelha',
    keywords: [
      'carne vermelha', 'carne', 'bife', 'chorizo', 'picanha', 'costela',
      'cordeiro', 'boi', 'churrasco', 'ragu', 'bovin', 'assado'
    ]
  },
  {
    id: 'aves',
    label: 'Aves',
    keywords: ['ave', 'frango', 'pato', 'peru', 'galinha', 'codorna']
  },
  { id: 'caca', label: 'Caça', keywords: ['caca', 'javali', 'veado', 'cordeiro selvagem'] },
  { id: 'peixe', label: 'Peixe', keywords: ['peixe', 'salmao', 'bacalhau', 'atum', 'robalo'] },
  {
    id: 'frutos',
    label: 'Frutos do mar',
    keywords: [
      'frutos do mar', 'ostra', 'camarao', 'lagosta', 'marisco', 'polvo',
      'lula', 'vieira', 'siri'
    ]
  },
  {
    id: 'massa',
    label: 'Massa e risoto',
    keywords: ['massa', 'risoto', 'lasanha', 'pizza', 'nhoque', 'espaguete']
  },
  { id: 'queijo', label: 'Queijos', keywords: ['queijo'] },
  {
    id: 'aperitivo',
    label: 'Aperitivo',
    keywords: ['aperitivo', 'petisco', 'salgadinho', 'entrada', 'frit']
  },
  {
    id: 'vegetariano',
    label: 'Vegetariano',
    keywords: ['vegetarian', 'legume', 'salada', 'cogumelo', 'verdura']
  },
  {
    id: 'sobremesa',
    label: 'Sobremesa',
    keywords: ['sobremesa', 'doce', 'chocolate', 'torta', 'fruta em calda']
  }
]

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Tudo que o vinho diz sobre comida, num texto só. */
function foodText(wine: Wine): string {
  return norm(
    [wine.pairings.join(' '), wine.tastingNotes ?? '', wine.menuNote ?? ''].join(' ')
  )
}

export function matchesFamily(wine: Wine, familyId: string): boolean {
  const family = FOOD_FAMILIES.find((f) => f.id === familyId)
  if (!family) return true
  const text = foodText(wine)
  return family.keywords.some((k) => text.includes(norm(k)))
}

/** Busca livre: casa uva, região, harmonização, história e degustação. */
export function matchesText(wine: Wine, query: string): boolean {
  if (!query.trim()) return true
  const haystack = norm(
    [
      wine.name,
      wine.producer,
      wine.country,
      wine.region,
      wine.subregion ?? '',
      wine.grapes.join(' '),
      wine.pairings.join(' '),
      wine.tastingNotes ?? '',
      wine.story ?? '',
      wine.menuNote ?? '',
      wine.type
    ].join(' ')
  )
  return norm(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

/** Só mostra a família como opção se algum vinho da carta combinar com ela. */
export function availableFamilies(wines: Wine[]): FoodFamily[] {
  return FOOD_FAMILIES.filter((f) => wines.some((w) => matchesFamily(w, f.id)))
}
