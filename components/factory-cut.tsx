'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { RotateCcw } from 'lucide-react'
import { FAINT, INK, fitTo, line, moduleView, path, type Pt, type Range } from '@/components/axo'
import { mdfFrameDecors } from '@/lib/catalog-data'
import './factory-cut.css'

/**
 * Собственное производство одной сценой: лист МДФ лежит на полу, по нему
 * прочерчиваются линии реза, детали поднимаются и летят на место — боковины
 * по пути встают, — и собирается каркас нижнего модуля. В конце — размеры
 * каркаса из каталога (высота 720, глубина 530 мм). Играет один раз, когда
 * блок увидели; кнопка «Ещё раз» повторяет.
 *
 * Полёт — настоящее движение в пространстве: позиция детали по дуге и
 * поворот боковины вокруг её длинной кромки считаются в миллиметрах и
 * проецируются в аксонометрию (axo.ts). На каждом шаге это своё аффинное
 * преобразование детали, поэтому оно задано ключевыми кадрами matrix() —
 * часто, чтобы между кадрами не было заметно. Размер листа и ширина модуля —
 * схема, на чертеже они не подписаны.
 */

const { P, DEPTH_ANGLE } = moduleView

const VIEW = { w: 520, h: 390 }

/** Лист на полу, толщина плиты */
const SHEET = { x: [0, 1348] as Range, z: [0, 1320] as Range }
const T = 16
/** Каркас собирается правее листа: ширина 600, высота и глубина из каталога */
const CX = 2300
const CW = 600
const CH = 720
const CD = 530

type V3 = [number, number, number]
type Part = {
  id: string
  label: string
  /** Где деталь лежит в листе: по x — длина, по z — ширина. Узкие царги лежат рядом — подписана одна на двоих */
  x: Range
  z: Range
  /** Куда встаёт: угол детали в каркасе и стоит ли она (боковина) */
  to: V3
  stand?: boolean
}

/** Порядок — как детали видно в собранном каркасе: от дальних к ближним */
const PARTS: Part[] = [
  { id: 'rail-back', label: '', x: [760, 1328], z: [1090, 1190], to: [CX + T, CH, CD - 100] },
  { id: 'side-left', label: 'Боковина', x: [20, 740], z: [20, 550], to: [CX + T, 0, 0], stand: true },
  { id: 'bottom', label: 'Дно', x: [760, 1328], z: [20, 550], to: [CX + T, T, 0] },
  { id: 'shelf', label: 'Полка', x: [760, 1328], z: [570, 1070], to: [CX + T, 366, 15] },
  { id: 'rail-front', label: 'Царги', x: [760, 1328], z: [1200, 1300], to: [CX + T, CH, 0] },
  { id: 'side-right', label: 'Боковина', x: [20, 740], z: [570, 1100], to: [CX + CW, 0, 0], stand: true },
]

/** Время, с: рез, полёт деталей, подписи готового каркаса */
const CUT = { start: 0.3, step: 0.18 }
const FLY = { start: 1.7, step: 0.14, duration: 2.1 }
const DONE = FLY.start + FLY.step * (PARTS.length - 1) + FLY.duration
/** Высота дуги, по которой деталь летит, мм */
const ARC = 280

/* ── Полёт детали ───────────────────────────────────────────────────── */

const O = P(0, 0, 0)
const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
const EX = sub(P(1, 0, 0), O)
const EY = sub(P(0, 1, 0), O)
const EZ = sub(P(0, 0, 1), O)
const at = ([x, y, z]: V3): Pt => P(x, y, z)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const smooth = (t: number) => {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}

/**
 * Деталь на шаге t (0 — лежит в листе, 1 — стоит в каркасе): аффинное
 * преобразование её исходного рисунка. Длина детали в листе идёт по x,
 * ширина — по z; у боковины длина по дороге поворачивается вверх
 */
