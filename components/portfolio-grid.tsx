'use client'

import dynamic from 'next/dynamic'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FocusEvent, type PointerEvent, type RefObject } from 'react'
import { Grid2X2, Grid3X3, Images, Maximize2 } from 'lucide-react'
import { type PortfolioProject } from '@/lib/portfolio-data'
import { PortfolioImage } from '@/components/portfolio-image'
import { CardPreview, previewSlides } from '@/components/portfolio-card-preview'
import { visibleCardPhoto } from '@/components/portfolio-flight'
import { play as playReflow, snapshot, type Snapshot } from '@/components/portfolio-reflow'
import { RollingCount } from '@/components/rolling-count'
import { PlanButton, PlanTag } from '@/components/plan'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

const PortfolioModal = dynamic(() => import('@/components/portfolio-modal').then((module) => module.PortfolioModal), { ssr: false })

const filters = [
  { id: 'all', label: 'Все проекты', matches: () => true },
  { id: 'modern', label: 'Современные', matches: (p: PortfolioProject) => ['Современный', 'Минимализм'].includes(p.style) },
  { id: 'classic', label: 'Классика', matches: (p: PortfolioProject) => ['Классика', 'Неоклассика', 'Современная классика'].includes(p.style) },
  { id: 'scandi', label: 'Сканди', matches: (p: PortfolioProject) => p.style === 'Скандинавский' },
  { id: 'compact', label: 'Небольшие', matches: (p: PortfolioProject) => parseFloat(p.area) <= 10 },
]

const preload = (src: string) => { new window.Image().src = src }

const COVER_SIZES = '(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 640px'

/**
 * Когда карточка «смотрится»: курсор на ней или фокус с клавиатуры, а на
 * сенсорном экране — пока она пересекает узкую полосу посередине экрана
 */
function useCardActive(ref: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { rootMargin: '-45% 0px -45% 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  const handlers = {
    onPointerEnter: (event: PointerEvent) => { if (event.pointerType === 'mouse') setActive(true) },
    onPointerLeave: (event: PointerEvent) => { if (event.pointerType === 'mouse') setActive(false) },
    // Только фокус с клавиатуры: после закрытия просмотра фокус возвращается
    // на карточку, и показ не должен начинаться заново сам
    onFocus: (event: FocusEvent<HTMLElement>) => { if (event.currentTarget.matches(':focus-visible')) setActive(true) },
    onBlur: () => setActive(false),
  }
  return [active, handlers] as const
}

