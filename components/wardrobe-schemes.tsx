'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { BRASS, FACE, FAINT, INK, SHADE, SHADE_DEEP, line, wardrobeView, type Range } from '@/components/axo'
import { Jar } from '@/components/filling-scene'
import { PlayWhenSeen } from '@/components/play-when-seen'
import { Path, SchemeSvg, WB, affine, keys, lagged, rotY, type Built } from '@/components/scheme-kit'
import { ColorChips, SchemePanel } from '@/components/scheme-panel'
import { vetrine } from '@/lib/wardrobes-data'

/**
 * Схемы на странице шкафов — в том же каркасе, что системы хранения
 * (scheme-kit.tsx): серии LINE и BASE — чем открываются двери, и витрина
 * Vetrine — рамка и стекло на выбор. Подписи и варианты — из
 * lib/wardrobes-data.ts, рисунок — схема.
 */

const v = wardrobeView

/** Цвета рамки и профиля — для схемы; образцы — на фото раздела */
const FRAME = { Чёрный: '#2b2b2b', Латунь: '#c2a36b', Серебро: '#c3c6ca', Белый: '#f3f2ee' } as const
type Frame = keyof typeof FRAME

/** Стекло: заливка поверх содержимого — от почти прозрачного до сатина, который его прячет */
const GLASS = {
  Прозрачное: 'color-mix(in oklab, var(--primary) 6%, transparent)',
  Сатин: 'color-mix(in oklab, var(--card) 78%, transparent)',
  Графит: 'color-mix(in oklab, #2b2b2b 58%, transparent)',
  Бронза: 'color-mix(in oklab, #8a6a45 50%, transparent)',
  Структурное: 'color-mix(in oklab, var(--primary) 8%, transparent)',
} as const
type Glass = keyof typeof GLASS

/** Дверь на петлях: поворот к зрителю вокруг вертикальной кромки (hinge — x кромки, знак — в какую сторону) */
function swing(hinge: number, deg: number) {
  return keys((s) => affine(v, [[hinge, 0, 0], [hinge + 1000, 0, 0], [hinge, 1000, 0]], rotY([hinge, 0, 0], deg * s)))
}

