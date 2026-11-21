'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/plugins/captions.css'

export interface GalleryPhoto {
  id: string
  caption: string
  date: string
}

/**
 * Фото заказа: визуализации проекта или фотоотчёт с производства и монтажа.
 * Сетка с плавным приближением под мышью, по нажатию — просмотр во весь экран
 * с подписями и увеличением. Файлы идут через /kabinet/file — только своему клиенту.
 */
export function PhotoGallery({ photos, aspect = 'aspect-[4/3]' }: { photos: GalleryPhoto[]; aspect?: string }) {
  const [index, setIndex] = useState(-1)

  return (
    <>
      <ul className="admin-stagger grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((photo, i) => (
          <li key={photo.id} style={{ '--i': i } as CSSProperties}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className={`kb-photo group relative block w-full overflow-hidden rounded-lg bg-secondary ${aspect}`}
              aria-label={photo.caption || `Фото ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/kabinet/file/${photo.id}`} alt="" loading="lazy" className="size-full object-cover" />
              {(photo.caption || photo.date) && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6 text-left text-[11px] leading-tight text-white">
                  {photo.caption && <span className="line-clamp-2 font-medium">{photo.caption}</span>}
                  <span className="block opacity-75">{photo.date}</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        plugins={[Captions, Zoom]}
        slides={photos.map((photo) => ({ src: `/kabinet/file/${photo.id}`, description: [photo.caption, photo.date].filter(Boolean).join(' · ') }))}
      />
    </>
  )
}