function ProjectCard({ project, index, onOpen }: { project: PortfolioProject; index: number; onOpen: (trigger: HTMLButtonElement, photo: number) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [active, handlers] = useCardActive(ref)
  const slides = useMemo(() => previewSlides(project), [project])

  // Раз человек смотрит на проект, заранее грузим первое фото просмотра:
  // к клику оно уже в кеше, и обложке есть куда прилететь
  useEffect(() => {
    if (active && project.photos[0]) preload(project.photos[0].src)
  }, [active, project.photos])

  return (
    <article className="group flex min-w-0 flex-col gap-4">
      <button
        ref={ref}
        {...handlers}
        type="button"
        data-portfolio-card={project.id}
        className="portfolio-card relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        // Просмотр откроется на фото, которое видно в карточке, — грузим его,
        // пока палец или кнопка мыши ещё нажаты
        onPointerDown={() => { const photo = project.photos[visibleCardPhoto(ref.current)]; if (photo) preload(photo.src) }}
        onClick={(event) => onOpen(event.currentTarget, visibleCardPhoto(event.currentTarget))}
        aria-label={`Смотреть проект «${project.title}»`}
        aria-haspopup="dialog"
      >
        <PortfolioImage
          src={project.coverSrc}
          alt={project.alt}
          fill
          sizes={COVER_SIZES}
          className="motion-safe:transition-transform motion-safe:duration-700 group-hover:scale-[1.035]"
        />
        <CardPreview slides={slides} active={active} sizes={COVER_SIZES} />
        {project.isPlaceholder ? (
          <span className="plan-tag absolute left-3 top-3">
            <span className="plan-tag__value">Скоро фотоотчёт</span>
          </span>
        ) : (
          <span className="plan-tag plan-tag--row absolute left-3 top-3">
            <Images className="size-3.5 text-primary" aria-hidden="true" />
            <span className="plan-tag__value">{project.photos.length} фото</span>
          </span>
        )}
        {/* Бирка как выноска на первом экране: номер проекта и площадь.
            Площадь заполнена не у всех — тогда в бирке остаётся только номер */}
        <PlanTag
          title={project.area ? `Проект ${String(index + 1).padStart(2, '0')}` : undefined}
          value={project.area || `Проект ${String(index + 1).padStart(2, '0')}`}
          dot
          className="absolute bottom-3 left-3"
        />
        <span className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Maximize2 className="size-5" aria-hidden="true" />
        </span>
      </button>
      <div data-card-caption className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h3 className="flyer-title text-xl leading-tight sm:text-2xl">{project.title}</h3>
            {!project.isPlaceholder && (
              <span className="hidden rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary sm:inline-block">
                Свежий монтаж
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{project.style}<span aria-hidden="true"> · </span>{project.tag}</p>
        </div>
      </div>
    </article>
  )
}

/** Список приходит с сервера: проекты редактируются в панели, а не в коде */
export function PortfolioGrid({ projects: allProjects }: { projects: PortfolioProject[] }) {
  const [filter, setFilter] = useState('all')
  const [density, setDensity] = useState('large')
  const [selected, setSelected] = useState<string | null>(null)
  const [origin, setOrigin] = useState<HTMLButtonElement | null>(null)
  const [photo, setPhoto] = useState(0)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const reflow = useRef<Snapshot | null>(null)
  const projects = useMemo(() => {
    const active = filters.find((item) => item.id === filter) ?? filters[0]
    return allProjects.filter(active.matches)
  }, [allProjects, filter])

  // Карточки запоминают свои места до смены, а после неё переезжают
  // на новые (components/portfolio-reflow.ts)
  function changeFilter(next: string) {
    if (next === filter) return
    const matches = (filters.find((item) => item.id === next) ?? filters[0]).matches
    reflow.current = snapshot(listRef.current, 'filter', new Set(projects.filter((project) => !matches(project)).map((project) => project.id)))
    setFilter(next)
  }

  function changeDensity(next: string) {
    if (next === density) return
    reflow.current = snapshot(listRef.current, 'density')
    setDensity(next)
  }

  useLayoutEffect(() => {
    playReflow(listRef.current, reflow.current)
    reflow.current = null
  }, [projects, density])

  // Фильтр, под который не осталось ни одного проекта, показывать нечем:
  // после редактирования портфолио такое вполне может случиться
  const available = useMemo(
    () => filters.filter((item) => allProjects.some(item.matches)),
    [allProjects]
  )

  // «Все» плюс одна категория — это не выбор, а шум. Показываем фильтр,
  // когда кроме «Все» есть хотя бы две категории
  const showFilters = available.length >= 3

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-4 border-b border-border pb-5">
        {showFilters && (
          <div className="overflow-x-auto pb-1">
            <ToggleGroup aria-label="Фильтр проектов" value={[filter]} onValueChange={(value) => { if (value[0]) changeFilter(value[0]) }} variant="portfolio" size="touch" spacing={2} className="gap-2">
              {available.map((item) => <ToggleGroupItem key={item.id} value={item.id}>{item.label}<span className="ml-1 tabular-nums opacity-60">{allProjects.filter(item.matches).length}</span></ToggleGroupItem>)}
            </ToggleGroup>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <p role="status" className="text-sm text-muted-foreground">
            {showFilters ? <>Показано <RollingCount value={projects.length} /> из {allProjects.length} проектов</> : `Проектов: ${allProjects.length}`}
          </p>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground lg:block">Откройте фото, чтобы рассмотреть детали</span>
            <ToggleGroup aria-label="Размер фотографий" value={[density]} onValueChange={(value) => { if (value[0]) changeDensity(value[0]) }} variant="outline" size="touch" spacing={0} className="hidden sm:flex">
              <ToggleGroupItem value="large" aria-label="Крупные фотографии" title="Крупные фотографии"><Grid2X2 /></ToggleGroupItem>
              <ToggleGroupItem value="compact" aria-label="Компактная сетка" title="Компактная сетка"><Grid3X3 /></ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">Готовим фотоотчёты новых проектов — покажем совсем скоро.</p>
      ) : (
        <ul ref={listRef} data-anim="stagger" className={cn('grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:gap-x-8 lg:gap-y-10', density === 'compact' && 'portfolio-grid--compact sm:grid-cols-3')}>
          {projects.map((project, index) => <li key={project.id} data-project={project.id} className="min-w-0"><ProjectCard project={project} index={index} onOpen={(trigger, photo) => { triggerRef.current = trigger; setOrigin(trigger); setPhoto(photo); setSelected(project.id) }} /></li>)}
        </ul>
      )}

      <div className="flex flex-col gap-4 rounded-2xl bg-secondary p-6 text-secondary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex flex-col gap-1"><h3 className="flyer-script flyer-script--lead">У вашей кухни будет своя история.</h3><p className="text-sm leading-relaxed text-muted-foreground">Возьмём за основу то, что понравилось, и создадим проект под вас.</p></div>
        <PlanButton href="/quiz" className="shrink-0">Хочу свою кухню</PlanButton>
      </div>

      {selected && <PortfolioModal projects={projects} initialProjectId={selected} initialPhoto={photo} origin={origin} onClose={() => { setSelected(null); requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true })) }} />}
    </div>
  )
}