/** Корпус-фрагмент: правый бок, верх (если не обрезан), внутри — задняя стенка и полки */
function Body({ uid, x, y, cutBottom, cutTop, shelves = [], children }: { uid: string; x: Range; y: Range; cutBottom?: boolean; cutTop?: boolean; shelves?: number[]; children?: ReactNode }) {
  const { P, front, top, side } = v
  const inner: Range = [x[0] + WB.T, x[1] - WB.T]
  const yIn: Range = [y[0], y[1] - (cutTop ? 0 : WB.T)]
  return (
    <g strokeLinejoin="round">
      <path d={side(x[1], y, [0, WB.D])} fill={SHADE} stroke={INK} strokeWidth={1} />
      {!cutTop && <path d={top(x, y[1], [0, WB.D])} fill={SHADE} stroke={INK} strokeWidth={1} />}
      {/* Внутренность видна только сквозь проём: дальше её закрывают боковины */}
      <defs>
        <clipPath id={`${uid}-in`}><path d={front(inner, yIn, 0)} /></clipPath>
      </defs>
      <g clipPath={`url(#${uid}-in)`}>
        <path d={front(inner, yIn, WB.D - 10)} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.8} />
        <path d={side(inner[0], yIn, [0, WB.D - 10])} fill={SHADE} stroke={INK} strokeWidth={0.6} />
        {shelves.map((sy) => (
          <g key={sy}>
            <path d={top(inner, sy, [0, WB.D - 10])} fill={FACE} stroke={INK} strokeWidth={0.6} />
            <path d={front(inner, [sy - WB.T, sy], 0)} fill={FACE} stroke={INK} strokeWidth={0.8} />
          </g>
        ))}
        {children}
      </g>
      <path d={front([x[0], inner[0]], y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
      <path d={front([inner[1], x[1]], y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
      {(cutTop || cutBottom) && (
        <g stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" fill="none">
          {cutTop && <path d={line([P(x[0] - 60, y[1], 0), P(x[1], y[1], 0), P(x[1], y[1], WB.D)])} />}
          {cutBottom && <path d={line([P(x[0] - 60, y[0], 0), P(x[1], y[0], 0), P(x[1], y[0], WB.D)])} />}
        </g>
      )}
    </g>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Две серии
   ══════════════════════════════════════════════════════════════════════ */

const SERIES_VIEW = { w: 400, h: 260 }

/** Двери фрагментом по высоте: LINE — гладкие с профилем по кромке, BASE — рамочные с ручками */
function seriesScene(id: 'LINE' | 'BASE'): Built {
  const { P, front } = v
  const x: Range = [0, 932]
  const y: Range = [500, 1700]
  const doors: { x: Range; hinge: number; deg: number; edge: number }[] = [
    { x: [WB.T + 1.5, 466 - 1.5], hinge: WB.T, deg: 24, edge: 466 - 1.5 },
    { x: [466 + 1.5, 932 - WB.T - 1.5], hinge: 932 - WB.T, deg: -24, edge: 466 + 1.5 },
  ]
  const color = id === 'LINE' ? FRAME.Латунь : '#2b2b2b'
  return {
    view: v,
    extremes: [P(x[0] - 60, y[0], 0), P(x[1], y[1], WB.D), P(x[0] - 60, y[1], 0), P(x[1], y[0], 0), P(x[0], y[0], -300)],
    body: (uid) => (
      <g>
        <Body uid={uid} x={x} y={y} cutTop cutBottom shelves={[1120]} />
        {doors.map((door) => {
          const handleX = door.edge + (door.hinge < door.edge ? -1 : 1) * (id === 'LINE' ? 9 : 70)
          return (
            <Path key={door.hinge} steps={swing(door.hinge, door.deg)} d={1.25} t={1.0}>
              <path d={front(door.x, y, 0)} fill={FACE} stroke={INK} strokeWidth={1} />
              {/* BASE — рамочный фасад: на фрагменте видны продольные рамки */}
              {id === 'BASE' &&
                [door.x[0] + 60, door.x[1] - 60].map((fx) => (
                  <path key={fx} d={line([P(fx, y[0], 0), P(fx, y[1], 0)])} stroke={INK} strokeWidth={0.7} />
                ))}
              {id === 'LINE' ? (
                // Профиль по кромке двери прочерчивается снизу вверх
                <path
                  className="hs-draw-y"
                  style={{ '--d': lagged(0.35), '--t': '0.7s', '--origin': 'bottom' } as CSSProperties}
                  d={front([handleX - 9, handleX + 9], y, -2)}
                  fill={color}
                  stroke={INK}
                  strokeWidth={0.5}
                />
              ) : (
                <g className="hs-in" style={{ '--d': lagged(0.4), '--t': '0.5s', '--from': 'scale(0.4)', '--e': 'var(--pop)' } as CSSProperties}>
                  <path d={line([P(handleX, 1000, 0), P(handleX, 1000, -30), P(handleX, 1320, -30), P(handleX, 1320, 0)])} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                </g>
              )}
            </Path>
          )
        })}
      </g>
    ),
    notes: [id === 'LINE' ? { at: [700, 1450, -150], text: 'Профиль 3000 мм', d: 2.3 } : { at: [700, 1450, -150], text: 'Пять коллекций ручек', d: 2.3 }],
  }
}

/** Схема в карточке серии: двери открываются за профиль (LINE) или за ручки (BASE) */
export function SeriesScheme({ id }: { id: 'LINE' | 'BASE' }) {
  return (
    <div className="paper relative mb-5 overflow-hidden rounded-xl" style={{ aspectRatio: `${SERIES_VIEW.w} / ${SERIES_VIEW.h}` }} aria-hidden="true">
      <PlayWhenSeen className="ss absolute inset-0">
        <SchemeSvg built={seriesScene(id)} id={`series-${id}`} view={SERIES_VIEW} pad={{ x: 14, top: 16, bottom: 14 }} />
      </PlayWhenSeen>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Витрины
   ══════════════════════════════════════════════════════════════════════ */

const VETRINE_VIEW = { w: 440, h: 340 }

/** Книги на полке — корешками к зрителю */
function Books({ x0, y, z, n }: { x0: number; y: number; z: number; n: number }) {
  const widths = [34, 28, 40, 30, 36, 26, 38]
  const heights = [240, 210, 260, 200, 230, 190, 250]
  let x = x0
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const w = widths[i % widths.length]
        const h = heights[i % heights.length]
        const el = (
          <g key={i} strokeLinejoin="round">
            <path d={v.side(x + w, [y, y + h], [z, z + 200])} fill={SHADE_DEEP} stroke={INK} strokeWidth={0.5} />
            <path d={v.top([x, x + w], y + h, [z, z + 200])} fill={SHADE} stroke={INK} strokeWidth={0.5} />
            <path d={v.front([x, x + w], [y, y + h], z)} fill={i % 3 === 0 ? 'color-mix(in oklab, var(--primary) 30%, var(--card))' : i % 3 === 1 ? FACE : SHADE} stroke={INK} strokeWidth={0.5} />
          </g>
        )
        x += w + 2
        return el
      })}
    </g>
  )
}

function vetrineScene(frame: string, glass: Glass): Built {
  const { P, front } = v
  const x: Range = [0, 932]
  const y: Range = [900, 2200]
  const inner: Range = [WB.T, 932 - WB.T]
  const shelves = [1320, 1760]
  const light: Range = [y[1] - WB.T - 30, y[1] - WB.T]
  const doors: { x: Range; hinge: number; deg: number }[] = [
    { x: [inner[0] + 1.5, 466 - 1.5], hinge: inner[0], deg: 0 },
    { x: [466 + 1.5, inner[1] - 1.5], hinge: inner[1], deg: -62 },
  ]
  const glassPane = (dx: Range) => {
    const gx: Range = [dx[0] + 22, dx[1] - 22]
    const gy: Range = [y[0] + 22, y[1] - WB.T - 22]
    return (
      <g>
        {/* Рамка — кольцом: внутри стекло, сквозь него видно полки */}
        <path d={front(dx, [y[0], y[1] - WB.T], -1) + front(gx, gy, -1)} fillRule="evenodd" fill={frame} stroke={INK} strokeWidth={0.6} style={{ transition: 'fill 0.4s' }} />
        <path d={front(gx, gy, -1)} fill={GLASS[glass]} stroke="none" style={{ transition: 'fill 0.4s' }} />
        {glass === 'Структурное'
          ? Array.from({ length: Math.floor((gx[1] - gx[0]) / 24) }, (_, i) => gx[0] + 12 + i * 24).map((lx) => (
              <path key={lx} d={line([P(lx, gy[0], -1), P(lx, gy[1], -1)])} stroke={INK} strokeOpacity={0.25} strokeWidth={0.5} />
            ))
          : [0.3, 0.55].map((k) => (
              <path key={k} d={line([P(gx[0] + (gx[1] - gx[0]) * k, gy[1] - 60, -1), P(gx[0] + (gx[1] - gx[0]) * (k - 0.25), gy[1] - 360, -1)])} stroke="var(--card)" strokeOpacity={0.7} strokeWidth={1.6} strokeLinecap="round" />
            ))}
      </g>
    )
  }
  return {
    view: v,
    extremes: [P(x[0] - 60, y[0], 0), P(x[1], y[1], WB.D), P(x[0] - 60, y[1], 0), P(x[1], y[0], 0), P(inner[1] - 466, y[0], -420)],
    body: (uid) => (
      <g>
        <defs>
          <linearGradient id={`${uid}-glow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <Body uid={uid} x={x} y={y} cutBottom shelves={shelves}>
          {/* Подсветка сверху загорается — свет на задней стенке */}
          <path d={front(inner, [y[0], light[0]], WB.D - 30)} className="hs-fade" style={{ '--d': lagged(0.4), '--t': '0.9s' } as CSSProperties} fill={`url(#${uid}-glow)`} />
          {/* Содержимое на полках */}
          <Books x0={70} y={shelves[0]} z={120} n={6} />
          <Jar at={P(620, shelves[0], 260)} w={110} h={200} />
          <Jar at={P(760, shelves[0], 200)} w={80} h={140} />
          <Books x0={520} y={shelves[1]} z={140} n={7} />
          <Jar at={P(200, shelves[1], 240)} w={120} h={170} />
          <Jar at={P(330, y[0], 260)} w={140} h={230} />
          <Books x0={560} y={y[0]} z={140} n={5} />
          <path d={front(inner, light, 30)} className="hs-fade" style={{ '--d': lagged(0.4), '--t': '0.5s' } as CSSProperties} fill={BRASS} />
        </Body>
        {/* Двери: левая закрыта — видно стекло, правая открывается */}
        {doors.map((door) =>
          door.deg === 0 ? (
            <g key={door.hinge}>{glassPane(door.x)}</g>
          ) : (
            <Path key={door.hinge} steps={swing(door.hinge, door.deg)} d={1.2} t={1.1}>
              {glassPane(door.x)}
            </Path>
          ),
        )}
      </g>
    ),
    notes: [{ at: [466, light[0] - 60, 30], text: 'Подсветка внутри', d: 1.0 }],
  }
}

/** Витрина: схема, рамка и стекло — из вариантов каталога */
export function VetrineScheme() {
  const frames = (vetrine.options[0].values as Frame[]).map((name) => ({ name, color: FRAME[name] }))
  const smooth = vetrine.options[1].values as Glass[]
  const glassOptions = [...smooth, 'Структурное' as const].map((name) => ({ name, color: GLASS[name] }))
  const [frame, setFrame] = useState<Frame>(frames[0].name)
  const [glass, setGlass] = useState<Glass>('Прозрачное')
  return (
    <SchemePanel
      ratio={`${VETRINE_VIEW.w} / ${VETRINE_VIEW.h}`}
      className="mb-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
      aside={
        <>
          <ColorChips label={vetrine.options[0].title} options={frames} value={frame} onChange={setFrame} />
          <ColorChips label="Стекло" options={glassOptions} value={glass} onChange={setGlass} />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Гладкое стекло — прозрачное, сатин, графит или бронза; структурное — прозрачное.
          </p>
        </>
      }
    >
      <SchemeSvg built={vetrineScene(FRAME[frame], glass)} id="vetrine" view={VETRINE_VIEW} />
    </SchemePanel>
  )
}
