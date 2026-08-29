import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateSettings } from '../db/db'
import { MENU_TYPE_ORDER, type Wine } from '../types'
import { headlineRating, money, ratingLabel, vintageLabel } from '../lib/format'
import { Empty, Header, IconButton } from '../components/Layout'
import { BottomSheet } from '../components/BottomSheet'
import { TextField, Toggle } from '../components/Field'
import { MenuWineSheet } from '../components/MenuWineSheet'
import { IconGear, IconPrint, IconStar } from '../components/icons'

export default function Menu() {
  const wines = useLiveQuery(() => db.wines.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const [config, setConfig] = useState(false)
  const [aberto, setAberto] = useState<Wine | null>(null)
  const [showRatings, setShowRatings] = useState(true)

  const groups = useMemo(() => {
    const listed = (wines ?? []).filter(
      (w) => w.inMenu && w.status === 'estoque' && w.quantity > 0
    )
    const byType = new Map<string, Wine[]>()
    for (const w of listed) {
      const list = byType.get(w.type) ?? []
      list.push(w)
      byType.set(w.type, list)
    }
    // Dentro de cada tipo: por região, depois produtor — como numa carta.
    for (const list of byType.values()) {
      list.sort(
        (a, b) =>
          (a.country || 'zz').localeCompare(b.country || 'zz', 'pt-BR') ||
          (a.region || 'zz').localeCompare(b.region || 'zz', 'pt-BR') ||
          a.producer.localeCompare(b.producer, 'pt-BR')
      )
    }
    return MENU_TYPE_ORDER.filter((t) => byType.has(t)).map((t) => ({
      type: t,
      wines: byType.get(t)!
    }))
  }, [wines])

  const total = groups.reduce((n, g) => n + g.wines.length, 0)
  const currency = settings?.currency ?? 'BRL'
  const showPrices = settings?.menuShowPrices ?? false

  return (
    <>
      <Header
        eyebrow={`${total} rótulos na carta`}
        title="Cardápio"
        right={
          <>
            <IconButton label="Imprimir" onClick={() => window.print()}>
              <IconPrint />
            </IconButton>
            <IconButton label="Ajustes do cardápio" onClick={() => setConfig(true)}>
              <IconGear />
            </IconButton>
          </>
        }
      />

      {total === 0 ? (
        <Empty
          title="Nenhum vinho na carta"
          hint="Todo vinho catalogado entra no cardápio por padrão. Se a carta está vazia, é porque não há garrafas em estoque ou todas foram marcadas como fora do cardápio."
        />
      ) : (
        <div className="print-sheet">
          <div className="text-center mb-8 pt-2">
            <h2 className="font-display text-[34px] leading-tight font-semibold">
              {settings?.menuTitle || 'Carta de Vinhos'}
            </h2>
            {settings?.menuSubtitle && (
              <p className="text-muted text-sm mt-1.5">{settings.menuSubtitle}</p>
            )}
            <div className="mx-auto mt-4 h-px w-16 bg-gold/60" />
            <p className="text-[11px] text-muted mt-3 no-print">
              Toque em um vinho para ver a história e a ficha completa.
            </p>
          </div>

          {groups.map((group) => (
            <section key={group.type} className="mb-9">
              <h3 className="font-display text-[22px] text-gold text-center mb-1">
                {group.type}
              </h3>
              <div className="mx-auto mb-5 h-px w-10 bg-border" />

              <div className="grid gap-5">
                {group.wines.map((w) => {
                  const rating = showRatings ? headlineRating(w) : null
                  return (
                    <article key={w.id} className="break-inside-avoid">
                      <button
                        type="button"
                        onClick={() => setAberto(w)}
                        className="w-full text-left active:opacity-70 transition-opacity"
                      >
                      <div className="flex items-baseline gap-3">
                        <h4 className="font-display text-[19px] leading-tight font-semibold flex-1 min-w-0">
                          {w.name || w.producer}
                          <span className="text-muted font-sans text-[13px] font-normal">
                            {' '}
                            {vintageLabel(w.vintage)}
                          </span>
                        </h4>
                        {showPrices && w.menuPrice !== null && (
                          <span className="font-mono text-[13px] text-gold tabular-nums shrink-0">
                            {money(w.menuPrice, currency)}
                          </span>
                        )}
                      </div>

                      <div className="text-[13px] text-muted mt-0.5">
                        {[w.producer, w.region, w.country].filter(Boolean).join(' · ')}
                      </div>

                      {w.grapes.length > 0 && (
                        <div className="text-[12px] text-muted/80 mt-0.5 italic">
                          {w.grapes.join(', ')}
                        </div>
                      )}

                      {w.menuNote && (
                        <p className="text-[13px] leading-relaxed mt-1.5 text-ink/85">
                          {w.menuNote}
                        </p>
                      )}

                      {rating && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-gold">
                          <IconStar width={12} height={12} filled />
                          <span className="font-mono text-[11px]">
                            {ratingLabel(rating)} {rating.source}
                          </span>
                        </div>
                      )}
                      </button>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}

          <p className="text-center text-[10px] text-muted/60 font-mono tracking-[0.14em] mt-10">
            {total} RÓTULOS · {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}

      <MenuWineSheet
        wine={aberto}
        onClose={() => setAberto(null)}
        currency={currency}
        showPrice={showPrices}
      />

      <BottomSheet open={config} onClose={() => setConfig(false)} title="Ajustes do cardápio">
        <TextField
          label="Título"
          value={settings?.menuTitle ?? ''}
          onChange={(v) => updateSettings({ menuTitle: v })}
          placeholder="Carta de Vinhos"
        />
        <TextField
          label="Subtítulo"
          value={settings?.menuSubtitle ?? ''}
          onChange={(v) => updateSettings({ menuSubtitle: v })}
          placeholder="Casa Pentagna · 2026"
        />
        <Toggle
          label="Mostrar preços"
          hint="Usa o preço do cardápio de cada vinho."
          checked={showPrices}
          onChange={(v) => updateSettings({ menuShowPrices: v })}
        />
        <Toggle
          label="Mostrar notas"
          hint="Vivino e críticos abaixo de cada rótulo."
          checked={showRatings}
          onChange={setShowRatings}
        />
        <p className="text-[12px] text-muted leading-relaxed mt-4">
          O botão de impressão gera um PDF limpo, em papel branco, sem a navegação
          do app — dá para imprimir ou salvar e mandar por WhatsApp.
        </p>
      </BottomSheet>
    </>
  )
}
