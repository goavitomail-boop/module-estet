'use client'

import type { CSSProperties, ReactNode } from 'react'
import { BRASS, FACE, FAINT, INK, INSIDE, SHADE, SHADE_DEEP, axonometry, fillingView, line, wardrobeView, type Range } from '@/components/axo'
import { Bottle, Jar, Pot } from '@/components/filling-scene'
import { POP } from '@/components/scene-kit'
import { Bowls, Plate } from '@/components/storage-scene'
import {
  DARK, GLASS, KB, BaseRun, Block, Cut, Drop, Hinged, Move, Path, Question, Tier,
  at, baseExtremes, gap, keys, lagged, ring, rotX, rotY, shift,
  type Built, type Mod, type Turn, type V3, type View,
} from '@/components/scheme-kit'

/**
 * Схемы кухонного квиза — в каркасе, как «Наполнение» на главной
 * (scheme-kit.tsx). Планировки — план комнаты, где модули по очереди
 * встают вдоль стен; размеры — ряд модулей в общем масштабе с размерной
 * линией; техника и удобства — фрагмент кухни, где на выбор срабатывает
 * механизм: посудомойка открывается и выдвигает корзину, холодильник и
 * пенал распахивают двери, духовка опускает дверцу, СВЧ крутит тарелку,
 * остров встаёт на своё место.
 *
 * Рисунок — схема, а не проект: размеры модулей типовые (600 мм).
 */

const fade = (d: number, t = 0.4) => ({ '--d': lagged(d), '--t': `${t}s` }) as CSSProperties
const COUNTER = 'color-mix(in oklab, var(--primary) 16%, var(--card))'
const LIT = 'color-mix(in oklab, var(--primary) 10%, var(--card))'

/* ══════════════════════════════════════════════════════════════════════
   Планировка: план комнаты
   ══════════════════════════════════════════════════════════════════════ */

/** На угол комнаты сверху-спереди-справа: пол виден целиком, стены низкие, со срезом */
const plan = axonometry({ deg: 20, scale: 0.9 }, { deg: 40, scale: 0.85 }, 0.75)
const ROOM = { W: 3600, D: 3000, H: 1300 }
const LOW = { top: 900, body: 860, depth: 600, over: 25 }

type Box = { x: Range; z: Range }
/** Ряд модулей: корпуса, столешница, мойка (вдоль x или z) и варочная — центрами */
type Run = { mods: Box[]; counter: Box; sink?: { c: [number, number]; along: 'x' | 'z' }; hob?: [number, number] }

const split = (r: Range, step = 600): Range[] => {
  const out: Range[] = []
  for (let a = r[0]; a < r[1] - 1; a += step) out.push([a, Math.min(a + step, r[1])])
  return out
}

/** Вдоль задней стены; вдоль левой и правой — от дальнего края к ближнему (так рисуются по порядку) */
const back = (x: Range, extra: Partial<Run> = {}): Run => ({
  mods: split(x).map((xx) => ({ x: xx, z: [ROOM.D - LOW.depth, ROOM.D] })),
  counter: { x, z: [ROOM.D - LOW.depth - LOW.over, ROOM.D] },
  ...extra,
})
const left = (z: Range, extra: Partial<Run> = {}): Run => ({
  mods: split(z).reverse().map((zz) => ({ x: [0, LOW.depth], z: zz })),
  counter: { x: [0, LOW.depth + LOW.over], z },
  ...extra,
})
const right = (z: Range, extra: Partial<Run> = {}): Run => ({
  mods: split(z).reverse().map((zz) => ({ x: [ROOM.W - LOW.depth, ROOM.W], z: zz })),
  counter: { x: [ROOM.W - LOW.depth - LOW.over, ROOM.W], z },
  ...extra,
})
/** Ряд у ближней стены — для параллельной: дверцы смотрят в проход */
const near = (x: Range, extra: Partial<Run> = {}): Run => ({
  mods: split(x).map((xx) => ({ x: xx, z: [0, LOW.depth] })),
  counter: { x, z: [0, LOW.depth + LOW.over] },
  ...extra,
})
/** Остров: столешница со свесом к залу — за ней сидят */
const island = (x: Range, z: Range, extra: Partial<Run> = {}): Run => ({
  mods: split(x, 750).map((xx) => ({ x: xx, z })),
  counter: { x: [x[0] - 25, x[1] + 25], z: [z[0] - 250, z[1] + 25] },
  ...extra,
})

const ISLAND = island([1050, 2550], [1000, 1700], { hob: [1800, 1350] })

export type LayoutKind = 'straight' | 'corner' | 'u' | 'island' | 'parallel'

