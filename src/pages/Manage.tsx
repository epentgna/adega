import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { computeStats, occupancy } from '../lib/stats'
import { money } from '../lib/format'
import { Header } from '../components/Layout'
import {
  IconCellar,
  IconChevron,
  IconGear,
  IconGlass,
  IconPrint
} from '../components/icons'

export default function Manage() {
  const wines = useLiveQuery(() => db.wines.toArray(), [])
  const cellars = useLiveQuery(() => db.cellars.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const drunk = useLiveQuery(() => db.consumption.count(), [])

  const stats = useMemo(() => computeStats(wines ?? []), [wines])
  const maps = useMemo(
    () => occupancy(cellars ?? [], wines ?? []),
    [cellars, wines]
  )
  const currency = settings?.currency ?? 'BRL'

  const invested = useMemo(
    () =>
      (wines ?? [])
        .filter((w) => w.purchasePrice !== null)
        .reduce((sum, w) => sum + w.purchasePrice! * Math.max(w.quantity, 1), 0),
    [wines]
  )

  return (
    <>
      <Header eyebrow="Módulo de gerenciamento" title="Gestão" />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card label="Garrafas" value={String(stats.bottles)} />
        <Card label="Rótulos" value={String(stats.labels)} />
        <Card label="Investido" value={money(invested, currency)} />
        <Card label="Valor hoje" value={money(stats.value, currency)} />
      </div>

      {maps.map((m) => (
        <section key={m.cellar.id} className="card p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display text-lg font-semibold">{m.cellar.name}</div>
              {m.cellar.location && (
                <div className="text-[12px] text-muted">{m.cellar.location}</div>
              )}
            </div>
            <Link to="/gestao/adegas" className="font-mono text-[10px] text-wine tracking-[0.14em]">
              EDITAR
            </Link>
          </div>

          {m.shelves.length === 0 ? (
            <p className="text-[13px] text-muted">Sem prateleiras cadastradas.</p>
          ) : (
            <div className="grid gap-2">
              {m.shelves.map((s) => {
                const pct = s.capacity
                  ? Math.min(100, Math.round((s.bottles / s.capacity) * 100))
                  : null
                return (
                  <Link
                    key={s.name}
                    to={`/catalogo?q=${encodeURIComponent(s.name)}`}
                    className="flex items-center gap-3"
                  >
                    <span className="text-[13px] w-[108px] shrink-0 truncate">
                      {s.name}
                    </span>
                    <span className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-wine"
                        style={{
                          width: `${
                            pct ??
                            Math.min(100, (s.bottles / Math.max(1, stats.bottles)) * 100)
                          }%`
                        }}
                      />
                    </span>
                    <span className="font-mono text-[11px] text-muted tabular-nums shrink-0 w-[52px] text-right">
                      {s.bottles}
                      {s.capacity ? `/${s.capacity}` : ''}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}

          {m.unplaced > 0 && (
            <p className="text-[12px] text-danger mt-3">
              {m.unplaced} garrafa{m.unplaced > 1 ? 's' : ''} em prateleira que não
              existe mais nesta adega.
            </p>
          )}
        </section>
      ))}

      <div className="grid gap-2.5 mt-5">
        <NavRow
          to="/gestao/adegas"
          icon={<IconCellar width={20} height={20} />}
          title="Adegas e prateleiras"
          hint={`${cellars?.length ?? 0} adega${(cellars?.length ?? 0) === 1 ? '' : 's'}`}
        />
        <NavRow
          to="/gestao/consumo"
          icon={<IconGlass width={20} height={20} />}
          title="Histórico de consumo"
          hint={`${drunk ?? 0} garrafa${drunk === 1 ? '' : 's'} aberta${drunk === 1 ? '' : 's'}`}
        />
        <NavRow
          to="/gestao/etiquetas"
          icon={<IconPrint width={20} height={20} />}
          title="Etiquetas para imprimir"
          hint="Folha com o número de cada garrafa"
        />
        <NavRow
          to="/gestao/config"
          icon={<IconGear width={20} height={20} />}
          title="Configurações"
          hint="IA, numeração, backup"
        />
      </div>
    </>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="sys-label mb-1.5">{label}</div>
      <div className="font-display text-[24px] leading-none font-semibold tabular-nums">
        {value}
      </div>
    </div>
  )
}

function NavRow({
  to,
  icon,
  title,
  hint
}: {
  to: string
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <Link to={to} className="card p-4 flex items-center gap-3.5 active:bg-white/[0.03]">
      <span className="text-wine shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px]">{title}</span>
        <span className="block text-[12px] text-muted">{hint}</span>
      </span>
      <IconChevron className="text-muted shrink-0" />
    </Link>
  )
}
