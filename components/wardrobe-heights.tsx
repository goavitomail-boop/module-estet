'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { BRASS, FACE, FAINT, INK, K, SHADE, fitTo, line, wardrobeView, type Pt, type Range } from '@/components/axo'
import { RollingCount } from '@/components/rolling-count'
import { enter } from '@/components/scene-kit'
import { wardrobeHeights } from '@/lib/wardrobes-data'
import { cn } from '@/lib/utils'
import './wardrobe-heights.css'

/**
 * Высота шкафа: корпус 2200 или 2400 мм и антресоль 350–600 мм сверху
 * (wardrobeHeights в lib/wardrobes-data.ts). Выбираешь — шкаф на схеме
 * вытягивается, размерные линии слева пересчитываются.
 *
 * Шкаф нарисован в самом высоком варианте, а ниже его делают сдвиги: верх
 * корпуса и антресоль — «рукава», которые съезжают вниз поверх нижней части,
 * размерные линии сжимаются от низа. Так двигаются только transform
 * и opacity (docs/MOTION.md, раздел 6). Ракурс и грани — axo.ts.
 */

const { P, front, top, side } = wardrobeView

const VIEW = { w: 440, h: 600 }

const W = 1800
const D = 600
const FLOOR = 7
const DOORS = 3

const BASES = wardrobeHeights.map((row) => row.base)
const MEZZANINES = [...new Set(wardrobeHeights.flatMap((row) => row.mezzanines))].sort((a, b) => a - b)
const [MIN_BASE, MAX_BASE] = [Math.min(...BASES), Math.max(...BASES)]
const [MIN_M, MAX_M] = [MEZZANINES[0], MEZZANINES[MEZZANINES.length - 1]]
const CEILING = MAX_BASE + MAX_M

/** Сдвиг вниз на mm миллиметров — в единицах чертежа: вверх по y на экране идёт без перекоса */
const down = (mm: number) => ({ transform: `translate(0px, ${(K * mm).toFixed(1)}px)` }) as CSSProperties

/** Где стоят размерные линии слева от шкафа: цепочка частей и общий размер */
const DIM_X = { parts: -170, total: -520 }

