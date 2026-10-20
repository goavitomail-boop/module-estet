'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import { FAINT, INK, K, fitTo, line, moduleView, type Pt, type Range } from '@/components/axo'
import { mdfFrameDecors } from '@/lib/catalog-data'
import { cn } from '@/lib/utils'
import './module-layers.css'

/**
 * Нижний модуль кухни в разрезе: столешница, каркас из МДФ, задняя стенка
 * и фасад. Когда блок виден, модуль разбирается на слои и по очереди
 * показывает каждый; кнопкой слой выбирают сами, кружками — декор каркаса.
 *
 * Все числа — из каталога производства: высота и глубина каркаса —
 * constructionSpecs, столешница и свес — countertopSpecs, толщина фасадов —
 * facadeCollections (lib/catalog-data.ts), кромка каркаса — раздел «Корпус
 * МДФ» (lib/pdf-catalog-data.ts). Ширины модуля и толщины плит в каталоге
 * нет, поэтому на схеме они не подписаны. Миллиметры и оси — как в axo.ts.
 */

const { P, AX_ANGLE, DEPTH_ANGLE, front, top, side, pullOut } = moduleView

const VIEW = { w: 520, h: 440 }

/** Каркас: ширина (на схеме без подписи), высота и глубина из каталога, плита */
const W = 600
const H = 720
const D = 530
const T = 16
/** Столешница 40 мм, свес 30 мм за каркас, глубина 600 */
const TOP_Y: Range = [H, H + 40]
const TOP_Z: Range = [-30, 570]
/** Фасад перед каркасом, задняя стенка ХДФ в пазу у задней кромки */
const FACADE_Z: Range = [-18, -2]
const BACK_Z: Range = [D - 22, D - 18]

/** Насколько слои разъезжаются, мм: столешница вверх, фасад к зрителю, стенка назад */
const APART = { top: 300, facade: 380, back: 300 }

const PARTS = [
  {
    id: 'top',
    label: 'Столешница',
    title: 'Столешница SLOTEX',
    text: 'Толщина 40 мм, свес спереди за каркасами — 30 мм, одинаковый для кухонь с ручками и с профилем LINE. Декоры однотонные, под камень и мрамор, под дерево.',
  },
  {
    id: 'carcass',
    label: 'Каркас МДФ',
    title: 'Каркас из МДФ',
    text: 'Высота каркаса — 720 мм, глубина — 530 мм. Торцы деталей закрыты кромкой 0,4 мм на клее PUR со всех сторон. Декор — один из десяти, его можно выбрать ниже.',
  },
  {
    id: 'back',
    label: 'Задняя стенка',
    title: 'Задняя стенка из ХДФ',
    text: 'Стенка ставится в паз каркаса.',
  },
  {
    id: 'facade',
    label: 'Фасад',
    title: 'Фасад',
    text: 'Толщина 16 мм у Soft & Wood и 18 мм у Touch. Торцы закрыты кромкой ПВХ 0,8 мм на клее PUR со всех сторон.',
  },
] as const
type PartId = (typeof PARTS)[number]['id']

/** Сколько автопоказ держит каждый слой: разъезд, подписи и время прочитать */
const AUTO_STEP = 3

const COUNTERTOP = 'color-mix(in oklab, var(--foreground) 22%, var(--card))'
const COUNTERTOP_TOP = 'color-mix(in oklab, var(--foreground) 12%, var(--card))'
const HDF = 'color-mix(in oklab, var(--foreground) 9%, var(--card))'
const FACADE = 'var(--card)'
const SHADE = 'color-mix(in oklab, var(--foreground) 7%, var(--card))'
const BRASS = 'var(--primary)'

/** Тона декора для граней: лицо — сам декор, верх светлее, бок темнее */
function tones(hex: string) {
  return {
    face: hex,
    top: `color-mix(in oklab, ${hex} 82%, var(--card))`,
    side: `color-mix(in oklab, ${hex} 84%, var(--foreground))`,
  }
}

/* ── Детали ─────────────────────────────────────────────────────────── */

