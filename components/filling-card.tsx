'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Check } from 'lucide-react'
import type { FillingCategory } from '@/lib/filling-data'
import { FILLING_DRAWINGS, FillingScene } from '@/components/filling-scene'
import { PlayWhenSeen } from '@/components/play-when-seen'
import { PlanTag } from '@/components/plan'
import { cn } from '@/lib/utils'

/**
 * На широком экране три карточки входят в экран разом — выезжают по очереди.
 * На телефоне они друг под другом, и каждая ждёт, пока её долистают
 */
const LAG = ['', 'md:[--lag:1.2s]', 'md:[--lag:2.4s]']

/**
 * Раздел наполнения: схема, на которой модуль выезжает из шкафа, а рядом —
 * фото того же наполнения. Для раздела без схемы — сразу фото
 */
export function FillingCard({ category, index }: { category: FillingCategory; index: number }) {
  const drawing = FILLING_DRAWINGS[category.title]
  const [view, setView] = useState<'scheme' | 'photo'>(drawing ? 'scheme' : 'photo')
  // Вернулись к схеме — модуль выезжает заново и без очереди
  const [run, setRun] = useState(0)

  return (
    <article className="overflow-hidden rounded-3xl border border-primary/35 bg-card">
      <div className="paper relative aspect-[20/17] overflow-hidden">
        {drawing && view === 'scheme' && (
          <PlayWhenSeen key={run} className={cn('fs absolute inset-0', run === 0 ? LAG[index] : '[--lag:0s]')}>
            <FillingScene drawing={drawing} id={String(index)} />
          </PlayWhenSeen>
        )}
        {view === 'photo' && (
          <div className={cn('absolute inset-0 overflow-hidden', drawing && 'hs')}>
            <div className={cn('absolute inset-0 overflow-hidden', drawing && 'hs-wipe')}>
              <div className={cn('absolute inset-0', drawing && 'hs-wipe-img')}>
                <Image src={category.image} alt={category.imageAlt} fill sizes="(max-width: 768px) 100vw, 380px" className="object-cover" />
              </div>
            </div>
          </div>
        )}
        <PlanTag value={String(index + 1).padStart(2, '0')} dot className="absolute left-4 top-4 tabular-nums" />
        {drawing && (
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
        <p className="text-xs font-bold uppercase tracking-widest text-primary">{category.shortTitle}</p>
        <h3 className="flyer-title mt-1 text-2xl text-foreground">{category.title}</h3>
        <ul className="mt-4 flex flex-col gap-2">
          {category.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
