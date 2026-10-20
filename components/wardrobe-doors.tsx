'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { FACE } from '@/components/axo'
import './wardrobe-doors.css'

/**
 * Модульный шкаф для баннера на главной: две секции, четыре распашные двери.
 * Когда баннер вошёл в экран, двери открываются на петлях к зрителю, за
 * ними — наполнение: штанга и ящики слева, полки справа, сверху загорается
 * подсветка. Схема, а не замер: размеров на ней нет.
 *
 * Корпус — чертёж спереди с одной точкой схода: секции видно вглубь, полки
 * ниже взгляда показывают верх, выше — низ. Двери — HTML-полотна в CSS-
 * перспективе с той же точкой схода (perspective-origin), поэтому они
 * поворачиваются по настоящей дуге. Миллиметры, y — сверху вниз.
 */

/** Шкаф: ширина, высота, плита; две секции по перегородке */
const W = 1800
const H = 2200
const T = 16
const MID = [892, 908] as const
const SECTIONS = [
  [T, MID[0]],
  [MID[1], W - T],
] as const
/** Кадр с запасом: открытые двери выходят за корпус и в перспективе растут */
const VB = { x: -280, y: -210, w: 2360, h: 2620 }
/** Точка схода — там же, где perspective-origin сцены (50% 42%) */
const VP = { x: VB.x + VB.w * 0.5, y: VB.y + VB.h * 0.42 }
/** Насколько глубина секции сжимает её к точке схода */
const DEPTH = 0.9

/** Двери: где петля и в какую сторону от неё полотно; задержка — по парам */
const DOORS = [
  { x: 2, hinge: 'left', d: 0 },
  { x: 452, hinge: 'right', d: 0.06 },
  { x: 902, hinge: 'left', d: 0.28 },
  { x: 1352, hinge: 'right', d: 0.34 },
] as const
const DOOR_W = 446
const DOOR_Y = [4, H - 4] as const

const INK = 'color-mix(in oklab, var(--foreground) 72%, transparent)'
const WALL = 'color-mix(in oklab, var(--foreground) 7%, var(--card))'
const WALL_DEEP = 'color-mix(in oklab, var(--foreground) 13%, var(--card))'
const BACK = 'color-mix(in oklab, var(--foreground) 18%, var(--card))'

type Pt = [number, number]
const poly = (pts: Pt[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
/** Точка на глубине k: 0 — плоскость фасада, 1 — задняя стенка */
const deep = ([x, y]: Pt, k = 1): Pt => {
  const s = 1 - (1 - DEPTH) * k
  return [VP.x + (x - VP.x) * s, VP.y + (y - VP.y) * s]
}

/** Полка в секции: передняя кромка и видимая плоскость — верх ниже взгляда, низ выше */
function Shelf({ x, y }: { x: readonly [number, number]; y: number }) {
  const face = y < VP.y ? y + T : y
  const surface: Pt[] = [[x[0], face], [x[1], face], deep([x[1], face]), deep([x[0], face])]
  return (
    <g stroke={INK} strokeWidth={1} vectorEffect="non-scaling-stroke">
      <polygon points={poly(surface)} fill={FACE} vectorEffect="non-scaling-stroke" />
      <rect x={x[0]} y={y} width={x[1] - x[0]} height={T} fill={FACE} vectorEffect="non-scaling-stroke" />
    </g>
  )
}

/** Секция изнутри: стенки к точке схода и задняя стенка */
function Opening({ x }: { x: readonly [number, number] }) {
  const corners: Pt[] = [[x[0], T], [x[1], T], [x[1], H - T], [x[0], H - T]]
  const back = corners.map((p) => deep(p))
  const wall = (a: number, b: number, fill: string) => (
    <polygon points={poly([corners[a], corners[b], back[b], back[a]])} fill={fill} stroke={INK} strokeWidth={1} vectorEffect="non-scaling-stroke" />
  )
  return (
    <g>
      <polygon points={poly(back)} fill={BACK} stroke={INK} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {wall(0, 1, WALL_DEEP)}
      {wall(3, 2, WALL)}
      {wall(0, 3, WALL)}
      {wall(1, 2, WALL_DEEP)}
    </g>
  )
}

const pct = (value: number, from: number, size: number) => `${(((value - from) / size) * 100).toFixed(3)}%`

export function WardrobeDoors() {
  const uid = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        setOpen(true)
      },
      { threshold: 0.4 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const [A, B] = SECTIONS

  return (
    <div ref={rootRef} className="wd wd-panel absolute inset-0" data-open={open || undefined} aria-hidden="true">
      <div className="wd-stage" style={{ '--ratio': VB.w / VB.h } as CSSProperties}>
        <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} className="absolute inset-0 size-full">
          <defs>
            <linearGradient id={`${uid}-light`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--primary)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={VB.x} x2={VB.x + VB.w} y1={H} y2={H} stroke={INK} strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" opacity={0.5} />

          {/* Корпус и секции изнутри */}
          <rect x={0} y={0} width={W} height={H} fill={FACE} stroke={INK} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          <Opening x={A} />
          <Opening x={B} />

          {/* Подсветка под верхними полками */}
          {SECTIONS.map((x) => {
            const [l, t] = deep([x[0], 300])
            const [r] = deep([x[1], 300])
            return <rect key={x[0]} className="wd-glow" x={l} y={t} width={r - l} height={700} fill={`url(#${uid}-light)`} />
          })}

          {/* Слева: полка, штанга, три ящика */}
          <Shelf x={A} y={270} />
          <line
            x1={deep([A[0], 420], 0.5)[0]}
            y1={deep([A[0], 420], 0.5)[1]}
            x2={deep([A[1], 420], 0.5)[0]}
            y2={deep([A[1], 420], 0.5)[1]}
            stroke="var(--primary)"
            strokeWidth={3}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <Shelf x={A} y={1444} />
          {[[1480, 1700], [1710, 1930], [1940, 2180]].map(([top, bottom]) => (
            <g key={top}>
              <rect x={A[0] + 6} y={top} width={A[1] - A[0] - 12} height={bottom - top} fill={FACE} stroke={INK} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              <line x1={410} x2={500} y1={top + 40} y2={top + 40} stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          ))}

          {/* Справа: полки */}
          {[270, 580, 960, 1340, 1720].map((y) => (
            <Shelf key={y} x={B} y={y} />
          ))}

          {/* Кромки корпуса спереди: перегородка */}
          <rect x={MID[0]} y={0} width={MID[1] - MID[0]} height={H} fill={FACE} stroke={INK} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Двери: полотна в перспективе, поворачиваются на петлях */}
        {DOORS.map((door) => (
          <div
            key={door.x}
            className="wd-door"
            data-hinge={door.hinge}
            style={
              {
                left: pct(door.x, VB.x, VB.w),
                top: pct(DOOR_Y[0], VB.y, VB.h),
                width: `${((DOOR_W / VB.w) * 100).toFixed(3)}%`,
                height: `${(((DOOR_Y[1] - DOOR_Y[0]) / VB.h) * 100).toFixed(3)}%`,
                '--d': `${door.d}s`,
              } as CSSProperties
            }
          >
            <div className="wd-face">
              <span className="wd-handle" style={door.hinge === 'left' ? { right: '9%' } : { left: '9%' }} />
              <span className="wd-shade" />
            </div>
            <div className="wd-face wd-face--back" />
          </div>
        ))}
      </div>
    </div>
  )
}
