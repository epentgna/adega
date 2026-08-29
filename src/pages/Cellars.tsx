import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Cellar } from '../types'
import { BackBar, Empty, Sheet } from '../components/Layout'
import { BottomSheet, Confirm } from '../components/BottomSheet'
import { NumberField, TagField, TextField } from '../components/Field'
import { IconPlus, IconTrash } from '../components/icons'

const BLANK: Cellar = {
  name: '',
  location: '',
  shelves: [],
  capacityPerShelf: null,
  notes: ''
}

export default function Cellars() {
  const cellars = useLiveQuery(() => db.cellars.toArray(), [])
  const wines = useLiveQuery(() => db.wines.toArray(), [])
  const [editing, setEditing] = useState<Cellar | null>(null)
  const [removing, setRemoving] = useState<Cellar | null>(null)

  const bottlesIn = (id: number | undefined) =>
    (wines ?? [])
      .filter((w) => w.cellarId === id && w.status === 'estoque')
      .reduce((n, w) => n + w.quantity, 0)

  const save = async () => {
    if (!editing) return
    const record = { ...editing, name: editing.name.trim() || 'Adega' }
    if (record.id) await db.cellars.put(record)
    else await db.cellars.add(record)
    setEditing(null)
  }

  const remove = async (cellar: Cellar) => {
    // As garrafas não somem junto: ficam sem adega, esperando um novo lugar.
    await db.transaction('rw', db.cellars, db.wines, async () => {
      await db.wines
        .where('cellarId')
        .equals(cellar.id!)
        .modify({ cellarId: null, shelf: '' })
      await db.cellars.delete(cellar.id!)
    })
    setRemoving(null)
  }

  return (
    <Sheet>
      <BackBar
        title="Adegas"
        to="/gestao"
        right={
          <button
            className="btn-ghost px-4"
            onClick={() => setEditing({ ...BLANK, shelves: ['Prateleira 1'] })}
          >
            <IconPlus width={17} height={17} />
            Nova
          </button>
        }
      />

      {(cellars?.length ?? 0) === 0 ? (
        <Empty
          title="Nenhuma adega"
          hint="Crie uma adega e dê nome às prateleiras. É onde cada garrafa vai morar."
        />
      ) : (
        <div className="grid gap-3">
          {cellars?.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display text-xl font-semibold truncate">
                    {c.name}
                  </div>
                  <div className="text-[12px] text-muted">
                    {[c.location, `${bottlesIn(c.id)} garrafas`]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="btn-ghost px-3" onClick={() => setEditing(c)}>
                    Editar
                  </button>
                  <button
                    className="btn-danger px-3"
                    aria-label={`Excluir ${c.name}`}
                    onClick={() => setRemoving(c)}
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3.5">
                {c.shelves.length === 0 ? (
                  <span className="text-[12px] text-muted">Sem prateleiras.</span>
                ) : (
                  c.shelves.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar adega' : 'Nova adega'}
      >
        {editing && (
          <>
            <TextField
              label="Nome"
              value={editing.name}
              onChange={(name) => setEditing({ ...editing, name })}
              placeholder="Adega da sala"
              autoFocus
            />
            <TextField
              label="Onde fica"
              value={editing.location ?? ''}
              onChange={(location) => setEditing({ ...editing, location })}
              placeholder="Sala de jantar"
            />
            <TagField
              label="Prateleiras"
              values={editing.shelves}
              onChange={(shelves) => setEditing({ ...editing, shelves })}
              placeholder="Prateleira 1"
              hint="Enter ou vírgula para adicionar. A ordem é a de cima para baixo."
            />
            <NumberField
              label="Capacidade por prateleira"
              value={editing.capacityPerShelf}
              onChange={(capacityPerShelf) =>
                setEditing({ ...editing, capacityPerShelf })
              }
              suffix="garrafas"
              hint="Opcional. Serve para a barra de ocupação em Gestão."
            />
            <button className="btn-primary mt-2" onClick={save}>
              Salvar
            </button>
          </>
        )}
      </BottomSheet>

      <Confirm
        open={removing !== null}
        title={`Excluir ${removing?.name}?`}
        message="Os vinhos não são apagados: eles ficam sem adega até você indicar um novo lugar."
        confirmLabel="Excluir adega"
        danger
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && remove(removing)}
      />
    </Sheet>
  )
}
