'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { FACE, FAINT, INK, SHADE, SHADE_DEEP, fitTo, line, wardrobeView, type Pt, type Range } from '@/components/axo'
import './wardrobe-doors.css'

/**
 * Модульный шкаф для баннера на главной: две секции, четыре распашные двери.
 * Когда баннер вошёл в экран, двери открываются на петлях, за ними —
 * наполнение: штанга и ящики слева, полки справа, сверху загорается
 * подсветка. Схема, а не замер: размеров на ней нет.
 *
 * Дверь поворачивается вокруг вертикальной оси на петле. В аксонометрии это
 * на каждом угле — своё аффинное преобразование её закрытого контура, поэтому
 * поворот задан ключевыми кадрами matrix() через каждые 15°. Миллиметры и
 * оси — как в axo.ts.
 */

const { P, front, top, side } = wardrobeView

const VIEW = { w: 440, h: 460 }

/** Шкаф: ширина, высота, глубина, плита; две секции по перегородке */
const W = 1800
const H = 2200
const D = 580
const T = 16
const MID: Range = [892, 908]
const A: Range = [T, MID[0]]
const B: Range = [MID[1], W - T]
/** Плоскость дверей — чуть впереди корпуса */
const DOOR_Z = -4
const DOOR_Y: Range = [4, H - 4]
/** Двери: где петля и в какую сторону от неё полотно */
const DOORS = [
  { hinge: 2, dir: 1 },
  { hinge: 898, dir: -1 },
  { hinge: 902, dir: 1 },
  { hinge: 1798, dir: -1 },
] as const
const DOOR_W = 444
/** Насколько двери открываются, градусов, и шаг ключевых кадров */
const OPEN = 90
const STEP = 15

/* ── Поворот двери ──────────────────────────────────────────────────── */

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
const O = P(0, 0, 0)
const EX = sub(P(1, 0, 0), O)
const EY = sub(P(0, 1, 0), O)
const EZ = sub(P(0, 0, 1), O)

/**
 * Преобразование закрытой двери в открытую на угол deg: точка полотна на
 * расстоянии u от петли уходит из направления вдоль фасада в направление,
 * повёрнутое к зрителю. Высота не меняется
 */
function doorMatrix(hinge: number, dir: number, deg: number) {
  const r = (deg * Math.PI) / 180
  const closed: Pt = [dir * EX[0], dir * EX[1]]
  const open: Pt = [dir * Math.cos(r) * EX[0] - Math.sin(r) * EZ[0], dir * Math.cos(r) * EX[1] - Math.sin(r) * EZ[1]]
  // Матрица [open | EY] · [closed | EY]⁻¹
  const det = closed[0] * EY[1] - EY[0] * closed[1]
  const inv = [EY[1] / det, -closed[1] / det, -EY[0] / det, closed[0] / det]
  const a = open[0] * inv[0] + EY[0] * inv[1]
  const b = open[1] * inv[0] + EY[1] * inv[1]
  const c = open[0] * inv[2] + EY[0] * inv[3]
  const d = open[1] * inv[2] + EY[1] * inv[3]
  // Ось — петля: её точки остаются на месте
  const [hx, hy] = P(hinge, 0, DOOR_Z)
  const e = hx - (a * hx + c * hy)
  const f = hy - (b * hx + d * hy)
  return `matrix(${[a, b, c, d, e, f].map((value) => value.toFixed(4)).join(',')})`
}

const FRAMES = DOORS.map(({ hinge, dir }) =>
  Array.from({ length: OPEN / STEP + 1 }, (_, i) => ({ transform: doorMatrix(hinge, dir, i * STEP) })),
)

/* ── Схема ──────────────────────────────────────────────────────────── */

/** Плита: видны лицо, верх и правый бок */
function Box({ x, y, z, tone = FACE }: { x: Range; y: Range; z: Range; tone?: string }) {
  return (
    <g stroke={INK} strokeWidth={0.8} strokeLinejoin="round">
      <path d={side(x[1], y, z)} fill={SHADE_DEEP} />
      <path d={top(x, y[1], z)} fill={SHADE} />
      <path d={front(x, y, z[0])} fill={tone} />
    </g>
  )
}

/** Кадр — по корпусу и по дверям, открытым до конца */
const FRAME = fitTo(
  [
    P(0, 0, 0), P(0, H, D), P(W, H, D), P(W, 0, 0), P(W, 0, D),
    ...DOORS.flatMap(({ hinge, dir }) => {
      const r = (OPEN * Math.PI) / 180
      const x = hinge + dir * DOOR_W * Math.cos(r)
      const z = DOOR_Z - DOOR_W * Math.sin(r)
      return [P(x, 0, z), P(x, H, z)]
    }),
  ],
  VIEW,
  { x: 18, top: 18, bottom: 18 },
)

