import { useRef, useState } from 'react'
import { db } from '../db/db'
import { deletePhoto, savePhoto } from '../lib/photos'
import type { Photo } from '../types'
import { WinePhoto } from './WinePhoto'
import { IconCamera, IconPlus, IconX } from './icons'

/**
 * Captura e gerencia as fotos de um vinho. Enquanto o vinho não foi salvo,
 * as fotos ficam com wineId -1 e são varridas depois de uma hora.
 */
export function PhotoCapture({
  photoIds,
  onChange,
  wineId,
  max = 4
}: {
  photoIds: number[]
  onChange: (ids: number[]) => void
  wineId: number | null
  max?: number
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setError('')
    try {
      const room = Math.max(0, max - photoIds.length)
      const kinds: Photo['kind'][] = ['rotulo', 'contra', 'garrafa', 'outro']
      const ids: number[] = []
      for (const [i, file] of Array.from(files).slice(0, room).entries()) {
        ids.push(
          await savePhoto(file, kinds[Math.min(photoIds.length + i, 3)], wineId ?? -1)
        )
      }
      onChange([...photoIds, ...ids])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui salvar a foto.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    onChange(photoIds.filter((x) => x !== id))
    await deletePhoto(id)
  }

  /** A capa é a primeira foto: é ela que aparece nas listas e no cardápio. */
  const makeCover = (id: number) => {
    onChange([id, ...photoIds.filter((x) => x !== id)])
  }

  return (
    <div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {photoIds.map((id, i) => (
          <div key={id} className="relative shrink-0">
            <button type="button" onClick={() => makeCover(id)} className="block">
              <WinePhoto
                photoId={id}
                alt={`Foto ${i + 1}`}
                className={`w-[92px] h-[124px] border ${
                  i === 0 ? 'border-gold/70' : 'border-border'
                }`}
              />
            </button>
            {i === 0 && (
              <span className="absolute bottom-1 left-1 font-mono text-[9px] px-1.5 py-0.5
                rounded bg-black/70 text-gold tracking-wider">
                CAPA
              </span>
            )}
            <button
              type="button"
              aria-label="Remover foto"
              onClick={() => remove(id)}
              className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-card
                border border-border flex items-center justify-center text-muted"
            >
              <IconX width={13} height={13} />
            </button>
          </div>
        ))}

        {photoIds.length < max && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="shrink-0 w-[92px] h-[124px] rounded-xl border border-dashed
                border-wine/50 bg-wine/[0.06] flex flex-col items-center justify-center
                gap-1.5 text-wine disabled:opacity-40"
            >
              <IconCamera width={24} height={24} />
              <span className="font-mono text-[9px] tracking-[0.14em]">
                {busy ? 'SALVANDO' : 'FOTO'}
              </span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => libraryRef.current?.click()}
              className="shrink-0 w-[62px] h-[124px] rounded-xl border border-dashed
                border-border flex flex-col items-center justify-center gap-1.5
                text-muted disabled:opacity-40"
            >
              <IconPlus width={20} height={20} />
              <span className="font-mono text-[9px] tracking-[0.12em]">FOTOS</span>
            </button>
          </>
        )}
      </div>

      {error && <p className="text-danger text-xs mt-2">{error}</p>}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void add(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void add(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

/** Vincula as fotos soltas ao vinho recém-salvo. */
export async function linkPhotos(ids: number[], wineId: number): Promise<void> {
  await Promise.all(ids.map((id) => db.photos.update(id, { wineId })))
}
