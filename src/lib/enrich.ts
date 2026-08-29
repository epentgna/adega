import Anthropic from '@anthropic-ai/sdk'
import { WEB_SEARCH_MODELS, type Rating, type WineType } from '../types'
import { blobToBase64, mediaType } from './photos'

/** O que a IA devolve; tudo opcional porque o rótulo pode não dizer tudo. */
export interface WineDraft {
  confidence: number | null
  name: string
  producer: string
  country: string
  region: string
  subregion: string
  vintage: number | null
  type: WineType | ''
  grapes: string[]
  abv: number | null
  volumeMl: number | null
  story: string
  tastingNotes: string
  body: 'Leve' | 'Médio' | 'Encorpado' | null
  pairings: string[]
  drinkFrom: number | null
  drinkTo: number | null
  servingTempC: string
  decantMin: number | null
  ratings: Rating[]
  marketPrice: number | null
  menuNote: string
  sources: string[]
  notes: string
  model: string
}

export interface EnrichInput {
  /** Fotos do rótulo (frente e, se houver, contra-rótulo). */
  images: Blob[]
  /** Texto que você digitou para ajudar ("Malbec argentino 2019"). */
  hint?: string
  /** Dados que você já preencheu, para a IA completar em vez de adivinhar. */
  known?: { name?: string; producer?: string; vintage?: number | null }
  apiKey: string
  model: string
  webSearch: boolean
  /** Progresso para a interface ("Lendo o rótulo…", "Pesquisando…"). */
  onProgress?: (stage: string) => void
}

const SYSTEM = `Você é um sommelier e pesquisador de vinhos. A partir da foto de um rótulo
(e de qualquer texto de apoio), identifique o vinho e monte a ficha completa em português do Brasil.

Regras:
- Leia o rótulo com cuidado: produtor, nome do vinho, safra, denominação de origem, teor alcoólico e volume costumam estar impressos. O que está impresso vale mais do que sua memória.
- Use a busca na web para confirmar a identificação e levantar notas de avaliação, uvas, janela de guarda e faixa de preço.
- Notas do Vivino usam escala 5; Robert Parker, Wine Spectator, James Suckling e Decanter usam escala 100. Informe a escala junto com a nota.
- Só registre uma avaliação se você realmente encontrou o número. NUNCA invente notas, número de votos ou preços. Campo sem informação confiável fica nulo/vazio.
- Prefira a nota da safra específica da garrafa. Se só encontrar a nota geral do rótulo (todas as safras), deixe o campo safra da avaliação nulo.
- "descricao_cardapio" é uma frase curta e elegante (máx. 160 caracteres) para uma carta de vinhos, sem repetir o nome do produtor.
- Em "observacoes", liste o que você não conseguiu determinar e o que ficou incerto.
- Termine SEMPRE chamando a ferramenta registrar_vinho, uma única vez.`

const WINE_TOOL: Anthropic.Tool = {
  name: 'registrar_vinho',
  description:
    'Registra a ficha do vinho identificado. Chame exatamente uma vez, ao final.',
  input_schema: {
    type: 'object',
    properties: {
      confianca: {
        type: ['number', 'null'],
        description:
          'De 0 a 1: quanta certeza você tem de que identificou este rótulo específico.'
      },
      nome: { type: 'string', description: 'Nome do vinho, sem o produtor.' },
      produtor: { type: 'string' },
      pais: { type: 'string' },
      regiao: { type: 'string', description: 'Região ou denominação de origem.' },
      sub_regiao: { type: 'string' },
      safra: { type: ['integer', 'null'], description: 'Ano. Nulo se sem safra.' },
      tipo: {
        type: 'string',
        enum: [
          'Tinto',
          'Branco',
          'Rosé',
          'Espumante',
          'Sobremesa',
          'Fortificado',
          'Laranja',
          'Licor'
        ]
      },
      uvas: { type: 'array', items: { type: 'string' } },
      teor_alcoolico: { type: ['number', 'null'], description: 'Em % vol.' },
      volume_ml: { type: ['integer', 'null'], description: '750 na maioria.' },
      historia: {
        type: 'string',
        description:
          'História do rótulo, do produtor ou do vinhedo, em 2 a 4 frases. Só o que for verificável.'
      },
      notas_degustacao: { type: 'string' },
      corpo: { type: ['string', 'null'], enum: ['Leve', 'Médio', 'Encorpado', null] },
      harmonizacoes: { type: 'array', items: { type: 'string' } },
      guarda_de: { type: ['integer', 'null'], description: 'Ano de início da janela.' },
      guarda_ate: { type: ['integer', 'null'], description: 'Ano final da janela.' },
      temperatura_servico: { type: 'string', description: 'Ex.: "16–18 °C".' },
      decantar_min: { type: ['integer', 'null'] },
      avaliacoes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fonte: { type: 'string', description: 'Ex.: Vivino, Robert Parker.' },
            nota: { type: 'number' },
            escala: { type: 'number', description: '5 para Vivino, 100 para críticos.' },
            votos: { type: ['integer', 'null'] },
            safra: { type: ['integer', 'null'] },
            url: { type: ['string', 'null'] }
          },
          required: ['fonte', 'nota', 'escala']
        }
      },
      preco_mercado: {
        type: ['number', 'null'],
        description: 'Preço típico de varejo no Brasil, em reais.'
      },
      descricao_cardapio: { type: 'string' },
      fontes: {
        type: 'array',
        items: { type: 'string' },
        description: 'Domínios consultados, ex.: vivino.com.'
      },
      observacoes: { type: 'string' }
    },
    required: ['nome', 'produtor', 'pais', 'tipo']
  }
}

