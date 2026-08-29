import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { photoUrl } from '../lib/photos'
import { IconBottle } from './icons'

/** Mostra a foto de capa do vinho (ou um marcador quando não há foto). */
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

  if (!photoId || !photo) {
    return (
      <div
        className={`${className} ${rounded} bg-white/[0.03] border border-border
          flex items-center justify-center text-border`}
        aria-hidden
      >
        <IconBottle width={28} height={28} />
      </div>
    )
  }

  return (
    <img
      src={photoUrl(photo)}
      alt={alt}
      loading="lazy"
      className={`${className} ${rounded} object-cover bg-white/[0.03]`}
    />
  )
}
