import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { computeStats } from '../lib/stats'
import { drinkability, money } from '../lib/format'
import { Empty, Header, IconButton } from '../components/Layout'
import { useRepoImport } from '../hooks/useRepoImport'
import { WineCard } from '../components/WineCard'
import { IconGear, IconSearch, IconSparkle, IconX } from '../components/icons'

export default function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const wines = useLiveQuery(() => db.wines.toArray(), [])
  const cellars = useLiveQuery(() => db.cellars.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const repo = useRepoImport(settings?.autoRepoImport ?? true)

  const stats = useMemo(() => computeStats(wines ?? []), [wines])

  const recent = useMemo(
    () =>
      [...(wines ?? [])]
        .filter((w) => w.status === 'estoque')
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 4),
    [wines]
  )

  const readyNow = useMemo(
    () =>
      (wines ?? [])
        .filter((w) => w.status === 'estoque' && w.quantity > 0)
        .filter((w) => drinkability(w) === 'passando' || drinkability(w) === 'pronto')
        .slice(0, 3),
    [wines]
  )

  const currency = settings?.currency ?? 'BRL'

  return (
    <>
      <Header
        eyebrow={settings?.ownerName ? `Olá, ${settings.ownerName}` : 'Sua coleção'}
        title="Adega"
        right={
          <IconButton label="Configurações" onClick={() => navigate('/gestao/config')}>
            <IconGear />
          </IconButton>
        }
      />

      {repo.running && (
        <div className="card p-3.5 mb-4 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse shrink-0" />
          <span className="text-[13px] text-muted truncate">
            {repo.label || 'Buscando garrafas novas…'}
          </span>
        </div>
      )}

      {repo.result && (
        <div className="card p-4 mb-4 border-gold/50 flex items-start gap-3">
          <IconSparkle width={19} height={19} className="text-gold shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px]">
              {repo.result.wines} garrafa{repo.result.wines === 1 ? '' : 's'} nova
              {repo.result.wines === 1 ? '' : 's'}
            </div>
            <div className="text-[12px] text-muted mt-0.5">
              {repo.result.firstCode}
              {repo.result.firstCode !== repo.result.lastCode
                ? ` a ${repo.result.lastCode}`
                : ''}{' '}
              · catalogadas por conversa
            </div>
          </div>
          <button
            onClick={repo.dismiss}
            aria-label="Dispensar"
            className="text-muted shrink-0"
          >
            <IconX width={17} height={17} />
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          navigate(`/catalogo?q=${encodeURIComponent(query)}`)
        }}
        className="field flex items-center gap-2.5 mb-5"
      >
        <IconSearch width={19} height={19} className="text-muted shrink-0" />
        <input
          className="flex-1 min-w-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, uva, número…"
          aria-label="Buscar na adega"
        />
      </form>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Stat label="Garrafas" value={String(stats.bottles)} sub={`${stats.labels} rótulos`} />
        <Stat
          label="Valor estimado"
          value={money(stats.value, currency)}
          sub={
            stats.valueKnown < stats.bottles
              ? `${stats.bottles - stats.valueKnown} sem preço`
              : 'acervo completo'
          }
        />
      </div>

      <div className="card p-4 mb-5">
        <div className="sys-label mb-3">Ponto de guarda</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Mini label="Guardando" value={stats.aging} tone="text-muted" />
          <Mini label="Prontos" value={stats.ready} tone="text-ok" />
          <Mini label="Beber já" value={stats.past} tone="text-danger" />
        </div>
      </div>

      {(wines?.length ?? 0) === 0 && (
        <Empty
          title="Adega vazia"
          hint="Fotografe o rótulo e a ficha do vinho se preenche sozinha: produtor, uva, região, safra e as notas do Vivino e dos críticos."
          action={
            <button className="btn-primary" onClick={() => navigate('/catalogar')}>
              <IconSparkle width={19} height={19} />
              Catalogar o primeiro
            </button>
          }
        />
      )}

      {readyNow.length > 0 && (
        <section className="mb-6">
          <SectionTitle title="Abrir agora" to="/catalogo?pronto=1" />
          <div className="grid gap-2.5">
            {readyNow.map((w) => (
              <WineCard key={w.id} wine={w} cellars={cellars} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mb-6">
          <SectionTitle title="Catalogados recentemente" to="/catalogo" />
          <div className="grid gap-2.5">
            {recent.map((w) => (
              <WineCard key={w.id} wine={w} cellars={cellars} />
            ))}
          </div>
        </section>
      )}

      {stats.byType.length > 0 && (
        <section className="mb-6">
          <div className="sys-label mb-3">Composição</div>
          <div className="card p-4">
            {stats.byType.map(([type, count]) => (
              <Bar
                key={type}
                label={type}
                count={count}
                total={stats.bottles}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="sys-label mb-1.5">{label}</div>
      <div className="font-display text-[28px] leading-none font-semibold tabular-nums">
        {value}
      </div>
      {sub && <div className="text-[11px] text-muted mt-1.5">{sub}</div>}
    </div>
  )
}

function Mini({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className={`font-display text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
      <div className="font-mono text-[9px] tracking-[0.14em] text-muted uppercase mt-0.5">
        {label}
      </div>
    </div>
  )
}

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-[13px] mb-1.5">
        <span>{label}</span>
        <span className="text-muted tabular-nums font-mono text-[11px]">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-wine" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SectionTitle({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <div className="sys-label">{title}</div>
      <Link to={to} className="font-mono text-[10px] text-wine tracking-[0.14em]">
        VER TUDO
      </Link>
    </div>
  )
}
