'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useReducedMotion } from 'framer-motion'
import Lightbox from 'yet-another-react-lightbox'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import { ArrowUpRight, ChevronLeft, ChevronRight, Info, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { PortfolioProject } from '@/lib/portfolio-data'
import { flyClose, flyOpen } from '@/components/portfolio-flight'
import { cn } from '@/lib/utils'

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
          {/* Незаполненные поля (площадь, срок) не показываем пустой строкой */}
          {[['Площадь', project.area], ['Изготовление', project.duration], ['Стиль', project.style], ['Фасады', project.tag]].filter(([, value]) => value).map(([label, value]) => <div key={label} className="flex flex-col gap-1"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm font-medium">{value}</dd></div>)}
        </dl>
        <div className="flex flex-col gap-2"><h4 className="font-medium">Материалы</h4><ul className="flex flex-col gap-1">{project.materials.map((material) => <li key={material} className="text-sm leading-relaxed text-muted-foreground">{material}</li>)}</ul></div>
        <div className="flex flex-col gap-2"><h4 className="font-medium">Решения</h4><ul className="flex flex-col gap-1">{project.features.map((feature) => <li key={feature} className="text-sm leading-relaxed text-muted-foreground">{feature}</li>)}</ul></div>
        <a href="/quiz" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">Хочу похожую кухню<ArrowUpRight className="size-4" aria-hidden="true" /></a>
      </div>
    </aside>
  )
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

  useEffect(() => {
    if (!origin) return
    let alive = true
    void flyOpen(origin, setFlying, () => alive)
    return () => { alive = false }
  }, [origin])

  function changeProject(direction: number) {
    const nextProject = (current.projectIndex + direction + projects.length) % projects.length
    setIndex(slides.findIndex((slide) => slide.projectIndex === nextProject))
  }

  return (
    <Lightbox
      open={open}
      close={() => { flyClose(project.id, setFlying); setOpen(false) }}
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
          <header className="portfolio-viewer__heading">
            <p className="text-sm text-background/60">Наши кухни <span aria-hidden="true">/</span> {current.projectIndex + 1} из {projects.length}</p>
            <h2 id="portfolio-viewer-title" className="flyer-title truncate text-xl text-background sm:text-2xl">{project.title}</h2>
          </header>
          <div className="portfolio-viewer__bottom">
            <div className="flex min-w-0 flex-col gap-1" aria-live="polite" aria-atomic="true"><p className="truncate text-sm text-background">{current.photoIndex === 0 ? 'Общий вид' : 'Детали кухни'}<span className="text-background/50"> · {current.photoIndex + 1} / {project.photos.length}</span></p><p className="hidden text-sm text-background/50 sm:block">Листайте фото · Двойное нажатие для увеличения</p></div>
            {projects.length > 1 && <nav aria-label="Переключение проектов" className="flex shrink-0 items-center gap-2"><button type="button" className="portfolio-viewer__project-nav" onClick={() => changeProject(-1)} aria-label="Предыдущий проект"><ChevronLeft className="size-4" aria-hidden="true" /></button><button type="button" className="portfolio-viewer__project-nav" onClick={() => changeProject(1)} aria-label="Следующий проект"><span>Следующий<span className="hidden sm:inline"> проект</span></span><ChevronRight className="size-4" aria-hidden="true" /></button></nav>}
          </div>
          {details && <><button className="portfolio-viewer__details-dismiss" type="button" onClick={() => { setDetails(false); infoButton.current?.focus() }} aria-label="Закрыть информацию"><X className="size-5" aria-hidden="true" /></button><ProjectDetails project={project} /></>}
        </>,
      }}
    />
  )
}
