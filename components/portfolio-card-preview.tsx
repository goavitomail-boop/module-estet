'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { PortfolioProject } from '@/lib/portfolio-data'
import { PlanTag } from '@/components/plan'
import { enter, leave, POP } from '@/components/scene-kit'
import { cn } from '@/lib/utils'

/**
 * Короткий показ проекта прямо в карточке: обложку шторкой сменяют фото
 * деталей, и на каждом встаёт бирка с фактом проекта — срок, стиль, фасады.
 * Играет, пока на карточку наведён курсор (на телефоне — пока карточка
 * в середине экрана). Когда показ кончился, уходит быстро и открывает обложку.
 */

/** Первая шторка и шаг между фото, с. Бирке хватает ~1,3 с на чтение */
const FIRST = 0.25
const STEP = 1.9
/** Сколько фото максимум: дольше человек не держит курсор */
const MAX_SLIDES = 3
/** Не дождались фото — всё равно играем, шторка покажет то, что успело */
const LOAD_TIMEOUT = 1200

/** photo — номер фото в проекте: с него откроется просмотр, если нажать сейчас */
type Slide = { src: string; photo: number; title: string; value: string }

/** Фото деталей (после главного) в паре с фактами проекта; пустые поля пропускаем */
export function previewSlides(project: PortfolioProject): Slide[] {
  if (project.isPlaceholder) return []
  const facts = [
    ['Изготовление', project.duration],
    ['Стиль', project.style],
    ['Фасады', project.tag],
  ].filter(([, value]) => value)
  const photos = project.photos.slice(1)
  return facts.slice(0, Math.min(MAX_SLIDES, photos.length)).map(([title, value], i) => ({ src: photos[i].src, photo: i + 1, title, value }))
}

export function CardPreview({ slides, active, sizes }: { slides: Slide[]; active: boolean; sizes: string }) {
  const [phase, setPhase] = useState<'off' | 'on' | 'leaving'>('off')
  // Каждый новый показ — с начала: сцена монтируется заново по ключу
  const [run, setRun] = useState(0)

  useEffect(() => {
    if (active) {
      setPhase('on')
      setRun((value) => value + 1)
    } else {
      setPhase((value) => (value === 'off' ? 'off' : 'leaving'))
    }
  }, [active])

  if (phase === 'off' || slides.length === 0) return null
  return <PreviewScene key={run} slides={slides} sizes={sizes} leaving={phase === 'leaving'} onLeft={() => setPhase('off')} />
}

function PreviewScene({ slides, sizes, leaving, onLeft }: { slides: Slide[]; sizes: string; leaving: boolean; onLeft: () => void }) {
  const [loaded, setLoaded] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const ready = timedOut || loaded >= slides.length

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT)
    return () => clearTimeout(timer)
  }, [])

  // Ушли раньше, чем фото загрузились: сцена ещё стоит, уходить нечему
  useEffect(() => {
    if (leaving && !ready) onLeft()
  }, [leaving, ready, onLeft])

  return (
    <div
      className={cn('hs hs-wait absolute inset-0', leaving && 'hs-leave')}
      data-wait={ready ? undefined : ''}
      onAnimationEnd={(event) => {
        if (leaving && event.target === event.currentTarget) onLeft()
      }}
      aria-hidden="true"
    >
      {slides.map((slide, i) => {
        const delay = { animationDelay: `${FIRST + i * STEP}s` }
        return (
          <div key={slide.src} className="hs-wipe absolute inset-0 overflow-hidden" style={delay} data-photo={slide.photo}>
            <div className="hs-wipe-img absolute inset-0" style={delay}>
              <Image src={slide.src} alt="" fill sizes={sizes} className="object-cover" onLoad={() => setLoaded((value) => value + 1)} />
            </div>
          </div>
        )
      })}
      {slides.map((slide, i) => {
        const at = FIRST + i * STEP
        const last = i === slides.length - 1
        return (
          // Вход и уход — на разных элементах; последняя бирка остаётся
          <span key={slide.title} className={cn('absolute right-3 top-3 max-w-[70%]', !last && 'hs-out')} style={last ? undefined : leave(at + STEP - 0.3)}>
            <span className="hs-in block" style={enter(at + 0.55, POP)}>
              <PlanTag title={slide.title} value={slide.value} dot />
            </span>
          </span>
        )
      })}
    </div>
  )
}