/** Плита: видны лицо, верх и правый бок */
function Slab({ x, y, z, face, topTone, sideTone, width = 0.8 }: { x: Range; y: Range; z: Range; face: string; topTone: string; sideTone: string; width?: number }) {
  return (
    <g stroke={INK} strokeWidth={width} strokeLinejoin="round">
      <path d={side(x[1], y, z)} fill={sideTone} />
      <path d={top(x, y[1], z)} fill={topTone} />
      <path d={front(x, y, z[0])} fill={face} />
    </g>
  )
}

/** Слой схемы: едет при разборке, отступает, когда выбран другой */
function Part({ id, active, explode, d, children }: { id: PartId; active: PartId | null; explode: string; d: number; children: ReactNode }) {
  return (
    <g className="ml-part" data-on={active === id || undefined} style={{ '--explode': explode, '--d': `${d}s` } as CSSProperties}>
      {children}
    </g>
  )
}

/** Размер: выноски, линия прочерчивается, засечки, число вдоль линии */
function Dim({ a, b, from, label, angle, on, d, size }: { a: Pt; b: Pt; from: [Pt, Pt]; label: string; angle: number; on: boolean; d: number; size: number }) {
  const data = { 'data-on': on || undefined, style: { '--d': `${d}s` } as CSSProperties }
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return (
    <g>
      <path className="ml-show" {...data} d={`${line([from[0], a])}${line([from[1], b])}`} stroke={BRASS} strokeWidth={0.8} />
      <path className="ml-line" {...data} pathLength={1} d={line([a, b])} stroke={BRASS} strokeWidth={1.2} fill="none" />
      <g className="ml-show" {...data}>
        {[a, b].map(([x, y]) => (
          <path key={x} d={`M${(x - 5).toFixed(1)},${(y + 5).toFixed(1)}L${(x + 5).toFixed(1)},${(y - 5).toFixed(1)}`} stroke={BRASS} strokeWidth={1.4} />
        ))}
      </g>
      <g transform={`translate(${mid[0].toFixed(1)} ${mid[1].toFixed(1)}) rotate(${angle.toFixed(1)})`}>
        <text className="ml-show" {...data} y={(-size * 1.1).toFixed(1)} textAnchor="middle" fontSize={size.toFixed(1)} fontWeight={600} fill="var(--foreground)" style={{ ...data.style, fontFamily: 'var(--font-roboto), sans-serif' }}>
          {label}
        </text>
      </g>
    </g>
  )
}

/** Сдвиг вверх на mm миллиметров — для CSS transform, в единицах чертежа */
const lift = (mm: number) => `translate(0px, ${(-K * mm).toFixed(1)}px)`
/** Точка разобранного слоя: столешница выше, фасад ближе, стенка дальше */
const up = (x: number, y: number, z: number) => P(x, y + APART.top, z)
const near = (x: number, y: number, z: number) => P(x, y, z - APART.facade)
const far = (x: number, y: number, z: number) => P(x, y, z + APART.back)

/** Чертёж вписан в кадр по разобранному модулю и его подписям */
const FRAME = fitTo(
  [
    P(0, 0, 0), P(W, 0, 0), P(W, 0, D), up(0, TOP_Y[1], TOP_Z[1]), up(W, TOP_Y[1], TOP_Z[0]), up(W, TOP_Y[0], TOP_Z[0]),
    near(0, 0, FACADE_Z[0]), near(W, 0, FACADE_Z[0]), near(0, H, FACADE_Z[0]),
    far(W, H, BACK_Z[1]), far(0, H, BACK_Z[1]),
    P(W + 140, 0, 0), P(W + 140, 0, D),
  ],
  VIEW,
  { x: 16, top: 16, bottom: 16 },
)

/* ── Схема ──────────────────────────────────────────────────────────── */

