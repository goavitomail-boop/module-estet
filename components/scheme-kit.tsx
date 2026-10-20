'use client'

import type { CSSProperties, ReactNode } from 'react'
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
export function Block({ v, x, y, z, fill = FACE, stroke = INK, sw = 0.8 }: { v: View; x: Range; y: Range; z: Range; fill?: string; stroke?: string; sw?: number }) {
  return (
    <g stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <path d={v.side(x[1], y, z)} fill={SHADE_DEEP} />
      <path d={v.top(x, y[1], z)} fill={SHADE} />
      <path d={v.front(x, y, z[0])} fill={fill} />
    </g>
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

/** Размер: выноски, линия от середины в обе стороны, засечки, число вдоль линии */
export function DimLine({ v, dim, fit }: { v: View; dim: Dim; fit: number }) {
  const a = v.P(...dim.a)
  const b = v.P(...dim.b)
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
  const upright = angle > 90 || angle < -90 ? angle + 180 : angle
  const ext = dim.ext ?? [0, 0, 0]
  const size = 13 / fit
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
          <path key={x} d={`M${(x - 5).toFixed(1)},${(y + 5).toFixed(1)}L${(x + 5).toFixed(1)},${(y - 5).toFixed(1)}`} stroke={BRASS} strokeWidth={1.4} />
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
export function SchemeSvg({ built, id, view, pad = { x: 18, top: 50, bottom: 16 } }: {
  built: Built
  id: string
  view: { w: number; h: number }
  pad?: { x: number; top: number; bottom: number }
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
          {dims.map((dim) => <DimLine key={dim.label + dim.a.join()} v={v} dim={dim} fit={fit} />)}
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