const INK_LINE = { fill: 'none', stroke: INK, strokeWidth: 1, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

/**
 * Кусок шкафа по высоте y: лицо и правый бок залиты, обведены только
 * указанные рёбра — чтобы стык с соседним куском не давал лишней линии
 */
function Slab({ y, edges }: { y: Range; edges: { bottom?: boolean; top?: boolean } }) {
  const seams = Array.from({ length: DOORS - 1 }, (_, i) => (W * (i + 1)) / DOORS)
  return (
    <g>
      <path d={front([0, W], y, 0)} fill={FACE} />
      <path d={side(W, y, [0, D])} fill={SHADE} />
      <path d={line([P(0, y[0], 0), P(0, y[1], 0)])} {...INK_LINE} />
      <path d={line([P(W, y[0], 0), P(W, y[1], 0)])} {...INK_LINE} />
      <path d={line([P(W, y[0], D), P(W, y[1], D)])} {...INK_LINE} />
      {seams.map((x) => (
        <path key={x} d={line([P(x, y[0], 0), P(x, y[1], 0)])} {...INK_LINE} strokeWidth={0.8} />
      ))}
      {edges.bottom && <path d={line([P(0, y[0], 0), P(W, y[0], 0), P(W, y[0], D)])} {...INK_LINE} />}
      {edges.top && (
        <>
          <path d={top([0, W], y[1], [0, D])} {...INK_LINE} fill={SHADE} />
          <path d={line([P(0, y[1], 0), P(W, y[1], 0)])} {...INK_LINE} />
        </>
      )}
    </g>
  )
}

/** Засечка размерной линии */
function Tick({ x, y }: { x: number; y: number }) {
  const [a, b] = P(x, y, 0)
  return <path d={`M${(a - 5).toFixed(1)},${(b + 5).toFixed(1)}L${(a + 5).toFixed(1)},${(b - 5).toFixed(1)}`} stroke={BRASS} strokeWidth={1.4} />
}

/** Число у размерной линии; при смене проявляется заново, когда шкаф уже доехал */
function Label({ x, y, value, size, strong = false }: { x: number; y: number; value: string; size: number; strong?: boolean }) {
  const [a, b] = P(x - 30, y, 0)
  return (
    <text
      key={value}
      className="hs-in"
      style={{ ...enter(0.45, { t: 0.4, from: 'translateX(6px)', ease: 'var(--out)' }), fontFamily: 'var(--font-roboto), sans-serif', transformBox: 'fill-box' }}
      x={a.toFixed(1)}
      y={b.toFixed(1)}
      textAnchor="end"
      dominantBaseline="middle"
      fontSize={size.toFixed(1)}
      fontWeight={strong ? 700 : 600}
      fill="var(--foreground)"
    >
      {value}
    </text>
  )
}

/** Чертёж вписан в кадр по самому высокому шкафу и подписям слева */
const FRAME = fitTo(
  [P(DIM_X.total - 420, FLOOR, 0), P(DIM_X.total - 420, CEILING + 120, D), P(W, FLOOR, 0), P(W, CEILING, D), P(W + 200, CEILING, D), P(0, CEILING, D)],
  VIEW,
  { x: 14, top: 18, bottom: 14 },
)

function Scheme({ base, mezzanine }: { base: number; mezzanine: number | null }) {
  const { fit, tx, ty } = FRAME
  const size = 12 / fit
  const m = mezzanine ?? MIN_M
  const total = base + (mezzanine ?? 0)
  const shiftBase = MAX_BASE - base
  const shiftM = MAX_M - m
  const stretch = (from: number, full: number, now: number) => ({ transform: `scaleY(${((now - from) / (full - from)).toFixed(4)})` }) as CSSProperties

  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 size-full" aria-hidden="true">
      <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${fit.toFixed(3)})`}>
        {/* Пол и потолок в самом высоком варианте — линия у стены */}
        <path d={line([P(DIM_X.total - 200, 0, 0), P(W + 300, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />
        <path d={line([P(DIM_X.total - 200, CEILING, D), P(W + 200, CEILING, D)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />

        {/* Корпус: низ стоит, верх съезжает поверх него, когда корпус ниже */}
        <Slab y={[FLOOR, MIN_BASE]} edges={{ bottom: true }} />
        {[W / DOORS - 45, W / DOORS + 45, (2 * W) / DOORS + 45].map((x) => (
          <path key={x} d={line([P(x, 950, 0), P(x, 1250, 0)])} stroke={INK} strokeWidth={2} strokeLinecap="round" />
        ))}
        <g className="wh-move" style={down(shiftBase)}>
          <Slab y={[MAX_BASE - 2 * (MAX_BASE - MIN_BASE), MAX_BASE]} edges={{ top: true }} />
        </g>

        {/* Антресоль: едет вместе с верхом корпуса, своя высота — своим рукавом */}
        <g className="wh-move" style={down(shiftBase)}>
          <g className="wh-fade" style={{ opacity: mezzanine ? 1 : 0 }}>
            <Slab y={[MAX_BASE, MAX_BASE + MIN_M]} edges={{}} />
            <g className="wh-move" style={down(shiftM)}>
              <Slab y={[CEILING - MIN_M, CEILING]} edges={{ top: true }} />
            </g>
            {/* Стык с корпусом — поверх рукава: при самой низкой антресоли он его закрыл бы */}
            <path d={line([P(0, MAX_BASE, 0), P(W, MAX_BASE, 0), P(W, MAX_BASE, D)])} {...INK_LINE} />
          </g>
        </g>

        {/* Размеры: корпус и антресоль цепочкой, общий — левее */}
        <g>
          <path className="wh-stretch" style={stretch(FLOOR, MAX_BASE, base)} d={line([P(DIM_X.parts, FLOOR, 0), P(DIM_X.parts, MAX_BASE, 0)])} stroke={BRASS} strokeWidth={1.2} />
          <Tick x={DIM_X.parts} y={FLOOR} />
          <g className="wh-move" style={down(shiftBase)}>
            <Tick x={DIM_X.parts} y={MAX_BASE} />
            <path d={line([P(-20, MAX_BASE, 0), P(DIM_X.parts - 30, MAX_BASE, 0)])} stroke={BRASS} strokeWidth={0.7} />
          </g>
          <g className="wh-move" style={down(shiftBase / 2)}>
            <Label x={DIM_X.parts} y={(FLOOR + MAX_BASE) / 2} value={String(base)} size={size} />
          </g>

          <g className="wh-move" style={down(shiftBase)}>
            <g className="wh-fade" style={{ opacity: mezzanine ? 1 : 0 }}>
              <path className="wh-stretch" style={stretch(MAX_BASE, CEILING, MAX_BASE + m)} d={line([P(DIM_X.parts, MAX_BASE, 0), P(DIM_X.parts, CEILING, 0)])} stroke={BRASS} strokeWidth={1.2} />
              <g className="wh-move" style={down(shiftM)}>
                <Tick x={DIM_X.parts} y={CEILING} />
                <path d={line([P(-20, CEILING, 0), P(DIM_X.total - 30, CEILING, 0)])} stroke={BRASS} strokeWidth={0.7} />
              </g>
              <g className="wh-move" style={down(shiftM / 2)}>
                <Label x={DIM_X.parts} y={MAX_BASE + MAX_M / 2} value={String(m)} size={size} />
              </g>
            </g>
          </g>

          <path className="wh-stretch" style={stretch(FLOOR, CEILING, total)} d={line([P(DIM_X.total, FLOOR, 0), P(DIM_X.total, CEILING, 0)])} stroke={BRASS} strokeWidth={1.2} />
          <Tick x={DIM_X.total} y={FLOOR} />
          <g className="wh-move" style={down(CEILING - total)}>
            <Tick x={DIM_X.total} y={CEILING} />
          </g>
          <g className="wh-move" style={down((CEILING - total) / 2)}>
            <Label x={DIM_X.total} y={(FLOOR + CEILING) / 2} value={`${total} мм`} size={size * 1.1} strong />
          </g>
        </g>
      </g>
    </svg>
  )
}

/** Кнопка-переключатель в ряду: тот же вид, что у кнопок «Что внутри шкафа» */
function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold tabular-nums transition-colors',
        on ? 'border-foreground bg-foreground text-background' : 'border-primary/35 bg-card text-foreground hover:border-primary',
      )}
    >
      {children}
    </button>
  )
}

export function WardrobeHeights() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [base, setBase] = useState(MAX_BASE)
  // Сначала без антресоли: когда блок увидели, она вырастает до потолка
  const [mezzanine, setMezzanine] = useState<number | null>(null)
  const touched = useRef(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let timer = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        timer = window.setTimeout(() => !touched.current && setMezzanine(MAX_M), reduced ? 0 : 400)
      },
      { threshold: 0.5 },
    )
    observer.observe(root)
    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [])

  const choose = (apply: () => void) => {
    touched.current = true
    apply()
  }
  const total = base + (mezzanine ?? 0)

  // На телефоне переключатели над схемой: нажали — и видно, как шкаф вырос
  return (
    <div ref={rootRef} className="hs flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-12">
      <div className="paper relative order-2 mx-auto aspect-[44/60] w-full max-w-[30rem] overflow-hidden rounded-3xl border border-primary/35 lg:order-none lg:col-start-1 lg:row-span-4 lg:row-start-1">
        <Scheme base={base} mezzanine={mezzanine} />
      </div>

      <div className="order-1 flex flex-col gap-4 lg:order-none lg:col-start-2 lg:row-start-2">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Корпус</p>
          <div className="flex gap-2" role="group" aria-label="Высота корпуса">
            {BASES.map((value) => (
              <Option key={value} on={base === value} onClick={() => choose(() => setBase(value))}>
                {`${value} мм`}
              </Option>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Антресоль</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="group" aria-label="Высота антресоли">
            <Option on={mezzanine === null} onClick={() => choose(() => setMezzanine(null))}>
              Без антресоли
            </Option>
            {MEZZANINES.map((value) => (
              <Option key={value} on={mezzanine === value} onClick={() => choose(() => setMezzanine(value))}>
                {String(value)}
              </Option>
            ))}
          </div>
        </div>
      </div>

      <div className="order-3 rounded-2xl border border-border bg-card p-5 lg:order-none lg:col-start-2 lg:row-start-3" aria-live="polite">
        <p className="text-sm text-muted-foreground">
          Корпус {base} мм{mezzanine ? ` + антресоль ${mezzanine} мм` : ''}
        </p>
        <p className="flyer-title mt-1 text-3xl">
          Высота <RollingCount value={total} /> мм
        </p>
        {total === CEILING && <p className="mt-2 text-sm text-muted-foreground">Самый высокий вариант — до {CEILING} мм, шкаф закрывает стену до потолка.</p>}
      </div>
    </div>
  )
}