function Scheme({ active, open, decor }: { active: PartId | null; open: boolean; decor: string }) {
  const { fit, tx, ty } = FRAME
  const size = 14 / fit
  const tone = tones(decor)
  const on = (id: PartId) => open && active === id
  const show = (id: PartId, d: number) => ({ className: 'ml-show', 'data-on': on(id) || undefined, style: { '--d': `${d}s` } as CSSProperties })

  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 size-full" aria-hidden="true">
      <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${fit.toFixed(3)})`}>
        <path d={line([P(-300, 0, 0), P(W + 400, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />

        {/* Задняя стенка: дальше всех, рисуется первой */}
        <Part id="back" active={active} explode={pullOut(-APART.back)} d={0.16}>
          <Slab x={[T - 6, W - T + 6]} y={[T - 6, H - T + 6]} z={BACK_Z} face={HDF} topTone={HDF} sideTone={SHADE} />
          <g {...show('back', 0.9)}>
            <path d={front([T - 6, W - T + 6], [T - 6, H - T + 6], BACK_Z[0])} fill="none" stroke={BRASS} strokeWidth={1.6} />
          </g>
        </Part>

        {/* Каркас: левая боковина, дно, задняя и передняя царги, правая боковина */}
        <Part id="carcass" active={active} explode="none" d={0}>
          <Slab x={[0, T]} y={[0, H]} z={[0, D]} face={tone.face} topTone={tone.top} sideTone={tone.side} />
          <Slab x={[T, W - T]} y={[0, T]} z={[0, D]} face={tone.face} topTone={tone.top} sideTone={tone.side} />
          <Slab x={[T, W - T]} y={[H - T, H]} z={[D - 118, D - 18]} face={tone.face} topTone={tone.top} sideTone={tone.side} />
          <Slab x={[T, W - T]} y={[H - T, H]} z={[0, 100]} face={tone.face} topTone={tone.top} sideTone={tone.side} />
          <Slab x={[W - T, W]} y={[0, H]} z={[0, D]} face={tone.face} topTone={tone.top} sideTone={tone.side} width={1} />
          {/* Кромка: торцы деталей спереди загораются латунью */}
          <g {...show('carcass', 0.5)} fill={BRASS} stroke="none">
            <path d={front([0, T], [0, H], 0)} />
            <path d={front([W - T, W], [0, H], 0)} />
            <path d={front([T, W - T], [0, T], 0)} />
            <path d={front([T, W - T], [H - T, H], 0)} />
          </g>
        </Part>

        {/* Фасад с ручкой: ближе всех к зрителю */}
        <Part id="facade" active={active} explode={pullOut(APART.facade)} d={0.08}>
          <Slab x={[2, W - 2]} y={[3, H - 3]} z={FACADE_Z} face={FACADE} topTone={SHADE} sideTone={SHADE} width={1} />
          <path d={line([P(W / 2 - 90, H - 70, FACADE_Z[0] - 8), P(W / 2 + 90, H - 70, FACADE_Z[0] - 8)])} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <g {...show('facade', 0.9)} fill={BRASS} stroke="none">
            <path d={side(W - 2, [3, H - 3], FACADE_Z)} />
            <path d={top([2, W - 2], H - 3, FACADE_Z)} />
          </g>
        </Part>

        {/* Столешница: выше всех, рисуется последней */}
        <Part id="top" active={active} explode={lift(APART.top)} d={0}>
          <Slab x={[0, W]} y={TOP_Y} z={TOP_Z} face={COUNTERTOP} topTone={COUNTERTOP_TOP} sideTone={COUNTERTOP} width={1} />
          <g {...show('top', 0.9)}>
            <path d={front([0, W], TOP_Y, TOP_Z[0])} fill="none" stroke={BRASS} strokeWidth={1.6} />
          </g>
        </Part>

        {/* Размеры каркаса — из каталога */}
        <Dim
          a={P(W + 110, 0, 0)}
          b={P(W + 110, H, 0)}
          from={[P(W + 10, 0, 0), P(W + 10, H, 0)]}
          label="720 мм"
          angle={-90}
          on={on('carcass')}
          d={0.7}
          size={size}
        />
        <Dim
          a={P(W + 110, 0, 0)}
          b={P(W + 110, 0, D)}
          from={[P(W + 10, 0, 0), P(W + 10, 0, D)]}
          label="530 мм"
          angle={DEPTH_ANGLE}
          on={on('carcass')}
          d={0.85}
          size={size}
        />
        {/* Свес столешницы за каркас */}
        <Dim
          a={up(-40, TOP_Y[0], TOP_Z[0])}
          b={up(-40, TOP_Y[0], 0)}
          from={[up(0, TOP_Y[0], TOP_Z[0]), up(0, TOP_Y[0], 0)]}
          label="30"
          angle={DEPTH_ANGLE}
          on={on('top')}
          d={0.8}
          size={size * 0.9}
        />
        <text
          {...show('top', 1)}
          x={up(W + 24, TOP_Y[0] + 20, TOP_Z[0])[0].toFixed(1)}
          y={up(W + 24, TOP_Y[0] + 20, TOP_Z[0])[1].toFixed(1)}
          fontSize={size.toFixed(1)}
          fontWeight={600}
          fill="var(--foreground)"
          dominantBaseline="middle"
          style={{ ...show('top', 1).style, fontFamily: 'var(--font-roboto), sans-serif' }}
        >
          40 мм
        </text>
        <text
          {...show('facade', 1)}
          x={near(W + 30, H / 2, FACADE_Z[0])[0].toFixed(1)}
          y={near(W + 30, H / 2, FACADE_Z[0])[1].toFixed(1)}
          fontSize={size.toFixed(1)}
          fontWeight={600}
          fill="var(--foreground)"
          dominantBaseline="middle"
          transform={`rotate(${AX_ANGLE.toFixed(1)} ${near(W + 30, H / 2, FACADE_Z[0])[0].toFixed(1)} ${near(W + 30, H / 2, FACADE_Z[0])[1].toFixed(1)})`}
          style={{ ...show('facade', 1).style, fontFamily: 'var(--font-roboto), sans-serif' }}
        >
          16 / 18 мм
        </text>
      </g>
    </svg>
  )
}

/* ── Бирки поверх схемы ─────────────────────────────────────────────── */

/** Бирка в точке чертежа: координаты в процентах кадра */
function Tag({ at, on, d, title, children }: { at: Pt; on: boolean; d: number; title: string; children: ReactNode }) {
  const [x, y] = [at[0] * FRAME.fit + FRAME.tx, at[1] * FRAME.fit + FRAME.ty]
  return (
    <span
      className="ml-show pointer-events-none absolute"
      data-on={on || undefined}
      style={{ left: `${(x / VIEW.w) * 100}%`, top: `${(y / VIEW.h) * 100}%`, '--d': `${d}s` } as CSSProperties}
    >
      <span className="plan-tag -translate-x-1/2 -translate-y-1/2">
        <span className="plan-tag__title">{title}</span>
        <span className="plan-tag__value">{children}</span>
      </span>
    </span>
  )
}

/* ── Блок целиком ───────────────────────────────────────────────────── */

export function ModuleLayers() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<PartId | null>(null)
  // Древесный декор по умолчанию: на нём каркас сразу отличается от белого фасада
  const [decor, setDecor] = useState(() => Math.max(0, mdfFrameDecors.findIndex((item) => item.name === 'Дуб Каселла Натуральный')))
  // Автопоказ идёт, пока человек сам ничего не выбрал
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
        if (!entry.isIntersecting) return
        // Первый показ: модуль разбирается и начинает со столешницы. При
        // «уменьшить движение» ничего не листается само
        setOpen(true)
        setActive((current) => current ?? PARTS[0].id)
        if (reduced) setAuto(false)
      },
      { threshold: 0.45 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const choose = (id: PartId) => {
    setAuto(false)
    setOpen(true)
    setActive((current) => (current === id && open ? null : id))
  }
  const next = () => {
    const index = PARTS.findIndex((part) => part.id === active)
    if (index < PARTS.length - 1) setActive(PARTS[index + 1].id)
    else setAuto(false)
  }
  const toggle = () => {
    setAuto(false)
    setActive(null)
    setOpen((value) => !value)
  }
  const pickDecor = (index: number) => {
    setAuto(false)
    setDecor(index)
    setOpen(true)
    setActive('carcass')
  }

  const part = PARTS.find((entry) => entry.id === active)
  const running = auto && visible && !paused
  const focus = open && active !== null

  return (
    <div
      ref={rootRef}
      className="hs ml flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr_auto] lg:gap-x-10"
      data-open={open || undefined}
      data-focus={focus || undefined}
    >
      <div className="lg:col-start-2">
        <p className="flyer-title text-2xl md:text-3xl">Каркасы из МДФ, а не ДСП</p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Нижний модуль кухни по слоям. Нажмите на слой — он выделится на схеме, рядом встанут размеры из каталога.
        </p>
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:-mx-8 md:px-8 lg:col-start-2 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="group" aria-label="Слой модуля">
        {PARTS.map((entry) => {
          const on = open && entry.id === active
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={on}
              onClick={() => choose(entry.id)}
              className={cn(
                'relative min-h-11 shrink-0 overflow-hidden rounded-full border px-4 text-sm font-semibold transition-colors',
                on ? 'border-foreground bg-foreground text-background' : 'border-primary/35 bg-card text-foreground hover:border-primary',
              )}
            >
              {entry.label}
              {on && auto && (
                <span
                  key={entry.id}
                  className="ml-progress absolute inset-x-3 bottom-1.5 block h-0.5 rounded-full bg-primary"
                  style={{ '--t': `${AUTO_STEP}s`, animationPlayState: running ? 'running' : 'paused' } as CSSProperties}
                  onAnimationEnd={next}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
        {auto && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? 'Продолжить показ' : 'Остановить показ'}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/35 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          </button>
        )}
      </div>

      <div className="paper relative aspect-[52/44] w-full overflow-hidden rounded-2xl border border-primary/35 lg:col-start-1 lg:row-span-5 lg:row-start-1 lg:self-start">
        <Scheme active={active} open={open} decor={mdfFrameDecors[decor].hex} />
        <Tag at={up(W * 0.35, TOP_Y[1], TOP_Z[1])} on={open && active === 'top'} d={1.1} title="Свес спереди">
          30 мм за каркас
        </Tag>
        <Tag at={P(T + 40, H * 0.55, D * 0.4)} on={open && active === 'carcass'} d={1} title="Кромка">
          0,4 мм на PUR
        </Tag>
        <Tag at={far(W * 0.62, H - 40, BACK_Z[0])} on={open && active === 'back'} d={1} title="ХДФ">
          в паз каркаса
        </Tag>
        <Tag at={near(W * 0.3, H * 0.32, FACADE_Z[0])} on={open && active === 'facade'} d={1.1} title="Кромка">
          ПВХ 0,8 мм на PUR
        </Tag>
        <button
          type="button"
          onClick={toggle}
          className="absolute bottom-3 right-3 inline-flex min-h-9 items-center rounded-full border border-primary/35 bg-card/90 px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary"
        >
          {open ? 'Собрать модуль' : 'Разобрать модуль'}
        </button>
      </div>

      <div className="min-h-[7.5rem] rounded-2xl border border-border bg-card p-5 lg:col-start-2" aria-live="polite">
        {part && open ? (
          <>
            <p className="flyer-title text-xl md:text-2xl">{part.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{part.text}</p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Корпуса доступны в десяти декорах МДФ, а фасады, витрины и столешницы подбираются дизайнером индивидуально под ваш проект.
          </p>
        )}
      </div>

      <div className="lg:col-start-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Декор каркаса · <span className="normal-case tracking-normal text-foreground">{mdfFrameDecors[decor].name}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Декор каркаса">
          {mdfFrameDecors.map((item, index) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={decor === index}
              aria-label={item.name}
              title={item.name}
              onClick={() => pickDecor(index)}
              className={cn(
                'size-9 rounded-full border transition-transform hover:scale-110',
                decor === index ? 'border-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border',
              )}
              style={{ backgroundColor: item.hex }}
            />
          ))}
        </div>
      </div>

      <Link
        href="/quiz"
        className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground lg:col-start-2 lg:justify-self-start"
      >
        Подобрать материалы
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  )
}
