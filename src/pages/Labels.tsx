import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { vintageLabel } from '../lib/format'
import { BackBar, Empty, Sheet } from '../components/Layout'
import { IconPrint } from '../components/icons'

/**
 * Folha de etiquetas: um adesivo por garrafa com o número, o nome e a safra.
 * Você cola no gargalo e acha a garrafa pelo número em vez de virar o rótulo.
 */
export default function Labels() {
  const wines = useLiveQuery(() => db.wines.toArray(), [])
  const cellars = useLiveQuery(() => db.cellars.toArray(), [])
  const [cellarId, setCellarId] = useState<number | 'todas'>('todas')
  const [onlyMissing, setOnlyMissing] = useState(false)

  const list = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    return (wines ?? [])
      .filter((w) => w.status === 'estoque')
      .filter((w) => cellarId === 'todas' || w.cellarId === cellarId)
      .filter((w) => !onlyMissing || w.createdAt >= since)
      .sort((a, b) => a.seq - b.seq)
  }, [wines, cellarId, onlyMissing])

  return (
    <Sheet>
      <BackBar
        title="Etiquetas"
        to="/gestao"
        right={
          <button className="btn-ghost px-4" onClick={() => window.print()}>
            <IconPrint />
            Imprimir
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4 no-print">
        <button
          onClick={() => setCellarId('todas')}
          className={`chip ${cellarId === 'todas' ? 'chip-active' : ''}`}
        >
          Todas
        </button>
        {cellars?.map((c) => (
          <button
            key={c.id}
            onClick={() => setCellarId(c.id!)}
            className={`chip ${cellarId === c.id ? 'chip-active' : ''}`}
          >
            {c.name}
          </button>
        ))}
        <button
          onClick={() => setOnlyMissing(!onlyMissing)}
          className={`chip ${onlyMissing ? 'chip-active' : ''}`}
        >
          Só os da semana
        </button>
      </div>

      <p className="text-[12px] text-muted mb-5 no-print leading-relaxed">
        {list.length} etiqueta{list.length === 1 ? '' : 's'}. Imprima em papel adesivo
        A4 e recorte — ou imprima em papel comum e prenda no gargalo com fita.
      </p>

      {list.length === 0 ? (
        <Empty title="Nada para imprimir" hint="Nenhum vinho com esse filtro." />
      ) : (
        <div className="print-sheet grid grid-cols-2 gap-2">
          {list.map((w) => (
            <div
              key={w.id}
              className="border border-border rounded-lg px-3 py-2.5 break-inside-avoid"
            >
              <div className="code-tag text-[13px]">{w.code}</div>
              <div className="font-display text-[15px] leading-tight mt-0.5 line-clamp-2">
                {w.name || w.producer}
              </div>
              <div className="text-[11px] text-muted mt-0.5 truncate">
                {[w.producer, vintageLabel(w.vintage)].filter(Boolean).join(' · ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
