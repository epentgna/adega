import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateSettings } from '../db/db'
import { MENU_TYPE_ORDER, type Wine } from '../types'
import { headlineRating, money, ratingLabel, vintageLabel } from '../lib/format'
import { Empty, Header, IconButton } from '../components/Layout'
import { BottomSheet } from '../components/BottomSheet'
import { TextField, Toggle } from '../components/Field'
import { MenuWineSheet } from '../components/MenuWineSheet'
import { availableFamilies, matchesFamily, matchesText } from '../lib/pairings'
import { IconGear, IconPrint, IconSearch, IconStar, IconX } from '../components/icons'

export default function Menu() {
  const wines = useLiveQuery(() => db.wines.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const [config, setConfig] = useState(false)
  const [aberto, setAberto] = useState<Wine | null>(null)
  const [showRatings, setShowRatings] = useState(true)

  const [tipo, setTipo] = useState<string | null>(null)
  const [prato, setPrato] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  /** Tudo o que está na carta, antes de qualquer filtro. */
  const naCarta = useMemo(
    () =>
      (wines ?? []).filter(
        (w) => w.inMenu && w.status === 'estoque' && w.quantity > 0
      ),
    [wines]
  )

  const familias = useMemo(() => availableFamilies(naCarta), [naCarta])

  const filtrar = (lista: Wine[], comTipo: boolean) =>
    lista.filter(
      (w) =>
        (!comTipo || !tipo || w.type === tipo) &&
        (!prato || matchesFamily(w, prato)) &&
        matchesText(w, busca)
    )

  const groups = useMemo(() => {
    const listed = filtrar(naCarta, true)
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
  }, [naCarta, tipo, prato, busca])

  const total = groups.reduce((n, g) => n + g.wines.length, 0)
  const filtrando = tipo !== null || prato !== null || busca.trim() !== ''
  // Quando o tipo escolhido não dá em nada, vale saber se sem ele daria.
  const semTipo = filtrar(naCarta, false).length
  const limpar = () => {
    setTipo(null)
    setPrato(null)
    setBusca('')
  }
  const currency = settings?.currency ?? 'BRL'
  const showPrices = settings?.menuShowPrices ?? false

  return (
    <>
      <Header
        eyebrow={
          filtrando
            ? `${total} de ${naCarta.length} rótulos`
            : `${total} rótulos na carta`
        }
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

      {naCarta.length > 0 && (
        <div className="no-print mb-6">
          <div className="field flex items-center gap-2.5 mb-3">
            <IconSearch width={18} height={18} className="text-muted shrink-0" />
            <input
              className="flex-1 min-w-0"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Uva, região, prato…"
              aria-label="Buscar na carta"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
                className="text-muted shrink-0"
              >
                <IconX width={16} height={16} />
              </button>
            )}
          </div>

          <div className="sys-label mb-2">Tipo</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {MENU_TYPE_ORDER.filter((t) =>
              naCarta.some((w) => w.type === t)
            ).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(tipo === t ? null : t)}
                className={`chip ${tipo === t ? 'chip-active' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>

          {familias.length > 0 && (
            <>
              <div className="sys-label mb-2">Para comer com</div>
              <div className="flex flex-wrap gap-2">
                {familias.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setPrato(prato === f.id ? null : f.id)}
                    className={`chip ${prato === f.id ? 'chip-active' : ''}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {filtrando && (
            <button
              onClick={limpar}
              className="mt-4 font-mono text-[10px] tracking-[0.14em] text-wine"
            >
              LIMPAR FILTROS
            </button>
          )}
        </div>
      )}

      {total === 0 && naCarta.length > 0 && filtrando ? (
        <Empty
          title="Nada com esses filtros"
          hint={
            tipo && semTipo > 0
              ? `Nenhum ${tipo.toLowerCase()} do seu acervo combina com isso. Sem o filtro de tipo, ${semTipo} ${
                  semTipo === 1 ? 'vinho combina' : 'vinhos combinam'
                }.`
              : 'Nenhum vinho da carta combina. Afrouxe a busca ou tire um filtro.'
          }
          action={
            tipo && semTipo > 0 ? (
              <button className="btn-primary" onClick={() => setTipo(null)}>
                Ver os {semTipo} de qualquer tipo
              </button>
            ) : (
              <button className="btn-ghost" onClick={limpar}>
                Limpar filtros
              </button>
            )
          }
        />
      ) : total === 0 ? (
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