function partMatrix(part: Part, t: number) {
  const e = easeInOut(t)
  const from: V3 = [part.x[0], T, part.z[0]]
  const lift = ARC * Math.sin(Math.PI * e)
  const origin: V3 = [from[0] + (part.to[0] - from[0]) * e, from[1] + (part.to[1] - from[1]) * e + lift, from[2] + (part.to[2] - from[2]) * e]
  const phi = part.stand ? (Math.PI / 2) * smooth((e - 0.15) / 0.65) : 0
  // Ось длины: в листе — вдоль x, у вставшей боковины — вверх
  const u: Pt = [Math.cos(phi) * EX[0] + Math.sin(phi) * EY[0], Math.cos(phi) * EX[1] + Math.sin(phi) * EY[1]]
  // [u | EZ] · [EX | EZ]⁻¹
  const det = EX[0] * EZ[1] - EZ[0] * EX[1]
  const inv = [EZ[1] / det, -EX[1] / det, -EZ[0] / det, EX[0] / det]
  const a = u[0] * inv[0] + EZ[0] * inv[1]
  const b = u[1] * inv[0] + EZ[1] * inv[1]
  const c = u[0] * inv[2] + EZ[0] * inv[3]
  const d = u[1] * inv[2] + EZ[1] * inv[3]
  const [fx, fy] = at(from)
  const [ox, oy] = at(origin)
  return `matrix(${[a, b, c, d, ox - (a * fx + c * fy), oy - (b * fx + d * fy)].map((value) => value.toFixed(4)).join(',')})`
}

const STEPS = 24
const FRAMES = PARTS.map((part) => Array.from({ length: STEPS + 1 }, (_, i) => ({ transform: partMatrix(part, i / STEPS) })))

/* ── Рисунок ────────────────────────────────────────────────────────── */

const top = (x: Range, y: number, z: Range) => path([P(x[0], y, z[0]), P(x[1], y, z[0]), P(x[1], y, z[1]), P(x[0], y, z[1])])
const frontEdge = (x: Range, z: number) => path([P(x[0], 0, z), P(x[1], 0, z), P(x[1], T, z), P(x[0], T, z)])
const sideEdge = (x: number, z: Range) => path([P(x, 0, z[0]), P(x, 0, z[1]), P(x, T, z[1]), P(x, T, z[0])])

const FRAME = fitTo(
  [
    P(SHEET.x[0], 0, SHEET.z[0]), P(SHEET.x[1], 0, SHEET.z[0]), P(SHEET.x[1], 0, SHEET.z[1]), P(SHEET.x[0], 0, SHEET.z[1]),
    P(CX, 0, 0), P(CX + CW, 0, 0), P(CX + CW, 0, CD), P(CX, CH, CD), P(CX + CW, CH, CD),
    // Верх дуги, по которой летят детали
    P(1500, CH + ARC, 600),
    // Размеры справа от каркаса
    P(CX + CW + 160, 0, 0), P(CX + CW + 160, 0, CD),
  ],
  VIEW,
  { x: 14, top: 14, bottom: 30 },
)

