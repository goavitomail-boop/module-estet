'use client'

import type { CSSProperties, ReactNode } from 'react'
import { enter, POP } from '@/components/scene-kit'
import {
  BRASS, FACE, FAINT, INK, INSIDE, SHADE, SHADE_DEEP,
  axonometry, fillingView, fitTo, hull, line, path, shape, wardrobeView, type Pt, type Range,
} from '@/components/axo'
import { Bottle, Jar, Pot } from '@/components/filling-scene'
import './storage-scene.css'

/**
 * Системы хранения на чертеже — как «Наполнение» на главной
 * (filling-scene.tsx): фрагмент кухни или шкафа в аксонометрии, и механизм
 * показывает, как работает. Бутылочница, сушка, колонна и утилизация
 * выезжают; волшебный уголок выдвигает передние корзины и перегоняет задние
 * из глухой части угла; корзина в верхнем модуле и пантограф опускаются по
 * дуге на рычагах; зеркало выдвигается и поворачивается; гладильная доска
 * выезжает и раскладывается. Потом прочерчивается размер.
 *
 * Размеры и подписи — из каталога поставщика (kitchenStorage
 * в lib/pdf-catalog-data.ts, wardrobeStorage в lib/wardrobes-data.ts);
 * рисунок — схема, а не замер. Проекция и грани — components/axo.ts:
 * миллиметры, x вдоль фасадов, y вверх, z вглубь, к зрителю — минус.
 *
 * В покое всё стоит в конечном положении, анимация (storage-scene.css)
 * везёт его из начального: при «уменьшить движение» схема сразу собрана.
 */

type View = ReturnType<typeof axonometry>
type V3 = [number, number, number]

const VIEW = { w: 400, h: 340 }

const BASKET = 'color-mix(in oklab, var(--primary) 12%, var(--card))'
const GLASS = 'color-mix(in oklab, var(--primary) 7%, var(--card))'
const GLASS_PANE = 'color-mix(in oklab, var(--primary) 22%, transparent)'
const BIN = 'color-mix(in oklab, var(--foreground) 26%, var(--card))'
const CLOTH = 'color-mix(in oklab, var(--primary) 18%, var(--card))'
const DARK = 'color-mix(in oklab, var(--foreground) 55%, var(--card))'

/** Время сцены: на широком экране карточки ряда ждут очереди — --lag */
const lagged = (d: number) => `calc(var(--lag, 0s) + ${d}s)`
const at = (d: number, options?: Parameters<typeof enter>[1]) => ({ ...enter(d, options), '--d': lagged(d) }) as CSSProperties

/* ══════════════════════════════════════════════════════════════════════
   Движение
   ══════════════════════════════════════════════════════════════════════ */

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

