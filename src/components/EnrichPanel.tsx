import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import { enrichWine, type WineDraft } from '../lib/enrich'
import { applyDraft } from '../lib/wine'
import type { Settings, Wine } from '../types'
import { WEB_SEARCH_MODELS } from '../types'
import { IconCheck, IconSparkle } from './icons'

/**
 * Botão de preenchimento automático: manda as fotos do rótulo para o Claude,
 * que lê o rótulo, pesquisa na web e devolve a ficha pronta.
 */
export function EnrichPanel({
  wine,
  onApply,
  settings
}: {
  wine: Wine
  onApply: (next: Wine) => void
  settings: Settings | undefined
}) {
  const [stage, setStage] = useState('')
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<WineDraft | null>(null)
  const [hint, setHint] = useState('')

  const hasKey = Boolean(settings?.apiKey)
  const busy = stage !== ''
  const canRun = wine.photoIds.length > 0 || hint.trim() !== '' || wine.name.trim() !== ''

  const run = async () => {
    if (!settings) return
    setError('')
    setDraft(null)
    setStage('Preparando…')
    try {
      const photos = await db.photos.bulkGet(wine.photoIds.slice(0, 3))
      const images = photos.filter(Boolean).map((p) => p!.blob)
      const result = await enrichWine({
        images,
        hint: hint.trim() || undefined,
        known: {
          name: wine.name || undefined,
          producer: wine.producer || undefined,
          vintage: wine.vintage
        },
        apiKey: settings.apiKey,
        model: settings.model,
        webSearch: settings.webSearch,
        onProgress: setStage
      })
      setDraft(result)
      onApply(applyDraft(wine, result))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setStage('')
    }
  }

  if (!hasKey) {
    return (
      <div className="card p-4 border-dashed">
        <div className="flex items-start gap-3">
          <IconSparkle width={20} height={20} className="text-muted shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[15px] mb-1">Preenchimento automático desligado</div>
            <p className="text-[13px] text-muted leading-relaxed">
              Com uma chave da API da Anthropic, a foto do rótulo vira ficha
              completa — uvas, região, guarda e as notas do Vivino e dos críticos.{' '}
              <Link to="/gestao/config" className="text-wine">
                Configurar agora
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <input
        className="field mb-3"
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder="Alguma pista? (opcional) — ex.: comprei em Mendoza"
        aria-label="Pista para a IA"
      />

      <button className="btn-gold" onClick={run} disabled={busy || !canRun}>
        <IconSparkle width={19} height={19} />
        {busy ? stage : draft ? 'Pesquisar de novo' : 'Preencher com IA'}
      </button>

      {busy && (
        <div className="mt-3 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-gold animate-pulse" />
        </div>
      )}

      {!busy && !canRun && (
        <p className="text-[12px] text-muted mt-2.5">
          Tire uma foto do rótulo (ou escreva o nome do vinho) para eu pesquisar.
        </p>
      )}

      {error && (
        <p className="text-danger text-[13px] mt-3 leading-relaxed">{error}</p>
      )}

      {draft && !error && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-ok text-[13px] mb-2">
            <IconCheck width={16} height={16} />
            Ficha preenchida
            {draft.confidence !== null && (
              <span className="text-muted font-mono text-[11px]">
                confiança {Math.round(draft.confidence * 100)}%
              </span>
            )}
          </div>
          {draft.ratings.length > 0 && (
            <p className="text-[12px] text-muted mb-1.5">
              Notas encontradas:{' '}
              {draft.ratings.map((r) => `${r.source} ${r.score}/${r.scale}`).join(' · ')}
            </p>
          )}
          {draft.sources.length > 0 && (
            <p className="text-[12px] text-muted mb-1.5">
              Fontes: {draft.sources.slice(0, 5).join(', ')}
            </p>
          )}
          {draft.notes && (
            <p className="text-[12px] text-muted leading-relaxed">
              <span className="text-gold">Confira: </span>
              {draft.notes}
            </p>
          )}
          <p className="text-[11px] text-muted/70 mt-2.5 leading-relaxed">
            Revise antes de salvar — nota e preço pesquisados podem estar
            desatualizados ou ser de outra safra.
          </p>
        </div>
      )}

      {settings && !WEB_SEARCH_MODELS.has(settings.model) && (
        <p className="text-[11px] text-muted mt-3">
          O modelo escolhido não faz busca na web: as notas virão só do que ele já
          sabe. Troque em Configurações para pesquisar de verdade.
        </p>
      )}
    </div>
  )
}
