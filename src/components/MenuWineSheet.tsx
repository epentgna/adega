import type { Wine } from '../types'
import { money, ratingLabel, vintageLabel } from '../lib/format'
import { BottomSheet } from './BottomSheet'
import { WinePhoto } from './WinePhoto'
import { IconStar } from './icons'

/**
 * Ficha do vinho como se lê numa carta: história, degustação, harmonização e
 * serviço. Sem nada de gestão — nem local, nem estoque, nem preço pago.
 */
export function MenuWineSheet({
  wine,
  onClose,
  currency,
  showPrice
}: {
  wine: Wine | null
  onClose: () => void
  currency: string
  showPrice: boolean
}) {
  if (!wine) return null

  const servico = [
    wine.servingTempC,
    wine.decantMin ? `decantar ${wine.decantMin} min` : '',
    wine.abv ? `${wine.abv}% vol.` : '',
    `${wine.volumeMl} ml`
  ]
    .filter(Boolean)
    .join(' · ')

  const guarda =
    wine.drinkFrom || wine.drinkTo
      ? `${wine.drinkFrom ?? '?'} – ${wine.drinkTo ?? '?'}`
      : ''

  return (
    // No cabeçalho vai o produtor; o nome do vinho fica grande ao lado da foto.
    <BottomSheet open onClose={onClose} title={wine.producer || wine.name}>
      <div className="flex gap-4 mb-5">
        <WinePhoto
          photoId={wine.photoIds[0]}
          alt={wine.name}
          className="w-[104px] h-[140px] shrink-0 border border-border"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[22px] leading-[1.15] font-semibold">
            {wine.name || wine.producer}
          </h3>
          <p className="text-[13px] text-muted mt-1">
            {vintageLabel(wine.vintage)}
          </p>
          <p className="text-[13px] text-muted">
            {[wine.subregion, wine.region, wine.country].filter(Boolean).join(' · ')}
          </p>
          {wine.grapes.length > 0 && (
            <p className="text-[12px] text-muted/80 italic mt-1">
              {wine.grapes.join(', ')}
            </p>
          )}
          {showPrice && wine.menuPrice !== null && (
            <p className="font-mono text-gold text-[14px] mt-2">
              {money(wine.menuPrice, currency)}
            </p>
          )}
        </div>
      </div>

      {wine.ratings.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {wine.ratings.map((r, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-lg border
                border-gold/40 bg-gold/[0.07] px-2.5 py-1.5"
            >
              <IconStar width={12} height={12} filled className="text-gold" />
              <span className="font-mono text-[11px] text-gold tabular-nums">
                {ratingLabel(r)}
              </span>
              <span className="text-[11px] text-muted">{r.source}</span>
            </span>
          ))}
        </div>
      )}

      <Block title="História" body={wine.story} />
      <Block title="Na taça" body={wine.tastingNotes} />

      {wine.pairings.length > 0 && (
        <div className="mb-5">
          <div className="sys-label mb-2">Harmoniza com</div>
          <div className="flex flex-wrap gap-2">
            {wine.pairings.map((p) => (
              <span key={p} className="chip">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {(servico || guarda) && (
        <div className="card p-4">
          {servico && <Line label="Serviço" value={servico} />}
          {guarda && <Line label="Guarda" value={guarda} />}
        </div>
      )}

      {!wine.story && !wine.tastingNotes && wine.pairings.length === 0 && (
        <p className="text-[13px] text-muted leading-relaxed">
          Este vinho ainda não tem história nem notas de degustação. Você pode
          escrever em Editar, na ficha dele, ou pedir para a IA preencher.
        </p>
      )}
    </BottomSheet>
  )
}

function Block({ title, body }: { title: string; body?: string }) {
  if (!body) return null
  return (
    <div className="mb-5">
      <div className="sys-label mb-2">{title}</div>
      <p className="text-[14px] leading-relaxed text-ink/90 whitespace-pre-wrap">
        {body}
      </p>
    </div>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5 border-b border-border last:border-0">
      <span className="sys-label shrink-0 w-[68px]">{label}</span>
      <span className="text-[13px] flex-1 min-w-0">{value}</span>
    </div>
  )
}