/** Сдвиг на вектор в миллиметрах — CSS-сдвиг в единицах чертежа (проекция линейна, ноль в нуле) */
function shift(v: View, d: V3) {
  const [x, y] = v.P(...d)
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`
}

/**
 * Плоская деталь, повёрнутая в пространстве, на чертеже — аффинный образ
 * самой себя: матрицу дают три точки её плоскости до и после поворота
 */
function affine(v: View, frame: [V3, V3, V3], f: (p: V3) => V3) {
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

const smooth = (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2)

/** Одиннадцать положений хода (ss-path): s от 0 до 1, уже с плавностью */
const keys = (fn: (s: number) => string, eased = true) => Array.from({ length: 11 }, (_, i) => fn(eased ? smooth(i / 10) : i / 10))

/** Два этапа подряд в одном ходе: первый до доли split, второй после, каждый со своей плавностью */
const twoStage = (split: number) => (s: number): [number, number] =>
  s <= split ? [smooth(s / split), 0] : [1, smooth((s - split) / (1 - split))]

/** Поворот вокруг оси, параллельной x, через точку (y, z): угол в градусах, плюс — верх уходит к зрителю */
function rotX(pivot: V3, deg: number) {
  const r = (deg * Math.PI) / 180
  return ([x, y, z]: V3): V3 => {
    const dy = y - pivot[1]
    const dz = z - pivot[2]
    return [x, pivot[1] + dy * Math.cos(r) + dz * Math.sin(r), pivot[2] - dy * Math.sin(r) + dz * Math.cos(r)]
  }
}

/** Поворот вокруг вертикали через точку (x, z): плюс — дальний конец уходит вправо */
function rotY(pivot: V3, deg: number) {
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
function arc(R: number, psi0: number, psi1: number) {
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
function Move({ from = 'none', to, d, t = 1.1, children }: { from?: string; to: string; d: number; t?: number; children: ReactNode }) {
  return (
    <g className="ss-move" style={{ '--from': from, '--to': to, '--d': lagged(d), '--t': `${t}s` } as CSSProperties}>
      {children}
    </g>
  )
}

/** Слой проходит одиннадцать положений */
function Path({ steps, d, t, children }: { steps: string[]; d: number; t: number; children: ReactNode }) {
  const style: Record<string, string> = { '--d': lagged(d), '--t': `${t}s` }
  steps.forEach((step, i) => (style[`--k${i}`] = step))
  return (
    <g className="ss-path" style={style as CSSProperties}>
      {children}
    </g>
  )
}

/** Область, которую проходит проём по пути движения: что вне её — закрыто корпусом */
function swept(v: View, corners: V3[], moves: V3[]) {
  return path(hull(moves.flatMap((m) => corners.map((c) => v.P(...add(c, m))))))
}

/* ══════════════════════════════════════════════════════════════════════
   Детали
   ══════════════════════════════════════════════════════════════════════ */

/** Брус или плита: правый бок, верх и лицо */
function Block({ v, x, y, z, fill = FACE, stroke = INK, sw = 0.8 }: { v: View; x: Range; y: Range; z: Range; fill?: string; stroke?: string; sw?: number }) {
  return (
    <g stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <path d={v.side(x[1], y, z)} fill={SHADE_DEEP} />
      <path d={v.top(x, y[1], z)} fill={SHADE} />
      <path d={v.front(x, y, z[0])} fill={fill} />
    </g>
  )
}

/** Тарелка на ребре, плоскостью поперёк x: круг в плоскости y–z */
function Plate({ v, x, y, z, r }: { v: View; x: number; y: number; z: number; r: number }) {
  const ring = (k: number) => path(Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2
    return v.P(x, y + r * k * Math.sin(a), z + r * k * Math.cos(a))
  }))
  return (
    <g>
      <path d={ring(1)} fill={FACE} stroke={INK} strokeWidth={0.7} />
      <path d={ring(0.62)} fill="none" stroke={FAINT} strokeWidth={0.6} />
    </g>
  )
}

/** Стопка мисок — силуэтом без перекоса */
function Bowls({ at: base, n = 3 }: { at: Pt; n?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={shape(base, [[-62, i * 34], [-90, i * 34 + 60], [90, i * 34 + 60], [62, i * 34]])} fill={FACE} stroke={INK} strokeWidth={0.8} strokeLinejoin="round" />
      ))}
    </g>
  )
}

/** Фигура в плоскости y–z (поперёк x): точки [dz, dy] от опорной */
function profile(v: View, x: number, y: number, z: number, pts: Array<[number, number]>) {
  return path(pts.map(([dz, dy]) => v.P(x, y + dy, z + dz)))
}

/** Фасад, который едет вместе с модулем: торец и лицо, ручка — латунью по верху */
function Face({ v, x, y, handle = 'top' }: { v: View; x: Range; y: Range; handle?: 'top' | 'none' }) {
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
function Tier({ v, x, y, z, rim = 60, children }: { v: View; x: Range; y: number; z: Range; rim?: number; children?: ReactNode }) {
  return (
    <g>
      <path d={v.top(x, y, z)} fill={BASKET} stroke={BRASS} strokeWidth={1.2} strokeLinejoin="round" />
      {children}
      <path d={v.top(x, y + rim, z)} fill="none" stroke={BRASS} strokeWidth={0.9} strokeLinejoin="round" />
    </g>
  )
}

/** Стойки рамы: задние до корзин, передняя правая — после, поверх содержимого */
function Posts({ v, x, y, z }: { v: View; x: number[]; y: Range; z: number }) {
  return (
    <g>
      {x.map((xx) => (
        <path key={xx} d={line([v.P(xx, y[0], z), v.P(xx, y[1], z)])} stroke={BRASS} strokeWidth={1.4} />
      ))}
    </g>
  )
}

/** Грань с обрезанным верхом: заливка целиком, линия — без верхнего ребра, обрыв — пунктиром */
function Cut({ pts }: { pts: Pt[] }) {
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

const KB = { PLINTH: 100, TOP: 820, COUNTER: 38, OVERHANG: 25, DEPTH: 560, COUNTER_DEPTH: 600, SET: 50, GAP: 3 }

/** Модуль: глухие фасады по высотам, проём (там, что выезжает), глухая часть угла, мойка */
type Mod = { w: number; fronts?: Range[]; open?: Range; blind?: boolean; sink?: boolean }

const spans = (mods: Mod[]): Range[] => {
  let x = 0
  return mods.map((m) => {
    const r: Range = [x, x + m.w]
    x += m.w
    return r
  })
}

/** Проём модуля: x и y с зазором */
const gap = (r: Range): Range => [r[0] + KB.GAP / 2, r[1] - KB.GAP / 2]

/** Нижние модули: цоколь, бок, фасады и проёмы; выдвижное — в children, потом столешница */
function BaseRun({ v, mods, children }: { v: View; mods: Mod[]; children?: ReactNode }) {
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
function baseExtremes(v: View, W: number, sink = false): Pt[] {
  const { P } = v
  const { TOP, COUNTER, OVERHANG, COUNTER_DEPTH, SET, DEPTH } = KB
  return [
    P(0, 0, SET), P(W, 0, SET), P(W, 0, DEPTH), P(0, TOP + COUNTER, COUNTER_DEPTH), P(W, TOP + COUNTER, -OVERHANG), P(W, TOP + COUNTER, COUNTER_DEPTH), P(0, TOP + COUNTER, -OVERHANG),
    ...(sink ? [P(0, TOP + COUNTER + 300, 540)] : []),
  ]
}

/* ══════════════════════════════════════════════════════════════════════
   Сцены
   ══════════════════════════════════════════════════════════════════════ */

type Dim = { a: V3; b: V3; ext?: V3; label: string; d: number; above?: boolean }
type Note = { at: V3; text: string; d: number }
type Built = { view: View; extremes: Pt[]; body: (uid: string) => ReactNode; dim?: Dim; note?: Note }

/* ── Бутылочница 6033: фасад 150 мм ── */
function bottleScene(): Built {
  const v = fillingView
  const mods: Mod[] = [
    { w: 400, fronts: [[KB.PLINTH, 460], [460, KB.TOP]] },
    { w: 150, open: [KB.PLINTH, KB.TOP] },
    { w: 300, fronts: [[KB.PLINTH, KB.TOP]] },
  ]
  const x = gap([400, 550])
  const y = gap([KB.PLINTH, KB.TOP])
  const travel = 420
  const z: Range = [24, 450]
  const tiers = [
    { y: 170, items: [[70, 250], [170, 220], [270, 270], [370, 230]] },
    { y: 480, items: [[80, 200], [190, 240], [300, 190], [400, 220]] },
  ]
  const cx = (x[0] + x[1]) / 2
  return {
    view: v,
    extremes: [...baseExtremes(v, 850), v.P(x[0], y[1], -travel), v.P(x[0], -160, -travel), v.P(x[1], -160, -travel)],
    body: (uid) => (
      <BaseRun v={v} mods={mods}>
        <defs>
          <clipPath id={`${uid}-out`}><path d={v.sweptOpening(x, y, 0, travel)} /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-out)`}>
          <Move to={shift(v, [0, 0, -travel])} d={0.35} t={1.2}>
            <Posts v={v} x={[x[0] + 14, x[1] - 14]} y={[170, 540]} z={z[1]} />
            {tiers.map((tier) => (
              <Tier key={tier.y} v={v} x={[x[0] + 14, x[1] - 14]} y={tier.y} z={z}>
                {[...tier.items].reverse().map(([zz, h]) => <Bottle key={zz} at={v.P(cx, tier.y, zz)} h={h} />)}
              </Tier>
            ))}
            <Posts v={v} x={[x[1] - 14]} y={[170, 540]} z={z[0]} />
            <Face v={v} x={x} y={y} />
          </Move>
        </g>
      </BaseRun>
    ),
    dim: { a: [x[0], y[0] - 110, -travel], b: [x[1], y[0] - 110, -travel], ext: [0, 90, 0], label: '150 мм', d: 1.45 },
  }
}

