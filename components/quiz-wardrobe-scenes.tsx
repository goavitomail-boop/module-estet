'use client'

import type { CSSProperties, ReactNode } from 'react'
import { BRASS, FACE, FAINT, INK, SHADE, SHADE_DEEP, line, wardrobeView, type Range } from '@/components/axo'
import { Jar } from '@/components/filling-scene'
import { Drawer } from '@/components/catalog-schemes'
import { Garment } from '@/components/storage-scene'
import { Books, swing } from '@/components/wardrobe-schemes'
import {
  CLOTH, DARK, Block, Drop, Move, Path, Question, WB,
  lagged, shift,
  type Built, type V3,
} from '@/components/scheme-kit'

/**
 * Схемы шкафного квиза — в каркасе, как «Наполнение» на главной
 * (scheme-kit.tsx). Типы шкафа показывают, чем отличаются: распашной
 * открывает двери, антресоль встаёт до потолка, встроенный заезжает в нишу,
 * гардеробная собирается из штанг и полок, стеллаж заполняется книгами.
 * Ширина — шкафы в общем масштабе с размерной линией. Наполнение
 * срабатывает на выбор: вещи повисают на штангу, ящики выезжают, полки
 * заполняются, подсветка загорается.
 *
 * Рисунок — схема: двери по 450 мм, глубина 580 мм.
 */

const v = wardrobeView
const { T, D } = WB
/** Цоколь под дверями */
const BASE = 70
const GAP = 3

const fade = (d: number, t = 0.4) => ({ '--d': lagged(d), '--t': `${t}s` }) as CSSProperties
const gap = (r: Range): Range => [r[0] + GAP / 2, r[1] - GAP / 2]
const GHOST = { fill: 'none', stroke: BRASS, strokeWidth: 1, strokeDasharray: '5 4' }

/** Пролёты секций изнутри: между боковинами и перегородками */
const sections = (x: Range, splits: number[]): Range[] => {
  const edges = [x[0], ...splits, x[1]]
  return edges.slice(0, -1).map((e, i): Range => [i === 0 ? e + T : e + T / 2, i === edges.length - 2 ? edges[i + 1] - T : edges[i + 1] - T / 2])
}

/**
 * Корпус: правый бок и крыша снаружи; изнутри — задняя стенка, левые стенки
 * секций и дно, видны только сквозь проёмы (inside); спереди — кромки
 * кольцом вокруг проёмов. Двери и выдвижное — в children, поверх
 */
