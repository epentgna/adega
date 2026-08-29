import { useEffect } from 'react'
import { IconX } from './icons'

export function BottomSheet({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center no-print">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-app bg-card border-t border-x border-border
          rounded-t-3xl max-h-[88vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
      >
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border
          px-5 py-4 flex items-center justify-between gap-3 rounded-t-3xl">
          <div className="font-display text-xl font-semibold truncate">{title}</div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="h-9 w-9 flex items-center justify-center text-muted shrink-0"
          >
            <IconX />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

export function Confirm({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger,
  onConfirm,
  onCancel
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <BottomSheet open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-muted leading-relaxed mb-6">{message}</p>
      <div className="grid grid-cols-2 gap-3">
        <button className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </BottomSheet>
  )
}
