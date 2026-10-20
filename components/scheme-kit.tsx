'use client'

import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { enter, POP } from '@/components/scene-kit'
import {
  BRASS, FACE, FAINT, INK, INSIDE, SHADE, SHADE_DEEP,
  axonometry, fitTo, hull, line, path, type Pt, type Range,
} from '@/components/axo'
import './scheme-kit.css'

/**
 * Набор для схем в каркасе — как «Наполнение» на главной (filling-scene.tsx):
 * фрагмент кухни или шкафа в аксонометрии (components/axo.ts), на котором
 * механизм показывает, как работает, а потом прочерчивается размер.
 * Пользуются им схемы систем хранения (storage-scene.tsx) и схемы разделов
 * каталога (catalog-schemes.tsx, wardrobe-schemes.tsx).
 *
 * В покое всё стоит в конечном положении, анимация (scheme-kit.css) везёт
 * его из начального: при «уменьшить движение» схема сразу собрана. Корень
 * схемы — .hs из scene-kit (кривые) и .ss (рамки подписей).
 */

export type View = ReturnType<typeof axonometry>
export type V3 = [number, number, number]

export const BASKET = 'color-mix(in oklab, var(--primary) 12%, var(--card))'
export const GLASS = 'color-mix(in oklab, var(--primary) 7%, var(--card))'
export const GLASS_PANE = 'color-mix(in oklab, var(--primary) 22%, transparent)'
export const BIN = 'color-mix(in oklab, var(--foreground) 26%, var(--card))'
export const CLOTH = 'color-mix(in oklab, var(--primary) 18%, var(--card))'
export const DARK = 'color-mix(in oklab, var(--foreground) 55%, var(--card))'

/** Время сцены: на широком экране карточки ряда ждут очереди — --lag */
export const lagged = (d: number) => `calc(var(--lag, 0s) + ${d}s)`
export const at = (d: number, options?: Parameters<typeof enter>[1]) => ({ ...enter(d, options), '--d': lagged(d) }) as CSSProperties

/* ══════════════════════════════════════════════════════════════════════
   Движение
   ══════════════════════════════════════════════════════════════════════ */

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