const LAYOUTS: Record<LayoutKind, Run[]> = {
  straight: [back([300, 3300], { sink: { c: [1200, 2700], along: 'x' }, hob: [2400, 2700] })],
  corner: [back([0, 3000], { hob: [1800, 2700] }), left([600, 2400], { sink: { c: [300, 1500], along: 'z' } })],
  u: [back([0, 3600], { sink: { c: [1800, 2700], along: 'x' } }), left([600, 2400], { hob: [300, 1500] }), right([600, 2400])],
  island: [back([300, 3300], { sink: { c: [1500, 2700], along: 'x' } }), ISLAND],
  parallel: [back([300, 3300], { sink: { c: [1200, 2700], along: 'x' } }), near([300, 3300], { hob: [2400, 300] })],
}

function Room() {
  const { P, top } = plan
  const { W, D, H } = ROOM
  return (
    <g>
      <path d={top([0, W], 0, [0, D])} fill={FACE} stroke={INK} strokeWidth={0.8} />
      {/* Сетка пола по 600 мм: на глаз видно, сколько модулей встаёт */}
      <g stroke={FAINT} strokeWidth={0.5}>
        {split([0, W]).slice(1).map(([x]) => <path key={`x${x}`} d={line([P(x, 0, 0), P(x, 0, D)])} />)}
        {split([0, D]).slice(1).map(([z]) => <path key={`z${z}`} d={line([P(0, 0, z), P(W, 0, z)])} />)}
      </g>
      <g fill={SHADE_DEEP}>
        <Cut pts={[P(0, 0, 0), P(0, 0, D), P(0, H, D), P(0, H, 0)]} />
      </g>
      <g fill={SHADE}>
        <Cut pts={[P(0, 0, D), P(W, 0, D), P(W, H, D), P(0, H, D)]} />
      </g>
    </g>
  )
}

