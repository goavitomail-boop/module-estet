'use client'

import type { CSSProperties } from 'react'
import { enter, POP } from '@/components/scene-kit'
import {
  AX_ANGLE, BRASS, FACE, FAINT, INK, INSIDE, K, P, SHADE, SHADE_DEEP,
  fitTo, front, line, path, pullOut, shape, side, sweptOpening, top, type Pt, type Range,
} from '@/components/axo'
import './filling-scene.css'

/**
 * Наполнение на чертеже: фрагмент кухни в аксонометрии — смотрим спереди,
 * справа и чуть сверху. Из шкафа выезжает выдвижной модуль, и его видно
 * сбоку целиком, вместе с тем, что стоит в корзинах; затем прочерчивается
 * размер. Размеры на чертеже — только те, что есть в каталоге
 * (lib/filling-data.ts); сам рисунок — схема, а не замер конкретной кухни.
 *
 * Проекция и грани — components/axo.ts, размеры там же — в миллиметрах.
 */

const VIEW = { w: 400, h: 340 }

const PLINTH = 100
const TOP = 820
const COUNTER = 38
const OVERHANG = 25
const CARCASS_DEPTH = 560
const COUNTER_DEPTH = 600
const PLINTH_SET = 50
const GAP = 3

/**
 * Вход слоя в момент d сцены. На широком экране три карточки стоят в ряд
 * и входят в экран разом, поэтому каждая ждёт свою очередь — --lag
 */
const at = (d: number, options?: Parameters<typeof enter>[1]) =>
  ({ ...enter(d, options), '--d': `calc(var(--lag, 0s) + ${d}s)` }) as CSSProperties

/* ── Наполнение ─────────────────────────────────────────────────────── */

/* Бутылки, банки и флаконы — силуэтами без перекоса (shape), основанием в точку (x, y, z) */

function Bottle({ at: base, h, r = 32 }: { at: Pt; h: number; r?: number }) {
  const n = 10
  return (
    <g>
      <path
        d={shape(base, [[-r, 0], [-r, h * 0.6], [-r * 0.55, h * 0.7], [-n, h * 0.78], [-n, h], [n, h], [n, h * 0.78], [r * 0.55, h * 0.7], [r, h * 0.6], [r, 0]])}
        fill={FACE}
        stroke={INK}
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <path d={shape(base, [[-n - 1, h - 22], [-n - 1, h], [n + 1, h], [n + 1, h - 22]])} fill={BRASS} />
    </g>
  )
}

function Jar({ at: base, w = 90, h = 120 }: { at: Pt; w?: number; h?: number }) {
  return (
    <g>
      <path d={shape(base, [[-w / 2, 0], [-w / 2, h], [w / 2, h], [w / 2, 0]])} fill={FACE} stroke={INK} strokeWidth={0.8} />
      <path d={shape(base, [[-w / 2 - 4, h], [-w / 2 - 4, h + 24], [w / 2 + 4, h + 24], [w / 2 + 4, h]])} fill={BRASS} />
    </g>
  )
}