function Carcass({ uid, x, H, splits = [], depth = D, inside, children }: {
  uid: string; x: Range; H: number; splits?: number[]; depth?: number; inside?: ReactNode; children?: ReactNode
}) {
  const { front, top, side } = v
  const secs = sections(x, splits)
  const yIn: Range = [BASE + T, H - T]
  const back = depth - 10
  return (
    <g strokeLinejoin="round">
      <path d={side(x[1], [0, H], [0, depth])} fill={SHADE} stroke={INK} strokeWidth={1} />
      <path d={top(x, H, [0, depth])} fill={SHADE} stroke={INK} strokeWidth={1} />
      <defs>
        <clipPath id={`${uid}-in`}>
          {secs.map((s) => <path key={s[0]} d={front(s, yIn, 0)} />)}
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-in)`}>
        <path d={front(x, yIn, back)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
        {secs.map((s) => (
          <g key={s[0]}>
            <path d={side(s[0], yIn, [0, back])} fill={SHADE} stroke={INK} strokeWidth={0.6} />
            <path d={top(s, yIn[0], [0, back])} fill={SHADE} stroke={INK} strokeWidth={0.6} />
          </g>
        ))}
        {inside}
      </g>
      <path d={front(x, [0, H], 0) + secs.map((s) => front(s, yIn, 0)).join('')} fillRule="evenodd" fill={FACE} stroke={INK} strokeWidth={1} />
      {children}
    </g>
  )
}

/** Полка: верх и кромка */
function Shelf({ s, y, depth = D }: { s: Range; y: number; depth?: number }) {
  return (
    <g strokeLinejoin="round">
      <path d={v.top(s, y, [0, depth - 10])} fill={FACE} stroke={INK} strokeWidth={0.6} />
      <path d={v.front(s, [y - T, y], 0)} fill={FACE} stroke={INK} strokeWidth={0.8} />
    </g>
  )
}

/** Штанга поперёк секции — латунью */
function Rod({ s, y, z = D / 2 }: { s: Range; y: number; z?: number }) {
  return <path d={line([v.P(s[0] + 6, y, z), v.P(s[1] - 6, y, z)])} stroke={BRASS} strokeWidth={2.6} strokeLinecap="round" />
}

/** Вещи на плечиках вдоль штанги — слева направо, ближние поверх */
function Hangers({ xs, y, z = D / 2, from = 0 }: { xs: number[]; y: number; z?: number; from?: number }) {
  return (
    <g>
      {xs.map((x, i) => <Garment key={x} v={v} x={x} y={y} z={z} kind={from + i} />)}
    </g>
  )
}

/** Стопка сложенных вещей на полке */
const FOLDS = [FACE, CLOTH, DARK, SHADE]
function Stack({ cx, y, n = 3, w = 300, z = [90, 420] as Range, from = 0 }: { cx: number; y: number; n?: number; w?: number; z?: Range; from?: number }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const color = FOLDS[(from + i) % FOLDS.length]
        const inset = (i % 2) * 12
        return <Block key={i} v={v} x={[cx - w / 2 + inset, cx + w / 2 - inset]} y={[y + i * 55, y + (i + 1) * 55]} z={z} fill={color} top={color} sw={0.6} />
      })}
    </g>
  )
}

/** Распашная дверь: ручка у свободной кромки */
function Door({ x, y, handle }: { x: Range; y: Range; handle: 'left' | 'right' | 'none' }) {
  const hx = handle === 'right' ? x[1] - 50 : x[0] + 50
  const mid = (y[0] + y[1]) / 2
  return (
    <g>
      <path d={v.front(x, y, -1)} fill={FACE} stroke={INK} strokeWidth={1} />
      {handle !== 'none' && <path d={line([v.P(hx, mid - 180, -1), v.P(hx, mid + 180, -1)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />}
    </g>
  )
}

/** Двери по 450 мм на ширину x */
const doorsOf = (x: Range, w = 450): Range[] =>
  Array.from({ length: Math.round((x[1] - x[0]) / w) }, (_, i) => gap([x[0] + i * w, x[0] + (i + 1) * w]))

/** Закрытый шкаф: корпус и двери парами, ручки у середины пары */
function Closed({ x, y }: { x: Range; y: Range }) {
  return (
    <g>
      <Block v={v} x={x} y={y} z={[0, D]} />
      {doorsOf(x).map((dx, i) => <Door key={dx[0]} x={dx} y={[y[0] + BASE + 2, y[1] - 2]} handle={i % 2 === 0 ? 'right' : 'left'} />)}
    </g>
  )
}

/** Перекрытие: линия со штриховкой — до него шкаф и встаёт */
function Ceiling({ x, y }: { x: Range; y: number }) {
  const { P } = v
  return (
    <g stroke={INK} strokeWidth={0.8}>
      <path d={line([P(x[0], y, 0), P(x[1], y, 0)])} />
      {Array.from({ length: Math.floor((x[1] - x[0]) / 150) }, (_, i) => x[0] + 75 + i * 150).map((xx) => (
        <path key={xx} d={line([P(xx, y, 0), P(xx - 90, y + 110, 0)])} strokeWidth={0.6} />
      ))}
    </g>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Тип шкафа
   ══════════════════════════════════════════════════════════════════════ */

/* ── Распашной: две двери из четырёх открываются, внутри штанга и полки ── */
export function hingedScene(): Built {
  const { P } = v
  const x: Range = [0, 1800]
  const H = 2300
  const [a, b] = sections(x, [900])
  const doors = doorsOf(x)
  const dy: Range = [BASE + 2, H - 2]
  const shelves = [520, 920, 1320, 1720]
  return {
    view: v,
    extremes: [P(-60, 0, 0), P(x[1], 0, D), P(x[1], H, D), P(0, H, 0), P(-100, 0, -450), P(-100, H, -450)],
    body: (uid) => (
      <Carcass
        uid={uid}
        x={x}
        H={H}
        splits={[900]}
        inside={
          <g>
            <Shelf s={a} y={1950} />
            <Rod s={a} y={1850} />
            <Hangers xs={[130, 250, 370, 490, 610, 730]} y={1850} />
            {shelves.map((sy, i) => (
              <g key={sy}>
                <Shelf s={b} y={sy} />
                <Stack cx={(b[0] + b[1]) / 2} y={sy} n={i % 2 === 0 ? 3 : 2} from={i} />
              </g>
            ))}
            <Shelf s={b} y={1950} />
          </g>
        }
      >
        {doors.map((dx, i) =>
          i % 2 === 0 ? (
            <Path key={dx[0]} steps={swing(dx[0], 100)} d={0.3 + i * 0.12} t={0.9}>
              <Door x={dx} y={dy} handle="right" />
            </Path>
          ) : (
            <Door key={dx[0]} x={dx} y={dy} handle="left" />
          ),
        )}
      </Carcass>
    ),
  }
}

/* ── До потолка с антресолями: антресоль встаёт на шкаф до перекрытия ── */
export function antresolScene(): Built {
  const { P, front, side, top } = v
  const x: Range = [0, 1800]
  const H = 2100
  const ceiling = 2700
  return {
    view: v,
    extremes: [P(-200, 0, 0), P(x[1], 0, D), P(x[1], ceiling, D), P(-200, ceiling, 0), P(x[1] + 200, ceiling, 0)],
    body: () => (
      <g>
        <Closed x={x} y={[0, H]} />
        {/* Контур антресоли — где она встанет */}
        <g {...GHOST}>
          <path d={front(x, [H, ceiling], 0)} />
          <path d={side(x[1], [H, ceiling], [0, D])} />
          <path d={top(x, ceiling, [0, D])} />
        </g>
        <Drop v={v} d={0.3} h={500} t={0.8}>
          <Block v={v} x={x} y={[H, ceiling]} z={[0, D]} />
          {doorsOf(x).map((dx, i) => (
            <g key={dx[0]}>
              <path d={front(dx, [H + 3, ceiling - 3], -1)} fill={FACE} stroke={INK} strokeWidth={1} />
              <path d={line([P(i % 2 === 0 ? dx[1] - 50 : dx[0] + 50, H + 80, -1), P(i % 2 === 0 ? dx[1] - 50 : dx[0] + 50, H + 260, -1)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
            </g>
          ))}
        </Drop>
        <Ceiling x={[-200, x[1] + 200]} y={ceiling} />
      </g>
    ),
  }
}

/* ── Встроенный в нишу: шкаф заезжает в проём между стенами, двери-купе ── */
export function nicheScene(): Built {
  const { P, front } = v
  const x: Range = [0, 1800]
  const H = 2400
  const top = 2650
  const wallD = D + 150
  const arrive = 0.3 + 1.0
  // Стены, которые в конце закрывают крышу и правый бок шкафа: рисуются второй раз поверх
  const walls = (
    <g>
      <Block v={v} x={x} y={[H, top]} z={[0, wallD]} fill={SHADE_DEEP} top={SHADE} />
      <Block v={v} x={[x[1], x[1] + 250]} y={[0, top]} z={[0, wallD]} fill={SHADE_DEEP} top={SHADE} side={SHADE} />
    </g>
  )
  const panels: { x: Range; z: number }[] = [
    { x: [x[0] + 2, 920], z: -22 },
    { x: [880, x[1] - 2], z: -46 },
  ]
  return {
    view: v,
    extremes: [P(-250, 0, 0), P(x[1] + 250, 0, wallD), P(x[1] + 250, top, wallD), P(-250, top, 0), P(-250, 0, -1000), P(x[1], H, -1000)],
    body: () => (
      <g>
        <Block v={v} x={[-250, 0]} y={[0, top]} z={[0, wallD]} fill={SHADE_DEEP} top={SHADE} side={SHADE} />
        <path d={front(x, [0, H], wallD)} fill={SHADE} stroke={INK} strokeWidth={0.6} />
        {walls}
        <Move from={shift(v, [0, 0, -1000])} to="none" d={0.3} t={1.0} ease="var(--out)">
          <Block v={v} x={x} y={[0, H]} z={[0, D]} />
          {panels.map((p) => (
            <g key={p.z}>
              <path d={front(p.x, [BASE, H - 6], p.z)} fill={FACE} stroke={INK} strokeWidth={1} />
              {[p.x[0] + 14, p.x[1] - 14].map((px) => (
                <path key={px} d={line([P(px, BASE, p.z), P(px, H - 6, p.z)])} stroke={BRASS} strokeWidth={1.8} />
              ))}
            </g>
          ))}
        </Move>
        <g className="hs-fade" style={fade(arrive, 0.01)}>{walls}</g>
      </g>
    ),
  }
}

/* ── Гардеробная система: открытые секции собираются — штанги, полки, ящики ── */
export function walkinScene(): Built {
  const { P } = v
  const x: Range = [0, 2400]
  const H = 2200
  const [a, b, c] = sections(x, [800, 1600])
  const slide = (d: number, children: ReactNode) => (
    <Move from={shift(v, [0, 0, -350])} to="none" d={d} t={0.7} ease="var(--out)">
      <g className="hs-fade" style={fade(d, 0.3)}>{children}</g>
    </Move>
  )
  const drawers: Range[] = [[BASE + T + 4, 420], [424, 760], [764, 1100]]
  return {
    view: v,
    extremes: [P(0, 0, 0), P(x[1], 0, D), P(x[1], H, D), P(0, H, 0)],
    body: (uid) => (
      <Carcass
        uid={uid}
        x={x}
        H={H}
        splits={[800, 1600]}
        inside={
          <g>
            {slide(0.25, (
              <g>
                <Rod s={a} y={1950} />
                <Hangers xs={[110, 230, 350, 470, 590, 700]} y={1950} />
                <Rod s={a} y={1050} />
                <Hangers xs={[140, 290, 440, 590]} y={1050} from={2} />
              </g>
            ))}
            {[1150, 1500, 1850].map((sy, i) =>
              <g key={sy}>{slide(0.5 + i * 0.12, (
                <g>
                  <Shelf s={b} y={sy} />
                  <Stack cx={(b[0] + b[1]) / 2} y={sy} n={3 - (i % 2)} from={i + 1} />
                </g>
              ))}</g>,
            )}
            {slide(0.85, (
              <g>
                {drawers.map((dy) => (
                  <g key={dy[0]}>
                    <path d={v.front(gap(b), dy, 0)} fill={FACE} stroke={INK} strokeWidth={0.9} />
                    <path d={line([P(b[0] + 300, dy[1] - 60, 0), P(b[1] - 300, dy[1] - 60, 0)])} stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
                  </g>
                ))}
              </g>
            ))}
            {slide(1.05, (
              <g>
                <Rod s={c} y={1950} />
                <Hangers xs={[1700, 1830, 1960, 2090, 2220]} y={1950} from={1} />
                <Shelf s={c} y={450} />
                <Block v={v} x={[c[0] + 60, c[0] + 360]} y={[450, 620]} z={[80, 420]} />
                <Block v={v} x={[c[0] + 420, c[0] + 720]} y={[450, 600]} z={[80, 420]} fill={CLOTH} top={CLOTH} />
              </g>
            ))}
          </g>
        }
      />
    ),
  }
}

/** Стеклянная дверь: тёмная рамка кольцом, стекло, два блика */
function GlassDoor({ x, y }: { x: Range; y: Range }) {
  const { P, front } = v
  const gx: Range = [x[0] + 40, x[1] - 40]
  const gy: Range = [y[0] + 40, y[1] - 40]
  return (
    <g>
      <path d={front(x, y, -1) + front(gx, gy, -1)} fillRule="evenodd" fill="#2b2b2b" stroke={INK} strokeWidth={0.6} />
      <path d={front(gx, gy, -1)} fill="color-mix(in oklab, var(--primary) 6%, transparent)" />
      {[0.35, 0.6].map((k) => (
        <path key={k} d={line([P(gx[0] + (gx[1] - gx[0]) * k, gy[1] - 80, -1), P(gx[0] + (gx[1] - gx[0]) * (k - 0.3), gy[1] - 420, -1)])} stroke="var(--card)" strokeOpacity={0.7} strokeWidth={1.6} strokeLinecap="round" />
      ))}
    </g>
  )
}

/* ── Стеллаж или витрина: полки заполняются книгами, витрина рядом подсвечена ── */
export function shelvingScene(): Built {
  const { P, front } = v
  const x: Range = [0, 1600]
  const H = 2000
  const depth = 400
  const [a, b] = sections(x, [800])
  const shelves = [480, 880, 1280, 1680]
  return {
    view: v,
    extremes: [P(0, 0, 0), P(x[1], 0, depth), P(x[1], H, depth), P(0, H, 0)],
    body: (uid) => (
      <Carcass
        uid={uid}
        x={x}
        H={H}
        splits={[800]}
        depth={depth}
        inside={
          <g>
            <defs>
              <linearGradient id={`${uid}-glow`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--primary)" stopOpacity="0.5" />
                <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="hs-fade" style={fade(0.3, 0.8)} d={front(b, [BASE + T, H - T], depth - 12)} fill={`url(#${uid}-glow)`} />
            {shelves.map((sy, i) => (
              <g key={sy}>
                <Shelf s={a} y={sy} depth={depth} />
                <Shelf s={b} y={sy} depth={depth} />
                <Drop v={v} d={0.35 + i * 0.15} h={200} t={0.6}>
                  <Books x0={a[0] + 40 + (i % 2) * 120} y={sy} z={110} n={6 + (i % 2)} />
                </Drop>
                <Jar at={P(b[0] + 200 + (i % 2) * 260, sy, 200)} w={110} h={150 + (i % 3) * 40} />
                <Jar at={P(b[0] + 470 - (i % 2) * 120, sy, 180)} w={80} h={120} />
              </g>
            ))}
          </g>
        }
      >
        <GlassDoor x={gap([800 + T / 2, x[1]])} y={[BASE + 2, H - 2]} />
      </Carcass>
    ),
  }
}