/* ── Корзина-сушка 4646: фасад 600–900 мм, тарелки на ребре ── */
function dryerScene(): Built {
  const v = fillingView
  const mods: Mod[] = [
    { w: 600, open: [KB.PLINTH, 440], fronts: [[440, KB.TOP]] },
    { w: 400, fronts: [[KB.PLINTH, 460], [460, KB.TOP]] },
  ]
  const x = gap([0, 600])
  const y = gap([KB.PLINTH, 440])
  const travel = 400
  const z: Range = [24, 440]
  const floor = 150
  return {
    view: v,
    extremes: [...baseExtremes(v, 1000), v.P(x[0], y[1], -travel), v.P(x[0], -160, -travel), v.P(x[1], -160, -travel)],
    body: (uid) => (
      <BaseRun v={v} mods={mods}>
        <defs>
          <clipPath id={`${uid}-out`}><path d={v.sweptOpening(x, y, 0, travel)} /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-out)`}>
          <Move to={shift(v, [0, 0, -travel])} d={0.35} t={1.2}>
            <Tier v={v} x={[x[0] + 20, x[1] - 20]} y={floor} z={z} rim={150}>
              <Bowls at={v.P(470, floor, 360)} />
              {Array.from({ length: 8 }, (_, i) => (
                <Plate key={i} v={v} x={70 + i * 34} y={floor + 112} z={230} r={105} />
              ))}
              <Bowls at={v.P(470, floor, 130)} n={2} />
            </Tier>
            <Face v={v} x={x} y={y} />
          </Move>
        </g>
      </BaseRun>
    ),
    dim: { a: [x[0], y[0] - 110, -travel], b: [x[1], y[0] - 110, -travel], ext: [0, 90, 0], label: '600–900 мм', d: 1.45 },
  }
}

/* ── Волшебный уголок 6022: дверь открывается, передние корзины выезжают, задние — из глухого угла в проём ── */
function cornerScene(): Built {
  const v = fillingView
  const { P } = v
  const mods: Mod[] = [
    { w: 450, open: [KB.PLINTH, KB.TOP] },
    { w: 450, fronts: [[KB.PLINTH, KB.TOP]], blind: true },
    { w: 300, fronts: [[KB.PLINTH, 460], [460, KB.TOP]] },
  ]
  const x = gap([0, 450])
  const y = gap([KB.PLINTH, KB.TOP])
  const travel = 380
  const tierY = [200, 500]
  // Дверь на левых петлях: поворачивается к зрителю на 95°
  const door = keys((s) => affine(v, [[0, 100, 0], [1000, 100, 0], [0, 1100, 0]], rotY([0, 0, 0], 95 * s)))
  const doorFace = (
    <g>
      <path d={v.front(x, y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
      <path d={line([P(x[1] - 40, 560, 0), P(x[1] - 40, 760, 0)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  )
  const basket = (bx: Range, bz: Range, ty: number, kind: 'front' | 'rear') => (
    <Tier key={ty} v={v} x={bx} y={ty} z={bz} rim={80}>
      {kind === 'front' ? (
        <>
          <Bottle at={P(bx[0] + 90, ty, bz[0] + 190)} h={230} />
          <Bottle at={P(bx[0] + 200, ty, bz[0] + 190)} h={190} />
          <Jar at={P(bx[0] + 330, ty, bz[0] + 120)} h={140} />
          <Bottle at={P(bx[0] + 120, ty, bz[0] + 60)} h={210} />
        </>
      ) : (
        <>
          <Jar at={P(bx[0] + 90, ty, bz[0] + 300)} h={130} />
          <Pot at={P(bx[0] + 230, ty, bz[0] + 200)} />
          <Jar at={P(bx[0] + 350, ty, bz[0] + 80)} h={100} />
        </>
      )}
    </Tier>
  )
  return {
    view: v,
    extremes: [...baseExtremes(v, 1200), P(0, y[1], -460), P(0, y[0], -460), P(x[0], y[0] - 40, -travel)],
    body: (uid) => (
      <BaseRun v={v} mods={mods}>
        <defs>
          <clipPath id={`${uid}-out`}><path d={v.sweptOpening(x, y, 0, 420)} /></clipPath>
        </defs>
        {/* Открытая дверь стоит левее корзин и ими закрыта; пока она закрыта —
            наоборот. Поэтому дверь нарисована дважды: верхняя копия гаснет,
            как только дверь открылась */}
        <Path steps={door} d={0.3} t={0.8}>{doorFace}</Path>
        <g clipPath={`url(#${uid}-out)`}>
          {/* Задние корзины: стоят в глухой части, потом переезжают в проём */}
          <Move to={shift(v, [-450, 0, -60])} d={1.95} t={1.1}>
            {tierY.map((ty) => basket([470, 880], [90, 500], ty, 'rear'))}
          </Move>
          {/* Передние — выезжают к зрителю */}
          <Move to={shift(v, [0, 0, -travel])} d={1.0} t={1.0}>
            <Posts v={v} x={[34, 416]} y={[tierY[0], tierY[1] + 80]} z={300} />
            {tierY.map((ty) => basket([20, 430], [30, 300], ty, 'front'))}
            <Posts v={v} x={[416]} y={[tierY[0], tierY[1] + 80]} z={30} />
          </Move>
        </g>
        <g className="ss-hide" style={{ '--d': lagged(1.12) } as CSSProperties}>
          <Path steps={door} d={0.3} t={0.8}>{doorFace}</Path>
        </g>
      </BaseRun>
    ),
    dim: { a: [0, -110, 0], b: [900, -110, 0], ext: [0, 100, 0], label: '800–900 мм', d: 3.0 },
    note: { at: [720, 330, 0], text: 'Глухой угол', d: 0.5 },
  }
}

