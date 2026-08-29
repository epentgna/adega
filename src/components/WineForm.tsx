import { useMemo } from 'react'
import type { Cellar, Wine } from '../types'
import { WINE_TYPES } from '../types'
import {
  NumberField,
  SelectField,
  TagField,
  TextField,
  Toggle
} from './Field'
import { StarRating } from './StarRating'
import { RatingsEditor } from './RatingsEditor'

export type Patch = (p: Partial<Wine>) => void

/** Ficha completa do vinho, usada tanto na catalogação quanto na edição. */
export function WineForm({
  wine,
  patch,
  cellars,
  currency
}: {
  wine: Wine
  patch: Patch
  cellars: Cellar[] | undefined
  currency: string
}) {
  const cellar = useMemo(
    () => cellars?.find((c) => c.id === wine.cellarId),
    [cellars, wine.cellarId]
  )

  return (
    <>
      <Section title="Identificação" />
      <TextField
        label="Nome do vinho"
        value={wine.name}
        onChange={(v) => patch({ name: v })}
        placeholder="Reserva, Gran Corte…"
      />
      <TextField
        label="Produtor"
        value={wine.producer}
        onChange={(v) => patch({ producer: v })}
        placeholder="Vinícola"
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Safra"
          value={wine.vintage}
          onChange={(v) => patch({ vintage: v === null ? null : Math.round(v) })}
          placeholder="2019"
        />
        <SelectField
          label="Tipo"
          value={wine.type}
          onChange={(v) => patch({ type: v })}
          options={WINE_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </div>
      <TagField
        label="Uvas"
        values={wine.grapes}
        onChange={(v) => patch({ grapes: v })}
        placeholder="Malbec, Cabernet…"
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="País"
          value={wine.country}
          onChange={(v) => patch({ country: v })}
          placeholder="Argentina"
        />
        <TextField
          label="Região"
          value={wine.region}
          onChange={(v) => patch({ region: v })}
          placeholder="Mendoza"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Teor alcoólico"
          value={wine.abv}
          onChange={(v) => patch({ abv: v })}
          suffix="%"
        />
        <NumberField
          label="Volume"
          value={wine.volumeMl}
          onChange={(v) => patch({ volumeMl: v ?? 750 })}
          suffix="ml"
        />
      </div>

      <Section title="Onde está guardado" />
      <SelectField
        label="Adega"
        value={wine.cellarId ?? -1}
        onChange={(v) => patch({ cellarId: v === -1 ? null : v, shelf: '' })}
        options={[
          { value: -1, label: 'Sem adega definida' },
          ...(cellars ?? []).map((c) => ({ value: c.id!, label: c.name }))
        ]}
      />
      {cellar && cellar.shelves.length > 0 ? (
        <div className="mb-4">
          <span className="field-label">Prateleira</span>
          <div className="flex flex-wrap gap-2">
            {cellar.shelves.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => patch({ shelf: s })}
                className={`chip ${wine.shelf === s ? 'chip-active' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <TextField
          label="Prateleira"
          value={wine.shelf}
          onChange={(v) => patch({ shelf: v })}
          placeholder="Prateleira 2"
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Posição"
          value={wine.position ?? ''}
          onChange={(v) => patch({ position: v })}
          placeholder="Nicho 4, fundo…"
        />
        <NumberField
          label="Garrafas"
          value={wine.quantity}
          onChange={(v) => patch({ quantity: Math.max(0, Math.round(v ?? 1)) })}
        />
      </div>

      <Section title="Avaliações" />
      <RatingsEditor
        ratings={wine.ratings}
        onChange={(ratings) => patch({ ratings })}
      />
      <div className="mb-4 mt-5">
        <span className="field-label">Minha nota</span>
        <StarRating value={wine.myRating} onChange={(v) => patch({ myRating: v })} />
      </div>
      <TextField
        label="Minhas anotações"
        value={wine.myNotes ?? ''}
        onChange={(v) => patch({ myNotes: v })}
        multiline
        placeholder="O que achou, com o que combinou…"
      />

      <Section title="Ficha técnica" />
      <TextField
        label="Notas de degustação"
        value={wine.tastingNotes ?? ''}
        onChange={(v) => patch({ tastingNotes: v })}
        multiline
      />
      <TagField
        label="Harmonizações"
        values={wine.pairings}
        onChange={(v) => patch({ pairings: v })}
        placeholder="Cordeiro, queijos curados…"
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Beber a partir de"
          value={wine.drinkFrom}
          onChange={(v) => patch({ drinkFrom: v === null ? null : Math.round(v) })}
          placeholder="2024"
        />
        <NumberField
          label="Beber até"
          value={wine.drinkTo}
          onChange={(v) => patch({ drinkTo: v === null ? null : Math.round(v) })}
          placeholder="2032"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Temperatura"
          value={wine.servingTempC ?? ''}
          onChange={(v) => patch({ servingTempC: v })}
          placeholder="16–18 °C"
        />
        <NumberField
          label="Decantar"
          value={wine.decantMin ?? null}
          onChange={(v) => patch({ decantMin: v === null ? null : Math.round(v) })}
          suffix="min"
        />
      </div>

      <Section title="Compra e valor" />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label={`Preço pago (${currency})`}
          value={wine.purchasePrice}
          onChange={(v) => patch({ purchasePrice: v })}
        />
        <NumberField
          label={`Preço de mercado (${currency})`}
          value={wine.marketPrice}
          onChange={(v) => patch({ marketPrice: v })}
        />
      </div>
      <TextField
        label="Comprado em"
        value={wine.purchasedFrom ?? ''}
        onChange={(v) => patch({ purchasedFrom: v })}
        placeholder="Importadora, viagem, presente…"
      />

      <Section title="Cardápio" />
      <Toggle
        label="Mostrar no cardápio"
        hint="Desligue para deixar a garrafa fora da carta."
        checked={wine.inMenu}
        onChange={(v) => patch({ inMenu: v })}
      />
      <TextField
        label="Descrição do cardápio"
        value={wine.menuNote ?? ''}
        onChange={(v) => patch({ menuNote: v })}
        multiline
        hint="Uma frase curta e elegante. A IA sugere uma quando identifica o rótulo."
      />
      <NumberField
        label={`Preço no cardápio (${currency})`}
        value={wine.menuPrice}
        onChange={(v) => patch({ menuPrice: v })}
        hint="Opcional. Só aparece se você ligar os preços no cardápio."
      />

      <Toggle
        label="Favorito"
        checked={wine.favorite}
        onChange={(v) => patch({ favorite: v })}
      />
    </>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mt-7 mb-4 first:mt-0">
      <span className="eyebrow">{title}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
