import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { deleteWine, saveWine } from '../lib/wine'
import type { Wine } from '../types'
import { BackBar, Sheet } from '../components/Layout'
import { PhotoCapture } from '../components/PhotoCapture'
import { EnrichPanel } from '../components/EnrichPanel'
import { WineForm } from '../components/WineForm'
import { Confirm } from '../components/BottomSheet'
import { IconCheck, IconTrash } from '../components/icons'

export default function EditWine() {
  const { id } = useParams()
  const wineId = Number(id)
  const navigate = useNavigate()
  const stored = useLiveQuery(() => db.wines.get(wineId), [wineId])
  const cellars = useLiveQuery(() => db.cellars.toArray(), [])
  const settings = useLiveQuery(() => db.settings.get(1), [])

  const [wine, setWine] = useState<Wine | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  // Carrega uma vez: depois disso o formulário é a fonte da verdade.
  useEffect(() => {
    if (stored && !wine) setWine(stored)
  }, [stored, wine])

  if (stored === undefined) return <Sheet>Carregando…</Sheet>
  if (!stored) return <Sheet>Vinho não encontrado.</Sheet>
  if (!wine) return <Sheet>Carregando…</Sheet>

  const patch = (p: Partial<Wine>) => setWine((w) => (w ? { ...w, ...p } : w))

  const save = async () => {
    setSaving(true)
    await saveWine(wine)
    navigate(`/vinho/${wineId}`, { replace: true })
  }

  return (
    <Sheet>
      <BackBar
        title="Editar"
        right={<span className="code-tag">{wine.code}</span>}
      />

      <div className="eyebrow mb-3">Fotos</div>
      <PhotoCapture
        photoIds={wine.photoIds}
        onChange={(photoIds) => patch({ photoIds })}
        wineId={wineId}
      />

      <div className="mt-5">
        <EnrichPanel wine={wine} onApply={setWine} settings={settings} />
      </div>

      <div className="mt-7">
        <WineForm
          wine={wine}
          patch={patch}
          cellars={cellars}
          currency={settings?.currency ?? 'BRL'}
        />
      </div>

      <div className="mt-7 grid gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          <IconCheck />
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
        <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
          <IconTrash />
          Excluir do catálogo
        </button>
      </div>

      <Confirm
        open={confirmDelete}
        title={`Excluir ${wine.code}?`}
        message="O vinho e as fotos dele somem para sempre. O número não é reaproveitado."
        confirmLabel="Excluir"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteWine(wineId)
          navigate('/catalogo', { replace: true })
        }}
      />
    </Sheet>
  )
}
