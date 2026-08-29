import { Link } from 'react-router-dom'
import type { Cellar, Wine } from '../types'
import {
  drinkability,
  DRINKABILITY_LABEL,
  headlineRating,
  locationLabel,
  ratingLabel,
  vintageLabel
} from '../lib/format'
import { cellarName } from '../lib/wine'
import { WinePhoto } from './WinePhoto'
import { IconHeart, IconStar } from './icons'

export function WineCard({
  wine,
  cellars
}: {
  wine: Wine
  cellars: Cellar[] | undefined
}) {
  const rating = headlineRating(wine)
  const d = drinkability(wine)

  return (
    <Link
      to={`/vinho/${wine.id}`}
      className="card p-3 flex gap-3.5 active:bg-white/[0.03] transition-colors"
    >
      <WinePhoto
        photoId={wine.photoIds[0]}
        alt={wine.name}
        className="w-[62px] h-[84px] shrink-0"
      />

      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-2 mb-1">
          <span className="code-tag">{wine.code}</span>
          {wine.favorite && <IconHeart width={13} height={13} filled className="text-wine" />}
          {wine.quantity > 1 && (
            <span className="font-mono text-[10px] text-muted">
              {wine.quantity}×
            </span>
          )}
        </div>

        <div className="font-display text-[19px] leading-[1.15] font-semibold truncate">
          {wine.name || 'Sem nome'}
        </div>
        <div className="text-[13px] text-muted truncate">
          {wine.producer}
          {wine.producer && ' · '}
          {vintageLabel(wine.vintage)}
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {rating && (
            <span className="inline-flex items-center gap-1 text-gold font-mono text-[11px]">
              <IconStar width={11} height={11} filled />
              {ratingLabel(rating)}
              <span className="text-muted">{rating.source}</span>
            </span>
          )}
          {d === 'pronto' && (
            <span className="font-mono text-[10px] text-ok/90">
              {DRINKABILITY_LABEL.pronto}
            </span>
          )}
          {d === 'passando' && (
            <span className="font-mono text-[10px] text-danger">
              {DRINKABILITY_LABEL.passando}
            </span>
          )}
        </div>

        <div className="font-mono text-[10px] text-muted/80 mt-1 truncate">
          {locationLabel(wine, cellarName(cellars, wine.cellarId))}
        </div>
      </div>
    </Link>
  )
}
