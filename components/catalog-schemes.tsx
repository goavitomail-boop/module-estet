'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { BRASS, FACE, FAINT, INK, K, SHADE, SHADE_DEEP, fillingView, line, path, shape, wardrobeView, type Range } from '@/components/axo'
import { Jar, Pot } from '@/components/filling-scene'
import { KB, BaseRun, Block, Face, Move, SchemeSvg, baseExtremes, gap, lagged, shift, type Built, type Dim, type Mod, type View } from '@/components/scheme-kit'
import { ColorChips, SchemePanel } from '@/components/scheme-panel'
import type { CatalogGroup } from '@/lib/pdf-catalog-data'

/**
 * Схемы разделов страницы «Наполнение» — в том же каркасе, что системы
 * хранения (scheme-kit.tsx): подсветка под навесными шкафами загорается,
 * ящики выезжают за ручки, модули собираются в размерную сетку. Размеры,
 * цвета и подписи — из каталога производства (fillingSections
 * в lib/pdf-catalog-data.ts), рисунок — схема.
 *
 * Схема ищется по разделу: в коде — по id, после переноса в панель — по
 * названию группы. Не нашлась — раздел просто без схемы.
 */

const VIEW = { w: 520, h: 340 }
const RATIO = `${VIEW.w} / ${VIEW.h}`

/** Цвета покрытий из каталога — для схемы, фото настоящих образцов ниже в разделе */
const FINISH = {
  Серебро: '#c3c6ca',
  Белый: '#f3f2ee',
  Чёрный: '#2b2b2b',
  Золото: '#c2a36b',
  'Чёрный матовый': '#2b2b2b',
  'Золото сатиновое': '#cdb27a',
  'Сатиновый хром': '#b9bec4',
  Графит: '#4a4c4f',
  'Золото матовое': '#c2a36b',
  'Золото брашированное': '#c4a66e',
  'Матовый хром': '#aeb3b8',
} as const
type Finish = keyof typeof FINISH
const finishes = <T extends Finish>(...names: T[]) => names.map((name) => ({ name, color: FINISH[name] }))

const fade = (d: number, t = 0.9) => ({ '--d': lagged(d), '--t': `${t}s` }) as CSSProperties

/* ══════════════════════════════════════════════════════════════════════
   Подсветка
   ══════════════════════════════════════════════════════════════════════ */

/** Навесные шкафы: низ на 1400 мм, глубина 320 — висят на стене за столешницей */
const WALL = { y: [1400, 2120] as Range, z: [280, 600] as Range }

