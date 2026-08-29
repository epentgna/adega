import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  activeFilterCount,
  applyFilters,
  EMPTY_FILTERS,
  facets,
  SORT_LABEL,
  sortWines,
  type Filters,
  type SortKey
} from '../lib/filters'
import { WINE_TYPES } from '../types'
import { Empty, Header, IconButton } from '../components/Layout'
import { BottomSheet } from '../components/BottomSheet'
import { WineCard } from '../components/WineCard'
import { Toggle } from '../components/Field'
import { IconSearch, IconSliders, IconX } from '../components/icons'

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const wines = useLiveQuery(() => db.wines.toArray(), [])
  const cellars = useLiveQuery(() => db.cellars.toArray(), [])

  const [filters, setFilters] = useState<Filters>(() => ({
    ...EMPTY_FILTERS,
    query: params.get('q') ?? '',
    onlyReady: params.get('pronto') === '1'
  }))
  const [sort, setSort] = useState<SortKey>('recent')
  const [showFilters, setShowFilters] = useState(false)

  // Mantém a busca na URL: dá para voltar da ficha sem perder o filtro.
  useEffect(() => {
    const next = new URLSearchParams()
    if (filters.query) next.set('q', filters.query)
    if (filters.onlyReady) next.set('pronto', '1')
    setParams(next, { replace: true })
  }, [filters.query, filters.onlyReady, setParams])

  const all = wines ?? []
  const f = useMemo(() => facets(all), [all])
  const result = useMemo(
    () => sortWines(applyFilters(all, filters), sort),
    [all, filters, sort]
  )

  const bottles = result.reduce((n, w) => n + w.quantity, 0)
  const count = activeFilterCount(filters)
  const patch = (p: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...p }))

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  const shelves = useMemo(() => {
    const cellar =
      filters.cellarId === 'todas'
        ? null
        : cellars?.find((c) => c.id === filters.cellarId)
    return cellar?.shelves ?? [...new Set(all.map((w) => w.shelf).filter(Boolean))]
  }, [cellars, filters.cellarId, all])

  return (
    <>
      <Header
        eyebrow={`${result.length} rótulos · ${bottles} garrafas`}
        title="Catálogo"
        right={
          <div className="relative">
            <IconButton
              label="Filtros"
              variant={count ? 'wine' : 'ghost'}
              onClick={() => setShowFilters(true)}
            >
              <IconSliders />
            </IconButton>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full
                bg-wine text-ink font-mono text-[10px] flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
        }
      />

      <div className="field flex items-center gap-2.5 mb-3">
        <IconSearch width={19} height={19} className="text-muted shrink-0" />
        <input
          className="flex-1 min-w-0"
          value={filters.query}
          onChange={(e) => patch({ query: e.target.value })}
          placeholder="Nome, produtor, uva, região, AD-0042…"
          aria-label="Buscar"
        />
        {filters.query && (
          <button
            onClick={() => patch({ query: '' })}
            aria-label="Limpar busca"
            className="text-muted shrink-0"
          >
            <IconX width={17} height={17} />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 -mx-5 px-5">
        {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`chip ${sort === key ? 'chip-active' : ''}`}
          >
            {SORT_LABEL[key]}
          </button>
        ))}
      </div>

      {result.length === 0 ? (
        <Empty
          title={all.length ? 'Nada com esses filtros' : 'Catálogo vazio'}
          hint={
            all.length
              ? 'Afrouxe a busca ou limpe os filtros.'
              : 'Toque no botão do meio para catalogar sua primeira garrafa.'
          }
          action={
            count > 0 || filters.query ? (
              <button className="btn-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
                Limpar filtros
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-2.5">
          {result.map((w) => (
            <WineCard key={w.id} wine={w} cellars={cellars} />
          ))}
        </div>
      )}

      <BottomSheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filtros"
      >
        <FilterGroup label="Tipo">
          {WINE_TYPES.filter((t) => f.types.some(([name]) => name === t)).map((t) => (
            <button
              key={t}
              onClick={() => patch({ types: toggleIn(filters.types, t) })}
              className={`chip ${filters.types.includes(t) ? 'chip-active' : ''}`}
            >
              {t}
            </button>
          ))}
        </FilterGroup>

        {f.countries.length > 0 && (
          <FilterGroup label="País">
            {f.countries.slice(0, 14).map(([country, n]) => (
              <button
                key={country}
                onClick={() => patch({ countries: toggleIn(filters.countries, country) })}
                className={`chip ${
                  filters.countries.includes(country) ? 'chip-active' : ''
                }`}
              >
                {country} <span className="text-muted">{n}</span>
              </button>
            ))}
          </FilterGroup>
        )}

        {f.grapes.length > 0 && (
          <FilterGroup label="Uva">
            {f.grapes.slice(0, 18).map(([grape, n]) => (
              <button
                key={grape}
                onClick={() => patch({ grapes: toggleIn(filters.grapes, grape) })}
                className={`chip ${filters.grapes.includes(grape) ? 'chip-active' : ''}`}
              >
                {grape} <span className="text-muted">{n}</span>
              </button>
            ))}
          </FilterGroup>
        )}

        {(cellars?.length ?? 0) > 0 && (
          <FilterGroup label="Onde está">
            <button
              onClick={() => patch({ cellarId: 'todas', shelf: 'todas' })}
              className={`chip ${filters.cellarId === 'todas' ? 'chip-active' : ''}`}
            >
              Todas
            </button>
            {cellars?.map((c) => (
              <button
                key={c.id}
                onClick={() => patch({ cellarId: c.id!, shelf: 'todas' })}
                className={`chip ${filters.cellarId === c.id ? 'chip-active' : ''}`}
              >
                {c.name}
              </button>
            ))}
          </FilterGroup>
        )}

        {shelves.length > 0 && (
          <FilterGroup label="Prateleira">
            <button
              onClick={() => patch({ shelf: 'todas' })}
              className={`chip ${filters.shelf === 'todas' ? 'chip-active' : ''}`}
            >
              Todas
            </button>
            {shelves.map((s) => (
              <button
                key={s}
                onClick={() => patch({ shelf: s })}
                className={`chip ${filters.shelf === s ? 'chip-active' : ''}`}
              >
                {s}
              </button>
            ))}
          </FilterGroup>
        )}

        <FilterGroup label="Nota mínima">
          {[null, 80, 88, 90, 95].map((min) => (
            <button
              key={String(min)}
              onClick={() => patch({ minScore: min })}
              className={`chip ${filters.minScore === min ? 'chip-active' : ''}`}
            >
              {min === null ? 'Qualquer' : `${min}+`}
            </button>
          ))}
        </FilterGroup>

        <div className="divider" />

        <Toggle
          label="Só prontos para beber"
          hint="Esconde o que ainda está guardando."
          checked={filters.onlyReady}
          onChange={(v) => patch({ onlyReady: v })}
        />
        <Toggle
          label="Só favoritos"
          checked={filters.onlyFavorites}
          onChange={(v) => patch({ onlyFavorites: v })}
        />
        <Toggle
          label="Só os do cardápio"
          checked={filters.onlyInMenu}
          onChange={(v) => patch({ onlyInMenu: v })}
        />
        <Toggle
          label="Incluir consumidos"
          hint="Mostra também as garrafas já bebidas ou presenteadas."
          checked={filters.includeConsumed}
          onChange={(v) => patch({ includeConsumed: v })}
        />

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button className="btn-ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpar
          </button>
          <button className="btn-primary" onClick={() => setShowFilters(false)}>
            Ver {result.length}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}

function FilterGroup({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <div className="sys-label mb-2.5">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
