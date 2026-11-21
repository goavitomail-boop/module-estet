'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { useReducedMotion } from 'framer-motion'
import Lightbox from 'yet-another-react-lightbox'
import { COMPANY } from '@/lib/company'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import { ArrowUpRight, ChevronLeft, ChevronRight, Info, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { PortfolioProject } from '@/lib/portfolio-data'
import { flyClose, flyOpen, nextFrame } from '@/components/portfolio-flight'
import { currentPhotoBox, playChapter, type ChapterRun } from '@/components/portfolio-chapter'
import { PlanTag } from '@/components/plan'
import { RollingCount } from '@/components/rolling-count'
import { enter, leave, POP } from '@/components/scene-kit'
import { cn } from '@/lib/utils'

/** Карусель просмотра листает свайпом за 0,3 с — бирку ставим, когда фото встало */
const SWIPE_SETTLE_MS = 320
/** Бирка проекта стоит, пока её читают: номер, площадь, стиль */
const TAG_LEAVE_AT = 2.3

const labels = {
  Next: 'Следующее фото', Previous: 'Предыдущее фото', Close: 'Закрыть галерею',
  'Zoom in': 'Увеличить', 'Zoom out': 'Уменьшить',
  'Show thumbnails': 'Показать миниатюры', 'Hide thumbnails': 'Скрыть миниатюры',
  'Image failed to load': 'Не удалось загрузить фото',
  'Photo gallery': 'Фотографии кухонь', Thumbnails: 'Миниатюры',
  '{index} of {total}': '{index} из {total}',
}

function ProjectDetails({ project }: { project: PortfolioProject }) {
  return (
    <aside id="portfolio-details" aria-label="Информация о проекте" className="portfolio-viewer__details" onKeyDown={(event) => { if (event.key.startsWith('Arrow')) event.stopPropagation() }}>
      <div className="flex flex-col gap-4">
        <p className="flyer-script text-2xl text-primary">О проекте</p>
        <h3 className="flyer-title text-3xl leading-tight">{project.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{project.description}</p>
        <dl className="grid grid-cols-2 gap-5 border-y border-border py-5">
          {/* Незаполненные поля (площадь) не показываем пустой строкой. Срок —
              общий для всех проектов, из lib/company.ts */}
          {[['Площадь', project.area], ['Изготовление', COMPANY.productionTime], ['Стиль', project.style], ['Фасады', project.tag]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="flex flex-col gap-1"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm font-medium">{value}</dd></div>)}
        </dl>
        <div className="flex flex-col gap-2"><h4 className="font-medium">Материалы</h4><ul className="flex flex-col gap-1">{project.materials.map((material) => <li key={material} className="text-sm leading-relaxed text-muted-foreground">{material}</li>)}</ul></div>
        <div className="flex flex-col gap-2"><h4 className="font-medium">Решения</h4><ul className="flex flex-col gap-1">{project.features.map((feature) => <li key={feature} className="text-sm leading-relaxed text-muted-foreground">{feature}</li>)}</ul></div>
        <a href="/quiz" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">Хочу похожую кухню<ArrowUpRight className="size-4" aria-hidden="true" /></a>
        {!project.isPlaceholder && (
          <a href={`/portfolio/${project.id}`} className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-border px-5 text-sm font-medium">Страница проекта<ArrowUpRight className="size-4" aria-hidden="true" /></a>
        )}
      </div>
    </aside>
  )
}

/** Бирка проекта, как на карточке: номер, а рядом то, что о нём известно */
function ProjectTag({ project, number }: { project: PortfolioProject; number: number }) {
  const label = `Проект ${String(number).padStart(2, '0')}`
  const facts = [project.area, project.style].filter(Boolean).join(' · ')
  return <PlanTag title={facts ? label : undefined} value={facts || label} dot />
}

export function PortfolioModal({ projects, initialProjectId, initialPhoto = 0, origin, onClose }: { projects: PortfolioProject[]; initialProjectId: string; initialPhoto?: number; origin?: HTMLElement | null; onClose: () => void }) {
  const slides = useMemo(() => projects.flatMap((project, projectIndex) => project.photos.map((photo, photoIndex) => ({ ...photo, projectIndex, photoIndex }))), [projects])
  const [index, setIndex] = useState(() => {
    const ofProject = (slide: (typeof slides)[number]) => projects[slide.projectIndex].id === initialProjectId
    const exact = slides.findIndex((slide) => ofProject(slide) && slide.photoIndex === initialPhoto)
    return Math.max(0, exact >= 0 ? exact : slides.findIndex(ofProject))
  })
  const [open, setOpen] = useState(true)
  const [details, setDetails] = useState(false)
  const infoButton = useRef<HTMLButtonElement>(null)
  const reducedMotion = useReducedMotion()
  const current = slides[index]
  const project = projects[current.projectIndex]
  // Пока летит снимок из карточки, настоящее фото спрятано под ним
  const [flying, setFlying] = useState(() => Boolean(origin) && !reducedMotion)

  // Смена проекта кнопками идёт главой (components/portfolio-chapter.ts): пока
  // въезжает шторка, просмотр ещё на старом проекте, а заголовок и счёт уже
  // на новом
  const [chapter, setChapter] = useState<{ to: number; dir: 1 | -1 } | null>(null)
  const run = useRef<ChapterRun | null>(null)
  const viaChapter = useRef(false)
  const shown = chapter?.to ?? current.projectIndex
  const shownProject = projects[shown]
  // Заголовок выезжает из-под маски при смене проекта, но не при открытии:
  // тогда главное — перелёт снимка из карточки
  const [moved, setMoved] = useState(false)
  if (!moved && shownProject.id !== initialProjectId) setMoved(true)

  // Бирка проекта на снимке: при каждой смене проекта, как бы его ни сменили
  const [tag, setTag] = useState<{ project: number; left: number; bottom: number; width: number; n: number } | null>(null)
  const lastProject = useRef(current.projectIndex)

  useEffect(() => {
    if (!origin) return
    let alive = true
    void flyOpen(origin, setFlying, () => alive)
    return () => { alive = false }
  }, [origin])

  useEffect(() => () => run.current?.cancel(), [])

  // Первое фото соседних проектов — в кеш заранее: шторке есть что везти
  useEffect(() => {
    for (const step of [1, -1]) {
      const neighbour = projects[(shown + step + projects.length) % projects.length]
      if (neighbour?.photos[0]) new window.Image().src = neighbour.photos[0].src
    }
  }, [projects, shown])

  useEffect(() => {
    if (lastProject.current === current.projectIndex) return
    lastProject.current = current.projectIndex
    setTag(null)
    if (reducedMotion) return
    // После шторки фото уже стоит; после свайпа карусель ещё доезжает
    const settle = viaChapter.current ? 0 : SWIPE_SETTLE_MS
    viaChapter.current = false
    let alive = true
    const timer = setTimeout(async () => {
      for (let start = performance.now(); alive && performance.now() - start < 1500; ) {
        const box = currentPhotoBox()
        if (box) {
          setTag({ project: current.projectIndex, left: box.left, bottom: box.bottom, width: box.width, n: performance.now() })
          return
        }
        await nextFrame()
      }
    }, settle)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [current.projectIndex, reducedMotion])

  function changeProject(direction: 1 | -1) {
    const from = chapter?.to ?? current.projectIndex
    // Проект без фото (заведён заранее, съёмки ещё нет) пропускаем: показать нечего
    let next = from
    do next = (next + direction + projects.length) % projects.length
    while (next !== from && projects[next].photos.length === 0)
    const target = slides.findIndex((slide) => slide.projectIndex === next)
    if (next === from || target < 0) return

    setChapter({ to: next, dir: direction })
    setTag(null)
    viaChapter.current = true
    // Листают дальше, пока прошлая шторка едет, — новая въезжает поверх неё
    const thisRun = playChapter(slides[target].src, direction, () => setIndex(target), run.current)
    run.current = thisRun
    void thisRun.done.then(() => {
      if (run.current !== thisRun) return
      run.current = null
      setChapter(null)
    })
  }

  const caption = chapter ? { photoIndex: 0, total: shownProject.photos.length } : { photoIndex: current.photoIndex, total: project.photos.length }

  return (
    <Lightbox
      open={open}
      close={() => { run.current?.cancel(); flyClose(project.id, setFlying); setOpen(false) }}
      index={index}
      slides={slides}
      className={cn('portfolio-viewer font-sans', details && 'portfolio-viewer--details', flying && 'portfolio-viewer--flying')}
      plugins={[Thumbnails, Zoom]}
      labels={labels}
      controller={{ aria: true, closeOnPullDown: true }}
      portal={{ container: { role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'portfolio-viewer-title' } }}
      carousel={{ padding: 16, spacing: 24, preload: 1, imageFit: 'contain' }}
      animation={{ fade: reducedMotion ? 0 : 200, swipe: reducedMotion ? 0 : 300, zoom: reducedMotion ? 0 : 250 }}
      zoom={{ maxZoomPixelRatio: 3, doubleClickMaxStops: 1 }}
      thumbnails={{ width: 72, height: 52, gap: 8, padding: 2, borderRadius: 6, showToggle: true, vignette: false, imageFit: 'cover' }}
      on={{ view: ({ index: next }) => setIndex(next), exited: onClose }}
      toolbar={{ buttons: [
        <button key="details" ref={infoButton} type="button" className="yarl__button" aria-label={details ? 'Скрыть информацию о проекте' : 'Информация о проекте'} title="Информация о проекте" aria-expanded={details} aria-controls="portfolio-details" onClick={() => setDetails((value) => !value)}><Info className="size-5" aria-hidden="true" /></button>,
        'close',
      ] }}
      render={{
        iconPrev: () => <ChevronLeft className="size-6" aria-hidden="true" />,
        iconNext: () => <ChevronRight className="size-6" aria-hidden="true" />,
        iconClose: () => <X className="size-6" aria-hidden="true" />,
        iconZoomIn: () => <ZoomIn className="size-5" aria-hidden="true" />,
        iconZoomOut: () => <ZoomOut className="size-5" aria-hidden="true" />,
        thumbnail: ({ slide }) => <span className="relative block size-full"><Image src={slide.src} alt={slide.alt || ''} fill sizes="72px" className="object-cover" /></span>,
        controls: () => <>
          <header className="portfolio-viewer__heading hs">
            <p className="text-sm text-background/60">Наши кухни <span aria-hidden="true">/</span> <RollingCount value={shown + 1} dir={chapter?.dir} /> из {projects.length}</p>
            <h2 id="portfolio-viewer-title" className="flyer-title truncate text-xl text-background sm:text-2xl">
              {moved ? (
                <span key={shownProject.id} className="hs-mask">
                  <span className="max-w-full truncate align-top" style={{ '--d': '0.2s' } as CSSProperties}>{shownProject.title}</span>
                </span>
              ) : shownProject.title}
            </h2>
          </header>
          {tag && (
            <span key={tag.n} className="hs pointer-events-none absolute" style={{ left: tag.left + 12, bottom: tag.bottom + 12, maxWidth: tag.width - 24 }} aria-hidden="true">
              <span className="hs-out block" style={leave(TAG_LEAVE_AT)} onAnimationEnd={(event) => { if (event.target === event.currentTarget) setTag(null) }}>
                <span className="hs-in block" style={enter(0.1, POP)}>
                  <ProjectTag project={projects[tag.project]} number={tag.project + 1} />
                </span>
              </span>
            </span>
          )}
          <div className="portfolio-viewer__bottom">
            <div className="flex min-w-0 flex-col gap-1" aria-live="polite" aria-atomic="true"><p className="truncate text-sm text-background">{caption.photoIndex === 0 ? 'Общий вид' : 'Детали кухни'}<span className="text-background/50"> · {caption.photoIndex + 1} / {caption.total}</span></p><p className="hidden text-sm text-background/50 sm:block">Листайте фото · Двойное нажатие для увеличения</p></div>
            {projects.length > 1 && <nav aria-label="Переключение проектов" className="flex shrink-0 items-center gap-2"><button type="button" className="portfolio-viewer__project-nav" onClick={() => changeProject(-1)} aria-label="Предыдущий проект"><ChevronLeft className="size-4" aria-hidden="true" /></button><button type="button" className="portfolio-viewer__project-nav" onClick={() => changeProject(1)} aria-label="Следующий проект"><span>Следующий<span className="hidden sm:inline"> проект</span></span><ChevronRight className="size-4" aria-hidden="true" /></button></nav>}
          </div>
          {details && <><button className="portfolio-viewer__details-dismiss" type="button" onClick={() => { setDetails(false); infoButton.current?.focus() }} aria-label="Закрыть информацию"><X className="size-5" aria-hidden="true" /></button><ProjectDetails project={shownProject} /></>}
        </>,
      }}
    />
  )
}