function lightScene(color: string): Built {
  const v = fillingView
  const { P, front, top, side } = v
  const W = 1200
  const mods: Mod[] = [
    { w: 600, fronts: [[KB.PLINTH, 460], [460, KB.TOP]] },
    { w: 600, fronts: [[KB.PLINTH, KB.TOP]] },
  ]
  // Профиль под дном навесных шкафов, у передней кромки
  const led = { x: [30, W - 30] as Range, y: [WALL.y[0] - 26, WALL.y[0]] as Range, z: [WALL.z[0] + 8, WALL.z[0] + 40] as Range }
  const counter = KB.TOP + KB.COUNTER
  const beam = [P(led.x[0], led.y[0], led.z[0]), P(led.x[1], led.y[0], led.z[0]), P(led.x[1], counter, 40), P(led.x[0], counter, 40)]
  // Низ кухни ниже CUT не нужен: срез по фасадам и правому боку
  const CUT = 560
  const cut = [P(-400, CUT, 0), P(W, CUT, 0), P(W, CUT, 700), P(W + 400, CUT, 700)]
  const above = path([...cut, [cut[3][0], cut[3][1] - 4000], [cut[0][0], cut[0][1] - 4000]])
  return {
    view: v,
    extremes: [P(0, CUT, 0), P(W, CUT, 0), P(W, CUT, KB.DEPTH), P(0, counter, -KB.OVERHANG), P(0, WALL.y[1], WALL.z[1]), P(W, WALL.y[1], WALL.z[1]), P(0, WALL.y[1], WALL.z[0])],
    body: (uid) => (
      <g>
        <defs>
          <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.38" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0.04" />
          </linearGradient>
          <clipPath id={`${uid}-above`}>
            <path d={above} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}-above)`}>
          <BaseRun v={v} mods={mods} />
        </g>
        <path d={line([P(0, CUT, 0), P(W, CUT, 0), P(W, CUT, KB.DEPTH)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" fill="none" />
        {/* Стена между столешницей и шкафами */}
        <path d={front([0, W], [counter, WALL.y[0]], WALL.z[1])} fill={SHADE} stroke={INK} strokeWidth={0.6} />
        <path className="hs-fade" style={fade(1.0)} d={front([0, W], [counter, WALL.y[0]], WALL.z[1])} fill={`url(#${uid}-wall)`} />
        {/* Свет на столешнице и луч от профиля */}
        <path className="hs-fade" style={fade(1.0)} d={top([0, W], counter, [20, KB.COUNTER_DEPTH])} fill={`url(#${uid}-beam)`} />
        <path className="hs-fade" style={fade(0.95, 1.1)} d={path(beam)} fill={`url(#${uid}-beam)`} />
        {/* Навесные шкафы */}
        <path d={side(W, WALL.y, WALL.z)} fill={SHADE} stroke={INK} strokeWidth={1} />
        <path d={top([0, W], WALL.y[1], WALL.z)} fill={SHADE} stroke={INK} strokeWidth={1} />
        {[[0, 600], [600, W]].map(([x0, x1]) => (
          <g key={x0}>
            <path d={front(gap([x0, x1]), gap(WALL.y), WALL.z[0])} fill={FACE} stroke={INK} strokeWidth={1} />
            <path d={line([P(x0 + 40, WALL.y[0] + 50, WALL.z[0]), P(x0 + 200, WALL.y[0] + 50, WALL.z[0])])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
          </g>
        ))}
        {/* Профиль: корпус цвета покрытия, снизу — светящаяся полоса */}
        <g className="hs-in" style={{ '--d': lagged(0.35), '--t': '0.6s', '--from': 'translateY(-6px)', '--e': 'var(--out)' } as CSSProperties}>
          <g style={{ transition: 'fill 0.4s' }}>
            <Block v={v} x={led.x} y={led.y} z={led.z} fill={color} sw={0.7} />
          </g>
        </g>
        <path className="hs-fade" style={fade(0.9, 0.5)} d={line([P(led.x[0], led.y[0], led.z[0] + 4), P(led.x[1], led.y[0], led.z[0] + 4)])} stroke="var(--card)" strokeWidth={2.4} strokeLinecap="round" />
      </g>
    ),
    notes: [
      { at: [W - 60, led.y[0] - 70, led.z[0]], text: 'LED-профиль', d: 1.5 },
      { at: [330, 660, -30], text: 'Свет на столешницу', d: 1.8 },
    ],
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Ручки
   ══════════════════════════════════════════════════════════════════════ */

type HandleKind = 'monte' | 'bar' | 'quadra' | 'rail' | 'olsen'

/** Ручка на фасаде: x — центр, y — высота оси или верхняя кромка фасада (торцевые), длина в мм */
function Handle({ v, kind, x, y, length, color }: { v: View; kind: HandleKind; x: number; y: number; length: number; color: string }) {
  const { P, front, top, side } = v
  const r: Range = [x - length / 2, x + length / 2]
  const paint = { fill: color, stroke: INK, strokeWidth: 0.6, strokeLinejoin: 'round' as const, style: { transition: 'fill 0.4s' } }
  if (kind === 'monte') {
    // На торце фасада: полка по кромке и губа вниз по лицу
    return (
      <g>
        <path d={top(r, y + 4, [-6, 18])} {...paint} />
        <path d={side(r[1], [y - 26, y + 4], [-6, 18])} {...paint} />
        <path d={front(r, [y - 26, y + 4], -6)} {...paint} />
      </g>
    )
  }
  if (kind === 'bar') {
    // Накладной профиль у верхней кромки: козырёк над пальцами
    return (
      <g>
        <path d={top(r, y, [-18, 0])} {...paint} />
        <path d={side(r[1], [y - 46, y], [-18, 0])} {...paint} />
        <path d={front(r, [y - 46, y], -18)} {...paint} />
        <path d={line([P(r[0] + 6, y - 40, -18), P(r[1] - 6, y - 40, -18)])} stroke={INK} strokeWidth={0.5} />
      </g>
    )
  }
  if (kind === 'quadra') {
    // Скоба: две ножки и планка, углы прямые
    const leg = (cx: number) => <Block v={v} x={[cx - 7, cx + 7]} y={[y - 7, y + 7]} z={[-34, 0]} fill={color} sw={0.6} />
    return (
      <g style={{ transition: 'fill 0.4s' }}>
        {leg(r[0])}
        <Block v={v} x={[r[0] - 7, r[1] + 7]} y={[y - 7, y + 7]} z={[-34, -22]} fill={color} sw={0.6} />
        {leg(r[1])}
      </g>
    )
  }
  if (kind === 'rail') {
    // Рейлинг: круглая перекладина на двух ножках; length — межцентровое
    return (
      <g stroke={color} strokeLinecap="round" style={{ transition: 'stroke 0.4s' }}>
        {[r[0], r[1]].map((xx) => (
          <path key={xx} d={line([P(xx, y, 0), P(xx, y, -34)])} strokeWidth={K * 11} />
        ))}
        <path d={line([P(r[0] - 32, y, -34), P(r[1] + 32, y, -34)])} strokeWidth={K * 13} />
        <path d={line([P(r[0] - 32, y + 3, -38), P(r[1] + 32, y + 3, -38)])} stroke="var(--card)" strokeOpacity={0.35} strokeWidth={K * 3} />
      </g>
    )
  }
  // Неоклассика: скоба дугой к зрителю
  const arch = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12
    return P(r[0] - 6 + t * (length + 12), y, -12 - 22 * Math.sin(t * Math.PI))
  })
  return (
    <g stroke={color} strokeLinecap="round" fill="none" style={{ transition: 'stroke 0.4s' }}>
      <path d={line([P(r[0], y, 0), P(r[0], y, -12)])} strokeWidth={K * 10} />
      <path d={line(arch)} strokeWidth={K * 10} />
      <path d={line([P(r[1], y, 0), P(r[1], y, -12)])} strokeWidth={K * 10} />
    </g>
  )
}