export function FactoryCut() {
  const rootRef = useRef<HTMLDivElement>(null)
  const partRefs = useRef<(SVGGElement | null)[]>([])
  /** Номер прогона: 0 — ещё не видели, дальше — каждый показ заново */
  const [run, setRun] = useState(0)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setStill(true)
        else setRun(1)
      },
      { threshold: 0.45 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const animations: Animation[] = []
    partRefs.current.forEach((element, i) => {
      if (!element) return
      if (still) {
        element.style.transform = FRAMES[i][STEPS].transform
        return
      }
      if (run === 0) return
      animations.push(element.animate(FRAMES[i], { duration: FLY.duration * 1000, delay: (FLY.start + i * FLY.step) * 1000, easing: 'linear', fill: 'both' }))
    })
    return () => animations.forEach((animation) => animation.cancel())
  }, [run, still])

  const { fit, tx, ty } = FRAME
  const size = 12 / fit
  const decor = mdfFrameDecors.find((item) => item.name === 'Дуб Каселла Натуральный')?.hex ?? '#c89e68'
  const face = decor
  const edge = `color-mix(in oklab, ${decor} 78%, var(--foreground))`
  const text = { fontSize: size.toFixed(1), fontWeight: 600, fill: 'var(--foreground)', style: { fontFamily: 'var(--font-roboto), sans-serif' } }
  const dimHeight = [P(CX + CW + 110, 0, 0), P(CX + CW + 110, CH, 0)] as const
  const dimDepth = [P(CX + CW + 110, 0, 0), P(CX + CW + 110, 0, CD)] as const
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

  return (
    <div ref={rootRef} className="hs fc absolute inset-0" data-play={run > 0 || undefined} data-still={still || undefined}>
      <svg key={run} viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="size-full" aria-hidden="true">
        <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${fit.toFixed(3)})`}>
          <path d={line([P(-300, 0, -200), P(CX + CW + 300, 0, -200)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />

          {/* Лист: остаток после раскроя бледнеет, когда детали ушли */}
          <g className="fc-rest" style={{ '--d': `${FLY.start + 0.4}s` } as CSSProperties} stroke={INK} strokeWidth={0.8} strokeLinejoin="round">
            <path d={sideEdge(SHEET.x[1], SHEET.z)} fill={edge} />
            <path d={frontEdge(SHEET.x, SHEET.z[0])} fill={edge} />
            <path d={top(SHEET.x, T, SHEET.z)} fill={`color-mix(in oklab, ${decor} 70%, var(--card))`} />
          </g>

          {/* Детали: лежат в листе, потом летят в каркас */}
          {PARTS.map((part, i) => (
            <g
              key={part.id}
              ref={(node) => {
                partRefs.current[i] = node
              }}
              stroke={INK}
              strokeWidth={0.8}
              strokeLinejoin="round"
            >
              <path d={sideEdge(part.x[1], part.z)} fill={edge} />
              <path d={frontEdge(part.x, part.z[0])} fill={edge} />
              <path d={top(part.x, T, part.z)} fill={face} />
            </g>
          ))}

          {/* Рез и подписи деталей на листе */}
          {PARTS.map((part, i) => {
            const style = { '--d': `${CUT.start + i * CUT.step}s`, '--od': `${FLY.start + i * FLY.step}s` } as CSSProperties
            const [lx, ly] = P((part.x[0] + part.x[1]) / 2, T, part.label === 'Царги' ? part.z[0] - 5 : (part.z[0] + part.z[1]) / 2)
            return (
              <g key={part.id}>
                <path className="fc-cut" style={style} pathLength={1} d={top(part.x, T, part.z)} fill="none" stroke="var(--primary)" strokeWidth={1.6} />
                {part.label && (
                  <text className="fc-label" style={{ ...style, ...text.style }} x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor="middle" dominantBaseline="middle" fontSize={(size * 0.9).toFixed(1)} fontWeight={600} fill="var(--foreground)">
                    {part.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Готовый каркас: размеры из каталога */}
          <g className="fc-done" style={{ '--d': `${DONE}s` } as CSSProperties} stroke="var(--primary)" fill="none">
            <path d={`${line([P(CX + CW + 10, 0, 0), dimHeight[0]])}${line([P(CX + CW + 10, CH, 0), dimHeight[1]])}`} strokeWidth={0.8} />
            <path d={line([dimHeight[0], dimHeight[1]])} strokeWidth={1.2} />
            <path d={`${line([P(CX + CW + 10, 0, CD), dimDepth[1]])}`} strokeWidth={0.8} />
            <path d={line([dimDepth[0], dimDepth[1]])} strokeWidth={1.2} />
            {[dimHeight[0], dimHeight[1], dimDepth[1]].map(([x, y]) => (
              <path key={`${x}-${y}`} d={`M${(x - 5).toFixed(1)},${(y + 5).toFixed(1)}L${(x + 5).toFixed(1)},${(y - 5).toFixed(1)}`} strokeWidth={1.4} />
            ))}
          </g>
          <g className="fc-done" style={{ '--d': `${DONE + 0.15}s` } as CSSProperties}>
            <text {...text} transform={`translate(${mid(dimHeight[0], dimHeight[1]).map((v) => v.toFixed(1)).join(' ')}) rotate(-90)`} y={(size * 1.5).toFixed(1)} textAnchor="middle">
              720 мм
            </text>
            <text {...text} transform={`translate(${mid(dimDepth[0], dimDepth[1]).map((v) => v.toFixed(1)).join(' ')}) rotate(${DEPTH_ANGLE.toFixed(1)})`} y={(size * 1.4).toFixed(1)} textAnchor="middle">
              530 мм
            </text>
          </g>
        </g>
      </svg>

      {run > 0 && (
        <button
          type="button"
          onClick={() => setRun((value) => value + 1)}
          className="absolute left-3 top-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/35 bg-card/90 px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary"
        >
          <RotateCcw className="size-3.5 text-primary" aria-hidden="true" />
          Ещё раз
        </button>
      )}
    </div>
  )
}
