/** Tipos de vinho usados em filtros, cardápio e ordenação. */
export type WineType =
  | 'Tinto'
  | 'Branco'
  | 'Rosé'
  | 'Espumante'
  | 'Sobremesa'
  | 'Fortificado'
  | 'Laranja'
  /** A adega guarda mais que vinho: limoncello, grappa, licor de ervas. */
  | 'Licor'

export const WINE_TYPES: WineType[] = [
  'Tinto',
  'Branco',
  'Rosé',
  'Espumante',
  'Sobremesa',
  'Fortificado',
  'Laranja',
  'Licor'
]

/** Ordem em que os tipos aparecem no cardápio. */
export const MENU_TYPE_ORDER: WineType[] = [
  'Espumante',
  'Branco',
  'Laranja',
  'Rosé',
  'Tinto',
  'Sobremesa',
  'Fortificado',
  // Licor fecha a carta, como digestivo.
  'Licor'
]

export type WineStatus = 'estoque' | 'consumido' | 'presenteado'

export type BodyLevel = 'Leve' | 'Médio' | 'Encorpado'

/** Nota de uma fonte externa (Vivino, Parker, Wine Spectator...). */
export interface Rating {
  /** Nome da fonte, ex.: "Vivino", "Robert Parker", "Wine Spectator". */
  source: string
  /** Nota na escala da fonte. */
  score: number
  /** Escala máxima (5 para Vivino, 100 para Parker/WS). */
  scale: number
  /** Número de avaliações, quando a fonte informa (Vivino). */
  votes?: number | null
  /** Safra à qual a nota se refere (fontes avaliam por safra). */
  vintage?: number | null
  /** Origem do dado: pesquisado pela IA, digitado por você, ou estimado. */
  origin?: 'ia' | 'manual'
  /** URL de referência, quando houver. */
  url?: string | null
}

/** Metadados do preenchimento automático por IA. */
export interface Enrichment {
  status: 'pendente' | 'ok' | 'erro'
  model?: string
  at?: number
  /** 0–1: quanta confiança a IA declarou na identificação do rótulo. */
  confidence?: number | null
  /** Domínios consultados na busca web. */
  sources?: string[]
  /** O que a IA não conseguiu determinar. */
  notes?: string
  error?: string
}

export interface Wine {
  id?: number
  /** Numeração única, ex.: "AD-0042". Índice único no banco. */
  code: string
  /** Parte numérica do código, usada para ordenar e gerar o próximo. */
  seq: number

  name: string
  producer: string
  country: string
  region: string
  subregion?: string
  /** null = sem safra (NV). */
  vintage: number | null
  type: WineType
  grapes: string[]
  abv: number | null
  volumeMl: number

  // Localização física
  cellarId: number | null
  shelf: string
  position?: string

  // Estoque
  quantity: number
  status: WineStatus

  // Avaliação
  ratings: Rating[]
  /** Sua nota pessoal, 0–5 (meio ponto permitido). */
  myRating: number | null
  myNotes?: string
  favorite: boolean

  // Ficha técnica
  /** História do rótulo, do produtor ou do vinhedo. Aparece no cardápio. */
  story?: string
  tastingNotes?: string
  body?: BodyLevel | null
  pairings: string[]
  /** Janela de guarda sugerida. */
  drinkFrom: number | null
  drinkTo: number | null
  servingTempC?: string
  decantMin?: number | null

  // Comercial
  purchasePrice: number | null
  purchasedAt: number | null
  purchasedFrom?: string
  /** Preço de mercado estimado, para calcular o valor da adega. */
  marketPrice: number | null

  // Cardápio
  inMenu: boolean
  menuNote?: string
  menuPrice: number | null

  // Fotos (ids na tabela `photos`); a primeira é a capa.
  photoIds: number[]

  enrichment?: Enrichment
  createdAt: number
  updatedAt: number
}

export interface Photo {
  id?: number
  wineId: number | null
  /**
   * Ausente quando a foto veio da nuvem e ainda não foi baixada: o arquivo
   * só desce quando a foto aparece na tela.
   */
  blob?: Blob
  /** Caminho no Supabase Storage, gravado depois do upload. */
  path?: string
  kind: 'rotulo' | 'contra' | 'garrafa' | 'outro'
  width: number
  height: number
  createdAt: number
}

export interface Cellar {
  id?: number
  name: string
  location?: string
  /** Prateleiras nomeadas, na ordem de cima para baixo. */
  shelves: string[]
  /** Capacidade por prateleira (garrafas), para o mapa de ocupação. */
  capacityPerShelf: number | null
  notes?: string
}

export interface ConsumptionLog {
  id?: number
  wineId: number
  /** Cópia do código: o registro sobrevive à exclusão do vinho. */
  wineCode: string
  wineName: string
  drankAt: number
  occasion?: string
  withWhom?: string
  rating: number | null
  notes?: string
}

export interface Settings {
  id?: number
  ownerName: string
  currency: string
  /** Prefixo da numeração única, ex.: "AD" gera AD-0001. */
  codePrefix: string
  /** Quantos dígitos no código. */
  codeDigits: number
  /** Chave da API da Anthropic (fica só neste dispositivo). */
  apiKey: string
  model: string
  /** Deixa a IA pesquisar na web (mais caro, dados melhores). */
  webSearch: boolean
  menuTitle: string
  menuSubtitle: string
  /** Mostrar preços no cardápio. */
  menuShowPrices: boolean
  /** Buscar sozinho as garrafas catalogadas por conversa. */
  autoRepoImport: boolean
  onboarded: boolean
}

export const CURRENCIES = ['BRL', 'USD', 'EUR', 'ARS', 'CLP'] as const

/** Modelos oferecidos na tela de configurações. */
export const MODELS: { id: string; label: string; hint: string }[] = [
  {
    id: 'claude-opus-5',
    label: 'Claude Opus 5',
    hint: 'Melhor identificação de rótulos difíceis. Padrão.'
  },
  {
    id: 'claude-sonnet-5',
    label: 'Claude Sonnet 5',
    hint: 'Bem mais barato, ótimo para rótulos legíveis.'
  },
  {
    id: 'claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    hint: 'O mais barato. Sem busca na web.'
  }
]

/** Modelos que suportam a ferramenta de busca web do servidor. */
export const WEB_SEARCH_MODELS = new Set(['claude-opus-5', 'claude-sonnet-5'])
