import type { ReactNode } from 'react'
import Image from 'next/image'
import type { CatalogItem } from '@/lib/pdf-catalog-data'

/**
 * Цветовые решения коллекции — как на слайде «Цвета …» каталога: слева форма
 * фасада (если она есть у коллекции), справа образцы цвета с названиями,
 * под ними подпись про торцы и тыльную сторону.
 */
export function FacadePalette({
  items,
  shape,
  shapeAlt,
  note,
  label = 'Цвета и декоры',
  action,
}: {
  items: CatalogItem[]
  shape?: string
  shapeAlt?: string
  note?: string
  label?: string
  /** Ссылка справа от подписи палитры */
  action?: ReactNode
}) {
  return (
    <div className={shape ? 'grid gap-6 md:grid-cols-[12rem_1fr] md:gap-10' : undefined}>
      {shape && (
        <div className="relative aspect-[3/5] w-24 self-start overflow-hidden rounded-xl border border-border bg-muted md:w-full">
          <Image src={shape} alt={shapeAlt ?? 'Форма фасада'} fill sizes="(max-width: 768px) 96px, 192px" className="object-cover" />
        </div>
      )}
      <div>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {label} · {items.length}
          </p>
          {action}
        </div>
        <ul className={shape ? 'grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4' : 'grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6'}>
          {items.map((item) => (
            <li key={item.name} className="flex flex-col gap-2">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                <Image src={item.image} alt={item.name} fill sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw" className="object-cover" />
              </div>
              <span className="text-sm leading-tight text-foreground">{item.name}</span>
            </li>
          ))}
        </ul>
        {note && <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{note}</p>}
      </div>
    </div>
  )
}