/* ── Нужна рекомендация: контур шкафа пунктиром и вопрос ── */
export function wardrobeUnknownScene(): Built {
  const { P, front, side, top } = v
  const x: Range = [0, 1800]
  const H = 2300
  return {
    view: v,
    extremes: [P(-60, 0, 0), P(x[1], 0, D), P(x[1], H, D), P(0, H, 0)],
    body: () => (
      <g>
        <g className="hs-fade" style={fade(0.2, 0.6)} {...GHOST}>
          <path d={front(x, [0, H], 0)} />
          <path d={side(x[1], [0, H], [0, D])} />
          <path d={top(x, H, [0, D])} />
          {[450, 900, 1350].map((dx) => <path key={dx} d={line([P(dx, BASE, 0), P(dx, H, 0)])} />)}
        </g>
        <Question p={P(900, 1150, 0)} size={300} d={0.5} />
      </g>
    ),
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Ширина: шкафы в общем масштабе
   ══════════════════════════════════════════════════════════════════════ */

const WIDEST = 9

/**
 * Шкаф из n дверей по 450: корпус, двери встают по очереди, потом размер.
 * Рамка у всех карточек шага — как у самого широкого шкафа, но по центру
 * этого: масштаб общий. ghost — «не знаю»: контур пунктиром и «? м»
 */
export function widthScene(n: number, label: string, ghost = false): Built {
  const { P, front, side, top } = v
  const W = n * 450
  const big = WIDEST * 450
  const H = 2300
  const dx = (W - big) / 2
  const frame: V3[] = [[0, 0, 0], [big, 0, 0], [big, 0, D], [0, H, D], [big, H, D], [0, H, 0], [-150, -850, 0], [big + 150, -850, 0]]
  const doors = doorsOf([0, W])
  const dimAt = ghost ? 0.5 : 0.35 + n * 0.07 + 0.2
  return {
    view: v,
    extremes: frame.map(([x, y, z]) => P(x + dx, y, z)),
    body: () => (
      <g>
        <path d={line([P(-200, 0, 0), P(W + 200, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />
        {ghost ? (
          <g className="hs-fade" style={fade(0.2, 0.6)} {...GHOST}>
            <path d={front([0, W], [0, H], 0)} />
            <path d={side(W, [0, H], [0, D])} />
            <path d={top([0, W], H, [0, D])} />
            {doors.slice(1).map((d) => <path key={d[0]} d={line([P(d[0], BASE, 0), P(d[0], H, 0)])} />)}
          </g>
        ) : (
          <g>
            <g className="hs-fade" style={fade(0.15, 0.4)}>
              <Block v={v} x={[0, W]} y={[0, H]} z={[0, D]} />
            </g>
            {doors.map((d, i) => (
              <g key={d[0]} className="hs-in" style={{ '--d': lagged(0.35 + i * 0.07), '--t': '0.5s', '--from': 'translateY(-6px)', '--e': 'var(--out)' } as CSSProperties}>
                <Door x={d} y={[BASE + 2, H - 2]} handle={i % 2 === 0 ? 'right' : 'left'} />
              </g>
            ))}
          </g>
        )}
      </g>
    ),
    dims: [{ a: [0, -110, 0], b: [W, -110, 0], ext: [0, 90, 0], label, d: dimAt }],
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Наполнение: секция шкафа, срабатывает на выбор
   ══════════════════════════════════════════════════════════════════════ */

const ONE: Range = [0, 900]
const ONE_H = 2300
const [ONE_IN] = sections(ONE, [])
const oneExtremes = () => [v.P(0, 0, 0), v.P(ONE[1], 0, D), v.P(ONE[1], ONE_H, D), v.P(0, ONE_H, 0)]
const ONE_XS = [130, 250, 370, 490, 610, 730]

/* ── Штанги: вещи по очереди повисают на штангу ── */
export function rodsScene(): Built {
  return {
    view: v,
    extremes: oneExtremes(),
    body: (uid) => (
      <Carcass
        uid={uid}
        x={ONE}
        H={ONE_H}
        inside={
          <g>
            <Shelf s={ONE_IN} y={1950} />
            <Rod s={ONE_IN} y={1850} />
            {ONE_XS.map((x, i) => (
              <Drop key={x} v={v} d={0.25 + i * 0.09} h={160} t={0.6}>
                <Garment v={v} x={x} y={1850} z={D / 2} kind={i} />
              </Drop>
            ))}
            <Shelf s={ONE_IN} y={520} />
          </g>
        }
      />
    ),
  }
}

/* ── Выдвижные ящики: три ящика выезжают по очереди, снизу вверх ── */
export function drawersScene(): Built {
  const { P } = v
  const travel = 360
  const ys: Range[] = [[BASE + T, 450], [450, 830], [830, 1210]].map((r) => gap(r as Range))
  return {
    view: v,
    extremes: [...oneExtremes(), P(ONE_IN[0], BASE, -travel)],
    body: (uid) => (
      <Carcass
        uid={uid}
        x={ONE}
        H={ONE_H}
        inside={
          <g>
            <Shelf s={ONE_IN} y={1600} />
            <Stack cx={300} y={1600} n={3} w={280} />
            <Stack cx={620} y={1600} n={2} w={260} from={2} />
            <Shelf s={ONE_IN} y={1950} />
            <Shelf s={ONE_IN} y={1230} />
          </g>
        }
      >
        <defs>
          {ys.map((y) => (
            <clipPath key={y[0]} id={`${uid}-d${Math.round(y[0])}`}><path d={v.sweptOpening(ONE_IN, y, 0, travel)} /></clipPath>
          ))}
        </defs>
        {ys.map((y, i) => (
          <g key={y[0]} clipPath={`url(#${uid}-d${Math.round(y[0])})`}>
            <Move to={shift(v, [0, 0, -travel])} d={0.3 + i * 0.2} t={0.9}>
              <Drawer v={v} x={ONE_IN} y={y}>
                <Block v={v} x={[ONE_IN[0] + 60, ONE_IN[0] + 330]} y={[y[0] + 22, y[0] + 110]} z={[60, 420]} fill={CLOTH} top={CLOTH} sw={0.6} />
                <Block v={v} x={[ONE_IN[0] + 380, ONE_IN[0] + 640]} y={[y[0] + 22, y[0] + 90]} z={[60, 420]} sw={0.6} />
              </Drawer>
              <path d={line([P(ONE_IN[0] + 300, y[1] - 60, 0), P(ONE_IN[1] - 300, y[1] - 60, 0)])} stroke={INK} strokeWidth={1.6} strokeLinecap="round" />
            </Move>
          </g>
        ))}
      </Carcass>
    ),
  }
}

/* ── Полки: на пустые полки ложатся стопки вещей ── */
export function shelvesScene(): Built {
  const shelves = [520, 900, 1280, 1660, 2040]
  return {
    view: v,
    extremes: oneExtremes(),
    body: (uid) => (
      <Carcass
        uid={uid}
        x={ONE}
        H={ONE_H}
        inside={
          <g>
            {shelves.map((sy) => <Shelf key={sy} s={ONE_IN} y={sy} />)}
            {[BASE + T, ...shelves.slice(0, -1)].map((sy, i) => (
              <Drop key={sy} v={v} d={0.25 + i * 0.12} h={140} t={0.55}>
                <Stack cx={280} y={sy} n={3 - (i % 2)} w={300} from={i} />
                <Stack cx={630} y={sy} n={2 + (i % 2)} w={280} from={i + 2} />
              </Drop>
            ))}
          </g>
        }
      />
    ),
  }
}

/* ── LED-подсветка: под полкой загорается лента, свет ложится на вещи ── */
export function ledScene(): Built {
  const { P, front } = v
  const strip: Range = [1950 - T - 18, 1950 - T]
  return {
    view: v,
    extremes: oneExtremes(),
    body: (uid) => (
      <Carcass
        uid={uid}
        x={ONE}
        H={ONE_H}
        inside={
          <g>
            <defs>
              <linearGradient id={`${uid}-glow`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--primary)" stopOpacity="0.55" />
                <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="hs-fade" style={fade(0.45, 0.8)} d={front(ONE_IN, [900, strip[0]], D - 12)} fill={`url(#${uid}-glow)`} />
            <Shelf s={ONE_IN} y={1950} />
            <Rod s={ONE_IN} y={1800} />
            <Hangers xs={ONE_XS} y={1800} />
            {/* Свет сверху вниз — поверх вещей */}
            <path
              className="hs-fade"
              style={fade(0.5, 0.8)}
              d={`${line([P(ONE_IN[0], strip[0], 40), P(ONE_IN[1], strip[0], 40), P(ONE_IN[1], 1000, -40), P(ONE_IN[0], 1000, -40)])}Z`}
              fill={`url(#${uid}-glow)`}
            />
            <path className="hs-fade" style={fade(0.35, 0.3)} d={front(ONE_IN, strip, 30)} fill={BRASS} />
            <Shelf s={ONE_IN} y={520} />
          </g>
        }
      />
    ),
  }
}
