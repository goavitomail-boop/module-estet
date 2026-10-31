'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowRight, ArrowUpRight, CalendarDays, Check, Factory, MapPin, Pause, Play, Ruler, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMPANY, KITCHEN_PRICE } from '@/lib/company'
import { facadeCollections } from '@/lib/catalog-data'
import { wardrobeCollections, wardrobeCover } from '@/lib/wardrobes-data'
import { MEASUREMENT_SLOTS } from '@/lib/measurement-slots'
import { enter, Finger, leave, POP } from '@/components/scene-kit'
import './hero-showcase.css'

/**
 * Первый экран главной. Слева — заголовок, цена и два пути (квиз и замер):
 * неподвижны, их видно сразу и их читают поисковики. Справа — сцена,
 * которая по кругу показывает, что есть на сайте: кухни, шкафы, квиз,
 * материалы и замер. Вкладки под сценой переключают главы, кнопка
 * ставит показ на паузу. Стиль — как у ролика визуализатора
 * (components/vizkit-intro.tsx), общие приёмы — components/scene-kit.tsx.
 */

const PRICE = KITCHEN_PRICE

type Chapter = {
  tab: string
  title: string
  text: string
  link: { label: string; href?: string }
  bg: string
  /** Как глава входит: шторка с латунной кромкой или створки-купе */
  enter: 'wipe' | 'doors'
  /** Затемнить фото, чтобы интерфейс поверх читался */
  dim?: boolean
  /** Сколько глава на экране, с */
  dur: number
  Scene: () => ReactNode
}

/** Плашка поверх фото */
const chip = 'rounded-full border border-background/25 bg-foreground/75 px-2.5 py-1 text-[10px] font-bold tracking-wider text-background md:px-3.5 md:py-1.5 md:text-xs'

function SceneKitchens() {
  const palette = facadeCollections[0].colors.slice(0, 6)
  return (
    <>
      <div className="hs-in absolute left-[4%] top-[5%] rounded-2xl bg-primary px-3 py-1.5 text-primary-foreground shadow-xl md:px-4 md:py-2" style={enter(0.55, POP)}>
        <span className="block text-[9px] font-bold uppercase tracking-wider opacity-70 md:text-[11px]">Кухни</span>
        <span className="flyer-title block text-base leading-tight md:text-2xl">{PRICE}</span>
      </div>
      <div className={cn('hs-in absolute right-[4%] top-[5%] flex items-center gap-2 uppercase', chip)} style={enter(0.7, { from: 'translateY(-10px)' })}>
        Палитра Soft &amp; Wood
        <span className="flex -space-x-1">
          {palette.map((c, i) => (
            <span
              key={c.name}
              className="hs-in size-3.5 rounded-full border border-background/70 md:size-5"
              style={{ background: c.hex, ...enter(0.85 + i * 0.06, { t: 0.5, from: 'scale(0.3)', ease: 'var(--pop)' }) }}
            />
          ))}
        </span>
      </div>
      <ul className="absolute inset-x-[4%] bottom-[5%] flex flex-wrap gap-1.5 md:gap-2">
        {facadeCollections.map((c, i) => (
          <li key={c.id} className={cn('hs-in', chip)} style={enter(0.75 + i * 0.08, POP)}>
            {c.name}
          </li>
        ))}
      </ul>
    </>
  )
}

function SceneWardrobes() {
  const rooms = ['Гардеробная', 'Гостиная', 'Спальня', 'Прихожая']
  return (
    <>
      <span
        className="hs-in absolute left-[4%] top-[5%] rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-xl md:text-xs"
        style={enter(1.4, POP)}
      >
        Новое направление
      </span>
      <ul className="absolute inset-x-[4%] bottom-[5%] flex flex-wrap gap-1.5 md:gap-2">
        {rooms.map((r, i) => (
          <li key={r} className={cn('hs-in', chip)} style={enter(1.5 + i * 0.09, POP)}>
            {r}
          </li>
        ))}
        <li className={cn('hs-in', chip, 'border-primary/60 text-primary')} style={enter(1.5 + rooms.length * 0.09, POP)}>
          + витрины Vetrine
        </li>
      </ul>
    </>
  )
}

const QUIZ_LAYOUTS = ['Прямая', 'Угловая', 'П-образная']
const QUIZ_SUMMARY = [
  ['Планировка', 'Угловая'],
  ['Размер', '3–4 м'],
  ['Стиль', 'Минимализм'],
  ['Сроки', '1–3 месяца'],
]