/** Кнопка-ручка: шляпка без перекоса на ножке */
function Knob({ v, x, y, color }: { v: View; x: number; y: number; color: string }) {
  const head = v.P(x, y, -24)
  const r = 17
  return (
    <g>
      <path d={line([v.P(x, y, 0), v.P(x, y, -20)])} stroke={INK} strokeWidth={K * 8} strokeLinecap="round" />
      <path
        d={shape([head[0], head[1] + r * K], Array.from({ length: 20 }, (_, i) => [r * Math.cos((i / 20) * Math.PI * 2), r + r * Math.sin((i / 20) * Math.PI * 2)] as [number, number]))}
        fill={color}
        stroke={INK}
        strokeWidth={0.6}
      />
    </g>
  )
}

/** Выдвижной ящик: стенки, дно, содержимое и фасад; ручку рисуют поверх */
function Drawer({ v, x, y, children }: { v: View; x: Range; y: Range; children?: ReactNode }) {
  const box: Range = [x[0] + 22, x[1] - 22]
  const floor = y[0] + 22
  const rim = y[1] - 55
  const zs: Range = [18, 470]
  return (
    <g strokeLinejoin="round">
      <path d={v.side(box[0], [floor, rim], zs)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={v.front(box, [floor, rim], zs[1])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={v.top(box, floor, zs)} fill={SHADE} stroke={INK} strokeWidth={0.8} />
      {children}
      <path d={v.side(box[1], [floor, rim], zs)} fill={SHADE} stroke={INK} strokeWidth={0.8} />
      <Face v={v} x={x} y={y} handle="none" />
    </g>
  )
}

/** Фасад-рамка для неоклассики: филёнка внутри рамки */
function FramePanel({ v, x, y, z = 0 }: { v: View; x: Range; y: Range; z?: number }) {
  return (
    <g fill="none" stroke={INK}>
      <path d={v.front([x[0] + 55, x[1] - 55], [y[0] + 55, y[1] - 55], z)} strokeWidth={0.8} />
      <path d={v.front([x[0] + 75, x[1] - 75], [y[0] + 75, y[1] - 75], z)} strokeWidth={0.5} />
    </g>
  )
}

type Pull = {
  /** Фасад ящика в модуле: x модуля, высоты */
  x: Range
  y: Range
  /** Ручка: центр по высоте или кромка, длина */
  handle: { y: number; length: number }
  travel: number
  d: number
  content?: (v: View, x: Range, y: Range) => ReactNode
  /** Подпись размера ручки */
  dim?: string
  dimAt?: number
}

/**
 * Модули с ручками: ящики выезжают за ручку по очереди, на выехавших
 * прочерчивается длина ручки. Глухие фасады — с той же ручкой
 */
function handleScene({ kind, mods, pulls, still, color, frames }: {
  kind: HandleKind
  mods: Mod[]
  pulls: Pull[]
  /** Ручки на глухих фасадах: x центра, y, длина */
  still: { x: number; y: number; length: number }[]
  color: string
  /** Неоклассика: рамки на фасадах */
  frames?: { x: Range; y: Range }[]
}): Built {
  const v = fillingView
  const { P } = v
  const W = mods.reduce((sum, m) => sum + m.w, 0)
  const opens = pulls.map((p) => ({ x: gap(p.x), y: gap(p.y) }))
  const dims: Dim[] = pulls.flatMap((p) => {
    if (!p.dim) return []
    const cx = (p.x[0] + p.x[1]) / 2
    const half = p.handle.length / 2
    const dy = p.dimAt ?? p.handle.y - 55
    const z = -p.travel - 30
    return [{ a: [cx - half, dy, z], b: [cx + half, dy, z], ext: [0, p.handle.y - dy - 12, 0], label: p.dim, d: p.d + 1.15, above: dy > p.handle.y }]
  })
  return {
    view: v,
    extremes: [...baseExtremes(v, W), ...pulls.flatMap((p) => [P(p.x[0], p.y[1], -p.travel), P(p.x[0], p.y[0], -p.travel), P(p.x[1], p.y[0], -p.travel)])],
    body: (uid) => (
      <BaseRun v={v} mods={mods}>
        <defs>
          {opens.map((o, i) => (
            <clipPath key={i} id={`${uid}-out-${i}`}>
              <path d={v.sweptOpening(o.x, o.y, 0, pulls[i].travel + 40)} />
            </clipPath>
          ))}
        </defs>
        {(frames ?? []).map((f) => <FramePanel key={`${f.x[0]}-${f.y[0]}`} v={v} x={f.x} y={f.y} />)}
        {still.map((h) => (kind === 'olsen' ? <Knob key={`${h.x}-${h.y}`} v={v} x={h.x} y={h.y} color={color} /> : <Handle key={`${h.x}-${h.y}`} v={v} kind={kind} x={h.x} y={h.y} length={h.length} color={color} />))}
        {/* Нижние ящики раньше верхних: верхний выехавший — ближе и выше */}
        {pulls.map((p, i) => ({ p, i })).sort((a, b) => a.p.y[0] - b.p.y[0]).map(({ p, i }) => {
          const cx = (p.x[0] + p.x[1]) / 2
          return (
            <g key={i} clipPath={`url(#${uid}-out-${i})`}>
              <Move to={shift(v, [0, 0, -p.travel])} d={p.d} t={1.0}>
                <Drawer v={v} x={opens[i].x} y={opens[i].y}>
                  {p.content?.(v, opens[i].x, opens[i].y)}
                </Drawer>
                {kind === 'olsen' && <FramePanel v={v} x={opens[i].x} y={opens[i].y} />}
                <Handle v={v} kind={kind} x={cx} y={p.handle.y} length={p.handle.length} color={color} />
              </Move>
            </g>
          )
        })}
      </BaseRun>
    ),
    dims,
  }
}

/** Ящик с кастрюлей и банками — чтобы было видно, что он выехал полностью */
const pots = (v: View, x: Range, y: Range) => (
  <g>
    <Pot at={v.P(x[0] + 170, y[0] + 22, 300)} />
    <Jar at={v.P(x[1] - 150, y[0] + 22, 330)} h={110} />
    <Jar at={v.P(x[1] - 140, y[0] + 22, 140)} h={90} />
  </g>
)

const B = KB.PLINTH
const T = KB.TOP

const HANDLE_SCENES: Record<HandleKind, (color: string) => Built> = {
  // Торцевые MONTE: длинная — по всей кромке верхнего ящика, короткая — на нижнем
  monte: (color) =>
    handleScene({
      kind: 'monte',
      color,
      mods: [{ w: 900, open: [440, T], fronts: [[B, 440]], blind: true }, { w: 300, fronts: [[B, T]], blind: true }],
      pulls: [{ x: [0, 900], y: [440, T], handle: { y: T - 1.5, length: 897 }, travel: 380, d: 0.35, content: pots, dim: '900 мм', dimAt: T + 110 }],
      still: [{ x: 450, y: 440 - 1.5, length: 128 }, { x: 1050, y: T - 1.5, length: 128 }],
    }),
  // Профиль-ручки 320 мм на трёх ящиках
  bar: (color) =>
    handleScene({
      kind: 'bar',
      color,
      mods: [{ w: 600, open: [560, T], fronts: [[B, 300], [300, 560]], blind: true }, { w: 400, fronts: [[B, T]], blind: true }],
      pulls: [{ x: [0, 600], y: [560, T], handle: { y: T - 4, length: 320 }, travel: 380, d: 0.35, content: pots, dim: '320 мм', dimAt: T + 110 }],
      still: [{ x: 300, y: 300 - 4, length: 320 }, { x: 300, y: 560 - 4, length: 320 }, { x: 800, y: T - 4, length: 320 }],
    }),
  // QUADRA: три ящика с тремя длинами скобы
  quadra: (color) =>
    handleScene({
      kind: 'quadra',
      color,
      mods: [{ w: 600, open: [B, T], blind: true }, { w: 400, fronts: [[B, T]], blind: true }],
      pulls: [
        { x: [0, 600], y: [B, 330], handle: { y: 270, length: 256 }, travel: 220, d: 0.75, dim: '256 мм' },
        { x: [0, 600], y: [330, 575], handle: { y: 515, length: 190 }, travel: 300, d: 0.55, dim: '190 мм' },
        { x: [0, 600], y: [575, T], handle: { y: 760, length: 160 }, travel: 380, d: 0.35, dim: '160 мм' },
      ],
      still: [{ x: 800, y: 700, length: 160 }],
    }),
  // Рейлинги: четыре межцентровых расстояния на четырёх ящиках
  rail: (color) =>
    handleScene({
      kind: 'rail',
      color,
      mods: [{ w: 600, open: [B, T], blind: true }, { w: 400, fronts: [[B, T]], blind: true }],
      pulls: [
        { x: [0, 600], y: [B, 280], handle: { y: 230, length: 256 }, travel: 160, d: 0.8, dim: '256 мм' },
        { x: [0, 600], y: [280, 460], handle: { y: 410, length: 224 }, travel: 230, d: 0.65, dim: '224 мм' },
        { x: [0, 600], y: [460, 640], handle: { y: 590, length: 192 }, travel: 300, d: 0.5, dim: '192 мм' },
        { x: [0, 600], y: [640, T], handle: { y: 770, length: 160 }, travel: 370, d: 0.35, dim: '160 мм' },
      ],
      still: [{ x: 800, y: 700, length: 160 }],
    }),
  // Неоклассика: рамочные фасады, ящик со скобой 128 мм, двери с кнопками
  olsen: (color) =>
    handleScene({
      kind: 'olsen',
      color,
      mods: [{ w: 600, open: [560, T], fronts: [[B, 560]], blind: true }, { w: 400, fronts: [[B, T]], blind: true }],
      pulls: [{ x: [0, 600], y: [560, T], handle: { y: 700, length: 128 }, travel: 380, d: 0.35, content: pots, dim: '128 мм', dimAt: 640 }],
      still: [{ x: 520, y: 480, length: 0 }, { x: 680, y: 740, length: 0 }],
      frames: [{ x: gap([0, 600]), y: gap([B, 560]) }, { x: gap([600, 1000]), y: gap([B, T]) }],
    }),
}

/* ══════════════════════════════════════════════════════════════════════
   Модули и размеры
   ══════════════════════════════════════════════════════════════════════ */

/** Корпус с фасадом: бок, верх, лицо; LINE — с горизонтальным профилем-захватом вверху */
function Carcass({ v, x, y, depth, z = 0, line: grip = false, handle = true }: {
  v: View; x: Range; y: Range; depth: number; z?: number; line?: boolean; handle?: boolean
}) {
  const { P, front, top, side } = v
  return (
    <g strokeLinejoin="round">
      <path d={side(x[1], y, [z, z + depth])} fill={SHADE} stroke={INK} strokeWidth={1} />
      <path d={top(x, y[1], [z, z + depth])} fill={SHADE} stroke={INK} strokeWidth={1} />
      <path d={front(x, y, z)} fill={FACE} stroke={INK} strokeWidth={1} />
      <path d={front(gap(x), [y[0] + 2, grip ? y[1] - 60 : y[1] - 2], z - 1)} fill={FACE} stroke={INK} strokeWidth={0.8} />
      {/* LINE: вместо ручки — утопленный профиль-захват по всей ширине */}
      {grip && (
        <g>
          <path d={front(x, [y[1] - 60, y[1]], z + 18)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
          <path d={line([P(x[0], y[1] - 60, z), P(x[1], y[1] - 60, z)])} stroke={BRASS} strokeWidth={1.6} />
        </g>
      )}
      {handle && !grip && <path d={line([P(x[0] + 40, y[1] - 50, z - 1), P(x[0] + 200, y[1] - 50, z - 1)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />}
    </g>
  )
}

/** Плинтус под нижним модулем */
function Plinth({ v, x, depth }: { v: View; x: Range; depth: number }) {
  return (
    <g>
      <path d={v.front(x, [0, KB.PLINTH], KB.SET)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
      <path d={v.side(x[1], [0, KB.PLINTH], [KB.SET, depth])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
    </g>
  )
}

function modulesScene(): Built {
  // Почти спереди, как листы каталога: модули стоят в ряд и не налезают друг на друга
  const v = wardrobeView
  const { P } = v
  const drop = (d: number, children: ReactNode) => (
    <Move from={shift(v, [0, 420, 0])} to="none" d={d} t={0.8} ease="var(--spring)">
      <g className="hs-fade" style={fade(d, 0.4)}>{children}</g>
    </Move>
  )
  // Слева направо: пенал с антресолью; верхний и нижний модули под ручки; нижний с профилем LINE
  const pen: Range = [0, 600]
  const mid: Range = [1150, 1750]
  const lin: Range = [2300, 2900]
  return {
    view: v,
    extremes: [P(0, 0, KB.SET), P(lin[1], 0, 560), P(0, 2480, 570), P(lin[1], 0, 0), P(0, 2480, 0), P(mid[1], 2120, 600)],
    body: () => (
      <g>
        <path d={line([P(-160, 0, 0), P(lin[1] + 220, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />
        {drop(0.25, (
          <g>
            <Plinth v={v} x={pen} depth={570} />
            <Carcass v={v} x={pen} y={[KB.PLINTH, 2100]} depth={570} />
          </g>
        ))}
        {drop(0.55, <Carcass v={v} x={pen} y={[2110, 2480]} depth={570} handle={false} />)}
        {drop(0.85, (
          <g>
            <Plinth v={v} x={mid} depth={560} />
            <Carcass v={v} x={mid} y={[KB.PLINTH, KB.PLINTH + 720]} depth={560} />
          </g>
        ))}
        {/* Верхний модуль висит на стене: передняя кромка на 280 мм глубже нижнего */}
        {drop(1.15, <Carcass v={v} x={mid} y={[1400, 2120]} depth={320} z={280} />)}
        {drop(1.45, (
          <g>
            <Plinth v={v} x={lin} depth={560} />
            <Carcass v={v} x={lin} y={[KB.PLINTH, KB.PLINTH + 780]} depth={560} line />
          </g>
        ))}
      </g>
    ),
    dims: [
      { a: [mid[0] - 90, KB.PLINTH, 0], b: [mid[0] - 90, KB.PLINTH + 720, 0], ext: [80, 0, 0], label: '720 мм', d: 2.0, above: true },
      { a: [lin[0] - 90, KB.PLINTH, 0], b: [lin[0] - 90, KB.PLINTH + 780, 0], ext: [80, 0, 0], label: '780 мм', d: 2.2, above: true },
      { a: [mid[0], 2200, 280], b: [mid[0], 2200, 600], ext: [0, -70, 0], label: '320 мм', d: 2.4, above: true },
      { a: [pen[0], 2560, 0], b: [pen[0], 2560, 570], ext: [0, -70, 0], label: '570 мм', d: 2.6, above: true },
    ],
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Раздел каталога → схема
   ══════════════════════════════════════════════════════════════════════ */

const p = (text: string) => <p className="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">{text}</p>

function LightScheme() {
  const options = finishes('Серебро', 'Белый', 'Чёрный', 'Золото')
  const [color, setColor] = useState<(typeof options)[number]['name']>('Серебро')
  return (
    <SchemePanel
      ratio={RATIO}
      aside={
        <>
          {p('Профиль ставится под навесные шкафы у передней кромки и светит на столешницу и стену — без теней от шкафов.')}
          <ColorChips label="Цвет профиля" options={options} value={color} onChange={setColor} />
        </>
      }
    >
      <SchemeSvg built={lightScene(FINISH[color])} id="light" view={VIEW} />
    </SchemePanel>
  )
}

function HandleScheme<T extends Finish>({ kind, text, options }: { kind: HandleKind; text: string; options: { name: T; color: string }[] }) {
  const [color, setColor] = useState<T>(options[0].name)
  return (
    <SchemePanel
      ratio={RATIO}
      aside={
        <>
          {p(text)}
          {options.length > 1 && <ColorChips label="Покрытие" options={options} value={color} onChange={setColor} />}
        </>
      }
    >
      <SchemeSvg built={HANDLE_SCENES[kind](FINISH[color])} id={kind} view={VIEW} />
    </SchemePanel>
  )
}

const SIZE_ROWS = [
  ['Нижние базы под накладные ручки', 'высота 720 мм'],
  ['Нижние базы с профилем LINE', 'высота 780 мм'],
  ['Верхние базы', 'глубина 320 мм'],
  ['Пеналы и антресоли', 'глубина 570 мм'],
]

function ModulesScheme() {
  return (
    <SchemePanel
      ratio={RATIO}
      aside={
        <dl className="flex flex-col gap-3">
          {SIZE_ROWS.map(([name, value]) => (
            <div key={name} className="flex items-baseline justify-between gap-4 border-b border-dotted border-border pb-3 last:border-0">
              <dt className="text-sm text-muted-foreground">{name}</dt>
              <dd className="shrink-0 text-sm font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      }
    >
      <SchemeSvg built={modulesScene()} id="modules" view={VIEW} />
    </SchemePanel>
  )
}

/** Какие разделы со схемой: id в коде и название группы — для каталога из панели */
const GROUPS: { id: string; title: string; render: () => ReactNode }[] = [
  { id: 'lighting', title: 'Накладная LED-подсветка', render: () => <LightScheme /> },
  {
    id: 'handles-profile',
    title: 'Торцевые ручки MONTE',
    render: () => (
      <HandleScheme
        kind="monte"
        text="Ручка ставится на верхнюю кромку фасада: ящик выдвигают, взявшись за неё. Длинная — по всей кромке, короткая — по центру."
        options={finishes('Чёрный матовый', 'Белый', 'Золото сатиновое', 'Сатиновый хром')}
      />
    ),
  },
  {
    id: 'handles-profile-bar',
    title: 'Профиль-ручки',
    render: () => (
      <HandleScheme
        kind="bar"
        text="Накладной профиль у верхней кромки фасада: пальцы заходят под козырёк, ничего не выступает."
        options={finishes('Чёрный матовый', 'Графит', 'Золото матовое')}
      />
    ),
  },
  {
    id: 'handles-bracket',
    title: 'Ручки-скобы QUADRA',
    render: () => (
      <HandleScheme
        kind="quadra"
        text="Одна скоба в трёх длинах: на узкий ящик — короче, на широкий фасад — длиннее."
        options={finishes('Чёрный матовый', 'Золото матовое')}
      />
    ),
  },
  {
    id: 'handles-classic',
    title: 'Неоклассика: кнопки и скобы',
    render: () => (
      <HandleScheme
        kind="olsen"
        text="Рамочные фасады: на ящике — скоба 128 мм, на дверях — кнопки. Все ручки — в матовом чёрном."
        options={finishes('Чёрный матовый')}
      />
    ),
  },
  {
    id: 'railings',
    title: 'Рейлинговые ручки',
    render: () => (
      <HandleScheme
        kind="rail"
        text="Межцентровое расстояние — между ножками: под него сверлится фасад. Четыре стандартных размера."
        options={finishes('Чёрный матовый', 'Золото брашированное', 'Матовый хром')}
      />
    ),
  },
  { id: 'technical', title: 'Схемы модулей и размеры', render: () => <ModulesScheme /> },
]

/** Схема к разделу каталога, если она есть */
export function GroupScheme({ group }: { group: CatalogGroup }) {
  const title = group.title.trim().toLowerCase()
  const match = GROUPS.find((entry) => entry.id === group.id || entry.title.toLowerCase() === title)
  return match ? <>{match.render()}</> : null
}
