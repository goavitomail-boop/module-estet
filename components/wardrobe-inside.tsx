'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Pause, Play } from 'lucide-react'
import { BRASS, FACE, FAINT, INK, SHADE, SHADE_DEEP, fitTo, line, path, wardrobeView, type Pt, type Range } from '@/components/axo'
import { wardrobeSpecs } from '@/lib/wardrobes-data'
import { cn } from '@/lib/utils'
import './wardrobe-inside.css'

/**
 * Шкаф изнутри: схема в той же аксонометрии, что «Наполнение» на главной
 * (components/axo.ts). Слева закрытая секция, посередине открытая — штанга,
 * брючница и ящики, справа узкая — выдвижная торцевая штанга и сетка для
 * обуви. Вещей на схеме нет — только механизмы, чтобы было видно, как они
 * устроены. Кнопка выдвигает свой элемент, и на нём встаёт размер.
 *
 * Все размеры на схеме — из каталога (wardrobeSpecs в lib/wardrobes-data.ts),
 * сам рисунок — схема, а не замер конкретного шкафа. Миллиметры, оси — как
 * в axo.ts.
 */

/** Ракурс почти спереди (axo.ts): выдвинутое при этом видно сверху и сбоку */
const { P, AX_ANGLE, DEPTH_ANGLE, front, top, side, pullOut, sweptOpening } = wardrobeView

const VIEW = { w: 440, h: 600 }

/** Корпус: высота, глубина, толщина плиты, опоры */
const H = 2200
const D = 580
const T = 16
const FLOOR = 7
const W = 1800
/** Закрытая секция, проёмы открытых и высота внутри */
const DOOR: Range = [1.5, 448.5]
const B: Range = [466, 1350]
const C: Range = [1366, 1784]
const INNER: Range = [FLOOR + T, H - T]

/** Ход выдвижных элементов */
const TRAVEL = { drawers: 380, trousers: 420, rod: 380 }

const ITEMS = [
  { id: 'drawers', label: 'Ящики', spec: 'Выдвижные ящики' },
  { id: 'trousers', label: 'Брючница', spec: 'Брючница' },
  { id: 'rod', label: 'Выдвижная штанга', spec: 'Выдвижные торцевые штанги' },
  { id: 'shoes', label: 'Обувь', spec: 'Сетка для обуви' },
  { id: 'light', label: 'Подсветка', spec: 'Врезная LED-подсветка' },
] as const
type ItemId = (typeof ITEMS)[number]['id']

/** Сколько автопоказ держит каждый элемент: выезд, размер и время прочитать */
const AUTO_STEP = 2.8

const specOf = (name: string) => wardrobeSpecs.flatMap((group) => group.items).find((item) => item.name === name)

/* ── Детали ─────────────────────────────────────────────────────────── */

/** Полка или плита: видны лицо, верх и правый бок */
function Box({ x, y, z, tone = FACE }: { x: Range; y: Range; z: Range; tone?: string }) {
  return (
    <g stroke={INK} strokeWidth={0.8} strokeLinejoin="round">
      <path d={side(x[1], y, z)} fill={SHADE_DEEP} />
      <path d={top(x, y[1], z)} fill={SHADE} />
      <path d={front(x, y, z[0])} fill={tone} />
    </g>
  )
}

/** Сетка для обуви внизу узкой секции: наклонная, сзади выше — высота сетки на глубине z */
const NET = { x: [C[0] + 20, C[1] - 20] as Range, z: [40, 440] as Range, y: [40, 190] as Range }
const netY = (z: number) => NET.y[0] + ((z - NET.z[0]) * (NET.y[1] - NET.y[0])) / (NET.z[1] - NET.z[0])

/* ── Выдвижные элементы ─────────────────────────────────────────────── */

const DRAWERS: Range[] = [[60, 335], [350, 525], [540, 640]]
const DRAWER_X: Range = [500, 1316]