function SceneQuiz() {
  const TAP = 1.55
  return (
    <>
      {/* Телефон с первым вопросом квиза */}
      <div
        className="hs-in absolute left-[7%] top-[9%] aspect-[9/18] w-[34%] overflow-hidden rounded-[1.4rem] border-[4px] border-[#0d0c0b] bg-background text-foreground shadow-2xl md:w-[27%]"
        style={enter(0.45, { t: 0.9, from: 'translateY(40%)' })}
      >
        <div className="flex h-full flex-col gap-1.5 px-2.5 pb-3 pt-5 md:gap-2.5 md:px-3.5 md:pt-7">
          <span className="block h-0.5 overflow-hidden rounded-full bg-foreground/10 md:h-1">
            <span className="hs-step block h-full bg-primary" style={{ '--d': `${TAP + 0.2}s` } as CSSProperties} />
          </span>
          <span className="text-[7px] font-bold uppercase tracking-wider text-primary md:text-[10px]">Планировка · 1 из 6</span>
          <span className="flyer-title text-[11px] leading-tight md:text-lg">Какую кухню планируете?</span>
          <span className="mt-0.5 flex flex-col gap-1 md:mt-1 md:gap-1.5">
            {QUIZ_LAYOUTS.map((l, i) => (
              <span
                key={l}
                className="hs-in relative flex items-center justify-between rounded-md border border-foreground/15 px-1.5 py-1 text-[8px] font-semibold md:rounded-lg md:px-2.5 md:py-2 md:text-xs"
                style={enter(0.75 + i * 0.08, { t: 0.6, from: 'translateY(8px)' })}
              >
                {l === 'Угловая' && <span className="hs-in absolute inset-0 rounded-[inherit] bg-primary" style={enter(TAP + 0.05, { t: 0.3, from: 'none', ease: 'var(--out)' })} />}
                <span className="relative">{l}</span>
                {l === 'Угловая' && (
                  <>
                    <Check className="hs-in relative size-2.5 md:size-3.5" style={enter(TAP + 0.1, { t: 0.4, from: 'scale(0.3)', ease: 'var(--pop)' })} />
                    <Finger d={1} tap={TAP} out={2} to="translate(160%, 40%)" />
                  </>
                )}
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* Ответы складываются в сводку для дизайнера — та же, что в баннере квиза */}
      <div
        className="hs-in absolute right-[5%] top-1/2 w-[48%] -translate-y-1/2 rounded-2xl bg-primary p-3 text-primary-foreground shadow-2xl md:w-[44%] md:p-5"
        style={enter(1.9, { t: 0.8, from: 'translateX(-24%) scale(0.9)' })}
      >
        <span className="block font-mono text-[7px] uppercase tracking-[0.2em] opacity-65 md:text-[10px]">Что получит дизайнер</span>
        <span className="flyer-title mt-1 block text-xs leading-tight md:mt-2 md:text-xl">Коротко о вашей кухне</span>
        <span className="mt-2 block rounded-xl bg-foreground/10 px-2 py-1 md:mt-3 md:px-3 md:py-2">
          {QUIZ_SUMMARY.map(([term, value], i) => (
            <span
              key={term}
              className="hs-in flex items-baseline justify-between gap-2 border-b border-dotted border-primary-foreground/25 py-0.5 text-[8px] last:border-b-0 md:py-1.5 md:text-sm"
              style={enter(2.1 + i * 0.16, { t: 0.5, from: 'translateX(-10px)', ease: 'var(--out)' })}
            >
              <span className="opacity-65">{term}</span>
              <span className="font-semibold">{value}</span>
            </span>
          ))}
        </span>
      </div>
    </>
  )
}

const MATERIALS = [
  { label: 'Фасады', src: '/catalog/facades/soft-wood/oak-kasella-natural.webp' },
  { label: 'Столешницы SLOTEX', src: '/catalog/materials/slotex/calacatta-oro.webp' },
  { label: 'Наполнение', src: '/images/filling/multifunction-basket.webp' },
  { label: 'Подсветка', src: '/catalog/hardware/lighting/gold.webp' },
]

function SceneMaterials() {
  return (
    <ul className="absolute inset-x-[5%] top-1/2 grid -translate-y-1/2 grid-cols-4 gap-[2.5%]">
      {MATERIALS.map((m, i) => (
        <li key={m.label} className="hs-in flex flex-col gap-1.5 md:gap-2.5" style={enter(0.5 + i * 0.12, { t: 0.95, from: `translateY(30%) rotate(${i % 2 ? 5 : -5}deg)` })}>
          <span className="relative block aspect-[3/4] overflow-hidden rounded-lg border-2 border-background/85 shadow-2xl md:rounded-xl">
            <Image src={m.src} alt="" fill sizes="(max-width: 768px) 25vw, 160px" className="object-cover" />
          </span>
          <span className="text-center text-[8px] font-bold uppercase leading-tight tracking-wider text-background md:text-xs">{m.label}</span>
        </li>
      ))}
    </ul>
  )
}

function SceneMeasure() {
  const DAY = 1.45
  const SEND = 2.3
  return (
    <>
      <span className={cn('hs-in absolute left-[4%] top-[5%] flex items-center gap-1.5', chip)} style={enter(0.6, POP)}>
        <MapPin className="size-3 text-primary md:size-3.5" aria-hidden="true" />
        {COMPANY.region}
      </span>
      <div
        className="hs-in absolute right-[5%] top-1/2 w-[64%] -translate-y-1/2 overflow-hidden rounded-2xl bg-background p-3 text-foreground shadow-2xl md:w-[50%] md:p-5"
        style={enter(0.45, { t: 0.9, from: 'translateY(16%) scale(0.95)' })}
      >
        {/* Форма записи — те же слова и слоты, что в настоящей */}
        <div className="hs-out" style={leave(SEND + 0.15, { t: 0.25, to: 'translateY(-6px)' })}>
          <span className="block text-[8px] font-bold uppercase tracking-wider text-primary md:text-[11px]">Замер · бесплатно</span>
          <span className="flyer-title mt-1 block text-xs leading-tight md:mt-1.5 md:text-xl">Когда вам удобно встретить мастера?</span>
          <span className="mt-2 grid grid-cols-3 gap-1 md:mt-3 md:gap-2">
            {MEASUREMENT_SLOTS.map((s) => (
              <span key={s.value} className="relative flex flex-col items-center rounded-md border border-foreground/15 px-1 py-1 text-center md:rounded-xl md:py-2">
                {s.value === 'day' && <span className="hs-in absolute inset-0 rounded-[inherit] bg-primary" style={enter(DAY + 0.05, { t: 0.3, from: 'none', ease: 'var(--out)' })} />}
                <span className="relative text-[9px] font-bold md:text-sm">{s.label}</span>
                <span className="relative text-[7px] opacity-60 md:text-[11px]">{s.time}</span>
                {s.value === 'day' && <Finger d={0.95} tap={DAY} out={1.85} to="translate(20%, 150%)" />}
              </span>
            ))}
          </span>
          <span className="relative mt-2 block md:mt-3">
            <span className="hs-press flex items-center justify-center gap-1.5 rounded-full bg-foreground py-1.5 text-[9px] font-bold text-background md:py-2.5 md:text-sm" style={{ '--d': `${SEND}s` } as CSSProperties}>
              <CalendarDays className="size-3 md:size-4" aria-hidden="true" />
              Записаться на замер
            </span>
            <Finger d={1.8} tap={SEND} out={2.6} from="translate(-20%, -150%)" />
          </span>
        </div>
        {/* Ответ — тот же, что видит человек после настоящей заявки */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center md:gap-3 md:p-5">
          <span
            className="hs-in flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground md:size-12"
            style={enter(SEND + 0.35, { t: 0.6, from: 'scale(0.3)', ease: 'var(--pop)' })}
          >
            <Check className="size-4 md:size-6" aria-hidden="true" />
          </span>
          <span className="hs-in flyer-title text-xs leading-tight md:text-2xl" style={enter(SEND + 0.45, { t: 0.6, from: 'translateY(8px)' })}>
            Заявка на замер принята
          </span>
          <span className="hs-in text-[8px] leading-snug opacity-65 md:text-sm" style={enter(SEND + 0.6, { t: 0.6, from: 'translateY(8px)' })}>
            Менеджер скоро перезвонит и подтвердит время.
          </span>
        </div>
      </div>
    </>
  )
}

const CHAPTERS: Chapter[] = [
  {
    tab: 'Кухни',
    title: `${facadeCollections.length} коллекций фасадов`,
    text: 'Soft Touch, дерево, рифление и рамочная классика.',
    link: { label: 'Каталог кухонь', href: '/collections' },
    bg: '/images/collections/soft-wood.webp',
    enter: 'wipe',
    dur: 4.8,
    Scene: SceneKitchens,
  },
  {
    tab: 'Шкафы',
    title: 'Шкафы в стиле кухни',
    text: `Гардеробные, гостиные, спальни и прихожие — ${wardrobeCollections.length} коллекций.`,
    link: { label: 'Смотреть шкафы', href: '/wardrobes' },
    bg: wardrobeCover,
    enter: 'doors',
    dur: 4.8,
    Scene: SceneWardrobes,
  },
  {
    tab: 'Квиз',
    title: 'Расчёт за минуту',
    text: '5 простых вопросов, можно отвечать «не знаю».',
    link: { label: 'Пройти квиз', href: '/quiz' },
    bg: '/quiz-options/style-minimal.webp',
    enter: 'wipe',
    dim: true,
    dur: 5.6,
    Scene: SceneQuiz,
  },
  {
    tab: 'Материалы',
    title: 'Фасады, столешницы, фурнитура',
    text: 'Столешницы SLOTEX, подсветка и наполнение ящиков.',
    link: { label: 'О материалах', href: '/materials' },
    bg: '/images/material-palette.webp',
    enter: 'wipe',
    dim: true,
    dur: 4.8,
    Scene: SceneMaterials,
  },
  {
    tab: 'Замер',
    title: 'Бесплатный замер',
    text: 'Мастер приедет утром, днём или вечером — как вам удобно.',
    link: { label: 'Записаться' },
    bg: '/images/portfolio/project-real-3/main.webp',
    enter: 'wipe',
    dim: true,
    dur: 5.6,
    Scene: SceneMeasure,
  },
]

const promises = [
  { icon: Ruler, title: 'По вашим меркам', note: 'Проект под вашу планировку' },
  { icon: Factory, title: 'Своя фабрика', note: 'Производство в Московской области' },
  { icon: ShieldCheck, title: 'Гарантия 5 лет', note: 'По договору, с сервисом' },
]

const openBooking = () => window.dispatchEvent(new Event('measurement-booking:open'))

/** Рифлёный антрацит с латунным профилем — те же створки, что в квизе */
const FLUTES = 'repeating-linear-gradient(90deg, #2c2c2e 0 9px, #1f1f21 9px 11px, #353537 11px 20px)'

export function HeroShowcase() {
  // i — текущая глава, prev — уходящая (ещё видна под новой), n — счётчик смен:
  // по нему пересоздаются слои новой главы, и их анимации идут сначала
  const [view, setView] = useState({ i: 0, prev: -1, n: 0 })
  const [userPaused, setUserPaused] = useState(false)
  const [inView, setInView] = useState(true)
  const rootRef = useRef<HTMLElement>(null)

  const go = (k: number) => setView((v) => (v.i === k ? v : { i: k, prev: v.i, n: v.n + 1 }))
  const next = () => setView((v) => ({ i: (v.i + 1) % CHAPTERS.length, prev: v.i, n: v.n + 1 }))
  const clearPrev = () => setView((v) => (v.prev === -1 ? v : { ...v, prev: -1 }))

  // Первый экран ушёл из виду — показ стоит и не тратит батарею
  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const chapter = CHAPTERS[view.i]
  const paused = userPaused || !inView

  return (
    <section
      ref={rootRef}
      id="top"
      data-own-motion
      aria-labelledby="hero-title"
      className={cn('hs relative isolate overflow-hidden bg-foreground text-background', paused && 'hs-paused')}
    >
      <div className="mx-auto flex min-h-[min(100svh,62rem)] max-w-7xl flex-col gap-8 px-4 pb-8 pt-24 md:px-8 md:pt-28 lg:gap-10">
        <div className="grid flex-1 items-center gap-5 md:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
          {/* ── Текст. На телефоне и планшете его блоки встают вперемешку со сценой
              (contents + order): заголовок, цена и кнопки — сцена — описание.
              Иначе сцена целиком уходит под первый экран ── */}
          <div className="contents lg:flex lg:flex-col lg:gap-6">
            {/* H1 — то, что ищут: «кухни на заказ в Москве». Слоган ниже крупнее,
                но это абзац: поисковику важен смысл заголовка, а не его размер */}
            <h1 id="hero-title" className="hs-in order-1 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.14em] text-primary md:text-sm lg:order-none" style={enter(0.1, { t: 0.6, ease: 'var(--out)' })}>
              <span className="h-px w-7 bg-current" aria-hidden="true" />
              Кухни и шкафы на заказ в Москве и МО
            </h1>
            <p className="flyer-script flyer-script--lead order-2 -mb-3 hidden text-primary sm:block lg:order-none">
              <span className="hs-in block" style={enter(0.25, { t: 0.7, ease: 'var(--out)' })}>
                Не просто мебель.
              </span>
              <span className="hs-in block" style={enter(0.37, { t: 0.7, ease: 'var(--out)' })}>
                Место быть собой.
              </span>
            </p>
            <p className="hs-title order-3 lg:order-none">
              <span className="hs-line">
                <span style={{ '--d': '0.45s' } as CSSProperties}>Кухня,</span>
              </span>
              <span className="hs-line">
                <span style={{ '--d': '0.55s' } as CSSProperties}>в которой</span>
              </span>
              <span className="hs-line">
                <span className="text-primary" style={{ '--d': '0.65s' } as CSSProperties}>
                  хочется жить.
                </span>
              </span>
            </p>
            <p className="hs-in order-7 max-w-md text-pretty text-base leading-relaxed text-background/75 md:text-[17px] lg:order-none" style={enter(0.9, { t: 0.7, ease: 'var(--out)' })}>
              Кухни и шкафы по вашим размерам — со своей фабрики в Подмосковье. Посчитайте онлайн за минуту или пригласите
              дизайнера на замер.
            </p>
            <div className="hs-in order-4 flex items-baseline gap-3 lg:order-none" style={enter(1.0, { t: 0.7, ease: 'var(--out)' })}>
              <span className="flyer-title text-3xl leading-none text-primary md:text-4xl">{PRICE}</span>
              <span className="text-sm text-background/65">стоимость кухни</span>
            </div>
            <div className="order-5 flex flex-wrap gap-3 lg:order-none">
              <Link
                href="/quiz"
                className="hs-in group inline-flex min-h-[3.75rem] items-center gap-4 rounded-full bg-primary py-2 pl-6 pr-2 font-semibold text-primary-foreground transition-colors hover:bg-background"
                style={enter(1.1, { t: 0.7, ease: 'var(--out)' })}
              >
                <span className="flex flex-col text-left leading-tight">
                  <span>Рассчитать за минуту</span>
                  <small className="text-xs font-medium opacity-70">Кухня или шкаф · бесплатно</small>
                </span>
                <span className="flex size-11 items-center justify-center rounded-full border border-primary-foreground/25" aria-hidden="true">
                  <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
              <button
                type="button"
                onClick={openBooking}
                className="hs-in inline-flex min-h-[3.75rem] items-center gap-2.5 rounded-full border border-background/35 px-5 font-medium text-background transition-colors hover:border-primary hover:text-primary"
                style={enter(1.2, { t: 0.7, ease: 'var(--out)' })}
              >
                <CalendarDays className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
                Записаться на замер
              </button>
            </div>
          </div>

          {/* ── Сцена ── */}
          <div className="hs-in order-6 min-w-0 lg:order-none" style={enter(0.3, { t: 0.9, from: 'translateY(24px)' })}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-primary/30 bg-[#161412] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]" aria-hidden="true">
              {/* Фоны: все в DOM (так снимки заранее загружены), видны текущий и уходящий */}
              {CHAPTERS.map((c, k) => {
                const active = k === view.i
                const under = k === view.prev
                const animate = active && view.n > 0
                const wipe = animate && c.enter === 'wipe'
                const doors = animate && c.enter === 'doors'
                return (
                  <div
                    key={k}
                    className={cn('absolute inset-0 overflow-hidden', active ? 'z-[2]' : under ? 'z-[1]' : 'invisible', wipe && 'hs-wipe')}
                    onAnimationEnd={(e) => {
                      if (e.animationName === 'hs-wipe' || e.animationName === 'hs-door-l') clearPrev()
                    }}
                  >
                    <div className={cn('absolute inset-0', wipe && 'hs-wipe-img', doors && 'hs-behind')}>
                      <Image
                        src={c.bg}
                        alt=""
                        fill
                        priority={k === 0}
                        fetchPriority={k === 0 ? 'high' : 'low'}
                        sizes="(max-width: 1024px) 100vw, 680px"
                        className="object-cover"
                      />
                      {c.dim && <span className="absolute inset-0 bg-[#161412]/55" />}
                    </div>
                    {wipe && (
                      <span
                        className="hs-out absolute inset-y-0 left-0 z-10 w-0.5 bg-primary shadow-[0_0_18px_4px_rgba(216,191,138,0.55)]"
                        style={leave(0.9, { t: 0.3, to: 'none' })}
                      />
                    )}
                    {doors && (
                      <>
                        <span className="hs-door absolute inset-y-0 left-0 w-1/2" style={{ backgroundImage: FLUTES }}>
                          <span className="absolute inset-y-0 right-0 w-[3px] bg-primary" />
                        </span>
                        <span className="hs-door hs-door--r absolute inset-y-0 right-0 w-1/2" style={{ backgroundImage: FLUTES }}>
                          <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" />
                        </span>
                      </>
                    )}
                  </div>
                )
              })}

              {/* Низ кадра темнее — плашки читаются на любом фото. Неподвижно */}
              <span className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.35)),linear-gradient(to_top,rgba(0,0,0,0.45),transparent_35%)]" />

              {/* Слои главы: уходящая гаснет, новая собирается */}
              {[view.prev, view.i]
                .filter((k) => k >= 0)
                .map((k) => {
                  const leaving = k === view.prev
                  const Scene = CHAPTERS[k].Scene
                  return (
                    <div key={`${k}-${leaving ? view.n - 1 : view.n}`} className={cn('absolute inset-0 z-[4]', leaving && 'hs-leave')}>
                      <Scene />
                    </div>
                  )
                })}
            </div>

            {/* Вкладки: полоска текущей тянется время главы, её конец — следующая глава */}
            <div className="mt-4 flex items-center gap-3">
              <div className="grid flex-1 grid-cols-5 gap-1.5 md:gap-2" role="group" aria-label="Что есть на сайте">
                {CHAPTERS.map((c, k) => (
                  <button
                    key={c.tab}
                    type="button"
                    onClick={() => go(k)}
                    aria-current={k === view.i ? 'true' : undefined}
                    className="group flex min-w-0 flex-col gap-2 py-1 text-left"
                  >
                    <span className="block h-0.5 overflow-hidden rounded-full bg-background/20">
                      {k === view.i && (
                        <span
                          key={view.n}
                          className="hs-progress block h-full bg-primary"
                          style={{ '--t': `${c.dur}s` } as CSSProperties}
                          onAnimationEnd={(e) => e.animationName === 'hs-progress' && next()}
                        />
                      )}
                    </span>
                    <span
                      className={cn(
                        'truncate text-[10px] font-semibold transition-colors min-[400px]:text-[11px] sm:text-xs sm:uppercase sm:tracking-wider',
                        k === view.i ? 'text-background' : 'text-background/45 group-hover:text-background/80',
                      )}
                    >
                      {c.tab}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={userPaused ? 'Продолжить показ' : 'Остановить показ'}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-background/25 text-background/75 transition-colors hover:border-primary hover:text-primary"
              >
                {userPaused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
              </button>
            </div>

            {/* Подпись главы и куда пойти дальше */}
            <div key={view.n} className="mt-3 flex min-h-[5.5rem] flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="min-w-0 flex-1">
                <p className="flyer-title text-2xl leading-tight md:text-3xl">
                  <span className="hs-mask">
                    <span style={{ '--d': '0.3s' } as CSSProperties}>{chapter.title}</span>
                  </span>
                </p>
                <p className="hs-in mt-1.5 text-pretty text-sm text-background/65" style={enter(0.45, { t: 0.6, from: 'translateY(6px)', ease: 'var(--out)' })}>
                  {chapter.text}
                </p>
              </div>
              {chapter.link.href ? (
                <Link
                  href={chapter.link.href}
                  className="hs-in group inline-flex items-center gap-2 text-sm font-semibold text-primary"
                  style={enter(0.55, { t: 0.6, from: 'translateX(-8px)', ease: 'var(--out)' })}
                >
                  {chapter.link.label}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openBooking}
                  className="hs-in group inline-flex items-center gap-2 text-sm font-semibold text-primary"
                  style={enter(0.55, { t: 0.6, from: 'translateX(-8px)', ease: 'var(--out)' })}
                >
                  {chapter.link.label}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Три обещания — как раньше на первом экране */}
        <ul className="grid grid-cols-3 gap-3 border-t border-background/15 pt-5 md:gap-6">
          {promises.map((p, k) => (
            <li key={p.title} className="hs-in flex items-start gap-3" style={enter(1.35 + k * 0.1, { t: 0.7, ease: 'var(--out)' })}>
              <span className="hidden size-10 shrink-0 items-center justify-center rounded-full border border-primary/40 text-primary sm:flex" aria-hidden="true">
                <p.icon className="size-5" strokeWidth={1.5} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flyer-title text-sm leading-tight md:text-lg">{p.title}</span>
                <span className="text-[11px] leading-snug text-background/55 md:text-sm">{p.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