function supportsAdaptiveThinking(model: string): boolean {
  return model === 'claude-opus-5' || model === 'claude-sonnet-5'
}

/**
 * A busca na web é uma ferramenta de servidor: roda na infraestrutura da
 * Anthropic e o resultado volta na mesma resposta, sem loop no cliente.
 */
function webSearchTool(): Anthropic.Tool {
  return {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: 6
  } as unknown as Anthropic.Tool
}

let fallbacksSupported = true

function createClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    // Chamada direta do navegador: a chave é do próprio dono do aparelho e
    // fica só no IndexedDB dele.
    dangerouslyAllowBrowser: true,
    maxRetries: 2
  })
}

/** Uma rodada de request, com ou sem os fallbacks de recusa do Opus 5. */
async function runOnce(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  useFallbacks: boolean
): Promise<Anthropic.Message> {
  if (useFallbacks) {
    const stream = client.beta.messages.stream({
      ...params,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default'
    } as never)
    return (await stream.finalMessage()) as unknown as Anthropic.Message
  }
  const stream = client.messages.stream(params)
  return stream.finalMessage()
}

async function callClaude(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  wantsFallbacks: boolean
): Promise<Anthropic.Message> {
  const useFallbacks = wantsFallbacks && fallbacksSupported
  try {
    return await runOnce(client, params, useFallbacks)
  } catch (err) {
    // Beta indisponível nesta conta/SDK: repete sem os fallbacks e não
    // tenta de novo nas próximas fotos.
    if (useFallbacks && err instanceof Anthropic.BadRequestError) {
      fallbacksSupported = false
      return runOnce(client, params, false)
    }
    throw err
  }
}

function asText(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError)
    return 'Chave da API inválida. Confira em Gestão › Configurações.'
  if (err instanceof Anthropic.RateLimitError)
    return 'Limite de requisições atingido. Espere alguns segundos e tente de novo.'
  if (err instanceof Anthropic.APIConnectionError)
    return 'Sem conexão com a API. Verifique a internet.'
  if (err instanceof Anthropic.APIError) return `Erro ${err.status}: ${err.message}`
  return err instanceof Error ? err.message : String(err)
}

export class EnrichError extends Error {}

/** Identifica o vinho na foto e devolve a ficha preenchida. */
export async function enrichWine(input: EnrichInput): Promise<WineDraft> {
  const { apiKey, model, images, hint, known, onProgress } = input
  if (!apiKey) throw new EnrichError('Nenhuma chave da API configurada.')
  if (images.length === 0 && !hint && !known?.name)
    throw new EnrichError('Envie ao menos uma foto ou uma descrição do vinho.')

  const client = createClient(apiKey)
  const useWebSearch = input.webSearch && WEB_SEARCH_MODELS.has(model)

  onProgress?.('Preparando as fotos…')
  const content: Anthropic.ContentBlockParam[] = []
  for (const blob of images.slice(0, 3)) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType(blob),
        data: await blobToBase64(blob)
      }
    })
  }

  const pistas: string[] = []
  if (known?.producer) pistas.push(`Produtor: ${known.producer}`)
  if (known?.name) pistas.push(`Nome: ${known.name}`)
  if (known?.vintage) pistas.push(`Safra: ${known.vintage}`)
  if (hint) pistas.push(`Observação minha: ${hint}`)

  content.push({
    type: 'text',
    text:
      (images.length
        ? 'Identifique o vinho da(s) foto(s) e monte a ficha completa.'
        : 'Monte a ficha completa do vinho descrito abaixo.') +
      (pistas.length ? `\n\nO que já sei:\n${pistas.join('\n')}` : '') +
      (useWebSearch
        ? '\n\nPesquise na web para confirmar e buscar as notas de avaliação.'
        : '\n\nSem acesso à web: preencha só o que o rótulo mostra e o que você sabe com segurança, e diga em observacoes o que ficou sem confirmação.')
  })

  const tools: Anthropic.Tool[] = useWebSearch
    ? [webSearchTool(), WINE_TOOL]
    : [WINE_TOOL]

  const params = {
    model,
    max_tokens: 8000,
    system: SYSTEM,
    tools,
    messages: [{ role: 'user', content }] as Anthropic.MessageParam[],
    ...(supportsAdaptiveThinking(model)
      ? {
          thinking: { type: 'adaptive' as const },
          output_config: { effort: 'medium' as const }
        }
      : {})
  } as unknown as Anthropic.MessageCreateParamsNonStreaming

  onProgress?.(useWebSearch ? 'Lendo o rótulo e pesquisando…' : 'Lendo o rótulo…')

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content }]
  let response: Anthropic.Message
  let guard = 0

  try {
    // `pause_turn` acontece quando a busca no servidor demora; basta devolver
    // o que veio e mandar continuar.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      response = await callClaude(
        client,
        { ...params, messages },
        model === 'claude-opus-5'
      )
      if (response.stop_reason !== 'pause_turn' || guard++ >= 3) break
      messages.push({ role: 'assistant', content: response.content })
      onProgress?.('Continuando a pesquisa…')
    }
  } catch (err) {
    throw new EnrichError(asText(err))
  }

  if (response.stop_reason === 'refusal')
    throw new EnrichError(
      'O modelo recusou responder sobre esta imagem. Preencha manualmente.'
    )

  const call = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === 'tool_use' && b.name === 'registrar_vinho'
  )

  if (!call) {
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim()
    throw new EnrichError(
      text
        ? `Não consegui montar a ficha. O modelo respondeu: "${text.slice(0, 240)}"`
        : 'Não consegui identificar o rótulo. Tente uma foto mais nítida ou preencha manualmente.'
    )
  }

  onProgress?.('Montando a ficha…')
  return toDraft(call.input as Record<string, unknown>, response.model || model)
}