/** Мойка: чаша в столешнице и смеситель у стены */
function Sink({ c: [cx, cz], along }: { c: [number, number]; along: 'x' | 'z' }) {
  const { P, top } = plan
  const [hx, hz] = along === 'x' ? [260, 190] : [190, 260]
  const y = LOW.top + 1
  const foot: V3 = along === 'x' ? [cx, y, cz + hz + 60] : [cx - hx - 60, y, cz]
  const spout: V3 = along === 'x' ? [cx, y + 230, cz + hz - 60] : [cx - hx + 60, y + 230, cz]
  return (
    <g>
      <path d={top([cx - hx, cx + hx], y, [cz - hz, cz + hz])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={line([P(...foot), P(foot[0], y + 230, foot[2]), P(...spout)])} fill="none" stroke={INK} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

/** Варочная: тёмная панель и четыре конфорки */
function Hob({ c: [cx, cz] }: { c: [number, number] }) {
  const y = LOW.top + 1
  return (
    <g>
      <path d={plan.top([cx - 270, cx + 270], y, [cz - 240, cz + 240])} fill={DARK} stroke={INK} strokeWidth={0.8} />
      {[[-125, -110], [125, -110], [-125, 110], [125, 110]].map(([dx, dz]) => (
        <path key={`${dx},${dz}`} d={ring(plan, cx + dx, y, cz + dz, 80)} fill="none" stroke="var(--card)" strokeWidth={0.9} />
      ))}
    </g>
  )
}

/**
 * Ряд на плане. d — когда начинают вставать модули (каждый следующий
 * чуть позже), столешница — после всех модулей, мойка и плита — за ней.
 * Без d ряд просто стоит
 */
function RunView({ run, d, counterAt }: { run: Run; d?: number; counterAt?: number }) {
  const mods = run.mods.map((m, i) => {
    const block = <Block v={plan} x={m.x} y={[0, LOW.body]} z={m.z} />
    return d === undefined ? <g key={i}>{block}</g> : <Drop key={i} v={plan} d={d + i * 0.06} h={600} t={0.6}>{block}</Drop>
  })
  const counter = <Block v={plan} x={run.counter.x} y={[LOW.body, LOW.top]} z={run.counter.z} top={COUNTER} sw={0.9} />
  const details = (
    <g>
      {run.sink && <Sink {...run.sink} />}
      {run.hob && <Hob c={run.hob} />}
    </g>
  )
  return (
    <g>
      {mods}
      {counterAt === undefined ? counter : <g className="hs-fade" style={fade(counterAt)}>{counter}</g>}
      {counterAt === undefined ? details : <g className="hs-in" style={at(counterAt + 0.25, POP)}>{details}</g>}
    </g>
  )
}

const roomExtremes = () => {
  const { P } = plan
  const { W, D, H } = ROOM
  return [P(0, 0, 0), P(W, 0, 0), P(W, 0, D), P(0, H, D), P(W, H, D), P(0, H, 0)]
}

/** Планировка: модули по очереди встают вдоль стен, потом столешница, мойка и плита */
export function layoutScene(kind: LayoutKind): Built {
  const runs = LAYOUTS[kind]
  const total = runs.reduce((n, run) => n + run.mods.length, 0)
  const counterAt = 0.2 + total * 0.06 + 0.2
  // Когда начинает вставать каждый ряд: модули идут сплошной очередью по всем рядам
  const starts = runs.map((_, i) => 0.2 + runs.slice(0, i).reduce((n, run) => n + run.mods.length, 0) * 0.06)
  return {
    view: plan,
    extremes: roomExtremes(),
    body: () => (
      <g>
        <Room />
        {runs.map((run, i) => <RunView key={i} run={run} d={starts[i]} counterAt={counterAt} />)}
      </g>
    ),
  }
}

/** Контур на полу пунктиром — там, где может встать кухня */
function Footprint({ box }: { box: Box }) {
  return <path d={plan.top(box.x, 2, box.z)} fill="none" stroke={BRASS} strokeWidth={1} strokeDasharray="5 4" />
}

/** «Пока не знаю»: пустая комната, контуры угловой кухни и знак вопроса */
export function layoutUnknownScene(): Built {
  const ghost = LAYOUTS.corner
  return {
    view: plan,
    extremes: roomExtremes(),
    body: () => (
      <g>
        <Room />
        <g className="hs-fade" style={fade(0.2, 0.6)}>
          {ghost.map((run, i) => <Footprint key={i} box={run.counter} />)}
        </g>
        <Question p={plan.P(2000, 700, 1300)} size={260} d={0.5} />
      </g>
    ),
  }
}

/** Пожелание «остров»: кухня у стены стоит, на выбор остров встаёт на свой контур */
export function islandScene(): Built {
  const [wall] = LAYOUTS.island
  return {
    view: plan,
    extremes: roomExtremes(),
    body: () => (
      <g>
        <Room />
        <RunView run={wall} />
        <Footprint box={ISLAND.counter} />
        <Drop v={plan} d={0.25} h={700} t={0.8}>
          <RunView run={{ ...ISLAND, hob: undefined }} />
        </Drop>
        <g className="hs-in" style={at(0.85, POP)}>
          <Hob c={ISLAND.hob!} />
        </g>
      </g>
    ),
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Размер: ряд модулей в общем масштабе
   ══════════════════════════════════════════════════════════════════════ */

const RUN = { wall: [1400, 2120] as Range, wallZ: [280, 600] as Range, longest: 8 }

/**
 * Прямая кухня из n модулей по 600: нижние встают по очереди, столешница
 * прочерчивается, навесные встают следом, потом размер. Рамка у всех
 * карточек шага — как у самой длинной кухни, только по центру этой: так
 * масштаб общий и разница в длине видна сразу. ghost — «не знаю»: контур
 * пунктиром и размер со знаком вопроса
 */
export function runScene(n: number, label: string, ghost = false): Built {
  const v = wardrobeView
  const { P } = v
  const W = n * 600
  const big = RUN.longest * 600
  const dx = (W - big) / 2
  const frame: V3[] = [[0, 0, 0], [big, 0, 0], [big, 0, 600], [0, RUN.wall[1], 600], [big, RUN.wall[1], 600], [0, RUN.wall[1], 280], [-150, -820, 0], [big + 150, -820, 0]]
  const mods = Array.from({ length: n }, (_, i) => [i * 600, (i + 1) * 600] as Range)
  const counterAt = 0.15 + n * 0.07 + 0.05
  const wallAt = (i: number) => counterAt + 0.3 + i * 0.05
  const dimAt = wallAt(n) + 0.15
  return {
    view: v,
    extremes: frame.map(([x, y, z]) => P(x + dx, y, z)),
    body: () => (
      <g>
        <path d={line([P(-200, 0, 0), P(W + 200, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />
        {ghost ? (
          <g className="hs-fade" style={fade(0.2, 0.6)} fill="none" stroke={BRASS} strokeWidth={1} strokeDasharray="5 4">
            {mods.map((x) => (
              <g key={x[0]}>
                <path d={v.front(x, [0, KB.TOP + KB.COUNTER], 0)} />
                <path d={v.front(x, RUN.wall, RUN.wallZ[0])} />
              </g>
            ))}
          </g>
        ) : (
          <g>
            {mods.map((x, i) => (
              <Drop key={x[0]} v={v} d={0.15 + i * 0.07} h={350} t={0.6}>
                <path d={v.front(x, [0, KB.PLINTH], KB.SET)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
                <path d={v.side(x[1], [0, KB.PLINTH], [KB.SET, KB.DEPTH])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
                <Block v={v} x={x} y={[KB.PLINTH, KB.TOP]} z={[0, KB.DEPTH]} />
                <path d={line([P(x[0] + 60, KB.TOP - 50, 0), P(x[0] + 220, KB.TOP - 50, 0)])} stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
              </Drop>
            ))}
            <g className="hs-draw-x" style={{ '--d': lagged(counterAt), '--t': '0.5s', '--origin': 'left' } as CSSProperties}>
              <Block v={v} x={[0, W]} y={[KB.TOP, KB.TOP + KB.COUNTER]} z={[-KB.OVERHANG, KB.COUNTER_DEPTH]} top={COUNTER} />
            </g>
            {mods.map((x, i) => (
              <Drop key={`w${x[0]}`} v={v} d={wallAt(i)} h={300} t={0.6}>
                <Block v={v} x={x} y={RUN.wall} z={RUN.wallZ} />
                <path d={line([P(x[0] + 60, RUN.wall[0] + 50, RUN.wallZ[0]), P(x[0] + 220, RUN.wall[0] + 50, RUN.wallZ[0])])} stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
              </Drop>
            ))}
          </g>
        )}
      </g>
    ),
    dims: [{ a: [0, -110, 0], b: [W, -110, 0], ext: [0, 90, 0], label, d: ghost ? 0.5 : dimAt }],
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Техника и удобства: фрагмент кухни, механизм срабатывает на выбор
   ══════════════════════════════════════════════════════════════════════ */

/** Колонна слева от нижнего ряда: x от −600 до 0, по высоте до 2120 */
const COL = { x: [-600, 0] as Range, y: [KB.PLINTH, 2120] as Range, depth: 560 }
const colIn = (y: Range): Range => [y[0] + 8, y[1] - 8]
const COL_IN: Range = [COL.x[0] + 16, COL.x[1] - 16]

/** Корпус колонны: цоколь, правый бок, верх */
function ColumnBody({ v }: { v: View }) {
  return (
    <g strokeLinejoin="round">
      <path d={v.front(COL.x, [0, KB.PLINTH], KB.SET)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={v.side(COL.x[1], COL.y, [0, COL.depth])} fill={SHADE} stroke={INK} strokeWidth={1} />
      <path d={v.top(COL.x, COL.y[1], [0, COL.depth])} fill={SHADE} stroke={INK} strokeWidth={1} />
      <path d={v.front(COL.x, COL.y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
    </g>
  )
}

/** Ниша в колонне: изнутри задняя стенка и левый бок, видны только сквозь проём */
function Niche({ v, uid, y, fill = INSIDE, children }: { v: View; uid: string; y: Range; fill?: string; children?: ReactNode }) {
  return (
    <g>
      <defs>
        <clipPath id={`${uid}-n${y[0]}`}><path d={v.front(COL_IN, y, 0)} /></clipPath>
      </defs>
      <g clipPath={`url(#${uid}-n${y[0]})`} strokeLinejoin="round">
        <path d={v.front(COL_IN, y, COL.depth - 20)} fill={fill} stroke={INK} strokeWidth={0.8} />
        <path d={v.side(COL_IN[0], y, [0, COL.depth - 20])} fill={fill} stroke={INK} strokeWidth={0.6} />
        <path d={v.top(COL_IN, y[0], [0, COL.depth - 20])} fill={fill} stroke={INK} strokeWidth={0.6} />
        {children}
      </g>
    </g>
  )
}

/** Фасад колонны с ручкой у правой кромки: дверь на левых петлях */
function ColumnDoor({ v, y, handle = 'side' }: { v: View; y: Range; handle?: 'side' | 'top' | 'none' }) {
  const { P, front } = v
  const x = gap(COL.x)
  return (
    <g>
      <path d={front(x, colIn(y), 0)} fill={FACE} stroke={INK} strokeWidth={1} />
      {handle === 'side' && <path d={line([P(x[1] - 50, y[0] + 60, 0), P(x[1] - 50, y[0] + 260, 0)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />}
      {handle === 'top' && <path d={line([P(x[0] + 60, y[1] - 50, 0), P(x[0] + 220, y[1] - 50, 0)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />}
    </g>
  )
}

/** Дверь колонны на левых петлях распахивается к зрителю */
const swingLeft = (y: Range, deg: number): Turn => {
  const x0 = gap(COL.x)[0]
  return { origin: [x0, y[0], 0], along: [0, 1, 0], across: [1, 0, 0], move: (s) => rotY([x0, 0, 0], deg * s) }
}

/** Дверца на нижних петлях опускается к зрителю */
const dropDown = (x: Range, y0: number, deg = 88): Turn => ({
  origin: [x[0], y0, 0], along: [1, 0, 0], across: [0, 1, 0], move: (s) => rotX([0, y0, 0], deg * s),
})

/** Свет изнутри: тёплый градиент сверху вниз */
function GlowDef({ id, strength = 0.5 }: { id: string; strength?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="var(--primary)" stopOpacity={strength} />
      <stop offset="1" stopColor="var(--primary)" stopOpacity="0.04" />
    </linearGradient>
  )
}

const columnExtremes = (v: View, W: number, swing = 0) => [
  ...baseExtremes(v, W),
  v.P(COL.x[0], 0, KB.SET), v.P(COL.x[0], COL.y[1], 0), v.P(COL.x[0], COL.y[1], COL.depth), v.P(COL.x[1], COL.y[1], COL.depth),
  ...(swing ? [v.P(COL.x[0] - 120, 0, -swing), v.P(COL.x[0] - 120, COL.y[1], -swing)] : []),
]

/* ── Посудомоечная машина: дверца опускается, нижняя корзина с тарелками выезжает на неё ── */
export function dishwasherScene(): Built {
  const v = fillingView
  const { P } = v
  const mods: Mod[] = [
    { w: 450, fronts: [[KB.PLINTH, 460], [460, KB.TOP]] },
    { w: 600, open: [KB.PLINTH, KB.TOP] },
    { w: 450, fronts: [[KB.PLINTH, KB.TOP]] },
  ]
  const x = gap([450, 1050])
  const y = gap([KB.PLINTH, KB.TOP])
  const open = dropDown(x, y[0])
  const travel = 400
  const rack = { x: [x[0] + 30, x[1] - 30] as Range, y: y[0] + 70, z: [30, 500] as Range }
  const shut = 0.3 + 0.9
  const door = (
    <g>
      <path d={v.front(x, y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
      {/* Панель управления по верхней кромке — по ней посудомойку узнают и закрытой */}
      <path d={v.front([x[0] + 10, x[1] - 10], [y[1] - 80, y[1] - 14], 0)} fill={DARK} stroke={INK} strokeWidth={0.6} />
      {[0, 1, 2].map((i) => {
        const [cx, cy] = P(x[1] - 70 - i * 55, y[1] - 47, 0)
        return <circle key={i} cx={cx} cy={cy} r={2.4} fill={i === 0 ? BRASS : 'var(--card)'} />
      })}
    </g>
  )
  return {
    view: v,
    extremes: [...baseExtremes(v, 1500), P(x[0], y[0], -720), P(x[1], y[0], -720), P(x[0], 0, -720)],
    body: (uid) => (
      <BaseRun v={v} mods={mods}>
        <defs>
          <clipPath id={`${uid}-in`}><path d={v.front(x, y, 0)} /></clipPath>
          <clipPath id={`${uid}-out`}><path d={v.sweptOpening(x, y, 0, travel)} /></clipPath>
        </defs>
        {/* Верхняя корзина с чашками остаётся внутри */}
        <g clipPath={`url(#${uid}-in)`}>
          <Tier v={v} x={rack.x} y={520} z={rack.z} rim={80}>
            {[90, 230, 370].map((zz) => <Jar key={zz} at={P((x[0] + x[1]) / 2, 520, zz)} w={70} h={80} />)}
          </Tier>
        </g>
        {/* Нижняя копия дверцы — под корзиной, когда та выезжает */}
        <Hinged v={v} turn={open} d={0.3} t={0.9}>{door}</Hinged>
        <g clipPath={`url(#${uid}-out)`}>
          <Move to={shift(v, [0, 0, -travel])} d={shut} t={0.9}>
            <Tier v={v} x={rack.x} y={rack.y} z={rack.z} rim={150}>
              {Array.from({ length: 8 }, (_, i) => (
                <Plate key={i} v={v} x={rack.x[0] + 50 + i * 55} y={rack.y + 115} z={260} r={100} />
              ))}
            </Tier>
          </Move>
        </g>
        {/* Верхняя копия: закрытая дверца прячет корзины, у открытой — уходит */}
        <g className="ss-hide" style={{ '--d': lagged(shut) } as CSSProperties}>
          <Hinged v={v} turn={open} d={0.3} t={0.9}>{door}</Hinged>
        </g>
      </BaseRun>
    ),
  }
}

/* ── Встроенный холодильник: колонна, верхняя дверь распахивается, внутри загорается свет ── */
export function fridgeScene(): Built {
  const v = fillingView
  const { P } = v
  const freezer: Range = [KB.PLINTH, 800]
  const fridge: Range = [800, COL.y[1]]
  const shelves = [1150, 1460, 1770]
  const cx = (COL.x[0] + COL.x[1]) / 2
  return {
    view: v,
    extremes: columnExtremes(v, 900, 560),
    body: (uid) => (
      <g>
        <defs><GlowDef id={`${uid}-glow`} strength={0.4} /></defs>
        <ColumnBody v={v} />
        <Niche v={v} uid={uid} y={colIn(fridge)} fill={FACE}>
          <path className="hs-fade" style={fade(0.75, 0.6)} d={v.front(COL_IN, colIn(fridge), COL.depth - 20)} fill={`url(#${uid}-glow)`} />
          {/* Ящики для овощей внизу и стеклянные полки */}
          <Block v={v} x={[COL_IN[0], COL_IN[1]]} y={[fridge[0] + 10, fridge[0] + 190]} z={[40, 520]} fill={GLASS} />
          {shelves.map((sy) => (
            <path key={sy} d={v.top(COL_IN, sy, [20, COL.depth - 20])} fill={GLASS} stroke={INK} strokeWidth={0.6} />
          ))}
          <Jar at={P(cx - 120, shelves[0], 300)} w={110} h={130} />
          <Jar at={P(cx + 100, shelves[0], 200)} w={90} h={170} />
          <Bottle at={P(cx - 130, shelves[1], 280)} h={250} />
          <Bottle at={P(cx - 40, shelves[1], 250)} h={220} />
          <Jar at={P(cx + 120, shelves[1], 220)} w={100} h={110} />
          <Pot at={P(cx, shelves[2], 300)} />
        </Niche>
        <ColumnDoor v={v} y={freezer} handle="side" />
        <Hinged v={v} turn={swingLeft(fridge, 100)} d={0.3} t={1.0}>
          <ColumnDoor v={v} y={fridge} handle="side" />
          {/* Полочки на двери — видны, только когда она открыта */}
          <g className="hs-fade" style={fade(0.9, 0.3)}>
            {[1150, 1500, 1850].map((sy) => (
              <path key={sy} d={v.front([COL.x[0] + 60, COL.x[1] - 60], [sy, sy + 70], 0)} fill={GLASS} stroke={INK} strokeWidth={0.6} />
            ))}
          </g>
        </Hinged>
        <BaseRun v={v} mods={[{ w: 450, fronts: [[KB.PLINTH, 460], [460, KB.TOP]] }, { w: 450, fronts: [[KB.PLINTH, KB.TOP]] }]} />
      </g>
    ),
  }
}

/* ── Духовой шкаф на уровне глаз: дверца опускается, внутри греет, противень выезжает ── */
export function ovenScene(): Built {
  const v = fillingView
  const { P } = v
  const oven: Range = [830, 1430]
  const doorY: Range = [oven[0] + 6, oven[1] - 90]
  const x = gap(COL.x)
  const travel = 300
  const tray = { x: [COL_IN[0] + 20, COL_IN[1] - 20] as Range, y: 1010, z: [40, 500] as Range }
  const shut = 0.3 + 0.8
  const door = (
    <g>
      <path d={v.front(x, doorY, 0)} fill={DARK} stroke={INK} strokeWidth={1} />
      <path d={v.front([x[0] + 70, x[1] - 70], [doorY[0] + 70, doorY[1] - 110], 0)} fill="color-mix(in oklab, var(--foreground) 32%, var(--card))" stroke={INK} strokeWidth={0.6} />
      <path d={line([P(x[0] + 70, doorY[1] - 50, 0), P(x[1] - 70, doorY[1] - 50, 0)])} stroke={BRASS} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  )
  return {
    view: v,
    extremes: [...columnExtremes(v, 900), P(x[0], doorY[0], -560)],
    body: (uid) => (
      <g>
        <defs>
          <GlowDef id={`${uid}-glow`} strength={0.75} />
          <clipPath id={`${uid}-out`}><path d={v.sweptOpening(COL_IN, colIn(oven), 0, travel)} /></clipPath>
        </defs>
        <ColumnBody v={v} />
        <ColumnDoor v={v} y={[KB.PLINTH, 460]} handle="top" />
        <ColumnDoor v={v} y={[460, oven[0]]} handle="top" />
        <ColumnDoor v={v} y={[oven[1], COL.y[1]]} handle="side" />
        <Niche v={v} uid={uid} y={colIn(oven)}>
          {/* Духовка разогревается: тёплый свет изнутри */}
          <path className="hs-fade" style={fade(0.85, 0.7)} d={v.front(COL_IN, colIn(oven), COL.depth - 20)} fill={`url(#${uid}-glow)`} />
          <path d={line([P(COL_IN[0], 1220, 40), P(COL_IN[0], 1220, COL.depth - 20)])} stroke="var(--card)" strokeWidth={0.8} />
        </Niche>
        {/* Панель с переключателями над дверцей */}
        <path d={v.front(x, [oven[1] - 84, oven[1] - 6], 0)} fill={DARK} stroke={INK} strokeWidth={0.8} />
        {[0, 1].map((i) => {
          const [kx, ky] = P(i === 0 ? x[0] + 110 : x[1] - 110, oven[1] - 45, 0)
          return <circle key={i} cx={kx} cy={ky} r={3} fill="var(--card)" stroke={INK} strokeWidth={0.6} />
        })}
        <Hinged v={v} turn={dropDown(x, doorY[0])} d={0.3} t={0.8}>{door}</Hinged>
        <g clipPath={`url(#${uid}-out)`}>
          <Move to={shift(v, [0, 0, -travel])} d={shut} t={0.8}>
            <Tier v={v} x={tray.x} y={tray.y} z={tray.z} rim={30}>
              <path d={ring(v, (tray.x[0] + tray.x[1]) / 2, tray.y + 2, 260, 150)} fill="color-mix(in oklab, var(--primary) 45%, var(--card))" stroke={INK} strokeWidth={0.7} />
            </Tier>
          </Move>
        </g>
        <g className="ss-hide" style={{ '--d': lagged(shut) } as CSSProperties}>
          <Hinged v={v} turn={dropDown(x, doorY[0])} d={0.3} t={0.8}>{door}</Hinged>
        </g>
        <BaseRun v={v} mods={[{ w: 450, fronts: [[KB.PLINTH, 460], [460, KB.TOP]] }, { w: 450, fronts: [[KB.PLINTH, KB.TOP]] }]} />
      </g>
    ),
  }
}

/* ── Встроенная СВЧ: в навесном модуле над столешницей; дверца распахивается, тарелка вращается ── */
const WALL = { y: [1400, 2120] as Range, z: [280, 600] as Range }

export function microwaveScene(): Built {
  const v = fillingView
  const { P, front, top, side } = v
  const W = 1200
  const counter = KB.TOP + KB.COUNTER
  const mw: Range = [WALL.y[0] + 10, WALL.y[0] + 390]
  const inner: Range = [16, 600 - 16]
  const doorX: Range = [3, 440]
  const panelX: Range = [440, 597]
  const plate = { cx: 260, y: mw[0] + 30, cz: WALL.z[0] + 160, r: 115 }
  const orbit = keys((s) => {
    const a0 = Math.PI * 0.75
    const a = a0 + s * Math.PI * 1.5
    return shift(v, [60 * (Math.cos(a) - Math.cos(a0)), 0, 60 * (Math.sin(a) - Math.sin(a0))])
  }, false)
  const swing: Turn = { origin: [doorX[0], mw[0], WALL.z[0]], along: [0, 1, 0], across: [1, 0, 0], move: (s) => rotY([doorX[0], 0, WALL.z[0]], 95 * s) }
  return {
    view: v,
    extremes: [...baseExtremes(v, W), P(0, WALL.y[1], WALL.z[1]), P(W, WALL.y[1], WALL.z[1]), P(0, WALL.y[1], WALL.z[0]), P(-140, mw[0], WALL.z[0] - 440)],
    body: (uid) => (
      <g>
        <defs>
          <GlowDef id={`${uid}-glow`} strength={0.6} />
          <clipPath id={`${uid}-in`}><path d={front(inner, [mw[0] + 10, mw[1] - 10], WALL.z[0])} /></clipPath>
        </defs>
        <BaseRun v={v} mods={[{ w: 600, fronts: [[KB.PLINTH, 460], [460, KB.TOP]] }, { w: 600, fronts: [[KB.PLINTH, KB.TOP]] }]} />
        {/* Стена над столешницей */}
        <path d={front([0, W], [counter, WALL.y[0]], WALL.z[1])} fill={SHADE} stroke={INK} strokeWidth={0.6} />
        {/* Навесные: правый бок и верх, слева — модуль с СВЧ, справа — с дверцей */}
        <path d={side(W, WALL.y, WALL.z)} fill={SHADE} stroke={INK} strokeWidth={1} />
        <path d={top([0, W], WALL.y[1], WALL.z)} fill={SHADE} stroke={INK} strokeWidth={1} />
        <path d={front([0, W], WALL.y, WALL.z[0])} fill={FACE} stroke={INK} strokeWidth={1} />
        <path d={front(gap([0, 600]), [mw[1] + 6, WALL.y[1] - 2], WALL.z[0])} fill={FACE} stroke={INK} strokeWidth={1} />
        <path d={front(gap([600, W]), gap(WALL.y), WALL.z[0])} fill={FACE} stroke={INK} strokeWidth={1} />
        <path d={line([P(640, WALL.y[0] + 50, WALL.z[0]), P(800, WALL.y[0] + 50, WALL.z[0])])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        {/* Камера СВЧ: свет, тарелка, миска на ней */}
        <g clipPath={`url(#${uid}-in)`} strokeLinejoin="round">
          <path d={front(inner, mw, WALL.z[1] - 20)} fill={LIT} stroke={INK} strokeWidth={0.8} />
          <path d={side(inner[0], mw, [WALL.z[0], WALL.z[1] - 20])} fill={LIT} stroke={INK} strokeWidth={0.6} />
          <path d={top(inner, mw[0] + 10, [WALL.z[0], WALL.z[1] - 20])} fill={LIT} stroke={INK} strokeWidth={0.6} />
          <path className="hs-fade" style={fade(0.85, 0.5)} d={front(inner, mw, WALL.z[1] - 20)} fill={`url(#${uid}-glow)`} />
          <path d={ring(v, plate.cx, plate.y, plate.cz, plate.r)} fill={GLASS} stroke={INK} strokeWidth={0.7} />
          <Path steps={orbit} d={0.95} t={1.6}>
            <Bowls at={P(plate.cx, plate.y, plate.cz)} n={1} />
          </Path>
        </g>
        {/* Панель управления справа от дверцы */}
        <path d={front(panelX, [mw[0], mw[1]], WALL.z[0] - 1)} fill={DARK} stroke={INK} strokeWidth={0.8} />
        {[0, 1].map((i) => {
          const [kx, ky] = P((panelX[0] + panelX[1]) / 2, mw[1] - 90 - i * 110, WALL.z[0] - 1)
          return <circle key={i} cx={kx} cy={ky} r={3} fill="var(--card)" stroke={INK} strokeWidth={0.6} />
        })}
        <Hinged v={v} turn={swing} d={0.3} t={0.9}>
          <path d={front(doorX, mw, WALL.z[0] - 1)} fill={DARK} stroke={INK} strokeWidth={1} />
          <path d={front([doorX[0] + 45, doorX[1] - 45], [mw[0] + 45, mw[1] - 45], WALL.z[0] - 1)} fill="color-mix(in oklab, var(--foreground) 32%, var(--card))" stroke={INK} strokeWidth={0.6} />
        </Hinged>
      </g>
    ),
  }
}

/* ── Высокие пеналы: колонна с двумя дверями, за ними полки с запасами ── */
export function pantryScene(): Built {
  const v = fillingView
  const { P } = v
  const lower: Range = [KB.PLINTH, 1100]
  const upper: Range = [1100, COL.y[1]]
  const cx = (COL.x[0] + COL.x[1]) / 2
  const shelf = (sy: number) => (
    <g key={sy}>
      <path d={v.top(COL_IN, sy, [0, COL.depth - 20])} fill={FACE} stroke={INK} strokeWidth={0.6} />
      <path d={v.front(COL_IN, [sy - 16, sy], 0)} fill={FACE} stroke={INK} strokeWidth={0.7} />
    </g>
  )
  return {
    view: v,
    extremes: columnExtremes(v, 900, 560),
    body: (uid) => (
      <g>
        <ColumnBody v={v} />
        <Niche v={v} uid={uid} y={colIn(lower)} fill={SHADE}>
          {shelf(560)}
          <Pot at={P(cx, colIn(lower)[0], 300)} />
          <Jar at={P(cx - 120, 560, 300)} w={110} h={200} />
          <Jar at={P(cx + 30, 560, 260)} w={90} h={150} />
          <Jar at={P(cx + 150, 560, 200)} w={80} h={180} />
        </Niche>
        <Niche v={v} uid={uid} y={colIn(upper)} fill={SHADE}>
          {shelf(1500)}
          {shelf(1820)}
          <Bottle at={P(cx - 150, colIn(upper)[0], 300)} h={260} />
          <Bottle at={P(cx - 60, colIn(upper)[0], 260)} h={230} />
          <Jar at={P(cx + 110, colIn(upper)[0], 240)} w={120} h={160} />
          <Jar at={P(cx - 110, 1500, 280)} w={90} h={140} />
          <Jar at={P(cx + 20, 1500, 250)} w={90} h={190} />
          <Jar at={P(cx + 140, 1500, 220)} w={80} h={120} />
          <Jar at={P(cx - 60, 1820, 260)} w={130} h={150} />
        </Niche>
        <Hinged v={v} turn={swingLeft(lower, 100)} d={0.3} t={1.0}>
          <ColumnDoor v={v} y={lower} handle="side" />
        </Hinged>
        <Hinged v={v} turn={swingLeft(upper, 100)} d={0.55} t={1.0}>
          <ColumnDoor v={v} y={upper} handle="side" />
        </Hinged>
        <BaseRun v={v} mods={[{ w: 450, fronts: [[KB.PLINTH, 460], [460, KB.TOP]] }, { w: 450, fronts: [[KB.PLINTH, KB.TOP]] }]} />
      </g>
    ),
  }
}

/** Схема без размеров и бирок — для маленьких карточек */
export const bare = (built: Built): Built => ({ ...built, dims: [], notes: [] })
