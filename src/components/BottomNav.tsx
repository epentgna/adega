import { NavLink, useNavigate } from 'react-router-dom'
import { IconBottle, IconCellar, IconMenu, IconPlus, IconSliders } from './icons'

const tabs = [
  { to: '/', label: 'ADEGA', Icon: IconCellar, end: true },
  { to: '/catalogo', label: 'CATÁLOGO', Icon: IconBottle, end: false },
  { to: '/cardapio', label: 'CARDÁPIO', Icon: IconMenu, end: false },
  { to: '/gestao', label: 'GESTÃO', Icon: IconSliders, end: false }
]

export function BottomNav() {
  const navigate = useNavigate()
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app z-40
        bg-card/95 backdrop-blur border-t border-border no-print"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Catalogar é a ação mais repetida (300+ garrafas): fica no meio, solta. */}
      {/* z-10: os NavLink abaixo são `relative` e, sem isso, roubam o toque
          na metade inferior do botão. */}
      <button
        onClick={() => navigate('/catalogar')}
        aria-label="Catalogar vinho"
        className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 h-14 w-14
          rounded-full border border-wine/70 bg-wine text-ink shadow-glow
          flex items-center justify-center active:scale-95 transition-transform"
      >
        <IconPlus width={26} height={26} />
      </button>

      <div className="grid grid-cols-4">
        {tabs.map(({ to, label, Icon, end }, i) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={`relative flex flex-col items-center gap-1 py-2.5 min-h-[58px] ${
              i === 1 ? 'pr-7' : i === 2 ? 'pl-7' : ''
            }`}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-wine shadow-glow-sm" />
                )}
                <Icon
                  width={21}
                  height={21}
                  className={isActive ? 'text-wine' : 'text-muted'}
                />
                <span
                  className={`font-mono text-[9px] tracking-[0.14em] ${
                    isActive ? 'text-wine' : 'text-muted'
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
