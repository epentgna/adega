import { IconStar } from './icons'

/** Nota pessoal de 0 a 5, com meia estrela (toque na metade esquerda). */
export function StarRating({
  value,
  onChange,
  size = 26
}: {
  value: number | null
  onChange?: (v: number | null) => void
  size?: number
}) {
  const current = value ?? 0
  const readOnly = !onChange

  return (
    <div className="flex items-center gap-1" role={readOnly ? undefined : 'radiogroup'}>
      {[1, 2, 3, 4, 5].map((i) => {
        const full = current >= i
        const half = !full && current >= i - 0.5
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            aria-label={`${i} estrela${i > 1 ? 's' : ''}`}
            onClick={(e) => {
              if (!onChange) return
              const rect = e.currentTarget.getBoundingClientRect()
              const isLeft = e.clientX - rect.left < rect.width / 2
              const next = isLeft ? i - 0.5 : i
              onChange(current === next ? null : next)
            }}
            className={`relative ${readOnly ? '' : 'active:scale-95'} transition-transform`}
          >
            <IconStar width={size} height={size} className="text-border" />
            {(full || half) && (
              <span
                className="absolute inset-0 overflow-hidden text-gold"
                style={{ width: half ? '50%' : '100%' }}
              >
                <IconStar width={size} height={size} filled />
              </span>
            )}
          </button>
        )
      })}
      {!readOnly && (
        <span className="ml-2 font-mono text-xs text-muted tabular-nums">
          {value === null ? '—' : value.toFixed(1)}
        </span>
      )}
    </div>
  )
}