/** Сдвиг на вектор в миллиметрах — CSS-сдвиг в единицах чертежа (проекция линейна, ноль в нуле) */
export function shift(v: View, d: V3) {
  const [x, y] = v.P(...d)
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`
}

/**
 * Плоская деталь, повёрнутая в пространстве, на чертеже — аффинный образ
 * самой себя: матрицу дают три точки её плоскости до и после поворота
 */
export function affine(v: View, frame: [V3, V3, V3], f: (p: V3) => V3) {
  const [a, b, c] = frame.map((p) => v.P(...p))
  const [a2, b2, c2] = frame.map((p) => v.P(...f(p)))
  const u = [b[0] - a[0], b[1] - a[1]]
  const w = [c[0] - a[0], c[1] - a[1]]
  const u2 = [b2[0] - a2[0], b2[1] - a2[1]]
  const w2 = [c2[0] - a2[0], c2[1] - a2[1]]
  const det = u[0] * w[1] - w[0] * u[1]
  const inv = [[w[1] / det, -w[0] / det], [-u[1] / det, u[0] / det]]
  const m11 = u2[0] * inv[0][0] + w2[0] * inv[1][0]
  const m12 = u2[0] * inv[0][1] + w2[0] * inv[1][1]
  const m21 = u2[1] * inv[0][0] + w2[1] * inv[1][0]
  const m22 = u2[1] * inv[0][1] + w2[1] * inv[1][1]
  const tx = a2[0] - (m11 * a[0] + m12 * a[1])
  const ty = a2[1] - (m21 * a[0] + m22 * a[1])
  return `matrix(${[m11, m21, m12, m22, tx, ty].map((n) => n.toFixed(4)).join(',')})`
}

export const smooth = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)

/** Одиннадцать положений хода (ss-path): s от 0 до 1, уже с плавностью */
export const keys = (fn: (s: number) => string, eased = true) => Array.from({ length: 11 }, (_, i) => fn(eased ? smooth(i / 10) : i / 10))

/** Два этапа подряд в одном ходе: первый до доли split, второй после, каждый со своей плавностью */
export const twoStage = (split: number) => (s: number): [number, number] =>
  s <= split ? [smooth(s / split), 0] : [1, smooth((s - split) / (1 - split))]

/** Поворот вокруг оси, параллельной x, через точку (y, z): угол в градусах, плюс — верх уходит к зрителю */
export function rotX(pivot: V3, deg: number) {
  const r = (deg * Math.PI) / 180
  return ([x, y, z]: V3): V3 => {
    const dy = y - pivot[1]
    const dz = z - pivot[2]
    return [x, pivot[1] + dy * Math.cos(r) + dz * Math.sin(r), pivot[2] - dy * Math.sin(r) + dz * Math.cos(r)]
  }
}

/** Поворот вокруг вертикали через точку (x, z): плюс — дальний конец уходит вправо */
export function rotY(pivot: V3, deg: number) {
  const r = (deg * Math.PI) / 180
  return ([x, y, z]: V3): V3 => {
    const dx = x - pivot[0]
    const dz = z - pivot[2]
    return [pivot[0] + dx * Math.cos(r) + dz * Math.sin(r), y, pivot[2] - dx * Math.sin(r) + dz * Math.cos(r)]
  }
}

/**
 * Ход по дуге на рычаге: рычаг длиной R от оси поворачивается с ψ0 до ψ1
 * (0° — вверх, 90° — к зрителю). Деталь на нём не наклоняется, а едет
 * параллельно себе — так работают лифты и пантографы
 */
export function arc(R: number, psi0: number, psi1: number) {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const vec = (psi: number): [number, number] => [R * Math.cos(rad(psi)), -R * Math.sin(rad(psi))]
  const [y0, z0] = vec(psi0)
  return {
    move: (s: number): V3 => {
      const [y, z] = vec(psi0 + (psi1 - psi0) * s)
      return [0, y - y0, z - z0]
    },
    angle: (s: number) => (psi1 - psi0) * s,
  }
}

/** Слой едет из from в to */
export function Move({ from = 'none', to, d, t = 1.1, ease, children }: { from?: string; to: string; d: number; t?: number; ease?: string; children: ReactNode }) {
  return (
    <g className="ss-move" style={{ '--from': from, '--to': to, '--d': lagged(d), '--t': `${t}s`, ...(ease ? { '--ease': ease } : {}) } as CSSProperties}>
      {children}
    </g>
  )
}

/**
 * Поворот плоской детали на петлях — дверцы, двери, доски, зеркала. Деталь
 * лежит в плоскости, натянутой на along (вдоль петель — это направление при
 * повороте не меняется) и across; origin — её угол на оси петель.
 * move(s) — куда деталь переносит ход s: поворот, при надобности со сдвигом.
 *
 * Почему не affine: промежуточные кадры между одиннадцатью матрицами браузер
 * считает, раскладывая матрицу на поворот, масштаб и сдвиг. Когда деталь
 * встаёт к зрителю ребром и дальше показывает изнанку, у матрицы меняется
 * знак, и между кадрами деталь проворачивалась и отлетала от петель. Здесь
 * та же матрица записана в осях самой детали: ось вдоль петель стоит,
 * поперечная сжимается до нуля и уходит в минус. Это scaleY и skewX
 * (и сдвиг, если петли едут), и браузер ведёт их линейно
 */
export type Turn = { origin: V3; along: V3; across: V3; move: (s: number) => (p: V3) => V3 }

const num = (n: number) => String(Math.abs(n) < 1e-9 ? 0 : +n.toFixed(8))

/**
 * Насколько тонкой может стать деталь, пока её рисуем. Ровно ребром её
 * не видно, а почти нулевой масштаб тормозит: линии постоянной толщины
 * (.ss-card) браузер строит через обратную матрицу, и она огромна — выбор
 * карточки замирал на секунду. Поэтому ход делится на отрезки, где деталь
 * не тоньше EDGE; между ними — кадр-другой, когда её нет
 */
const EDGE = 0.04

export function turnSteps(v: View, { origin, along, across, move }: Turn, eased = true) {
  const O = v.P(...origin)
  const rel = (p: V3, o: Pt = O): Pt => {
    const q = v.P(...p)
    return [q[0] - o[0], q[1] - o[1]]
  }
  const far = (p: V3, d: V3) => add(p, [d[0] * 1000, d[1] * 1000, d[2] * 1000])
  // Оси детали на чертеже: метр вдоль петель и метр поперёк
  const c1 = rel(far(origin, along))
  const c2 = rel(far(origin, across))
  const det = c1[0] * c2[1] - c2[0] * c1[1]
  const local = ([x, y]: Pt): Pt => [(c2[1] * x - c2[0] * y) / det, (c1[0] * y - c1[1] * x) / det]
  // Положение в долю времени u: сдвиг петель, сжатие поперёк (q) и перекос
  const at = (u: number) => {
    const f = move(eased ? smooth(u) : u)
    const o = f(origin)
    const [tx, ty] = local(rel(o))
    const [p, q] = local(rel(f(far(origin, across)), v.P(...o)))
    return { q, css: `translate(${num(tx)}px, ${num(ty)}px) scaleY(${num(q)}) skewX(${num((Math.atan(p) * 180) / Math.PI)}deg)` }
  }
  // Отрезки хода, где деталь не тоньше EDGE и не меняет сторону
  const N = 400
  const qs = Array.from({ length: N + 1 }, (_, i) => at(i / N).q)
  const spans: Array<[number, number]> = []
  let start: number | null = 0
  for (let i = 1; i <= N; i++) {
    const thin = Math.abs(qs[i]) < EDGE
    if (start !== null && (thin || Math.sign(qs[i]) !== Math.sign(qs[start]))) {
      if (i - 1 > start) spans.push([start / N, (i - 1) / N])
      start = null
    }
    if (start === null && !thin) start = i
  }
  if (start !== null && start < N) spans.push([start / N, 1])
  const [i1, i2, io] = [local([1, 0]), local([0, 1]), local(O)]
  return {
    outer: `matrix(${[c1[0], c1[1], c2[0], c2[1], O[0], O[1]].map(num).join(' ')})`,
    inner: `matrix(${[i1[0], i1[1], i2[0], i2[1], -io[0], -io[1]].map(num).join(' ')})`,
    spans: spans.map(([from, to]) => ({ from, to, steps: Array.from({ length: 11 }, (_, i) => at(from + ((to - from) * i) / 10).css) })),
  }
}

/**
 * Деталь на петлях: снаружи — оси детали, в них ход, внутри — обратно
 * в чертёж. Отрезок хода — своя копия детали: первая гаснет в конце своего
 * отрезка, следующие появляются в начале своего
 */
export function Hinged({ v, turn, d, t, eased = true, children }: { v: View; turn: Turn; d: number; t: number; eased?: boolean; children: ReactNode }) {
  const { outer, inner, spans } = turnSteps(v, turn, eased)
  return (
    <g transform={outer}>
      {spans.map((span, i) => {
        let part = (
          <Path steps={span.steps} d={d + t * span.from} t={Math.max(t * (span.to - span.from), 0.01)}>
            <g transform={inner}>{children}</g>
          </Path>
        )
        if (i < spans.length - 1) part = <g className="ss-hide" style={{ '--d': lagged(d + t * span.to) } as CSSProperties}>{part}</g>
        if (i > 0) part = <g className="hs-fade" style={{ '--d': lagged(d + t * span.from), '--t': '0.01s' } as CSSProperties}>{part}</g>
        return <Fragment key={span.from}>{part}</Fragment>
      })}
    </g>
  )
}

/** Слой проходит одиннадцать положений */
export function Path({ steps, d, t, children }: { steps: string[]; d: number; t: number; children: ReactNode }) {
  const style: Record<string, string> = { '--d': lagged(d), '--t': `${t}s` }
  steps.forEach((step, i) => (style[`--k${i}`] = step))
  return (
    <g className="ss-path" style={style as CSSProperties}>
      {children}
    </g>
  )
}

/** Область, которую проходит проём по пути движения: что вне её — закрыто корпусом */
export function swept(v: View, corners: V3[], moves: V3[]) {
  return path(hull(moves.flatMap((m) => corners.map((c) => v.P(...add(c, m))))))
}

/* ══════════════════════════════════════════════════════════════════════
   Детали
   ══════════════════════════════════════════════════════════════════════ */

/** Брус или плита: правый бок, верх и лицо */
export function Block({ v, x, y, z, fill = FACE, top = SHADE, side = SHADE_DEEP, stroke = INK, sw = 0.8 }: {
  v: View; x: Range; y: Range; z: Range; fill?: string; top?: string; side?: string; stroke?: string; sw?: number
}) {
  return (
    <g stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <path d={v.side(x[1], y, z)} fill={side} />
      <path d={v.top(x, y[1], z)} fill={top} />
      <path d={v.front(x, y, z[0])} fill={fill} />
    </g>
  )
}

/** Деталь опускается на место сверху и проявляется: модуль встаёт в ряд */
export function Drop({ v, d, h = 450, t = 0.7, children }: { v: View; d: number; h?: number; t?: number; children: ReactNode }) {
  return (
    <Move from={shift(v, [0, h, 0])} to="none" d={d} t={t} ease="var(--spring)">
      <g className="hs-fade" style={{ '--d': lagged(d), '--t': '0.3s' } as CSSProperties}>{children}</g>
    </Move>
  )
}

/** Окружность в горизонтальной плоскости y: конфорка, поддон, тарелка СВЧ */
export function ring(v: View, cx: number, y: number, cz: number, r: number) {
  return path(Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2
    return v.P(cx + r * Math.cos(a), y, cz + r * Math.sin(a))
  }))
}

/** Знак вопроса — вариант «пока не знаю»: выскакивает с пружинкой; size — в единицах чертежа */
export function Question({ p, size, d }: { p: Pt; size: number; d: number }) {
  return (
    <text
      className="hs-in"
      style={{ ...at(d, POP), fontFamily: 'var(--font-roboto), sans-serif' }}
      x={p[0].toFixed(1)}
      y={p[1].toFixed(1)}
      fontSize={size}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
      fill={BRASS}
    >
      ?
    </text>
  )
}

/** Фигура в плоскости y–z (поперёк x): точки [dz, dy] от опорной */
export function profile(v: View, x: number, y: number, z: number, pts: Array<[number, number]>) {
  return path(pts.map(([dz, dy]) => v.P(x, y + dy, z + dz)))
}

/** Фасад, который едет вместе с модулем: торец и лицо, ручка — латунью по верху */
export function Face({ v, x, y, handle = 'top' }: { v: View; x: Range; y: Range; handle?: 'top' | 'none' }) {
  return (
    <g>
      <path d={v.side(x[1], y, [0, 18])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={v.front(x, y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
      {handle === 'top' && (
        <path d={line([v.P(x[0] + 30, y[1] - 40, 0), v.P(x[1] - 30, y[1] - 40, 0)])} stroke={BRASS} strokeWidth={2} strokeLinecap="round" />
      )}
    </g>
  )
}

/** Корзина: дно с содержимым и бортик; x — пролёт, z — глубина */
export function Tier({ v, x, y, z, rim = 60, children }: { v: View; x: Range; y: number; z: Range; rim?: number; children?: ReactNode }) {
  return (
    <g>
      <path d={v.top(x, y, z)} fill={BASKET} stroke={BRASS} strokeWidth={1.2} strokeLinejoin="round" />
      {children}
      <path d={v.top(x, y + rim, z)} fill="none" stroke={BRASS} strokeWidth={0.9} strokeLinejoin="round" />
    </g>
  )
}

/** Стойки рамы: задние до корзин, передняя правая — после, поверх содержимого */
export function Posts({ v, x, y, z }: { v: View; x: number[]; y: Range; z: number }) {
  return (
    <g>
      {x.map((xx) => (
        <path key={xx} d={line([v.P(xx, y[0], z), v.P(xx, y[1], z)])} stroke={BRASS} strokeWidth={1.4} />
      ))}
    </g>
  )
}

/** Грань с обрезанным верхом: заливка целиком, линия — без верхнего ребра, обрыв — пунктиром */
export function Cut({ pts }: { pts: Pt[] }) {
  // Точки: низ-лево, низ-право, верх-право, верх-лево
  const [bl, br, tr, tl] = pts
  return (
    <g>
      <path d={path(pts)} fill="inherit" stroke="none" />
      <path d={line([tl, bl, br, tr])} fill="none" stroke={INK} strokeWidth={1} strokeLinejoin="round" />
      <path d={line([tr, tl])} fill="none" stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />
    </g>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Кухня: нижние модули со столешницей
   ══════════════════════════════════════════════════════════════════════ */

export const KB = { PLINTH: 100, TOP: 820, COUNTER: 38, OVERHANG: 25, DEPTH: 560, COUNTER_DEPTH: 600, SET: 50, GAP: 3 }

/** Модуль: глухие фасады по высотам, проём (там, что выезжает), глухая часть угла, мойка */
export type Mod = { w: number; fronts?: Range[]; open?: Range; blind?: boolean; sink?: boolean }

export const spans = (mods: Mod[]): Range[] => {
  let x = 0
  return mods.map((m) => {
    const r: Range = [x, x + m.w]
    x += m.w
    return r
  })
}

/** Проём модуля: x и y с зазором */
export const gap = (r: Range): Range => [r[0] + KB.GAP / 2, r[1] - KB.GAP / 2]

/** Нижние модули: цоколь, бок, фасады и проёмы; выдвижное — в children, потом столешница */
export function BaseRun({ v, mods, children }: { v: View; mods: Mod[]; children?: ReactNode }) {
  const xs = spans(mods)
  const W = xs.at(-1)![1]
  const { P, front, top, side } = v
  const { PLINTH, TOP, COUNTER, OVERHANG, DEPTH, COUNTER_DEPTH, SET } = KB
  return (
    <g>
      <path d={line([P(-160, 0, 0), P(W + 220, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />
      <path d={front([0, W], [0, PLINTH], SET)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={side(W, [0, PLINTH], [SET, DEPTH])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={side(W, [PLINTH, TOP], [0, DEPTH])} fill={SHADE} stroke={INK} strokeWidth={1} />
      {mods.map((m, i) => {
        const [x0, x1] = xs[i]
        return (
          <g key={i}>
            {m.open && <path d={front(gap(xs[i]), gap(m.open), 0)} fill={INSIDE} stroke={INK} strokeWidth={1} />}
            {(m.fronts ?? []).map((f) => (
              <g key={f[0]}>
                <path d={front(gap(xs[i]), gap(f), 0)} fill={FACE} stroke={INK} strokeWidth={1} />
                {!m.blind && (
                  <path d={line([P(x0 + 40, f[1] - 40, 0), P(Math.min(x1 - 40, x0 + 200), f[1] - 40, 0)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
                )}
              </g>
            ))}
          </g>
        )
      })}
      {children}
      <path d={top([0, W], TOP + COUNTER, [-OVERHANG, COUNTER_DEPTH])} fill={SHADE} stroke={INK} strokeWidth={1} />
      <path d={side(W, [TOP, TOP + COUNTER], [-OVERHANG, COUNTER_DEPTH])} fill={SHADE_DEEP} stroke={INK} strokeWidth={1} />
      <path d={front([0, W], [TOP, TOP + COUNTER], -OVERHANG)} fill={FACE} stroke={INK} strokeWidth={1} />
      {mods.map((m, i) => {
        if (!m.sink) return null
        const [x0, x1] = xs[i]
        const mid = (x0 + x1) / 2
        return (
          <g key={`sink-${i}`}>
            <path d={top([x0 + 130, x1 - 130], TOP + COUNTER, [60, 460])} fill={SHADE_DEEP} stroke={INK} strokeWidth={1} />
            <path
              d={line([P(mid, TOP + COUNTER, 540), P(mid, TOP + COUNTER + 260, 540), P(mid, TOP + COUNTER + 260, 380)])}
              fill="none"
              stroke={INK}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      })}
    </g>
  )
}

/** Крайние точки нижних модулей — по ним чертёж вписывается в кадр */
export function baseExtremes(v: View, W: number, sink = false): Pt[] {
  const { P } = v
  const { TOP, COUNTER, OVERHANG, COUNTER_DEPTH, SET, DEPTH } = KB
  return [
    P(0, 0, SET), P(W, 0, SET), P(W, 0, DEPTH), P(0, TOP + COUNTER, COUNTER_DEPTH), P(W, TOP + COUNTER, -OVERHANG), P(W, TOP + COUNTER, COUNTER_DEPTH), P(0, TOP + COUNTER, -OVERHANG),
    ...(sink ? [P(0, TOP + COUNTER + 300, 540)] : []),
  ]
}


/* ══════════════════════════════════════════════════════════════════════
   Схема целиком
   ══════════════════════════════════════════════════════════════════════ */

/** Размер: концы линии, откуда выноски (сдвиг от концов), число, момент, подпись над линией */
export type Dim = { a: V3; b: V3; ext?: V3; label: string; d: number; above?: boolean }
/** Бирка в точке чертежа */
export type Note = { at: V3; text: string; d: number }
/** Схема: проекция, крайние точки для вписывания, рисунок, размеры и бирки */
export type Built = { view: View; extremes: Pt[]; body: (uid: string) => ReactNode; dims?: Dim[]; notes?: Note[] }

/* ══════════════════════════════════════════════════════════════════════
   Шкаф
   ══════════════════════════════════════════════════════════════════════ */

export const WB = { D: 580, T: 16, FLOOR: 7 }

/**
 * Секция шкафа: боковины, задняя стенка и дно изнутри, кромки спереди.
 * topY — где секция обрывается (низ шкафа без верха) или крыша (full)
 */
export function Section({ v, inner, topY, full = false, uid, inside, children }: {
  v: View; inner: Range; topY: number; full?: boolean; uid: string; inside?: ReactNode; children?: ReactNode
}) {
  const { P, front, top, side } = v
  const { D, T, FLOOR } = WB
  const XL = inner[0] - T
  const XR = inner[1] + T
  const yIn: Range = [FLOOR + T, full ? topY - T : topY]
  const corners = (x0: number, x1: number, z: number): Pt[] => [P(x0, FLOOR, z), P(x1, FLOOR, z), P(x1, topY, z), P(x0, topY, z)]
  return (
    <g>
      <path d={line([P(XL - 200, 0, 0), P(XR + 260, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />
      {/* Правая боковина снаружи */}
      {full ? (
        <>
          <path d={side(XR, [FLOOR, topY], [0, D])} fill={SHADE} stroke={INK} strokeWidth={1} />
          <path d={top([XL, XR], topY, [0, D])} fill={SHADE} stroke={INK} strokeWidth={1} />
        </>
      ) : (
        <g fill={SHADE}>
          <Cut pts={[P(XR, FLOOR, 0), P(XR, FLOOR, D), P(XR, topY, D), P(XR, topY, 0)]} />
        </g>
      )}
      {/* Изнутри: задняя стенка, левая боковина, дно */}
      <defs>
        <clipPath id={`${uid}-in`}><path d={front(inner, yIn, 0)} /></clipPath>
      </defs>
      <g clipPath={`url(#${uid}-in)`}>
        <path d={front(inner, [FLOOR, topY + 200], D - 10)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
        <path d={side(inner[0], [FLOOR, topY + 200], [0, D - 10])} fill={SHADE} stroke={INK} strokeWidth={0.8} />
        <path d={top(inner, yIn[0], [0, D - 10])} fill={SHADE} stroke={INK} strokeWidth={0.8} />
        {inside}
      </g>
      {/* Кромки: боковины, дно, крыша */}
      {full ? (
        <>
          <path d={front([XL, inner[0]], [FLOOR, topY], 0)} fill={FACE} stroke={INK} strokeWidth={1} />
          <path d={front([inner[1], XR], [FLOOR, topY], 0)} fill={FACE} stroke={INK} strokeWidth={1} />
          <path d={front(inner, [topY - T, topY], 0)} fill={FACE} stroke={INK} strokeWidth={1} />
        </>
      ) : (
        <g fill={FACE}>
          <Cut pts={corners(XL, inner[0], 0)} />
          <Cut pts={corners(inner[1], XR, 0)} />
        </g>
      )}
      <path d={front(inner, [FLOOR, FLOOR + T], 0)} fill={FACE} stroke={INK} strokeWidth={1} />
      {children}
    </g>
  )
}

/** Крайние точки секции */
export function sectionExtremes(v: View, inner: Range, topY: number): Pt[] {
  const { P } = v
  const XL = inner[0] - WB.T
  const XR = inner[1] + WB.T
  return [P(XL, 0, 0), P(XR, 0, 0), P(XR, 0, WB.D), P(XL, topY, 0), P(XR, topY, WB.D)]
}


/* ══════════════════════════════════════════════════════════════════════
   Чертёж
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Метки чертежа в единицах кадра: половина засечки и кегль числа. По
 * умолчанию засечка — 5 единиц чертежа: в больших схемах масштаб около
 * единицы. В маленьких карточках квиза чертёж ужат в разы, и засечки
 * задаются в единицах кадра, иначе они пропадают
 */
export type Marks = { tick: number; label: number }

/** Размер: выноски, линия от середины в обе стороны, засечки, число вдоль линии */
export function DimLine({ v, dim, fit, marks }: { v: View; dim: Dim; fit: number; marks?: Marks }) {
  const a = v.P(...dim.a)
  const b = v.P(...dim.b)
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
  const upright = angle > 90 || angle < -90 ? angle + 180 : angle
  const ext = dim.ext ?? [0, 0, 0]
  const size = (marks?.label ?? 13) / fit
  const tick = marks ? marks.tick / fit : 5
  return (
    <g>
      {dim.ext && (
        <g className="hs-in" style={at(dim.d, { t: 0.4, from: 'translateY(-4px)', ease: 'var(--out)' })}>
          {[dim.a, dim.b].map((p) => (
            <path key={p.join()} d={line([v.P(...add(p, ext)), v.P(...p)])} stroke={BRASS} strokeWidth={0.8} />
          ))}
        </g>
      )}
      {[a, b].map((end) => (
        <path key={end.join()} className="ss-line" pathLength={1} d={line([mid, end])} stroke={BRASS} strokeWidth={1.2} fill="none" style={{ '--d': lagged(dim.d + 0.1) } as CSSProperties} />
      ))}
      <g className="hs-in" style={at(dim.d + 0.55, { t: 0.4, from: 'scale(0.4)', ease: 'var(--pop)' })}>
        {[a, b].map(([x, y]) => (
          <path key={x} d={`M${(x - tick).toFixed(1)},${(y + tick).toFixed(1)}L${(x + tick).toFixed(1)},${(y - tick).toFixed(1)}`} stroke={BRASS} strokeWidth={1.4} />
        ))}
      </g>
      <g transform={`translate(${mid[0].toFixed(1)} ${mid[1].toFixed(1)}) rotate(${upright.toFixed(1)})`}>
        <text
          className="hs-in"
          style={{ ...at(dim.d + 0.6, POP), fontFamily: 'var(--font-roboto), sans-serif' }}
          y={((dim.above ? -1 : 1) * size * 1.25).toFixed(1)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size.toFixed(1)}
          fontWeight={600}
          fill="var(--foreground)"
        >
          {dim.label}
        </text>
      </g>
    </g>
  )
}

/**
 * Схема в кадре view: вписана по крайним точкам и концам размеров (с
 * запасом под подписи); сверху место под номер и кнопки. Бирки — HTML
 * поверх, в процентах кадра
 */
export function SchemeSvg({ built, id, view, pad = { x: 18, top: 50, bottom: 16 }, marks }: {
  built: Built
  id: string
  view: { w: number; h: number }
  pad?: { x: number; top: number; bottom: number }
  marks?: Marks
}) {
  const v = built.view
  const dims = built.dims ?? []
  const extremes = [
    ...built.extremes,
    ...dims.flatMap((dim) => [dim.a, dim.b].flatMap((p) => [v.P(...p), v.P(...add(p, [0, -150, 0])), v.P(...add(p, [-150, 0, 0]))])),
  ]
  const { fit, tx, ty } = fitTo(extremes, view, pad)
  const uid = `ss-${id}`
  return (
    <>
      <svg viewBox={`0 0 ${view.w} ${view.h}`} className="absolute inset-0 size-full" aria-hidden="true">
        <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${fit.toFixed(3)})`}>
          {built.body(uid)}
          {dims.map((dim) => <DimLine key={dim.label + dim.a.join()} v={v} dim={dim} fit={fit} marks={marks} />)}
        </g>
      </svg>
      {(built.notes ?? []).map((note) => {
        const [x, y] = v.P(...note.at)
        return (
          <span
            key={note.text}
            className="hs-in pointer-events-none absolute"
            style={{ left: `${((x * fit + tx) / view.w) * 100}%`, top: `${((y * fit + ty) / view.h) * 100}%`, ...at(note.d, POP) }}
          >
            <span className="plan-tag plan-tag--dot -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
              <span className="plan-tag__value">{note.text}</span>
            </span>
          </span>
        )
      })}
    </>
  )
}