export function WardrobeDoors() {
  const uid = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const doorRefs = useRef<(SVGGElement | null)[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        setOpen(true)
        doorRefs.current.forEach((door, i) => {
          if (!door) return
          const frames = FRAMES[i]
          if (reduced) {
            door.style.transform = frames[frames.length - 1].transform
            return
          }
          door.animate(frames, { duration: 1300, delay: 150 + i * 110, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'both' })
        })
      },
      { threshold: 0.4 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const { fit, tx, ty } = FRAME
  const inner: Range = [T, H - T]

  return (
    <div ref={rootRef} className="wd absolute inset-0" data-open={open || undefined}>
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="size-full" aria-hidden="true">
        <defs>
          {/* Наполнение видно только сквозь проём своей секции, не через боковины */}
          <clipPath id={`${uid}-a`}>
            <path d={front(A, [T, H - T], 0)} />
          </clipPath>
          <clipPath id={`${uid}-b`}>
            <path d={front(B, [T, H - T], 0)} />
          </clipPath>
          <linearGradient id={`${uid}-light`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${fit.toFixed(3)})`}>
          <path d={line([P(-500, 0, 0), P(W + 300, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />

          {/* Корпус снаружи: правый бок и крыша */}
          <path d={side(W, [0, H], [0, D])} fill={SHADE} stroke={INK} strokeWidth={1} />
          <path d={top([0, W], H, [0, D])} fill={SHADE} stroke={INK} strokeWidth={1} />

          {/* Секции изнутри: задняя стенка, левый бок, дно */}
          {[A, B].map((x, i) => (
            <g key={x[0]} clipPath={`url(#${uid}-${i ? 'b' : 'a'})`}>
              <path d={front(x, inner, D - 10)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
              <path d={side(x[0], inner, [0, D - 10])} fill={SHADE} stroke={INK} strokeWidth={0.8} />
              <path d={top(x, inner[0], [0, D - 10])} fill={SHADE} stroke={INK} strokeWidth={0.8} />
            </g>
          ))}

          {/* Слева: полка, штанга на держателях, три ящика */}
          <g clipPath={`url(#${uid}-a)`}>
            <Box x={A} y={[1914, 1930]} z={[0, D - 10]} />
            {[A[0] + 14, A[1] - 14].map((x) => (
              <path key={x} d={line([P(x, 1780, 280), P(x, 1914, 280)])} stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
            ))}
            <path d={line([P(A[0] + 14, 1780, 280), P(A[1] - 14, 1780, 280)])} stroke="var(--primary)" strokeWidth={3.6} strokeLinecap="round" />
            <Box x={A} y={[740, 756]} z={[0, D - 10]} />
            {([[40, 260], [270, 490], [500, 720]] as Range[]).map((y) => (
              <g key={y[0]}>
                <path d={front([A[0] + 6, A[1] - 6], y, 0)} fill={FACE} stroke={INK} strokeWidth={0.9} />
                <path d={line([P(410, y[1] - 40, 0), P(500, y[1] - 40, 0)])} stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" />
              </g>
            ))}
          </g>

          {/* Справа: полки */}
          <g clipPath={`url(#${uid}-b)`}>
            {[420, 820, 1220, 1620, 1914].map((y) => (
              <Box key={y} x={B} y={[y, y + 16]} z={[0, D - 10]} />
            ))}
          </g>

          {/* Подсветка под верхними полками: загорается, когда двери открылись */}
          {[A, B].map((x, i) => (
            <path key={x[0]} className="wd-glow" clipPath={`url(#${uid}-${i ? 'b' : 'a'})`} d={front([x[0] + 14, x[1] - 14], [1250, 1912], 40)} fill={`url(#${uid}-light)`} />
          ))}

          {/* Кромки корпуса спереди */}
          {[[0, T], MID, [W - T, W]].map(([x0, x1]) => (
            <path key={x0} d={front([x0, x1], [0, H], 0)} fill={FACE} stroke={INK} strokeWidth={1} />
          ))}
          <path d={front([0, W], [H - T, H], 0)} fill={FACE} stroke={INK} strokeWidth={1} />
          <path d={front([0, W], [0, T], 0)} fill={FACE} stroke={INK} strokeWidth={1} />

          {/* Двери: закрытый контур, поворот — из ключевых кадров */}
          {DOORS.map(({ hinge, dir }, i) => {
            const x: Range = dir > 0 ? [hinge, hinge + DOOR_W] : [hinge - DOOR_W, hinge]
            const handle = hinge + dir * (DOOR_W - 50)
            return (
              <g
                key={hinge}
                ref={(node) => {
                  doorRefs.current[i] = node
                }}
              >
                <path d={front(x, DOOR_Y, DOOR_Z)} fill={FACE} stroke={INK} strokeWidth={1} />
                <path d={line([P(handle, 950, DOOR_Z - 6), P(handle, 1250, DOOR_Z - 6)])} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