/** Внутренний ящик: левая стенка изнутри, дно, правый бок снаружи, лицо */
function Drawer({ y }: { y: Range }) {
  const box: Range = [DRAWER_X[0] + 16, DRAWER_X[1] - 16]
  const floor = y[0] + 15
  const rim = y[1] - 20
  const zs: Range = [10, 470]
  return (
    <g strokeLinejoin="round">
      <path d={side(box[0], [floor, rim], zs)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={top(box, floor, zs)} fill={SHADE} stroke={INK} strokeWidth={0.8} />
      <path d={side(box[1], [floor, rim], zs)} fill={SHADE} stroke={INK} strokeWidth={0.8} />
      <path d={front(DRAWER_X, y, zs[0])} fill={FACE} stroke={INK} strokeWidth={1} />
      <path d={line([P(860, y[1] - 22, zs[0]), P(956, y[1] - 22, zs[0])])} stroke={BRASS} strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

/** Брючница: выдвижная рама с перекладинами вглубь; ездит по направляющим на стенках секции */
const RACK = { x: [520, 1296] as Range, y: 960, z: [30, 460] as Range }
function TrouserRack() {
  const bars = Array.from({ length: 8 }, (_, i) => RACK.x[0] + 60 + i * 94)
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      {bars.map((x) => (
        <path key={x} d={line([P(x, RACK.y, RACK.z[0]), P(x, RACK.y, RACK.z[1])])} stroke={BRASS} strokeWidth={1.4} />
      ))}
      <path d={top(RACK.x, RACK.y, RACK.z)} fill="color-mix(in oklab, var(--primary) 8%, transparent)" stroke={BRASS} strokeWidth={1.6} />
      {/* Передняя перекладина — за неё выдвигают */}
      <path d={line([P(RACK.x[0], RACK.y, RACK.z[0]), P(RACK.x[1], RACK.y, RACK.z[0])])} stroke={BRASS} strokeWidth={3} />
    </g>
  )
}

/** Торцевая штанга в узкой секции: штанга выезжает из корпуса под полкой */
const ROD = { x: (C[0] + C[1]) / 2, y: 1880, z: [30, 430] as Range }
function EndRod() {
  return (
    <g strokeLinecap="round">
      <path d={line([P(ROD.x, ROD.y, ROD.z[0]), P(ROD.x, ROD.y, ROD.z[1])])} stroke={BRASS} strokeWidth={3} />
      {/* Упор на переднем конце */}
      <path d={line([P(ROD.x, ROD.y - 25, ROD.z[0]), P(ROD.x, ROD.y + 25, ROD.z[0])])} stroke={BRASS} strokeWidth={3} />
    </g>
  )
}

/* ── Подписи ────────────────────────────────────────────────────────── */

/** Размер: выноски от концов, линия прочерчивается, засечки, число вдоль линии */
function Dim({ a, b, from, label, angle, above = false, on, d, size }: {
  a: Pt; b: Pt; from?: [Pt, Pt]; label: string; angle: number; above?: boolean; on: boolean; d: number; size: number
}) {
  const data = { 'data-on': on || undefined, style: { '--d': `${d}s` } as CSSProperties }
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return (
    <g>
      {from && <path className="ws-show" {...data} d={`${line([from[0], a])}${line([from[1], b])}`} stroke={BRASS} strokeWidth={0.8} />}
      <path className="ws-line" {...data} pathLength={1} d={line([a, b])} stroke={BRASS} strokeWidth={1.2} fill="none" />
      <g className="ws-show" {...data}>
        {[a, b].map(([x, y]) => (
          <path key={x} d={`M${(x - 5).toFixed(1)},${(y + 5).toFixed(1)}L${(x + 5).toFixed(1)},${(y - 5).toFixed(1)}`} stroke={BRASS} strokeWidth={1.4} />
        ))}
      </g>
      <g transform={`translate(${mid[0].toFixed(1)} ${mid[1].toFixed(1)}) rotate(${angle.toFixed(1)})`}>
        <text className="ws-show" {...data} y={((above ? -1 : 1) * size * 1.3).toFixed(1)} textAnchor="middle" fontSize={size.toFixed(1)} fontWeight={600} fill="var(--foreground)" style={{ ...data.style, fontFamily: 'var(--font-roboto), sans-serif', dominantBaseline: 'middle' }}>
          {label}
        </text>
      </g>
    </g>
  )
}

/** Чертёж вписан в кадр по корпусу и по самому далеко выезжающему */
const FRAME = fitTo(
  [
    P(0, FLOOR, 0), P(0, H, D), P(W, H, D), P(W, FLOOR, 0), P(W, FLOOR, D),
    P(DRAWER_X[0], DRAWERS[0][0] - 90, -TRAVEL.drawers), P(DRAWER_X[1] + 260, DRAWERS[0][0], -TRAVEL.drawers),
    P(ROD.x, 2010, ROD.z[0] - TRAVEL.rod),
  ],
  VIEW,
  { x: 14, top: 14, bottom: 14 },
)

/* ── Схема ──────────────────────────────────────────────────────────── */

function Scheme({ active, uid }: { active: ItemId | null; uid: string }) {
  const is = (id: ItemId) => active === id
  const move = (id: ItemId, travel: number, d = 0) => ({
    className: 'ws-move',
    'data-open': is(id) || undefined,
    style: { '--pull': pullOut(travel), '--d': `${d}s` } as CSSProperties,
  })

  const { fit, tx, ty } = FRAME
  const size = 12 / fit
  const clip = (name: string) => `url(#${uid}-${name})`

  const pulledDrawer = -TRAVEL.drawers + 10
  const pulledRack = RACK.z[0] - TRAVEL.trousers

  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        <clipPath id={`${uid}-b`}><path d={front(B, INNER, 0)} /></clipPath>
        <clipPath id={`${uid}-c`}><path d={front(C, INNER, 0)} /></clipPath>
        <clipPath id={`${uid}-b-out`}><path d={sweptOpening(B, INNER, 0, TRAVEL.trousers)} /></clipPath>
        <clipPath id={`${uid}-c-out`}><path d={sweptOpening(C, INNER, 0, TRAVEL.rod)} /></clipPath>
        <linearGradient id={`${uid}-light`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${fit.toFixed(3)})`}>
        <path d={line([P(-200, 0, 0), P(W + 300, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />

        {/* Корпус снаружи: правый бок и крыша */}
        <path d={side(W, [FLOOR, H], [0, D])} fill={SHADE} stroke={INK} strokeWidth={1} />
        <path d={top([0, W], H, [0, D])} fill={SHADE} stroke={INK} strokeWidth={1} />

        {/* Закрытая секция: дверь с ручкой */}
        <path d={front(DOOR, [FLOOR, H], 0)} fill={FACE} stroke={INK} strokeWidth={1} />
        <path d={line([P(420, 950, 0), P(420, 1250, 0)])} stroke={INK} strokeWidth={2} strokeLinecap="round" />

        {/* Основная секция изнутри */}
        <g clipPath={clip('b')}>
          <path d={front(B, INNER, D - 10)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
          <path d={side(B[0], INNER, [0, D - 10])} fill={SHADE} stroke={INK} strokeWidth={0.8} />
          <path d={top(B, INNER[0], [0, D - 10])} fill={SHADE} stroke={INK} strokeWidth={0.8} />

          {/* Направляющие брючницы на стенках: по ним ездит рама */}
          {[B[0] + 6, B[1] - 6].map((x) => (
            <path key={x} d={line([P(x, RACK.y, 10), P(x, RACK.y, D - 30)])} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
          ))}
          {/* Средняя полка, штанга на держателях, верхняя полка */}
          <Box x={B} y={[1000, 1016]} z={[0, D - 10]} />
          {[B[0] + 14, B[1] - 14].map((x) => (
            <path key={x} d={line([P(x, 1760, 280), P(x, 1914, 280)])} stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
          ))}
          <path d={line([P(B[0] + 14, 1760, 280), P(B[1] - 14, 1760, 280)])} stroke={BRASS} strokeWidth={3.6} strokeLinecap="round" />
          <Box x={B} y={[1914, 1930]} z={[0, D - 10]} />

          {/* Подсветка: планка под полкой и свет вниз */}
          <path
            d={front([B[0] + 14, B[1] - 14], [1100, 1902], 40)}
            fill={`url(#${uid}-light)`}
            className="ws-show"
            data-on={is('light') || undefined}
            style={{ '--d': '0s' } as CSSProperties}
          />
          <path d={front([B[0] + 14, B[1] - 14], [1902, 1914], 30)} fill={is('light') ? BRASS : SHADE_DEEP} stroke={INK} strokeWidth={0.6} style={{ transition: 'fill 0.3s' }} />
        </g>

        {/* Узкая секция изнутри: сетка для обуви, полки, корпус торцевой штанги */}
        <g clipPath={clip('c')}>
          <path d={front(C, INNER, D - 10)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
          <path d={side(C[0], INNER, [0, D - 10])} fill={SHADE} stroke={INK} strokeWidth={0.8} />
          <path d={top(C, INNER[0], [0, D - 10])} fill={SHADE} stroke={INK} strokeWidth={0.8} />
          {/* Сетка для обуви: при выборе загорается латунью */}
          <g>
            <path
              d={path([P(NET.x[0], NET.y[0], NET.z[0]), P(NET.x[1], NET.y[0], NET.z[0]), P(NET.x[1], NET.y[1], NET.z[1]), P(NET.x[0], NET.y[1], NET.z[1])])}
              fill={is('shoes') ? 'color-mix(in oklab, var(--primary) 22%, var(--card))' : 'none'}
              stroke={is('shoes') ? BRASS : INK}
              strokeWidth={is('shoes') ? 1.6 : 0.8}
              style={{ transition: 'fill 0.4s, stroke 0.4s' }}
            />
            {/* Сетка: перекладины поперёк и прутья вдоль наклона */}
            {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((k) => {
              const z = NET.z[0] + k * (NET.z[1] - NET.z[0])
              return <path key={k} d={line([P(NET.x[0], netY(z), z), P(NET.x[1], netY(z), z)])} stroke={is('shoes') ? BRASS : INK} strokeWidth={0.8} />
            })}
            {[0.25, 0.5, 0.75].map((k) => {
              const x = NET.x[0] + k * (NET.x[1] - NET.x[0])
              return <path key={k} d={line([P(x, NET.y[0], NET.z[0]), P(x, NET.y[1], NET.z[1])])} stroke={is('shoes') ? BRASS : INK} strokeWidth={0.8} />
            })}
          </g>

          <Box x={C} y={[680, 696]} z={[0, D - 10]} />
          <Box x={C} y={[1080, 1096]} z={[0, D - 10]} />
          <Box x={C} y={[1914, 1930]} z={[0, D - 10]} />
          {/* Корпус торцевой штанги под полкой: из него она и выезжает */}
          <path d={front([ROD.x - 22, ROD.x + 22], [ROD.y + 10, 1914], 20)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
          <path d={side(ROD.x + 22, [ROD.y + 10, 1914], [20, D - 30])} fill={SHADE} stroke={INK} strokeWidth={0.8} />
        </g>

        {/* Кромки корпуса спереди: перегородки, бок, крыша и дно */}
        {[[450, 466], [1350, 1366], [1784, W]].map(([x0, x1]) => (
          <path key={x0} d={front([x0, x1], [FLOOR, H], 0)} fill={FACE} stroke={INK} strokeWidth={1} />
        ))}
        <path d={front([450, W], [H - T, H], 0)} fill={FACE} stroke={INK} strokeWidth={1} />
        <path d={front([450, W], [FLOOR, FLOOR + T], 0)} fill={FACE} stroke={INK} strokeWidth={1} />

        {/* Выдвижное основной секции: ящики снизу вверх, затем брючница — она выше и ближе */}
        <g clipPath={clip('b-out')}>
          {DRAWERS.map((y, i) => (
            <g key={y[0]} {...move('drawers', TRAVEL.drawers, i * 0.1)}>
              <Drawer y={y} />
            </g>
          ))}
          <g {...move('trousers', TRAVEL.trousers)}>
            <TrouserRack />
          </g>
        </g>
        <g clipPath={clip('c-out')}>
          <g {...move('rod', TRAVEL.rod)}>
            <EndRod />
          </g>
        </g>

        {/* Размеры — из каталога */}
        {DRAWERS.map((y, i) => (
          <text
            key={y[0]}
            className="ws-show"
            data-on={is('drawers') || undefined}
            style={{ '--d': `${0.8 + i * 0.1}s`, fontFamily: 'var(--font-roboto), sans-serif' } as CSSProperties}
            x={P(DRAWER_X[1] + 30, (y[0] + y[1]) / 2, pulledDrawer)[0].toFixed(1)}
            y={P(DRAWER_X[1] + 30, (y[0] + y[1]) / 2, pulledDrawer)[1].toFixed(1)}
            fontSize={size.toFixed(1)}
            fontWeight={600}
            fill="var(--foreground)"
            dominantBaseline="middle"
          >
            {['275 мм', '175 мм', '100 мм'][i]}
          </text>
        ))}
        <Dim
          a={P(DRAWER_X[0], DRAWERS[0][0] - 60, pulledDrawer)}
          b={P(DRAWER_X[1], DRAWERS[0][0] - 60, pulledDrawer)}
          from={[P(DRAWER_X[0], DRAWERS[0][0] - 10, pulledDrawer), P(DRAWER_X[1], DRAWERS[0][0] - 10, pulledDrawer)]}
          label="300–1000 мм"
          angle={AX_ANGLE}
          on={is('drawers')}
          d={0.9}
          size={size}
        />
        <Dim
          a={P(RACK.x[0], RACK.y + 50, pulledRack)}
          b={P(RACK.x[1], RACK.y + 50, pulledRack)}
          from={[P(RACK.x[0], RACK.y + 10, pulledRack), P(RACK.x[1], RACK.y + 10, pulledRack)]}
          label="500–900 мм"
          angle={AX_ANGLE}
          above
          on={is('trousers')}
          d={0.85}
          size={size}
        />
        <Dim
          a={P(ROD.x, 1990, ROD.z[0] - TRAVEL.rod)}
          b={P(ROD.x, 1990, ROD.z[1] - TRAVEL.rod)}
          from={[P(ROD.x, 1900, ROD.z[0] - TRAVEL.rod), P(ROD.x, 1900, ROD.z[1] - TRAVEL.rod)]}
          label="300–450 мм"
          angle={DEPTH_ANGLE}
          above
          on={is('rod')}
          d={0.85}
          size={size}
        />
      </g>
    </svg>
  )
}

/* ── Бирки поверх схемы ─────────────────────────────────────────────── */

/** Бирка в точке чертежа: координаты в процентах кадра */
function Tag({ at, on, d, children }: { at: Pt; on: boolean; d: number; children: ReactNode }) {
  return (
    <span
      className="ws-show pointer-events-none absolute"
      data-on={on || undefined}
      style={{ left: `${(at[0] / VIEW.w) * 100}%`, top: `${(at[1] / VIEW.h) * 100}%`, '--d': `${d}s` } as CSSProperties}
    >
      <span className="plan-tag plan-tag--dot -translate-x-1/2 -translate-y-1/2">
        <span className="plan-tag__value">{children}</span>
      </span>
    </span>
  )
}

/* ── Блок целиком ───────────────────────────────────────────────────── */

export function WardrobeInside() {
  const uid = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<ItemId | null>(null)
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
        // Первый показ: при «уменьшить движение» ничего не листается само
        setActive((current) => current ?? ITEMS[0].id)
        if (reduced) setAuto(false)
      },
      { threshold: 0.45 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const choose = (id: ItemId) => {
    setAuto(false)
    setActive((current) => (current === id ? null : id))
  }
  const next = () => {
    const index = ITEMS.findIndex((item) => item.id === active)
    if (index < ITEMS.length - 1) setActive(ITEMS[index + 1].id)
    else setAuto(false)
  }

  const item = ITEMS.find((entry) => entry.id === active)
  const spec = item && specOf(item.spec)
  const running = auto && visible && !paused

  // Бирки у сетки для обуви и у планки подсветки — в координатах кадра
  const place = ([x, y]: Pt): Pt => [x * FRAME.fit + FRAME.tx, y * FRAME.fit + FRAME.ty]

  // На телефоне кнопки над схемой: нажали — и выдвинутое видно сразу, без
  // прокрутки. На широком экране схема слева, кнопки и описание справа
  return (
    <div ref={rootRef} className="hs mb-12 flex flex-col gap-5 md:mb-16 lg:grid lg:grid-cols-2 lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-12">
      <div className="paper relative order-2 mx-auto aspect-[44/60] w-full max-w-[30rem] overflow-hidden rounded-3xl border border-primary/35 lg:order-none lg:col-start-1 lg:row-span-4 lg:row-start-1">
        <Scheme active={active} uid={uid} />
        <Tag at={place(P((C[0] + C[1]) / 2, 470, 40))} on={active === 'shoes'} d={0.3}>
          Глубина 400 мм
        </Tag>
        <Tag at={place(P(1100, 1840, 30))} on={active === 'light'} d={0.5}>
          Врезная LED-подсветка
        </Tag>
      </div>

      <div className="order-1 flex flex-col gap-4 lg:order-none lg:col-start-2 lg:row-start-2">
        <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
          Нажмите, что показать, — элемент выдвинется на схеме. Размеры — из каталога наполнения.
        </p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="group" aria-label="Что показать в шкафу">
          {ITEMS.map((entry) => {
            const on = entry.id === active
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
                    className="ws-progress absolute inset-x-3 bottom-1.5 block h-0.5 rounded-full bg-primary"
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
      </div>
      <div className="order-3 min-h-[6.5rem] rounded-2xl border border-border bg-card p-5 lg:order-none lg:col-start-2 lg:row-start-3" aria-live="polite">
        {spec ? (
          <>
            <p className="flyer-title text-2xl">{spec.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{spec.detail}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Выберите элемент — он выдвинется на схеме.</p>
        )}
      </div>
    </div>
  )
}