/* ── Выдвижная колонна 4862-64: пенал на шесть уровней ── */
function columnScene(): Built {
  const v = fillingView
  const { P, front, top, side } = v
  const H = 2100
  const DEPTH = 570
  const x = gap([0, 400])
  const y = gap([KB.PLINTH, H])
  const travel = 440
  const z: Range = [24, 450]
  const tiers = [200, 520, 840, 1160, 1480, 1800]
  const W = 1000
  return {
    view: v,
    extremes: [P(0, 0, KB.SET), P(W, 0, KB.SET), P(W, 0, DEPTH), P(0, H, DEPTH), P(W, H, DEPTH), P(0, H, 0), P(x[0], y[1], -travel), P(x[0], -160, -travel), P(x[1], -160, -travel)],
    body: (uid) => (
      <g>
        <path d={line([P(-160, 0, 0), P(W + 220, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />
        <path d={front([0, W], [0, KB.PLINTH], KB.SET)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
        <path d={side(W, [0, KB.PLINTH], [KB.SET, DEPTH])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
        <path d={side(W, [KB.PLINTH, H], [0, DEPTH])} fill={SHADE} stroke={INK} strokeWidth={1} />
        <path d={top([0, W], H, [0, DEPTH])} fill={SHADE} stroke={INK} strokeWidth={1} />
        <path d={front(x, y, 0)} fill={INSIDE} stroke={INK} strokeWidth={1} />
        {/* Соседний пенал с дверью */}
        <path d={front(gap([400, W]), y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
        <path d={line([P(450, 900, 0), P(450, 1300, 0)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        <defs>
          <clipPath id={`${uid}-out`}><path d={v.sweptOpening(x, y, 0, travel)} /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-out)`}>
          <Move to={shift(v, [0, 0, -travel])} d={0.35} t={1.3}>
            <Posts v={v} x={[x[0] + 14, x[1] - 14]} y={[tiers[0], tiers.at(-1)! + 80]} z={z[1]} />
            {tiers.map((ty, i) => (
              <Tier key={ty} v={v} x={[x[0] + 14, x[1] - 14]} y={ty} z={z} rim={70}>
                {i % 2 === 0 ? (
                  <>
                    <Jar at={P(300, ty, 340)} h={140} />
                    <Bottle at={P(120, ty, 300)} h={230} />
                    <Jar at={P(220, ty, 120)} h={110} />
                  </>
                ) : (
                  <>
                    <Bottle at={P(280, ty, 360)} h={250} />
                    <Jar at={P(120, ty, 240)} h={150} />
                    <Bottle at={P(300, ty, 130)} h={200} />
                  </>
                )}
              </Tier>
            ))}
            <Posts v={v} x={[x[1] - 14]} y={[tiers[0], tiers.at(-1)! + 80]} z={z[0]} />
            <Face v={v} x={x} y={y} />
          </Move>
        </g>
      </g>
    ),
    dim: { a: [x[0], y[0] - 110, -travel], b: [x[1], y[0] - 110, -travel], ext: [0, 90, 0], label: '300–450 мм', d: 1.55 },
  }
}

/* ── Корзина в верхний модуль 6095: дверь поднимается, корзина опускается по дуге ── */
function upperScene(): Built {
  const v = fillingView
  const { P, front, top, side } = v
  const Y: Range = [1400, 2120]
  const DEPTH = 320
  const W = 1000
  const x = gap([0, 600])
  const y = gap(Y)
  // Корзина в шкафу: два уровня, глубина 270
  const bx: Range = [40, 560]
  const bz: Range = [20, 290]
  const floors = [1440, 1660]
  const topY = 1860
  // Рычаги: ось на боковине, конец — у задней верхней точки корзины
  const lift = arc(300, -20, 135)
  const pivot: V3 = [585, 1578, 187]
  const moves = keys((s) => shift(v, lift.move(s)))
  const arm = (xx: number) => keys((s) => affine(v, [[xx, pivot[1], pivot[2]], [xx, pivot[1] + 1000, pivot[2]], [xx, pivot[1], pivot[2] + 1000]], rotX([xx, pivot[1], pivot[2]], lift.angle(s))))
  const door = keys((s) => affine(v, [[0, Y[1], 0], [1000, Y[1], 0], [0, Y[1] - 1000, 0]], rotX([0, Y[1], 0], -105 * s)))
  const end = lift.move(1)
  const corners: V3[] = [[x[0], y[0], 0], [x[1], y[0], 0], [x[1], y[1], 0], [x[0], y[1], 0]]
  const path11 = Array.from({ length: 11 }, (_, i) => lift.move(i / 10))
  const counter = KB.TOP + KB.COUNTER
  return {
    view: v,
    extremes: [P(0, 600, 0), P(W, 600, KB.COUNTER_DEPTH), P(0, counter, -KB.OVERHANG), P(W, Y[1], DEPTH), P(0, Y[1], DEPTH), P(0, Y[1] + 200, -700), P(bx[0], floors[0] + end[1], bz[0] + end[2])],
    body: (uid) => (
      <g>
        {/* Низ кухни обрезан: фасады, столешница и варочная панель — чтобы было, куда опускаться */}
        {/* Обрез снизу: точки идут от верха, и пунктиром выходит нижнее ребро */}
        <g fill={FACE}>
          {[[0, 600], [600, W]].map(([x0, x1]) => (
            <Cut key={x0} pts={[P(x0 + 1.5, KB.TOP - 1.5, 0), P(x1 - 1.5, KB.TOP - 1.5, 0), P(x1 - 1.5, 600, 0), P(x0 + 1.5, 600, 0)]} />
          ))}
        </g>
        <g fill={SHADE}>
          <Cut pts={[P(W, KB.TOP, 0), P(W, KB.TOP, KB.DEPTH), P(W, 600, KB.DEPTH), P(W, 600, 0)]} />
        </g>
        <path d={top([0, W], counter, [-KB.OVERHANG, KB.COUNTER_DEPTH])} fill={SHADE} stroke={INK} strokeWidth={1} />
        <path d={side(W, [KB.TOP, counter], [-KB.OVERHANG, KB.COUNTER_DEPTH])} fill={SHADE_DEEP} stroke={INK} strokeWidth={1} />
        <path d={front([0, W], [KB.TOP, counter], -KB.OVERHANG)} fill={FACE} stroke={INK} strokeWidth={1} />
        <path d={top([110, 490], counter, [90, 450])} fill={INSIDE} stroke={INK} strokeWidth={0.8} />
        {[[200, 200], [400, 340]].map(([cx, cz]) => (
          <path
            key={cx}
            d={path(Array.from({ length: 20 }, (_, i) => P(cx + 55 * Math.cos((i / 20) * Math.PI * 2), counter, cz + 55 * Math.sin((i / 20) * Math.PI * 2))))}
            fill="none"
            stroke={FACE}
            strokeWidth={0.9}
          />
        ))}

        {/* Верхние шкафы */}
        <path d={side(W, Y, [0, DEPTH])} fill={SHADE} stroke={INK} strokeWidth={1} />
        <path d={top([0, W], Y[1], [0, DEPTH])} fill={SHADE} stroke={INK} strokeWidth={1} />
        <path d={front(x, y, 0)} fill={INSIDE} stroke={INK} strokeWidth={1} />
        <path d={front(gap([600, W]), y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
        <path d={line([P(640, 1460, 0), P(800, 1460, 0)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />

        <defs>
          <clipPath id={`${uid}-out`}><path d={swept(v, corners, path11)} /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-out)`}>
          {/* Левый рычаг — за корзиной */}
          <Path steps={arm(15)} d={1.0} t={1.5}>
            <path d={line([P(15, pivot[1], pivot[2]), P(15, topY, bz[1])])} stroke={BRASS} strokeWidth={2.4} strokeLinecap="round" />
          </Path>
          <Path steps={moves} d={1.0} t={1.5}>
            <Posts v={v} x={[bx[0], bx[1]]} y={[floors[0], topY]} z={bz[1]} />
            {floors.map((fy, i) => (
              <Tier key={fy} v={v} x={bx} y={fy} z={bz} rim={70}>
                {i === 0
                  ? [440, 330, 220, 110].map((xx, k) => <Bottle key={xx} at={P(xx, fy, 160)} h={[180, 200, 170, 190][k]} r={26} />)
                  : [480, 360, 240, 120].map((xx, k) => <Jar key={xx} at={P(xx, fy, 160)} w={80} h={[110, 90, 120, 100][k]} />)}
                {/* Бортики из закалённого стекла: спереди и справа */}
                <path d={v.side(bx[1], [fy, fy + 70], bz)} fill={GLASS_PANE} stroke={BRASS} strokeWidth={0.8} />
                <path d={v.front(bx, [fy, fy + 70], bz[0])} fill={GLASS_PANE} stroke={BRASS} strokeWidth={0.8} />
              </Tier>
            ))}
            <Posts v={v} x={[bx[0], bx[1]]} y={[floors[0], topY]} z={bz[0]} />
            {/* Ручка корзины спереди сверху */}
            <path d={line([P(bx[0], topY, bz[0]), P(bx[1], topY, bz[0])])} stroke={BRASS} strokeWidth={2.6} strokeLinecap="round" />
          </Path>
          <Path steps={arm(585)} d={1.0} t={1.5}>
            <path d={line([P(585, pivot[1], pivot[2]), P(585, topY, bz[1])])} stroke={BRASS} strokeWidth={2.4} strokeLinecap="round" />
            <circle cx={P(585, pivot[1], pivot[2])[0]} cy={P(585, pivot[1], pivot[2])[1]} r={3} fill={BRASS} />
          </Path>
        </g>

        {/* Дверь поднимается вверх и уходит над шкафом */}
        <Path steps={door} d={0.3} t={0.8}>
          <path d={front(x, y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
          <path d={line([P(x[0] + 60, Y[0] + 50, 0), P(x[0] + 220, Y[0] + 50, 0)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
        </Path>
      </g>
    ),
    note: { at: [1000, 1960, 0], text: 'Пневматический механизм', d: 2.4 },
  }
}

/* ── Система утилизации 6156: фасад 300 мм, два ведра ── */
function wasteScene(): Built {
  const v = fillingView
  const mods: Mod[] = [
    { w: 600, fronts: [[KB.PLINTH, KB.TOP]], sink: true },
    { w: 300, open: [KB.PLINTH, KB.TOP] },
    { w: 400, fronts: [[KB.PLINTH, 460], [460, KB.TOP]] },
  ]
  const x = gap([600, 900])
  const y = gap([KB.PLINTH, KB.TOP])
  const travel = 400
  const bins: Range[] = [[250, 450], [40, 230]]
  const bx: Range = [622, 878]
  const by: Range = [200, 560]
  return {
    view: v,
    extremes: [...baseExtremes(v, 1300, true), v.P(x[0], y[1], -travel), v.P(x[0], -160, -travel), v.P(x[1], -160, -travel)],
    body: (uid) => (
      <BaseRun v={v} mods={mods}>
        <defs>
          <clipPath id={`${uid}-out`}><path d={v.sweptOpening(x, y, 0, travel)} /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-out)`}>
          <Move to={shift(v, [0, 0, -travel])} d={0.35} t={1.2}>
            <path d={v.top([x[0] + 14, x[1] - 14], by[0] - 10, [24, 470])} fill={BASKET} stroke={BRASS} strokeWidth={1.2} />
            {bins.map((bz) => (
              <g key={bz[0]} strokeLinejoin="round">
                <path d={v.side(bx[1], by, bz)} fill={BIN} stroke={INK} strokeWidth={0.8} />
                <path d={v.top(bx, by[1], bz)} fill={INSIDE} stroke={INK} strokeWidth={0.8} />
                <path d={v.front(bx, by, bz[0])} fill={BIN} stroke={INK} strokeWidth={0.9} />
                <path d={line([v.P(bx[0] + 70, by[1] - 50, bz[0]), v.P(bx[1] - 70, by[1] - 50, bz[0])])} stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
              </g>
            ))}
            <Face v={v} x={x} y={y} />
          </Move>
        </g>
      </BaseRun>
    ),
    dim: { a: [x[0], y[0] - 110, -travel], b: [x[1], y[0] - 110, -travel], ext: [0, 90, 0], label: '300 мм', d: 1.45 },
    note: { at: [250, 1180, -KB.OVERHANG], text: 'Два отсека по 10 л', d: 1.7 },
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Шкаф
   ══════════════════════════════════════════════════════════════════════ */

const WB = { D: 580, T: 16, FLOOR: 7 }

/**
 * Секция шкафа: боковины, задняя стенка и дно изнутри, кромки спереди.
 * topY — где секция обрывается (низ шкафа без верха) или крыша (full)
 */
function Section({ v, inner, topY, full = false, uid, inside, children }: {
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
function sectionExtremes(v: View, inner: Range, topY: number): Pt[] {
  const { P } = v
  const XL = inner[0] - WB.T
  const XR = inner[1] + WB.T
  return [P(XL, 0, 0), P(XR, 0, 0), P(XR, 0, WB.D), P(XL, topY, 0), P(XR, topY, WB.D)]
}

/** Вещь на плечиках — в плоскости y–z, вешается в точку (x, y, z) штанги */
const GARMENTS: Array<{ pts: Array<[number, number]>; fill: string }> = [
  { pts: [[-170, -45], [-195, -120], [-150, -130], [-150, -780], [150, -780], [150, -130], [195, -120], [170, -45]], fill: FACE },
  { pts: [[-150, -50], [-120, -300], [-220, -820], [220, -820], [120, -300], [150, -50]], fill: CLOTH },
  { pts: [[-175, -45], [-200, -130], [-160, -140], [-160, -700], [160, -700], [160, -140], [200, -130], [175, -45]], fill: DARK },
]
function Garment({ v, x, y, z, kind }: { v: View; x: number; y: number; z: number; kind: number }) {
  const g = GARMENTS[kind % GARMENTS.length]
  return (
    <g strokeLinejoin="round">
      <path d={line([v.P(x, y, z), v.P(x, y + 40, z), v.P(x, y + 55, z - 25)])} fill="none" stroke={INK} strokeWidth={0.8} />
      <path d={profile(v, x, y, z, g.pts)} fill={g.fill} stroke={INK} strokeWidth={0.8} />
      <path d={line([v.P(x, y - 45, z - 170), v.P(x, y, z), v.P(x, y - 45, z + 170)])} fill="none" stroke={INK} strokeWidth={0.9} />
    </g>
  )
}

/* ── Пантограф: штанга с вещами опускается из-под крыши на рычагах ── */
function liftScene(): Built {
  const v = wardrobeView
  const { P } = v
  const inner: Range = [16, 816]
  const H = 2200
  const lift = arc(420, 15, 110)
  const pivot: [number, number] = [1650, 330]
  const rod0 = add([0, pivot[0], pivot[1]], [0, 420 * Math.cos((15 * Math.PI) / 180), -420 * Math.sin((15 * Math.PI) / 180)])
  const moves = keys((s) => shift(v, lift.move(s)))
  const arm = (xx: number) => keys((s) => affine(v, [[xx, pivot[0], pivot[1]], [xx, pivot[0] + 1000, pivot[1]], [xx, pivot[0], pivot[1] + 1000]], rotX([xx, pivot[0], pivot[1]], lift.angle(s))))
  const corners: V3[] = [[inner[0], 23, 0], [inner[1], 23, 0], [inner[1], H - 16, 0], [inner[0], H - 16, 0]]
  const path11 = Array.from({ length: 11 }, (_, i) => lift.move(i / 10))
  const xs = [150, 290, 430, 570, 700]
  return {
    view: v,
    extremes: [...sectionExtremes(v, inner, H), P(inner[0], -150, 0)],
    body: (uid) => (
      <Section v={v} inner={inner} topY={H} full uid={uid}>
        <defs>
          <clipPath id={`${uid}-out`}><path d={swept(v, corners, path11)} /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-out)`}>
          <Path steps={arm(24)} d={0.35} t={1.6}>
            <path d={line([P(24, pivot[0], pivot[1]), P(24, rod0[1], rod0[2])])} stroke={BRASS} strokeWidth={2.4} strokeLinecap="round" />
          </Path>
          <Path steps={moves} d={0.35} t={1.6}>
            {xs.map((xx, i) => (
              <Garment key={xx} v={v} x={xx} y={rod0[1]} z={rod0[2]} kind={i} />
            ))}
            <path d={line([P(inner[0] + 8, rod0[1], rod0[2]), P(inner[1] - 8, rod0[1], rod0[2])])} stroke={BRASS} strokeWidth={3.2} strokeLinecap="round" />
          </Path>
          <Path steps={arm(808)} d={0.35} t={1.6}>
            <path d={line([P(808, pivot[0], pivot[1]), P(808, rod0[1], rod0[2])])} stroke={BRASS} strokeWidth={2.4} strokeLinecap="round" />
          </Path>
        </g>
      </Section>
    ),
    dim: { a: [inner[0], -110, 0], b: [inner[1], -110, 0], ext: [0, 100, 0], label: '600–1000 мм', d: 1.9 },
  }
}

/* ── Низ шкафа: брючница, корзина, обувь, гладильная доска ── */
const LOW = { inner: [16, 816] as Range }

/** Направляющие на боковинах на высоте y */
function Rails({ v, y }: { v: View; y: number }) {
  return (
    <g>
      {[LOW.inner[0] + 6, LOW.inner[1] - 6].map((xx) => (
        <path key={xx} d={line([v.P(xx, y, 10), v.P(xx, y, WB.D - 30)])} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
      ))}
    </g>
  )
}

function lowScene(build: (v: View) => { top: number; travel: number; rail: number; content: ReactNode; extremes: Pt[]; dim: Dim; d?: number; t?: number }): Built {
  const v = wardrobeView
  const b = build(v)
  const yIn: Range = [WB.FLOOR + WB.T, b.top]
  return {
    view: v,
    extremes: [...sectionExtremes(v, LOW.inner, b.top), ...b.extremes],
    body: (uid) => (
      <Section v={v} inner={LOW.inner} topY={b.top} uid={uid} inside={<Rails v={v} y={b.rail} />}>
        <defs>
          <clipPath id={`${uid}-out`}><path d={v.sweptOpening(LOW.inner, yIn, 0, b.travel)} /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-out)`}>
          <Move to={shift(v, [0, 0, -b.travel])} d={b.d ?? 0.35} t={b.t ?? 1.1}>
            {b.content}
          </Move>
        </g>
      </Section>
    ),
    dim: b.dim,
  }
}

/* ── Брючница: рама с перекладинами вглубь, брюки перекинуты через них ── */
function trousersScene(): Built {
  return lowScene((v) => {
    const { P } = v
    const y = 900
    const x: Range = [40, 792]
    const z: Range = [30, 470]
    const travel = 420
    const bars = Array.from({ length: 8 }, (_, i) => x[0] + 50 + i * 93)
    const hung = [1, 3, 4, 6]
    return {
      top: 1100,
      travel,
      rail: y,
      extremes: [P(x[0], y + 240, z[0] - travel), P(x[0], 330, z[0] - travel)],
      content: (
        <g strokeLinecap="round" strokeLinejoin="round">
          {bars.map((bx, i) => (
            <g key={bx}>
              <path d={line([P(bx, y, z[0]), P(bx, y, z[1])])} stroke={BRASS} strokeWidth={1.4} />
              {hung.includes(i) && (
                <g>
                  <path d={profile(v, bx, y, 0, [[110, 0], [390, 0], [370, -520], [270, -520], [250, -60], [230, -520], [130, -520]])} fill={i % 2 ? DARK : SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
                </g>
              )}
            </g>
          ))}
          <path d={v.top(x, y, z)} fill="none" stroke={BRASS} strokeWidth={1.6} />
          <path d={line([P(x[0], y, z[0]), P(x[1], y, z[0])])} stroke={BRASS} strokeWidth={3} />
        </g>
      ),
      dim: { a: [x[0], y + 170, z[0] - travel], b: [x[1], y + 170, z[0] - travel], ext: [0, -160, 0], label: '600–800 мм', d: 1.4, above: true },
    }
  })
}

/* ── Выдвижная корзина: сетка, сложенные рубашки ── */
function basketScene(): Built {
  return lowScene((v) => {
    const { P } = v
    const x: Range = [40, 792]
    const y: Range = [520, 660]
    const z: Range = [30, 470]
    const travel = 400
    const shirts: Array<[Range, Range]> = [[[90, 300], [525, 580]], [[330, 540], [525, 580]], [[570, 760], [525, 580]], [[90, 300], [580, 635]]]
    return {
      top: 820,
      travel,
      rail: y[0] + 20,
      extremes: [P(x[0], y[1], z[0] - travel), P(x[0], y[0] - 140, z[0] - travel), P(x[1], y[0] - 140, z[0] - travel)],
      content: (
        <g strokeLinejoin="round">
          <path d={v.top(x, y[0], z)} fill={BASKET} stroke={BRASS} strokeWidth={1.2} />
          <path d={v.front(x, y, z[1])} fill="none" stroke={BRASS} strokeWidth={0.8} />
          {shirts.map(([sx, sy]) => (
            <g key={`${sx[0]}-${sy[0]}`}>
              <Block v={v} x={sx} y={sy} z={[110, 400]} />
              <path d={line([v.P(sx[0] + 70, sy[1], 110), v.P((sx[0] + sx[1]) / 2, sy[1], 160), v.P(sx[1] - 70, sy[1], 110)])} fill="none" stroke={INK} strokeWidth={0.8} />
            </g>
          ))}
          {/* Сетка: прутья по бокам и спереди */}
          {Array.from({ length: 10 }, (_, i) => z[0] + 20 + i * 44).map((zz) => (
            <path key={zz} d={line([P(x[1], y[0], zz), P(x[1], y[1], zz)])} stroke={BRASS} strokeWidth={0.6} />
          ))}
          {Array.from({ length: 16 }, (_, i) => x[0] + 20 + i * 47).map((xx) => (
            <path key={xx} d={line([P(xx, y[0], z[0]), P(xx, y[1], z[0])])} stroke={BRASS} strokeWidth={0.6} />
          ))}
          <path d={v.side(x[1], y, z)} fill="none" stroke={BRASS} strokeWidth={1} />
          <path d={v.front(x, y, z[0])} fill="none" stroke={BRASS} strokeWidth={1.4} />
          <path d={v.top(x, y[1], z)} fill="none" stroke={BRASS} strokeWidth={1.2} />
        </g>
      ),
      dim: { a: [x[0], y[0] - 70, z[0] - travel], b: [x[1], y[0] - 70, z[0] - travel], ext: [0, 60, 0], label: '600–900 мм', d: 1.4 },
    }
  })
}

/* ── Полка для обуви: площадка, туфли и ботинки носками к зрителю ── */
const PUMP: Array<[number, number]> = [[0, 10], [20, 35], [70, 50], [120, 50], [175, 70], [235, 105], [242, 95], [240, 0], [229, 0], [200, 58], [120, 16], [60, 0], [10, 0]]
const LOAFER: Array<[number, number]> = [[0, 15], [15, 50], [80, 72], [170, 78], [240, 72], [256, 30], [256, 0], [10, 0]]
function shoesScene(): Built {
  return lowScene((v) => {
    const { P } = v
    const x: Range = [40, 792]
    const y = 140
    const z: Range = [30, 450]
    const travel = 400
    const pairs = [{ x: 110, kind: PUMP, fill: CLOTH }, { x: 350, kind: LOAFER, fill: DARK }, { x: 590, kind: PUMP, fill: FACE }]
    return {
      top: 560,
      travel,
      rail: y + 20,
      extremes: [P(x[0], y + 200, z[0] - travel), P(x[0], y - 150, z[0] - travel), P(x[1], y - 150, z[0] - travel)],
      content: (
        <g strokeLinejoin="round">
          <path d={v.top(x, y, z)} fill={BASKET} stroke={BRASS} strokeWidth={1.2} />
          {Array.from({ length: 7 }, (_, i) => z[0] + 50 + i * 55).map((zz) => (
            <path key={zz} d={line([P(x[0] + 20, y, zz), P(x[1] - 20, y, zz)])} stroke={BRASS} strokeWidth={0.5} strokeDasharray="2 3" />
          ))}
          {pairs.flatMap((p) => [p.x, p.x + 90].map((sx) => (
            <path key={sx} d={profile(v, sx, y, 110, p.kind.map(([dz, dy]) => [dz, dy] as [number, number]))} fill={p.fill} stroke={INK} strokeWidth={0.8} />
          )))}
          {/* Передний бортик */}
          <path d={line([P(x[0], y + 60, z[0]), P(x[1], y + 60, z[0])])} stroke={BRASS} strokeWidth={2.4} strokeLinecap="round" />
          {[x[0], x[1]].map((xx) => (
            <path key={xx} d={line([P(xx, y, z[0]), P(xx, y + 60, z[0])])} stroke={BRASS} strokeWidth={1.4} />
          ))}
        </g>
      ),
      dim: { a: [x[0], y - 90, z[0] - travel], b: [x[1], y - 90, z[0] - travel], ext: [0, 80, 0], label: '600–800 мм', d: 1.4 },
    }
  })
}

/* ── Гладильная доска: выезжает сложенной и раскладывается вперёд ── */
function ironingScene(): Built {
  const v = wardrobeView
  const { P } = v
  const y = 900
  const bx: Range = [266, 566]
  const half: Range = [40, 445]
  const travel = 400
  const hinge: V3 = [0, y + 12, half[0]]
  const flip = keys((s) => affine(v, [[0, y + 25, half[0]], [1000, y + 25, half[0]], [0, y + 25, half[0] + 1000]], rotX(hinge, 180 * s)))
  // Верхняя половина: нос — у дальнего конца, после раскладки он впереди
  const nose: V3[] = [[bx[0], y + 25, half[0]], [bx[1], y + 25, half[0]], [bx[1], y + 25, half[1] - 85], [bx[1] - 40, y + 25, half[1] - 25], [(bx[0] + bx[1]) / 2, y + 25, half[1]], [bx[0] + 40, y + 25, half[1] - 25], [bx[0], y + 25, half[1] - 85]]
  const topY = 1100
  const yIn: Range = [WB.FLOOR + WB.T, topY]
  const far = half[0] - travel - (half[1] - half[0])
  return {
    view: v,
    extremes: [...sectionExtremes(v, LOW.inner, topY), P(bx[0], y + 30, far), P(bx[1] + 120, y - 80, far)],
    body: (uid) => (
      <Section v={v} inner={LOW.inner} topY={topY} uid={uid} inside={<Rails v={v} y={y - 30} />}>
        <defs>
          <clipPath id={`${uid}-out`}><path d={v.sweptOpening(LOW.inner, yIn, 0, travel + 420)} /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-out)`}>
          <Move to={shift(v, [0, 0, -travel])} d={0.35} t={1.0}>
            {/* Каретка на направляющих и нижняя половина доски */}
            <path d={line([P(bx[0], y - 30, half[0]), P(bx[0], y - 30, half[1]), P(bx[1], y - 30, half[1]), P(bx[1], y - 30, half[0])])} fill="none" stroke={BRASS} strokeWidth={1.4} />
            <path d={v.front(bx, [y - 30, y], half[0])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
            <path d={v.top(bx, y + 12, half)} fill={CLOTH} stroke={INK} strokeWidth={0.9} />
            <Path steps={flip} d={1.4} t={1.0}>
              <path d={path(nose.map((p) => P(...p)))} fill={CLOTH} stroke={INK} strokeWidth={0.9} strokeLinejoin="round" />
            </Path>
          </Move>
        </g>
      </Section>
    ),
    dim: { a: [bx[1] + 60, y, far], b: [bx[1] + 60, y, half[1] - travel], ext: [-50, 0, 0], label: '810 мм', d: 2.45 },
  }
}

/* ── Выдвижное зеркало: выезжает вдоль боковины и поворачивается к зрителю ── */
function mirrorScene(): Built {
  const v = wardrobeView
  const { P } = v
  const inner: Range = [16, 616]
  const H = 2200
  const mx = 46
  const my: Range = [500, 1700]
  const mz: Range = [20, 372]
  const travel = 400
  const pivot: V3 = [mx, 0, mz[0] - travel]
  const stage = twoStage(0.48)
  const steps = keys((s) => {
    const [a, b] = stage(s)
    const f = (p: V3) => rotY(pivot, 65 * b)(add(p, [0, 0, -travel * a]))
    return affine(v, [[mx, my[0], mz[0]], [mx, my[0] + 1000, mz[0]], [mx, my[0], mz[0] + 1000]], f)
  }, false)
  const face = (inset: number) => path([[mz[0] + inset, my[0] + inset], [mz[1] - inset, my[0] + inset], [mz[1] - inset, my[1] - inset], [mz[0] + inset, my[1] - inset]].map(([z, y]) => P(mx, y, z)))
  const corners: V3[] = [[inner[0], 23, 0], [inner[1], 23, 0], [inner[1], H - 16, 0], [inner[0], H - 16, 0]]
  return {
    view: v,
    extremes: [...sectionExtremes(v, inner, H), P(mx - 120, my[0], mz[0] - travel)],
    body: (uid) => (
      <Section
        v={v}
        inner={inner}
        topY={H}
        full
        uid={uid}
        inside={
          <g>
            <Block v={v} x={inner} y={[1914, 1930]} z={[0, WB.D - 10]} />
            {[inner[0] + 14, inner[1] - 14].map((xx) => (
              <path key={xx} d={line([P(xx, 1760, 280), P(xx, 1914, 280)])} stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
            ))}
            <path d={line([P(inner[0] + 14, 1760, 280), P(inner[1] - 14, 1760, 280)])} stroke={BRASS} strokeWidth={3.2} strokeLinecap="round" />
            {[380, 470, 560].map((xx, i) => (
              <Garment key={xx} v={v} x={xx} y={1760} z={280} kind={i + 1} />
            ))}
            {/* Направляющая зеркала под полкой */}
            <path d={line([P(mx, my[1] + 40, 10), P(mx, my[1] + 40, WB.D - 30)])} stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
          </g>
        }
      >
        <defs>
          <clipPath id={`${uid}-out`}><path d={swept(v, corners, [[0, 0, 0], [0, 0, -travel - 40]])} /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}-out)`}>
          <Path steps={steps} d={0.35} t={2.2}>
            <path d={face(0)} fill={FACE} stroke={INK} strokeWidth={1} strokeLinejoin="round" />
            <path d={face(30)} fill={GLASS} stroke={INK} strokeWidth={0.6} />
            {[0.25, 0.42].map((k) => (
              <path key={k} d={line([P(mx, my[0] + (my[1] - my[0]) * k, mz[1] - 50), P(mx, my[0] + (my[1] - my[0]) * (k + 0.22), mz[0] + 50)])} stroke="var(--card)" strokeWidth={2} strokeLinecap="round" />
            ))}
          </Path>
        </g>
      </Section>
    ),
    dim: { a: [mx - 90, my[0], mz[0] - travel], b: [mx - 90, my[1], mz[0] - travel], ext: [70, 0, 0], label: '1200 мм', d: 2.6, above: true },
  }
}

/** Схемы по фото позиции: так они переживают перенос каталога в панель */
const SCENES: Record<string, () => Built> = {
  'bottle-6033': bottleScene,
  'dryer-4646': dryerScene,
  'corner-6022': cornerScene,
  'column-4862': columnScene,
  'upper-6095': upperScene,
  'waste-6156': wasteScene,
  'lift-10002': liftScene,
  'trousers-10756': trousersScene,
  'basket-10056': basketScene,
  'shoes-10556': shoesScene,
  'mirror-10001': mirrorScene,
  'ironing-10b01w': ironingScene,
}

/** Есть ли схема для позиции — по имени файла её фото */
export function storageSceneKey(image: string): string | null {
  const key = image.split('/').pop()?.replace(/\.\w+$/, '') ?? ''
  return key in SCENES ? key : null
}

/* ══════════════════════════════════════════════════════════════════════
   Чертёж
   ══════════════════════════════════════════════════════════════════════ */

/** Размер: выноски, линия от середины в обе стороны, засечки, число вдоль линии */
function DimLine({ v, dim, fit }: { v: View; dim: Dim; fit: number }) {
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

export function StorageScene({ scene, id }: { scene: string; id: string }) {
  const built = SCENES[scene]()
  const { view: v } = built
  // Сверху место под номер и переключатель «Схема / Фото»
  const extremes = [
    ...built.extremes,
    ...(built.dim
      ? [built.dim.a, built.dim.b].flatMap((p) => [v.P(...p), v.P(...add(p, [0, -150, 0])), v.P(...add(p, [-150, 0, 0]))])
      : []),
  ]
  const { fit, tx, ty } = fitTo(extremes, VIEW, { x: 18, top: 50, bottom: 16 })
  const uid = `ss-${id}`
  const note = built.note && v.P(...built.note.at)
  const notePct = note && { left: ((note[0] * fit + tx) / VIEW.w) * 100, top: ((note[1] * fit + ty) / VIEW.h) * 100 }
  return (
    <>
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 size-full" aria-hidden="true">
        <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${fit.toFixed(3)})`}>
          {built.body(uid)}
          {built.dim && <DimLine v={v} dim={built.dim} fit={fit} />}
        </g>
      </svg>
      {built.note && notePct && (
        <span className="hs-in pointer-events-none absolute" style={{ left: `${notePct.left}%`, top: `${notePct.top}%`, ...at(built.note.d, POP) }}>
          <span className="plan-tag plan-tag--dot -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
            <span className="plan-tag__value">{built.note.text}</span>
          </span>
        </span>
      )}
    </>
  )
}