function Pot({ at: base }: { at: Pt }) {
  return (
    <g>
      <path d={shape(base, [[-150, 100], [-115, 100]])} stroke={INK} strokeWidth={1.6} />
      <path d={shape(base, [[115, 100], [150, 100]])} stroke={INK} strokeWidth={1.6} />
      <path d={shape(base, [[-115, 0], [-115, 130], [115, 130], [115, 0]])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={shape(base, [[-122, 130], [-122, 148], [122, 148], [122, 130]])} fill={FACE} stroke={INK} strokeWidth={0.8} />
    </g>
  )
}

/** Флакон с распылителем — для корзины под мойкой */
function Spray({ at: base }: { at: Pt }) {
  return (
    <g>
      <path d={shape(base, [[-34, 0], [-34, 170], [-14, 200], [14, 200], [34, 170], [34, 0]])} fill={FACE} stroke={INK} strokeWidth={0.8} />
      <path d={shape(base, [[-16, 200], [-16, 250], [56, 250], [56, 228], [16, 228], [16, 200]])} fill={BRASS} />
    </g>
  )
}

/* ── Выдвижной модуль ───────────────────────────────────────────────── */

type Item = { kind: 'bottle' | 'jar' | 'pot' | 'spray'; x: number; z: number; h?: number }
type Unit = {
  /** Проём в фасаде, откуда выезжает модуль */
  x: Range
  y: Range
  /** Глубина модуля и насколько он выезжает */
  depth: number
  travel: number
  /** Корзины: высота дна и что на нём стоит (x — от левого края проёма) */
  tiers: { y: number; items: Item[] }[]
  /** Сифон: x — от левого края проёма, z — глубина. Корзины обходят его вырезом */
  siphon?: { x: number; z: number }
}

function Content({ item, x0, y }: { item: Item; x0: number; y: number }) {
  const base = P(x0 + item.x, y, item.z)
  if (item.kind === 'bottle') return <Bottle at={base} h={item.h ?? 240} />
  if (item.kind === 'jar') return <Jar at={base} h={item.h} />
  if (item.kind === 'pot') return <Pot at={base} />
  return <Spray at={base} />
}

/** Контур дна корзины сверху; под мойкой — буквой П вокруг сифона */
function tierOutline(unit: Unit, y: number): Pt[] {
  const [x0, x1] = [unit.x[0] + 14, unit.x[1] - 14]
  const [z0, z1] = [24, unit.depth - 30]
  if (!unit.siphon) return [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)]
  const sx = unit.x[0] + unit.siphon.x
  const sz = unit.siphon.z - 90
  return [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(sx + 100, y, z1), P(sx + 100, y, sz), P(sx - 100, y, sz), P(sx - 100, y, z1), P(x0, y, z1)]
}

