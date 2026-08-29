import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { photoUrl } from '../lib/photos'
import { ensureBlob } from '../lib/photoSync'
import { IconBottle } from './icons'

/**
 * Foto de capa do vinho. Se a foto veio da nuvem e o arquivo ainda não desceu,
 * baixa sob demanda — a live query redesenha sozinha quando o blob chega.
 */
export function WinePhoto({
  photoId,
  alt,
  className = '',
  rounded = 'rounded-xl'
}: {
  photoId: number | undefined
  alt: string
  className?: string
  rounded?: string
}) {
  const photo = useLiveQuery(
    () => (photoId ? db.photos.get(photoId) : undefined),
    [photoId]
  )

  const needsDownload = Boolean(photo && !photo.blob && photo.path)
  useEffect(() => {
    if (photo && needsDownload) void ensureBlob(photo)
  }, [photo, needsDownload])

  if (!photo?.blob) {
    return (
      <div
        className={`${className} ${rounded} bg-white/[0.03] border border-border
          flex items-center justify-center text-border ${
            needsDownload ? 'animate-pulse' : ''
          }`}
        aria-label={needsDownload ? 'Baixando foto…' : undefined}
        aria-hidden={needsDownload ? undefined : true}
      >
        <IconBottle width={28} height={28} />
      </div>
    )
  }

  return (
    <img
      src={photoUrl(photo.blob, photo.id)}
      alt={alt}
      loading="lazy"
      className={`${className} ${rounded} object-cover bg-white/[0.03]`}
    />
  )
}
