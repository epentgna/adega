import { Outlet, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { IconBack } from './icons'

export function Layout() {
  return (
    <div className="mx-auto w-full max-w-app min-h-full relative">
      <main
        className="px-5 pt-6"
        style={{ paddingBottom: 'calc(92px + env(safe-area-inset-bottom))' }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

/** Tela cheia, sem navegação de rodapé (formulários, detalhe, cardápio). */
export function Sheet({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-app min-h-full px-5 pt-4 pb-16 ${className}`}>
      {children}
    </div>
  )
}

export function Header({
  eyebrow,
  title,
  right
}: {
  eyebrow?: string
  title: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="font-display text-[30px] leading-tight font-semibold text-ink">
          {title}
        </h1>
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </header>
  )
}

export function BackBar({
  title,
  right,
  to
}: {
  title: string
  right?: React.ReactNode
  to?: string
}) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center gap-2 mb-5 -ml-2 no-print">
      <button
        onClick={() => (to ? navigate(to) : navigate(-1))}
        aria-label="Voltar"
        className="h-11 w-11 flex items-center justify-center text-ink shrink-0"
      >
        <IconBack />
      </button>
      <div className="font-display text-xl font-semibold truncate flex-1">{title}</div>
      {right}
    </div>
  )
}

export function IconButton({
  onClick,
  label,
  children,
  variant = 'ghost',
  type = 'button'
}: {
  onClick?: () => void
  label: string
  children: React.ReactNode
  variant?: 'ghost' | 'wine' | 'gold'
  type?: 'button' | 'submit'
}) {
  const styles = {
    ghost: 'border-border bg-white/[0.02] text-ink active:bg-white/[0.06]',
    wine: 'border-wine/70 bg-wine/20 text-ink shadow-glow-sm',
    gold: 'border-gold/70 bg-gold/15 text-gold shadow-glow-gold'
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      className={`flex items-center justify-center h-11 w-11 rounded-xl border transition-colors ${styles}`}
    >
      {children}
    </button>
  )
}

export function Empty({
  title,
  hint,
  action
}: {
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="card p-8 text-center">
      <div className="font-display text-xl mb-1.5">{title}</div>
      {hint && <p className="text-sm text-muted leading-relaxed mb-4">{hint}</p>}
      {action}
    </div>
  )
}