/** Модуль в закрытом положении: рама, корзины с содержимым, фасад. Выдвигает его .fs-pull */
function PullOut({ unit, d }: { unit: Unit; d: number }) {
  const [x0, x1] = unit.x
  const back = unit.depth - 30
  const railTop = unit.tiers.at(-1)!.y + 60
  return (
    <g className="fs-pull" style={{ '--pull': pullOut(unit.travel), '--d': `calc(var(--lag, 0s) + ${d}s)` } as CSSProperties}>
      {/* Задние стойки рамы */}
      {[x0 + 14, x1 - 14].map((x) => (
        <path key={x} d={line([P(x, unit.tiers[0].y, back), P(x, railTop, back)])} stroke={BRASS} strokeWidth={1.4} />
      ))}
      {unit.tiers.map((tier) => (
        <g key={tier.y}>
          <path d={path(tierOutline(unit, tier.y))} fill="color-mix(in oklab, var(--primary) 12%, var(--card))" stroke={BRASS} strokeWidth={1.2} strokeLinejoin="round" />
          {/* Содержимое — от дальнего к ближнему: глубже и левее рисуется раньше */}
          {[...tier.items].sort((a, b) => b.z - a.z || a.x - b.x).map((item) => (
            <Content key={`${item.kind}-${item.x}-${item.z}`} item={item} x0={x0} y={tier.y} />
          ))}
          {/* Бортик корзины */}
          <path d={path(tierOutline(unit, tier.y + 60))} fill="none" stroke={BRASS} strokeWidth={0.9} strokeLinejoin="round" />
        </g>
      ))}
      {/* Правая стойка рамы спереди — ближе всего, поверх содержимого */}
      <path d={line([P(x1 - 14, unit.tiers[0].y, 24), P(x1 - 14, railTop, 24)])} stroke={BRASS} strokeWidth={1.4} />
      {/* Фасад едет вместе с модулем: торец (в закрытом виден не будет) и лицо
          в одной плоскости с соседними фасадами */}
      <path d={side(x1, unit.y, [0, 18])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={front([x0, x1], unit.y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
      <path d={line([P(x0 + 30, unit.y[1] - 40, 0), P(x1 - 30, unit.y[1] - 40, 0)])} stroke={BRASS} strokeWidth={2} strokeLinecap="round" />
    </g>
  )
}

/* ── Кухня вокруг ───────────────────────────────────────────────────── */

type Module = { w: number; fronts: Range[]; pull?: boolean; sink?: boolean }

export type FillingDrawing = {
  modules: Module[]
  unit: Omit<Unit, 'x' | 'y'>
  /** Размер под выехавшим фасадом — из каталога */
  size?: string
  /** Бирка у выреза под сифон */
  note?: string
}

function moduleX(modules: Module[], index: number): Range {
  const x0 = modules.slice(0, index).reduce((sum, m) => sum + m.w, 0)
  return [x0, x0 + modules[index].w]
}

/** Сифон под мойкой: из чаши вниз, коленом к стене. Виден только в открытом проёме */
function Siphon({ x, z }: { x: number; z: number }) {
  const d = line([P(x, TOP, z), P(x, 470, z), P(x, 430, z + 60), P(x, 430, z + 300)])
  return (
    <g>
      <path d={d} fill="none" stroke={INK} strokeWidth={K * 50} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={FACE} strokeWidth={K * 50 - 2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

export function FillingScene({ drawing, id }: { drawing: FillingDrawing; id: string }) {
  const { modules } = drawing
  const W = modules.reduce((sum, m) => sum + m.w, 0)
  const pullIndex = modules.findIndex((m) => m.pull)
  const [px0, px1] = moduleX(modules, pullIndex)
  const unit: Unit = { ...drawing.unit, x: [px0 + GAP / 2, px1 - GAP / 2], y: [PLINTH + GAP / 2, TOP - GAP / 2] }
  const sink = modules[pullIndex].sink
  const travel = unit.travel

  // Проём, протянутый к зрителю на ход модуля: всё, что модуль показывает
  // перед фасадами, лежит в этой фигуре. Что глубже — видно только сквозь
  // сам проём, остальное закрывает корпус
  const opening = front(unit.x, unit.y, 0)
  const swept = sweptOpening(unit.x, unit.y, 0, travel)

  // Размер под выехавшим фасадом
  const dimY = unit.y[0] - 110
  const dimA = P(unit.x[0], dimY, -travel)
  const dimB = P(unit.x[1], dimY, -travel)

  // Чертёж вписываем в кадр по крайним точкам
  const extremes = [
    P(0, 0, PLINTH_SET), P(W, 0, PLINTH_SET), P(W, 0, CARCASS_DEPTH), P(0, TOP + COUNTER, COUNTER_DEPTH), P(W, TOP + COUNTER, -OVERHANG), P(W, TOP + COUNTER, COUNTER_DEPTH),
    P(0, TOP + COUNTER, -OVERHANG), P(unit.x[0], unit.y[1], -travel), P(unit.x[0], unit.y[0], -travel), P(unit.x[1], unit.y[0], -travel),
    ...(drawing.size ? [P(unit.x[0], dimY - 150, -travel), P(unit.x[1], dimY - 150, -travel)] : []),
    ...(sink ? [P((px0 + px1) / 2, TOP + COUNTER + 300, 540)] : []),
  ]
  // Сверху место под номер и переключатель «Схема / Фото»
  const { fit, tx, ty } = fitTo(extremes, VIEW, { x: 16, top: 48, bottom: 12 })
  const clipId = `fs-clip-${id}`

  // Бирка у сифона — справа от трубы, чтобы её не закрывать
  const noteAt = unit.siphon ? P(unit.x[0] + unit.siphon.x + 150, 560, unit.siphon.z) : P(0, 0, 0)
  const notePct = { left: ((noteAt[0] * fit + tx) / VIEW.w) * 100, top: ((noteAt[1] * fit + ty) / VIEW.h) * 100 }

  return (
    <>
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <path d={swept} />
          </clipPath>
          <clipPath id={`${clipId}-opening`}>
            <path d={opening} />
          </clipPath>
        </defs>
        <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${fit.toFixed(3)})`}>
          {/* Пол — тонкая линия, чтобы шкаф на чём-то стоял */}
          <path d={line([P(-160, 0, 0), P(W + 220, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />
          {/* Цоколь утоплен, правые торцы — в тени */}
          <path d={front([0, W], [0, PLINTH], PLINTH_SET)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
          <path d={side(W, [0, PLINTH], [PLINTH_SET, CARCASS_DEPTH])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
          <path d={side(W, [PLINTH, TOP], [0, CARCASS_DEPTH])} fill={SHADE} stroke={INK} strokeWidth={1} />

          {/* Фасады; выдвижной — проёмом, сам он едет поверх */}
          {modules.map((m, i) => {
            const [x0, x1] = moduleX(modules, i)
            if (m.pull) {
              return (
                <g key={i}>
                  <path d={opening} fill={INSIDE} stroke={INK} strokeWidth={1} />
                  {/* Сифон внутри шкафа: виден только сквозь проём */}
                  {unit.siphon && (
                    <g clipPath={`url(#${clipId}-opening)`}>
                      <Siphon x={unit.x[0] + unit.siphon.x} z={unit.siphon.z} />
                    </g>
                  )}
                </g>
              )
            }
            return m.fronts.map((f, j) => (
              <g key={`${i}-${j}`}>
                <path d={front([x0 + GAP / 2, x1 - GAP / 2], [f[0] + GAP / 2, f[1] - GAP / 2], 0)} fill={FACE} stroke={INK} strokeWidth={1} />
                <path d={line([P(x0 + 40, f[1] - 40, 0), P(Math.min(x1 - 40, x0 + 200), f[1] - 40, 0)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
              </g>
            ))
          })}

          <g clipPath={`url(#${clipId})`}>
            <PullOut unit={unit} d={0.35} />
          </g>

          {/* Столешница: верх, правый торец, передняя кромка */}
          <path d={top([0, W], TOP + COUNTER, [-OVERHANG, COUNTER_DEPTH])} fill={SHADE} stroke={INK} strokeWidth={1} />
          <path d={side(W, [TOP, TOP + COUNTER], [-OVERHANG, COUNTER_DEPTH])} fill={SHADE_DEEP} stroke={INK} strokeWidth={1} />
          <path d={front([0, W], [TOP, TOP + COUNTER], -OVERHANG)} fill={FACE} stroke={INK} strokeWidth={1} />
          {sink && (
            <g>
              <path d={top([px0 + 130, px1 - 130], TOP + COUNTER, [60, 460])} fill={SHADE_DEEP} stroke={INK} strokeWidth={1} />
              <path
                d={line([P((px0 + px1) / 2, TOP + COUNTER, 540), P((px0 + px1) / 2, TOP + COUNTER + 260, 540), P((px0 + px1) / 2, TOP + COUNTER + 260, 380)])}
                fill="none"
                stroke={INK}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Размер: выноски, линия от середины, засечки, число */}
          {drawing.size && (
            <g>
              <g className="hs-in" style={at(1.45, { t: 0.4, from: 'translateY(-4px)', ease: 'var(--out)' })}>
                {[unit.x[0], unit.x[1]].map((x) => (
                  <path key={x} d={line([P(x, unit.y[0] - 20, -travel), P(x, dimY - 30, -travel)])} stroke={BRASS} strokeWidth={0.8} />
                ))}
              </g>
              <path className="hs-draw-x" style={{ '--d': 'calc(var(--lag, 0s) + 1.55s)', '--t': '0.6s' } as CSSProperties} d={line([dimA, dimB])} stroke={BRASS} strokeWidth={1.2} />
              <g className="hs-in" style={at(2, { t: 0.4, from: 'scale(0.4)', ease: 'var(--pop)' })}>
                {[dimA, dimB].map(([a, b]) => (
                  <path key={a} d={`M${(a - 5).toFixed(1)},${(b + 5).toFixed(1)}L${(a + 5).toFixed(1)},${(b - 5).toFixed(1)}`} stroke={BRASS} strokeWidth={1.4} />
                ))}
              </g>
              {/* Число — вдоль размерной линии, под ней, как на чертеже */}
              <g transform={`translate(${((dimA[0] + dimB[0]) / 2).toFixed(1)} ${((dimA[1] + dimB[1]) / 2).toFixed(1)}) rotate(${AX_ANGLE.toFixed(1)})`}>
                <text
                  className="hs-in"
                  style={{ ...at(2.05, POP), fontFamily: 'var(--font-roboto), sans-serif' }}
                  y={(16 / fit).toFixed(1)}
                  textAnchor="middle"
                  fontSize={(13 / fit).toFixed(1)}
                  fontWeight={600}
                  fill="var(--foreground)"
                >
                  {drawing.size}
                </text>
              </g>
            </g>
          )}
        </g>
      </svg>
      {drawing.note && (
        <span className="hs-in pointer-events-none absolute" style={{ left: `${notePct.left}%`, top: `${notePct.top}%`, ...at(1.6, POP) }}>
          <span className="plan-tag plan-tag--dot -translate-y-1/2">
            <span className="plan-tag__value">{drawing.note}</span>
          </span>
        </span>
      )}
    </>
  )
}

/** Наполнение с главной: чертёж для каждого из трёх разделов */
export const FILLING_DRAWINGS: Record<string, FillingDrawing> = {
  // «Узкая версия шириной 150 мм» — lib/filling-data.ts
  Бутылочницы: {
    modules: [
      { w: 400, fronts: [[PLINTH, 460], [460, TOP]] },
      { w: 150, fronts: [[PLINTH, TOP]], pull: true },
      { w: 300, fronts: [[PLINTH, TOP]] },
    ],
    unit: {
      depth: 480,
      travel: 420,
      tiers: [
        { y: 170, items: [{ kind: 'bottle', x: 75, z: 70, h: 250 }, { kind: 'bottle', x: 75, z: 170, h: 220 }, { kind: 'bottle', x: 75, z: 270, h: 270 }, { kind: 'bottle', x: 75, z: 370, h: 230 }] },
        { y: 480, items: [{ kind: 'bottle', x: 75, z: 80, h: 200 }, { kind: 'bottle', x: 75, z: 190, h: 240 }, { kind: 'bottle', x: 75, z: 300, h: 190 }, { kind: 'bottle', x: 75, z: 400, h: 220 }] },
      ],
    },
    size: '150 мм',
  },
  // «Лотки AQ Tray выпускаются шириной от 400 до 900 мм» — lib/filling-data.ts
  'Многофункциональные корзины': {
    modules: [
      { w: 600, fronts: [[PLINTH, TOP]], pull: true },
      { w: 400, fronts: [[PLINTH, 250], [250, 535], [535, TOP]] },
    ],
    unit: {
      depth: 480,
      travel: 400,
      tiers: [
        { y: 170, items: [{ kind: 'pot', x: 400, z: 300 }, { kind: 'jar', x: 530, z: 110, h: 150 }, { kind: 'jar', x: 520, z: 400, h: 110 }] },
        { y: 500, items: [{ kind: 'jar', x: 380, z: 360, h: 130 }, { kind: 'bottle', x: 470, z: 250, h: 230 }, { kind: 'jar', x: 530, z: 110, h: 150 }, { kind: 'jar', x: 520, z: 400, h: 100 }] },
      ],
    },
    size: '400–900 мм',
  },
  // «Помогают задействовать место вокруг сифона» — lib/filling-data.ts
  'Системы под мойку': {
    modules: [
      { w: 700, fronts: [[PLINTH, TOP]], pull: true, sink: true },
      { w: 300, fronts: [[PLINTH, 460], [460, TOP]] },
    ],
    unit: {
      depth: 480,
      travel: 380,
      siphon: { x: 260, z: 130 },
      tiers: [
        { y: 170, items: [{ kind: 'spray', x: 560, z: 380 }, { kind: 'jar', x: 600, z: 130, h: 130 }, { kind: 'spray', x: 470, z: 110 }] },
        { y: 470, items: [{ kind: 'jar', x: 600, z: 380, h: 100 }, { kind: 'spray', x: 590, z: 120 }] },
      ],
    },
    note: 'Вокруг сифона',
  },
}