// --- Normalização -----------------------------------------------------------
// A saída da ferramenta é validada contra o esquema, mas números vindos como
// string e campos ausentes ainda aparecem. Tudo passa por aqui.

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').replace(/[^\d.-]/g, ''))
    if (Number.isFinite(n)) return n
  }
  return null
}

function int(v: unknown): number | null {
  const n = num(v)
  return n === null ? null : Math.round(n)
}

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(str).filter(Boolean)
}

const TYPES = new Set<string>([
  'Tinto',
  'Branco',
  'Rosé',
  'Espumante',
  'Sobremesa',
  'Fortificado',
  'Laranja',
  'Licor'
])

function toRatings(v: unknown): Rating[] {
  if (!Array.isArray(v)) return []
  const out: Rating[] = []
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const score = num(r.nota)
    const scale = num(r.escala)
    const source = str(r.fonte)
    if (!source || score === null || !scale) continue
    // Uma "4.2" numa escala 100 é erro de escala, não uma nota real.
    if (score < 0 || score > scale) continue
    out.push({
      source,
      score,
      scale,
      votes: int(r.votos),
      vintage: int(r.safra),
      url: str(r.url) || null,
      origin: 'ia'
    })
  }
  return out
}

function toDraft(input: Record<string, unknown>, model: string): WineDraft {
  const tipo = str(input.tipo)
  const corpo = str(input.corpo)
  const year = new Date().getFullYear()
  const safra = int(input.safra)

  return {
    confidence: num(input.confianca),
    name: str(input.nome),
    producer: str(input.produtor),
    country: str(input.pais),
    region: str(input.regiao),
    subregion: str(input.sub_regiao),
    // Um rótulo nunca é de daqui a 2 anos; se veio assim, é leitura errada.
    vintage: safra && safra > 1800 && safra <= year + 1 ? safra : null,
    type: TYPES.has(tipo) ? (tipo as WineType) : '',
    grapes: strArray(input.uvas),
    abv: num(input.teor_alcoolico),
    volumeMl: int(input.volume_ml),
    story: str(input.historia),
    tastingNotes: str(input.notas_degustacao),
    body:
      corpo === 'Leve' || corpo === 'Médio' || corpo === 'Encorpado'
        ? corpo
        : null,
    pairings: strArray(input.harmonizacoes),
    drinkFrom: int(input.guarda_de),
    drinkTo: int(input.guarda_ate),
    servingTempC: str(input.temperatura_servico),
    decantMin: int(input.decantar_min),
    ratings: toRatings(input.avaliacoes),
    marketPrice: num(input.preco_mercado),
    menuNote: str(input.descricao_cardapio),
    sources: strArray(input.fontes),
    notes: str(input.observacoes),
    model
  }
}

/** Testa a chave com o request mais barato possível. */
export async function testApiKey(apiKey: string, model: string): Promise<void> {
  const client = createClient(apiKey)
  try {
    await client.messages.create({
      model,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Responda apenas: ok' }]
    })
  } catch (err) {
    throw new EnrichError(asText(err))
  }
}
