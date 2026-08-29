type P = React.SVGProps<SVGSVGElement>

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
}

export function IconCellar(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...base} {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M3 15h18" />
      <path d="M8 4v6M13 10v5M17 15v5" />
    </svg>
  )
}

export function IconBottle(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...base} {...p}>
      <path d="M10 2h4v4.2c0 .9.3 1.7.9 2.4l.7.9c.9 1 1.4 2.3 1.4 3.7V20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-6.8c0-1.4.5-2.7 1.4-3.7l.7-.9c.6-.7.9-1.5.9-2.4V2Z" />
      <path d="M7 14h10" />
    </svg>
  )
}

export function IconGlass(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...base} {...p}>
      <path d="M6 3h12l-.8 6a5.2 5.2 0 0 1-10.4 0L6 3Z" />
      <path d="M12 14.5V21M8.5 21h7" />
    </svg>
  )
}

export function IconMenu(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...base} {...p}>
      <path d="M5 3h14a1 1 0 0 1 1 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 0 1 1-1Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  )
}

export function IconSliders(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...base} {...p}>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </svg>
  )
}

export function IconPlus(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...base} {...p}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconSearch(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...base} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function IconCamera(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...base} {...p}>
      <path d="M3 8a2 2 0 0 1 2-2h2l1.4-2h7.2L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

export function IconSparkle(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...base} {...p}>
      <path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8L12 3Z" />
      <path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
    </svg>
  )
}

export function IconStar({ filled, ...p }: P & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      {...base}
      fill={filled ? 'currentColor' : 'none'}
      {...p}
    >
      <path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
    </svg>
  )
}

export function IconHeart({ filled, ...p }: P & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      {...base}
      fill={filled ? 'currentColor' : 'none'}
      {...p}
    >
      <path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z" />
    </svg>
  )
}

export function IconBack(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...base} {...p}>
      <path d="M15 19 8 12l7-7" />
    </svg>
  )
}

export function IconChevron(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function IconTrash(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  )
}

export function IconCheck(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

export function IconX(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function IconGear(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 14H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.8-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.1 1.2Z" />
    </svg>
  )
}

export function IconPrint(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}>
      <path d="M7 9V3h10v6M7 19H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 15h10v6H7z" />
    </svg>
  )
}

export function IconDownload(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}>
      <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16" />
    </svg>
  )
}

export function IconMove(p: P) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}>
      <path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
    </svg>
  )
}
