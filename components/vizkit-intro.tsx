'use client'

import { Fragment, useRef, useState, type CSSProperties, type DragEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { ArrowRight, ChevronsLeftRight, Clock3, Home, RotateCcw, Smartphone, Sparkles, Users, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import './vizkit-intro.css'

/**
 * Вступительный ролик визуализатора: за 15 секунд показывает клиенту,
 * как это работает и зачем ему. Сцены не сменяют друг друга, а
 * перетекают: выбранная карточка становится плашкой «Ваш выбор», корпус
 * телефона тает и снимок становится кадром, а плашка выбора
 * запускает шторку «было / станет». Палец показывает, где нажимать.
 * В конце шторку можно потянуть самому.
 */

/** Вся раскадровка, в секундах. Слои и пути в @keyframes читают только её. */
const TL = {
  end: 14.7,
  scenes: [0, 3.15, 6.5, 10.7],
  captions: [{ in: 0.1, out: 3.05 }, { in: 3.3, out: 6.4 }, { in: 6.6, out: 10.6 }, { in: 10.8 }],
  cards: 0.15,
  swatches: 0.75,
  pick: 2.2, // касание образца
  fly: 2.6, // карточка улетает в плашку
  chip: 3.05, // плашка «Ваш выбор»
  phone: 3.15, // телефон входит, пока карточка ещё летит, — без пустого кадра
  hint: [3.6, 4.8],
  shot: 4.5, // снимок
  push: 5.2, // корпус телефона тает, снимок становится кадром
  grid: [6.55, 8.8],
  scan: 6.65,
  marks: 7.15,
  call: 8.9, // плашка выбора «зовёт» нейросеть
  reveal: [9.1, 10.3],
  sheen: 10.2,
  label: 10.55, // «Ваш выбор» → «Станет»
  back: [10.65, 11.55],
  before: 11.15, // «Было»
  handle: 11.25,
  benefits: 11.55,
  drag: [12.95, 13.55, 14.15],
  replay: 14.05,
  pulse: 14.45,
}

const OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)'
const LEAVE = 'cubic-bezier(0.55, 0, 0.75, 0)'

/** Камера в момент раскрытия, как в .vzi-camera */
const ZOOM = 1.035
const toScreen = (x: number) => 50 + (x - 50) * ZOOM

/** Куда нажимает палец, в процентах сцены */
const PICKED = 4
const PICK = { x: 50 + (PICKED - 2.5) * 9, y: 89 }
const SHUTTER = { x: 50, y: 81.5 }

/** Положение шторки: слева «было» шириной pos %. До раскрытия — 100, без анимации */
const SEAM: Array<[number, number, string?]> = [
  [TL.reveal[0], 100, IN_OUT],
  [TL.reveal[1], 0],
  [TL.back[0], 0, OUT],
  [TL.back[1], 50],
  [TL.drag[0], 50, IN_OUT],
  [TL.drag[1], 34, IN_OUT],
  [TL.drag[2], 50],
  [TL.end, 50],
]

/** Палец: x, y в процентах сцены, видимость */
const FINGER: Array<[number, number, number, number, string?]> = [
  [0, 80, 104, 0],
  [TL.pick - 0.7, 80, 104, 0, IN_OUT],
  [TL.pick - 0.08, PICK.x, PICK.y, 1],
  [TL.phone + 0.1, PICK.x, PICK.y, 1, IN_OUT],
  [TL.shot - 0.26, SHUTTER.x, SHUTTER.y, 1],
  [TL.shot + 0.3, SHUTTER.x, SHUTTER.y, 1, LEAVE],
  [TL.shot + 0.7, 54, 96, 0],
  [TL.drag[0] - 0.45, 50, 60, 0, OUT],
  [TL.drag[0] - 0.15, 50, 50, 1],
  [TL.drag[0], 50, 50, 1, IN_OUT],
  [TL.drag[1], toScreen(34), 50, 1, IN_OUT],
  [TL.drag[2], 50, 50, 1],
  [TL.drag[2] + 0.12, 50, 50, 1, LEAVE],
  [TL.drag[2] + 0.45, 50, 58, 0],
  [TL.end, 50, 58, 0],
]

/** Палец прижат к ручке шторки */
const GRAB = [TL.drag[0] - 0.13, TL.drag[2] + 0.05]
const TAPS = [TL.pick, TL.shot]

/** Кадр пути: время, CSS, кривая до следующего кадра */
type Frame = [number, string, string?]

/**
 * Путь в @keyframes. Анимация идёт только от первого кадра до конца
 * ролика: слой размером со сцену, который «анимируется» и стоя на месте,
 * заставляет перерисовывать весь кадр — без видеокарты это заметно.
 */
function keyframes(name: string, frames: Frame[]) {
  const t0 = frames[0][0]
  const pct = (t: number) => `${+(((t - t0) / (TL.end - t0)) * 100).toFixed(3)}%`
  return `@keyframes ${name}{${frames.map(([t, css, ease]) => `${pct(t)}{${css}${ease ? `;animation-timing-function:${ease}` : ''}}`).join('')}}`
}

const PATHS_CSS = [
  keyframes('vzi-seam-clip', SEAM.map(([t, p, e]): Frame => [t, `transform:translateX(${p - 100}%)`, e])),
  keyframes('vzi-seam-img', SEAM.map(([t, p, e]): Frame => [t, `transform:translateX(${100 - p}%)`, e])),
  keyframes('vzi-seam-line', SEAM.map(([t, p, e]): Frame => [t, `transform:translateX(${p}%)`, e])),
  keyframes('vzi-finger', FINGER.map(([t, x, y, o, e]): Frame => [t, `transform:translate(${x}cqw,${+(y * 0.75).toFixed(2)}cqw);opacity:${o}`, e])),
  keyframes('vzi-finger-dot', [
    [0, 'transform:none'],
    ...TAPS.flatMap((t): Frame[] => [
      [t - 0.03, 'transform:none'],
      [t + 0.04, 'transform:scale(0.8)'],
      [t + 0.2, 'transform:none'],
    ]),
    [GRAB[0], 'transform:none'],
    [GRAB[0] + 0.09, 'transform:scale(0.82)'],
    [GRAB[1], 'transform:scale(0.82)'],
    [GRAB[1] + 0.1, 'transform:none'],
    [TL.end, 'transform:none'],
  ]),
  keyframes('vzi-finger-ring', [
    [0, 'transform:scale(0.5);opacity:0'],
    ...[...TAPS, GRAB[0]].flatMap((t): Frame[] => [
      [t - 0.001, 'transform:scale(0.5);opacity:0'],
      [t + 0.02, 'transform:scale(0.5);opacity:0.75', OUT],
      [t + 0.6, 'transform:scale(2.2);opacity:0'],
    ]),
    [TL.end, 'transform:scale(0.5);opacity:0'],
  ]),
].join('')

const captions = [
  { step: '01 · Каталог', title: 'Выберите кухню в каталоге', text: 'Коллекция, цвет фасадов, столешница и ручки.' },
  { step: '02 · Фото', title: 'Сфотографируйте свою комнату', text: 'Пустую или со старой кухней. Хватит телефона.' },
  { step: '03 · Нейросеть', title: 'ИИ примеряет мебель в ваш интерьер', text: 'Стены, окна и свет остаются — меняется только мебель.' },
  { step: '04 · Результат', title: 'Увидите кухню до покупки', text: 'Сравните «было» и «станет» и приходите на замер с готовым решением.' },
]

const benefits = [
  { icon: Wallet, text: 'Бесплатно' },
  { icon: Clock3, text: 'Около минуты' },
  { icon: Home, text: 'Без выезда и ожидания' },
  { icon: Sparkles, text: 'Видно, как впишется' },
  { icon: Users, text: 'Можно показать семье' },
]

const CARDS = [
  { src: '/catalog/collections/touch-hero.webp', pose: 'rotate(-10deg) translateX(-34%)' },
  { src: '/catalog/collections/velvet-hero.webp', pose: 'rotate(10deg) translateX(34%)' },
  { src: '/catalog/collections/soft-wood-hero.webp', pose: 'none', picked: true },
]

const SWATCHES = ['white', 'cashmere', 'grey-stone', 'anthracite', 'oak-kasella-natural', 'oak-craft-gold']

const MARKS = [
  { label: 'Стена', place: 'left-[8%] top-[10%] h-[52%] w-[36%]' },
  { label: 'Окно', place: 'right-[8%] top-[24%] h-[30%] w-[22%]' },
  { label: 'Пол', place: 'bottom-[6%] left-[8%] h-[16%] w-[84%]' },
]

/** Вход слоя: когда, сколько, откуда и с какой кривой */
function enter(d: number, { t = 0.8, from = 'translateY(16px)', ease = 'var(--spring)' } = {}) {
  return { '--d': `${d}s`, '--t': `${t}s`, '--from': from, '--e': ease } as CSSProperties
}

/** Уход слоя */
function exit(d: number, { t = 0.32, to = 'translateY(-10px)' } = {}) {
  return { '--od': `${d}s`, '--ot': `${t}s`, '--to': to } as CSSProperties
}

function Layer({ className, style, children }: { className?: string; style?: CSSProperties; children?: ReactNode }) {
  return (
    <div className={cn('pointer-events-none absolute', className)} style={style} aria-hidden="true">
      {children}
    </div>
  )
}

export function VizKitIntro({ onStart }: { onStart: () => void }) {
  // Новый ключ — ролик начинается сначала
  const [run, setRun] = useState(0)
  const [live, setLive] = useState(false)
  const sceneRef = useRef<HTMLDivElement>(null)
  const pos = useRef(50)
  const dragging = useRef(false)

  const setPos = (p: number) => {
    pos.current = Math.min(100, Math.max(0, p))
    sceneRef.current?.style.setProperty('--pos', `${pos.current}%`)
    sceneRef.current?.setAttribute('aria-valuenow', String(Math.round(pos.current)))
  }
  const moveTo = (clientX: number) => {
    const r = sceneRef.current?.getBoundingClientRect()
    if (r) setPos(50 + (((clientX - r.left) / r.width) * 100 - 50) / ZOOM)
  }
  const slider = live
    ? {
        role: 'slider',
        tabIndex: 0,
        'aria-label': 'Сравнить «было» и «станет»',
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': Math.round(pos.current),
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          moveTo(e.clientX)
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => dragging.current && moveTo(e.clientX),
        onPointerUp: () => (dragging.current = false),
        onPointerCancel: () => (dragging.current = false),
        // Иначе браузер начинает тащить картинку как файл и отменяет жест
        onDragStart: (e: DragEvent<HTMLDivElement>) => e.preventDefault(),
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          setPos(pos.current + (e.key === 'ArrowLeft' ? -5 : 5))
        },
      }
    : {}

  return (
    <section data-own-motion aria-labelledby="vzi-title" className="bg-foreground pt-16 text-background md:pt-20">
      <style dangerouslySetInnerHTML={{ __html: PATHS_CSS }} />
      <div
        key={run}
        className={cn(
          'vzi relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl flex-col justify-start gap-6 px-4 pb-10 pt-12 sm:justify-center sm:gap-8 sm:py-10 md:min-h-[calc(100dvh-5rem)] md:px-8 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:items-center lg:gap-14',
          live && 'vzi-live',
        )}
        style={{ '--total': `${TL.end}s`, '--seam-d': `${TL.reveal[0]}s`, '--seam-t': `${TL.end - TL.reveal[0]}s` } as CSSProperties}
      >
        <button
          type="button"
          onClick={onStart}
          className="vzi-skip absolute right-4 top-2 z-20 rounded-full border border-background/25 px-4 py-1.5 text-xs font-semibold text-background/80 transition-colors hover:border-primary hover:text-primary md:right-8 md:top-4"
        >
          Пропустить
        </button>

        {/* ── Подписи сцен. На телефоне — под сценой, чтобы анимация была на первом экране ── */}
        <div className="order-2 flex flex-col lg:order-none">
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-primary md:text-xs">Визуализатор «Модуль Эстет»</p>
          <h1 id="vzi-title" className="sr-only">
            Как работает визуализатор мебели
          </h1>
          <div className="relative mt-4 min-h-[18rem] sm:min-h-[16rem] md:min-h-[24rem]">
            {captions.map((c, i) => {
              const { in: d, out } = TL.captions[i]
              const words = c.title.split(' ')
              return (
                <div key={c.step} className={cn('absolute inset-x-0 top-0', out !== undefined && 'vzi-out')} style={out !== undefined ? exit(out) : undefined}>
                  <p className="vzi-in font-mono text-xs uppercase tracking-[0.2em] text-background/50" style={enter(d, { t: 0.5, from: 'translateY(8px)', ease: 'var(--out)' })}>
                    {c.step}
                  </p>
                  <p className="flyer-title mt-3 text-balance text-4xl leading-[1.05] md:text-6xl">
                    {words.map((w, j) => (
                      <Fragment key={j}>
                        <span className="vzi-mask">
                          <span className="vzi-word" style={{ '--d': `${d + 0.08 + j * 0.06}s` } as CSSProperties}>
                            {w}
                          </span>
                        </span>
                        {j < words.length - 1 && ' '}
                      </Fragment>
                    ))}
                  </p>
                  <p
                    className="vzi-in mt-4 max-w-md text-pretty text-sm leading-relaxed text-background/65 md:text-base"
                    style={enter(d + 0.3 + words.length * 0.06, { t: 0.7, from: 'translateY(10px)', ease: 'var(--out)' })}
                  >
                    {c.text}
                  </p>
                  {i === captions.length - 1 && (
                    <ul className="mt-5 flex flex-wrap gap-2" aria-label="Чем полезно">
                      {benefits.map((b, k) => (
                        <li
                          key={b.text}
                          className="vzi-in flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-semibold md:px-4 md:py-2 md:text-sm"
                          style={enter(TL.benefits + k * 0.16, { t: 0.6, from: 'translateY(10px) scale(0.8)', ease: 'var(--pop)' })}
                        >
                          <b.icon className="size-3.5 text-primary md:size-4" aria-hidden="true" />
                          {b.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          {/* Прогресс по сценам */}
          <div className="mt-6 flex gap-1.5" aria-hidden="true">
            {TL.scenes.map((d, i) => (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-background/15">
                <span className="vzi-progress block h-full bg-primary" style={{ '--d': `${d}s`, '--t': `${(TL.scenes[i + 1] ?? TL.end) - d}s` } as CSSProperties} />
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="relative inline-flex">
              <span className="vzi-pulse pointer-events-none absolute inset-0 rounded-full bg-primary opacity-0" style={{ '--d': `${TL.pulse}s` } as CSSProperties} aria-hidden="true" />
              <button
                type="button"
                onClick={onStart}
                className="relative inline-flex min-h-14 items-center gap-3 rounded-full bg-primary pl-7 pr-2 font-bold text-primary-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                Собрать свою кухню
                <span className="flex size-10 items-center justify-center rounded-full bg-foreground/15">
                  <ArrowRight className="size-5" aria-hidden="true" />
                </span>
              </button>
            </span>
            <button
              type="button"
              onClick={() => {
                setLive(false)
                pos.current = 50
                setRun((r) => r + 1)
              }}
              className="vzi-in inline-flex min-h-12 items-center gap-2 rounded-full border border-background/25 px-5 text-sm font-semibold text-background/80 transition-colors hover:border-primary hover:text-primary"
              style={enter(TL.replay, { t: 0.6, from: 'none', ease: 'var(--out)' })}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Смотреть ещё раз
            </button>
          </div>
        </div>

        {/* ── Сцена ── */}
        <div
          ref={sceneRef}
          className={cn(
            '@container relative order-1 aspect-[4/3] w-full select-none overflow-hidden rounded-3xl border border-primary/30 bg-[#161412] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] outline-none focus-visible:ring-2 focus-visible:ring-primary lg:order-none',
            live && 'cursor-ew-resize touch-pan-y',
          )}
          {...slider}
        >
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(var(--primary)_1px,transparent_1px),linear-gradient(90deg,var(--primary)_1px,transparent_1px)] [background-size:40px_40px]"
            aria-hidden="true"
          />

          {/* Фото и нейросеть: камера, «станет» снизу, «было» поверх, шторка между ними */}
          <div className="vzi-camera absolute inset-0" style={{ '--d': `${TL.reveal[0] - 0.05}s`, '--t': '2s' } as CSSProperties} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/catalog/collections/soft-wood-1.webp"
              alt=""
              className="vzi-in absolute inset-0 size-full object-cover"
              style={enter(TL.reveal[0] - 0.05, { t: 0.01, from: 'none', ease: 'linear' })}
            />
            <Layer className="vzi-sheen inset-y-0 -left-1/3 w-1/3" style={{ '--d': `${TL.sheen}s` } as CSSProperties}>
              <span className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </Layer>
            <div className="vzi-seam-clip absolute inset-0 overflow-hidden">
              <div className="vzi-seam-img absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/vizkit/sample-old-kitchen.webp"
                  alt=""
                  className="vzi-in absolute inset-0 size-full object-cover"
                  style={enter(TL.push, { t: 0.4, from: 'none', ease: 'var(--out)' })}
                />
              </div>
            </div>

            <Layer className="vzi-out inset-0" style={exit(TL.grid[1], { to: 'none' })}>
              <div
                className="vzi-in size-full [background-image:linear-gradient(rgba(216,191,138,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(216,191,138,0.35)_1px,transparent_1px)] [background-size:56px_56px]"
                style={enter(TL.grid[0], { t: 0.5, from: 'none', ease: 'var(--out)' })}
              />
            </Layer>
            <Layer className="vzi-scan inset-0" style={{ '--d': `${TL.scan}s` } as CSSProperties}>
              <span className="absolute inset-x-0 top-0 h-0.5 bg-[#ffe3ad] shadow-[0_0_24px_8px_rgba(216,191,138,0.7)]" />
              <span className="absolute inset-x-0 bottom-full h-24 bg-gradient-to-t from-[rgba(216,191,138,0.28)] to-transparent" />
            </Layer>
            {MARKS.map((m, i) => (
              <Layer key={m.label} className={cn('vzi-out', m.place)} style={exit(TL.grid[1] + i * 0.04, { to: 'scale(0.96)' })}>
                <div className="vzi-in relative size-full rounded-md border-2 border-primary bg-primary/10" style={enter(TL.marks + i * 0.25, { t: 0.7, from: 'scale(0.92)' })}>
                  <span className="absolute -top-3 left-2 rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground md:text-xs">
                    {m.label}
                  </span>
                </div>
              </Layer>
            ))}

            <div
              className="vzi-seam-line pointer-events-none absolute inset-0"
              onAnimationEnd={(e) => {
                if (e.animationName === 'vzi-seam-line') setLive(true)
              }}
            >
              <span className="vzi-in absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-background shadow-[0_0_16px_rgba(255,236,205,0.8)]" style={enter(TL.reveal[0], { t: 0.2, from: 'none', ease: 'linear' })} />
              <span className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="vzi-in relative flex size-10 items-center justify-center rounded-full bg-background text-foreground shadow-xl md:size-12" style={enter(TL.handle, { t: 0.6, from: 'scale(0.4)', ease: 'var(--pop)' })}>
                  <span className="vzi-breathe absolute inset-0 rounded-full border-2 border-background opacity-0" style={{ '--d': `${TL.end}s` } as CSSProperties} />
                  <ChevronsLeftRight className="size-5" />
                </span>
              </span>
            </div>
          </div>

          {/* Сцена 1: веер коллекций; выбранная улетает в плашку «Ваш выбор» */}
          {CARDS.map((c, i) => (
            <Layer
              key={c.src}
              className={cn('left-1/2 top-[8%] w-[44%] -translate-x-1/2', c.picked ? 'vzi-fly' : 'vzi-out')}
              style={c.picked ? exit(TL.fly, { t: 0.62, to: 'translate(80%, -49%) scale(0.14)' }) : exit(TL.fly + i * 0.05, { t: 0.36, to: 'translateY(10%) scale(0.92)' })}
            >
              <div style={{ transform: c.pose }}>
                <div className="vzi-in aspect-[4/5] overflow-hidden rounded-2xl border border-background/15 shadow-2xl" style={enter(TL.cards + i * 0.12, { t: 0.95, from: 'translateY(28%) scale(0.88)' })}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.src} alt="" className="size-full object-cover" />
                </div>
              </div>
            </Layer>
          ))}
          {SWATCHES.map((name, i) => (
            <Layer
              key={name}
              className="vzi-out bottom-[6%] aspect-square w-[7.5%]"
              style={{ left: `${50 + (i - 2.5) * 9 - 3.75}%`, ...exit(TL.fly + 0.05 + i * 0.03, { to: 'translateY(30%) scale(0.9)' }) }}
            >
              <div className={cn('size-full', i === PICKED && 'vzi-lift')} style={{ '--d': `${TL.pick + 0.02}s` } as CSSProperties}>
                <div
                  className="vzi-in relative size-full overflow-hidden rounded-lg border-2 border-background/80 shadow-lg"
                  style={enter(TL.swatches + i * 0.07, { t: 0.7, from: 'translateY(-60%) rotate(-12deg)', ease: 'var(--pop)' })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/catalog/facades/soft-wood/${name}.webp`} alt="" className="size-full object-cover" />
                  {i === PICKED && (
                    <span className="vzi-in absolute inset-0 rounded-[inherit] ring-2 ring-inset ring-primary" style={enter(TL.pick, { t: 0.4, from: 'scale(1.3)', ease: 'var(--out)' })} />
                  )}
                </div>
              </div>
            </Layer>
          ))}

          {/* Сцена 2: телефон и снимок. Снимок в нём — размером со сцену и по её центру: корпус тает, а кадр остаётся и продолжается за края */}
          <Layer className="vzi-out left-1/2 top-1/2 w-[30%] -translate-x-1/2 -translate-y-1/2" style={exit(TL.push + 0.15, { t: 0.5, to: 'none' })}>
            <div
              className="vzi-in relative aspect-[9/18] overflow-hidden rounded-[1.6rem] border-[5px] border-[#0d0c0b] bg-[#0d0c0b] shadow-2xl"
              style={enter(TL.phone, { t: 0.95, from: 'translateY(75%)' })}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/vizkit/sample-old-kitchen.webp"
                alt=""
                className="vzi-drift absolute left-1/2 top-1/2 h-[75cqw] w-[100cqw] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
                style={{ '--d': `${TL.phone}s`, '--t': `${TL.shot - TL.phone}s` } as CSSProperties}
              />
              <span className="absolute left-1/2 top-1.5 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-black" />
              <span className="vzi-flash absolute inset-0 bg-white" style={{ '--d': `${TL.shot + 0.02}s` } as CSSProperties} />
              <span className="absolute bottom-[4%] left-1/2 aspect-square w-[22%] -translate-x-1/2">
                <span className="vzi-press block size-full rounded-full border-[3px] border-white/90 bg-white/30" style={{ '--d': `${TL.shot}s` } as CSSProperties} />
              </span>
            </div>
          </Layer>
          <Layer className="vzi-out left-[5%] top-[20%]" style={exit(TL.hint[1])}>
            <div
              className="vzi-in flex items-center gap-2 whitespace-nowrap rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-xl md:text-sm"
              style={enter(TL.hint[0], { t: 0.6, from: 'scale(0.6)', ease: 'var(--pop)' })}
            >
              <Smartphone className="size-4 text-primary" aria-hidden="true" />
              Снимите всю стену
            </div>
          </Layer>

          {/* Виньетка: края кадра темнее, взгляд — в центр. Неподвижна */}
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.4))]" aria-hidden="true" />

          {/* Плашка выбора живёт с первой сцены до конца и становится подписью «Станет» */}
          <Layer className="right-[3%] top-[4%]">
            <div
              className="vzi-in relative flex items-center gap-2 rounded-full bg-background py-1 pl-1 pr-3.5 text-foreground shadow-xl"
              style={enter(TL.chip, { t: 0.6, from: 'scale(0.6)', ease: 'var(--pop)' })}
            >
              <span className="vzi-ring absolute inset-0 rounded-full border-2 border-primary opacity-0" style={{ '--d': `${TL.call}s` } as CSSProperties} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/catalog/collections/soft-wood-hero.webp" alt="" className="size-7 rounded-full object-cover md:size-9" />
              <span className="whitespace-nowrap leading-tight">
                <span className="relative block h-[1.3em] text-[10px] font-bold uppercase tracking-wider text-primary md:text-[11px]">
                  <span className="vzi-out absolute inset-0" style={exit(TL.label, { t: 0.2, to: 'translateY(-60%)' })}>
                    Ваш выбор
                  </span>
                  <span className="vzi-in absolute inset-0" style={enter(TL.label + 0.12, { t: 0.5, from: 'translateY(60%)', ease: 'var(--out)' })}>
                    Станет
                  </span>
                </span>
                <span className="block text-xs font-semibold md:text-sm">Soft Wood · дуб</span>
              </span>
            </div>
          </Layer>
          <Layer className="left-[3%] top-[4%]">
            <span
              className="vzi-in block rounded-full bg-foreground/75 px-3 py-1 text-xs font-semibold text-background md:text-sm"
              style={enter(TL.before, { t: 0.6, from: 'scale(0.6)', ease: 'var(--pop)' })}
            >
              Было
            </span>
          </Layer>

          {/* Палец: касается образца, нажимает на затвор, тянет шторку. Тёмный с белым кантом — виден и на белой кнопке */}
          <div className="vzi-finger pointer-events-none absolute left-0 top-0" aria-hidden="true">
            <span className="absolute left-0 top-0 size-8 -translate-x-1/2 -translate-y-1/2 md:size-11">
              <span className="vzi-finger-ring absolute inset-0 rounded-full border-2 border-white" />
              <span className="vzi-finger-dot block size-full rounded-full border-2 border-white bg-[rgba(20,18,16,0.4)] shadow-[0_6px_18px_rgba(0,0,0,0.45)]" />
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
