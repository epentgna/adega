import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { nextCode } from '../lib/code'
import { emptyWine, saveWine } from '../lib/wine'
import type { Wine } from '../types'
import { BackBar, Sheet } from '../components/Layout'
import { PhotoCapture, linkPhotos } from '../components/PhotoCapture'
import { EnrichPanel } from '../components/EnrichPanel'
import { WineForm } from '../components/WineForm'
import { IconCheck } from '../components/icons'

export default function AddWine() {
  const navigate = useNavigate()
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const cellars = useLiveQuery(() => db.cellars.toArray(), [])
  const [wine, setWine] = useState<Wine>(() => emptyWine())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Reserva o número assim que a tela abre, para você já etiquetar a garrafa.
  useEffect(() => {
    if (!settings || wine.code) return
    void nextCode(settings).then(({ code, seq }) =>
      setWine((w) => (w.code ? w : { ...w, code, seq }))
    )
  }, [settings, wine.code])

  // Primeira adega vira o padrão: uma escolha a menos por garrafa.
  useEffect(() => {
    if (wine.cellarId === null && cellars?.length) {
      const first = cellars[0]
      setWine((w) =>
        w.cellarId === null
          ? { ...w, cellarId: first.id!, shelf: w.shelf || first.shelves[0] || '' }
          : w
      )
    }
  }, [cellars, wine.cellarId])

  const patch = (p: Partial<Wine>) => setWine((w) => ({ ...w, ...p }))

  const save = async () => {
    if (!wine.name.trim() && !wine.producer.trim()) {
      setError('Dê ao menos um nome ou produtor para esta garrafa.')
      return
    }
    setSaving(true)
    setError('')
    try {
      // Reconfirma o número na hora de salvar: outra aba pode ter cadastrado.
      const taken = await db.wines.where('code').equals(wine.code).first()
      const final = taken ? { ...wine, ...(await nextCode(settings)) } : wine
      const id = await saveWine(final)
      await linkPhotos(final.photoIds, id)
      navigate(`/vinho/${id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui salvar.')
      setSaving(false)
    }
  }

  return (
    <Sheet>
      <BackBar
        title="Catalogar"
        right={
          <span className="code-tag border border-gold/40 rounded-lg px-2.5 py-1.5">
            {wine.code || '—'}
          </span>
        }
      />

      <div className="eyebrow mb-3">Fotos do rótulo</div>
      <PhotoCapture
        photoIds={wine.photoIds}
        onChange={(photoIds) => patch({ photoIds })}
        wineId={null}
      />
      <p className="text-[12px] text-muted mt-2.5 mb-5 leading-relaxed">
        A primeira foto é a capa. Fotografe também o contra-rótulo: é lá que
        costumam estar as uvas e o teor alcoólico.
      </p>

      <EnrichPanel wine={wine} onApply={setWine} settings={settings} />

      <div className="mt-7">
        <WineForm
          wine={wine}
          patch={patch}
          cellars={cellars}
          currency={settings?.currency ?? 'BRL'}
        />
      </div>

      {error && <p className="text-danger text-[13px] mt-5">{error}</p>}

      <div className="mt-7 grid gap-3">
        <button className="btn-primary" onClick={save} disabled={saving}>
          <IconCheck />
          {saving ? 'Salvando…' : `Salvar como ${wine.code}`}
        </button>
        <button className="btn-ghost" onClick={() => navigate(-1)} disabled={saving}>
          Cancelar
        </button>
      </div>
    </Sheet>
  )
}
