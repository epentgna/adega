import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { cellarName, drinkBottle } from '../lib/wine'
import {
  dateBR,
  DRINKABILITY_LABEL,
  drinkability,
  grapesLabel,
  locationLabel,
  money,
  ratingLabel,
  vintageLabel
} from '../lib/format'
import { BackBar, Sheet } from '../components/Layout'
import { WinePhoto } from '../components/WinePhoto'
import { StarRating } from '../components/StarRating'
import { BottomSheet } from '../components/BottomSheet'
import { TextField } from '../components/Field'
import {
  IconGlass,
  IconHeart,
  IconSparkle,
  IconStar
} from '../components/icons'

export default function WineDetail() {
  const { id } = useParams()
  const wineId = Number(id)
  const navigate = useNavigate()
  const wine = useLiveQuery(() => db.wines.get(wineId), [wineId])
  const cellars = useLiveQuery(() => db.cellars.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const [drinking, setDrinking] = useState(false)
  const [occasion, setOccasion] = useState('')
  const [withWhom, setWithWhom] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState<number | null>(null)

  if (wine === undefined) return <Sheet>Carregando…</Sheet>
  if (!wine) return <Sheet>Vinho não encontrado.</Sheet>

  const currency = settings?.currency ?? 'BRL'
  const d = drinkability(wine)
  const toneByDrinkability = {
    jovem: 'text-muted',
    pronto: 'text-ok',
    passando: 'text-danger',
    desconhecido: 'text-muted'
  }[d]

  return (
    <Sheet>
      <BackBar
        title={wine.code}
        right={
          <div className="flex gap-2">
            <button
              aria-label={wine.favorite ? 'Remover dos favoritos' : 'Favoritar'}
              onClick={() => db.wines.update(wineId, { favorite: !wine.favorite })}
              className={`h-11 w-11 rounded-xl border flex items-center justify-center ${
                wine.favorite
                  ? 'border-wine/70 bg-wine/20 text-wine'
                  : 'border-border text-muted'
              }`}
            >
              <IconHeart filled={wine.favorite} />
            </button>
            <button
              className="btn-ghost px-4"
              onClick={() => navigate(`/vinho/${wineId}/editar`)}
            >
              Editar
            </button>
          </div>
        }
      />

      {wine.photoIds.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar mb-5 -mx-5 px-5">
          {wine.photoIds.map((pid) => (
            <WinePhoto
              key={pid}
              photoId={pid}
              alt={wine.name}
              className="w-[168px] h-[224px] shrink-0 border border-border"
            />
          ))}
        </div>
      )}

      <h1 className="font-display text-[32px] leading-[1.1] font-semibold">
        {wine.name || 'Sem nome'}
      </h1>
      <p className="text-muted mt-1">
        {[wine.producer, vintageLabel(wine.vintage)].filter(Boolean).join(' · ')}
      </p>

      <div className="flex flex-wrap gap-2 mt-4">
        <span className="chip chip-active">{wine.type}</span>
        {wine.grapes.map((g) => (
          <span key={g} className="chip">
            {g}
          </span>
        ))}
      </div>

      {wine.ratings.length > 0 && (
        <div className="card p-4 mt-5">
          <div className="sys-label mb-3">Avaliações</div>
          <div className="grid gap-2.5">
            {wine.ratings.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <IconStar width={15} height={15} filled className="text-gold shrink-0" />
                <span className="flex-1 min-w-0 truncate text-[14px]">
                  {r.source}
                  {r.vintage ? (
                    <span className="text-muted text-[12px]"> · safra {r.vintage}</span>
                  ) : null}
                </span>
                {r.votes ? (
                  <span className="font-mono text-[10px] text-muted shrink-0">
                    {r.votes.toLocaleString('pt-BR')}
                  </span>
                ) : null}
                <span className="font-mono text-gold tabular-nums shrink-0">
                  {ratingLabel(r)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4 mt-3">
        <Row label="Onde está" value={locationLabel(wine, cellarName(cellars, wine.cellarId))} />
        <Row label="Garrafas" value={String(wine.quantity)} />
        <Row label="Origem" value={[wine.region, wine.subregion, wine.country].filter(Boolean).join(' · ') || '—'} />
        <Row label="Uvas" value={grapesLabel(wine.grapes)} />
        <Row label="Álcool" value={wine.abv ? `${wine.abv}%` : '—'} />
        <Row label="Volume" value={`${wine.volumeMl} ml`} />
        <Row
          label="Guarda"
          value={
            wine.drinkFrom || wine.drinkTo
              ? `${wine.drinkFrom ?? '?'} – ${wine.drinkTo ?? '?'}`
              : '—'
          }
          extra={
            <span className={`font-mono text-[10px] ${toneByDrinkability}`}>
              {DRINKABILITY_LABEL[d]}
            </span>
          }
        />
        <Row label="Serviço" value={wine.servingTempC || '—'} />
        {wine.decantMin ? <Row label="Decantar" value={`${wine.decantMin} min`} /> : null}
        <Row label="Pago" value={money(wine.purchasePrice, currency)} />
        <Row label="Mercado" value={money(wine.marketPrice, currency)} />
        {wine.purchasedFrom ? <Row label="Comprado em" value={wine.purchasedFrom} /> : null}
        {wine.purchasedAt ? <Row label="Data da compra" value={dateBR(wine.purchasedAt)} /> : null}
      </div>

      {wine.tastingNotes && (
        <Block title="Notas de degustação" body={wine.tastingNotes} />
      )}

      {wine.pairings.length > 0 && (
        <div className="mt-5">
          <div className="sys-label mb-2.5">Harmoniza com</div>
          <div className="flex flex-wrap gap-2">
            {wine.pairings.map((p) => (
              <span key={p} className="chip">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <div className="sys-label mb-2.5">Minha nota</div>
        <StarRating
          value={wine.myRating}
          onChange={(v) => db.wines.update(wineId, { myRating: v, updatedAt: Date.now() })}
        />
      </div>

      {wine.myNotes && <Block title="Minhas anotações" body={wine.myNotes} />}

      {wine.enrichment?.status === 'ok' && (
        <div className="card p-4 mt-5 border-dashed">
          <div className="flex items-center gap-2 sys-label mb-2">
            <IconSparkle width={13} height={13} className="text-wine" />
            Preenchido por IA
          </div>
          <p className="text-[12px] text-muted leading-relaxed">
            {dateBR(wine.enrichment.at)} · {wine.enrichment.model}
            {wine.enrichment.confidence !== null &&
            wine.enrichment.confidence !== undefined
              ? ` · confiança ${Math.round(wine.enrichment.confidence * 100)}%`
              : ''}
            {wine.enrichment.sources?.length
              ? ` · fontes: ${wine.enrichment.sources.slice(0, 4).join(', ')}`
              : ''}
          </p>
          {wine.enrichment.notes && (
            <p className="text-[12px] text-muted leading-relaxed mt-2">
              {wine.enrichment.notes}
            </p>
          )}
        </div>
      )}

      {wine.status === 'estoque' && wine.quantity > 0 ? (
        <button className="btn-primary mt-7" onClick={() => setDrinking(true)}>
          <IconGlass width={19} height={19} />
          Abrir uma garrafa
        </button>
      ) : (
        <div className="card p-4 mt-7 text-center text-muted text-sm">
          Sem garrafas em estoque.
        </div>
      )}

      <BottomSheet
        open={drinking}
        onClose={() => setDrinking(false)}
        title={`Abrir ${wine.code}`}
      >
        <p className="text-sm text-muted mb-5">
          Baixa uma garrafa do estoque e guarda no histórico.
        </p>
        <div className="mb-5">
          <span className="field-label">Que nota você dá?</span>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <TextField
          label="Ocasião"
          value={occasion}
          onChange={setOccasion}
          placeholder="Jantar de aniversário…"
        />
        <TextField
          label="Com quem"
          value={withWhom}
          onChange={setWithWhom}
          placeholder="Convidados"
        />
        <TextField
          label="Comentários"
          value={notes}
          onChange={setNotes}
          multiline
          placeholder="Como estava, com o que combinou…"
        />
        <button
          className="btn-primary mt-2"
          onClick={async () => {
            await drinkBottle(wine, { occasion, withWhom, rating, notes })
            setDrinking(false)
            setOccasion('')
            setWithWhom('')
            setNotes('')
            setRating(null)
          }}
        >
          Registrar
        </button>
      </BottomSheet>
    </Sheet>
  )
}

function Row({
  label,
  value,
  extra
}: {
  label: string
  value: string
  extra?: React.ReactNode
}) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-border last:border-0">
      <span className="sys-label shrink-0 w-[104px]">{label}</span>
      <span className="text-[14px] flex-1 min-w-0">{value}</span>
      {extra}
    </div>
  )
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-5">
      <div className="sys-label mb-2">{title}</div>
      <p className="text-[14px] leading-relaxed text-ink/90 whitespace-pre-wrap">
        {body}
      </p>
    </div>
  )
}
