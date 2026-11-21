'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { CatalogItem } from '@/lib/pdf-catalog-data'
import { PlayWhenSeen } from '@/components/play-when-seen'
import { PlanTag } from '@/components/plan'
import { StorageScene, storageSceneKey } from '@/components/storage-scene'
import { cn } from '@/lib/utils'

/**
 * На широком экране три карточки ряда входят в экран разом — механизмы
 * срабатывают по очереди. На телефоне карточки друг под другом, и каждая
 * ждёт, пока её долистают
 */
const LAG = ['', 'md:[--lag:1.2s]', 'md:[--lag:2.4s]']

/**
 * Система хранения на /filling и /wardrobes — как «Наполнение» на главной
 * (filling-card.tsx): схема, на которой механизм показывает, как работает,
 * а рядом фото. Схема ищется по фото позиции; если фото заменили в панели
 * и схемы для него нет — карточка сразу с фото
 */
export function StorageCard({ item, index }: { item: CatalogItem; index: number }) {
  const scene = storageSceneKey(item.image)
  const [view, setView] = useState<'scheme' | 'photo'>(scene ? 'scheme' : 'photo')
  // Вернулись к схеме — механизм срабатывает заново и без очереди
  const [run, setRun] = useState(0)

  return (
    <article className="overflow-hidden rounded-3xl border border-primary/35 bg-card">
      <div className="paper relative aspect-[20/17] overflow-hidden">
        {scene && view === 'scheme' && (
          <PlayWhenSeen key={run} className={cn('ss absolute inset-0', run === 0 ? LAG[index % 3] : '[--lag:0s]')}>
            <StorageScene scene={scene} id={scene} />
          </PlayWhenSeen>
        )}
        {view === 'photo' && (
          <div className={cn('absolute inset-0 overflow-hidden', scene && 'hs')}>
            <div className={cn('absolute inset-0 overflow-hidden', scene && 'hs-wipe')}>
              <div className={cn('absolute inset-0', scene && 'hs-wipe-img')}>
                <Image src={item.image} alt={item.name} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" />
              </div>
            </div>
          </div>
        )}
        <PlanTag value={String(index + 1).padStart(2, '0')} dot className="absolute left-4 top-4 tabular-nums" />
        {scene && (
          <div role="group" aria-label="Что показать" className="absolute right-3 top-3 flex rounded-full border border-primary/35 bg-card/90 p-0.5 text-xs font-semibold">
            {(['scheme', 'photo'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => {
                  if (view === option) return
                  if (option === 'scheme') setRun((value) => value + 1)
                  setView(option)
                }}
                className={cn(
                  'min-h-9 rounded-full px-3 transition-colors',
                  view === option ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {option === 'scheme' ? 'Схема' : 'Фото'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="flyer-title text-2xl text-foreground">{item.name}</h3>
        {item.meta && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.meta}</p>}
      </div>
    </article>
  )
}
