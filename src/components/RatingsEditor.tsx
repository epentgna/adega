import { useState } from 'react'
import type { Rating } from '../types'
import { parseNumber, ratingLabel } from '../lib/format'
import { IconPlus, IconSparkle, IconX } from './icons'

const SOURCES = [
  { name: 'Vivino', scale: 5 },
  { name: 'Robert Parker', scale: 100 },
  { name: 'Wine Spectator', scale: 100 },
  { name: 'James Suckling', scale: 100 },
  { name: 'Decanter', scale: 100 }
]

/** Lista de notas externas, com origem visível (IA x digitada por você). */
export function RatingsEditor({
  ratings,
  onChange
}: {
  ratings: Rating[]
  onChange: (r: Rating[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [source, setSource] = useState(SOURCES[0].name)
  const [scale, setScale] = useState(5)
  const [score, setScore] = useState('')

  const add = () => {
    const value = parseNumber(score)
    if (value === null || value < 0 || value > scale) return
    onChange([...ratings, { source, score: value, scale, origin: 'manual' }])
    setScore('')
    setAdding(false)
  }

  return (
    <div>
      {ratings.length === 0 && !adding && (
        <p className="text-[13px] text-muted mb-3">
          Nenhuma nota ainda. A IA busca Vivino e críticos ao identificar o rótulo.
        </p>
      )}

      <div className="grid gap-2 mb-3">
        {ratings.map((r, i) => (
          <div
            key={`${r.source}-${i}`}
            className="flex items-center gap-3 rounded-xl border border-border
              bg-white/[0.02] px-3.5 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] truncate flex items-center gap-1.5">
                {r.source}
                {r.origin === 'ia' && (
                  <IconSparkle width={12} height={12} className="text-wine shrink-0" />
                )}
              </div>
              <div className="font-mono text-[10px] text-muted">
                {r.votes ? `${r.votes.toLocaleString('pt-BR')} avaliações` : ''}
                {r.votes && r.vintage ? ' · ' : ''}
                {r.vintage ? `safra ${r.vintage}` : ''}
                {!r.votes && !r.vintage
                  ? r.origin === 'ia'
                    ? 'pesquisada'
                    : 'sua'
                  : ''}
              </div>
            </div>
            <span className="font-mono text-gold text-[15px] tabular-nums shrink-0">
              {ratingLabel(r)}
            </span>
            <button
              type="button"
              aria-label={`Remover nota ${r.source}`}
              onClick={() => onChange(ratings.filter((_, j) => j !== i))}
              className="text-muted shrink-0"
            >
              <IconX width={16} height={16} />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div className="rounded-xl border border-border bg-white/[0.02] p-3.5">
          <div className="flex flex-wrap gap-2 mb-3">
            {SOURCES.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => {
                  setSource(s.name)
                  setScale(s.scale)
                }}
                className={`chip ${source === s.name ? 'chip-active' : ''}`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="field flex items-center gap-2 flex-1">
              <input
                className="flex-1 min-w-0"
                inputMode="decimal"
                autoFocus
                value={score}
                placeholder={scale === 5 ? '4,2' : '92'}
                onChange={(e) => setScore(e.target.value)}
              />
              <span className="text-muted text-sm shrink-0">/{scale}</span>
            </div>
            <button type="button" className="btn-ghost px-5" onClick={add}>
              Ok
            </button>
            <button
              type="button"
              className="btn-ghost px-3"
              onClick={() => setAdding(false)}
              aria-label="Cancelar"
            >
              <IconX />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => setAdding(true)}
        >
          <IconPlus width={17} height={17} />
          Adicionar nota
        </button>
      )}
    </div>
  )
}
