'use client'

import type { CSSProperties } from 'react'
import { BookOpen, Bell, Palette, Phone, Ruler } from 'lucide-react'
import { BRASS, FACE, FAINT, INK, SHADE, SHADE_DEEP, axonometry, fitTo, line, shape, type Range } from '@/components/axo'
import { Later } from '@/components/play-when-seen'
import { enter, POP } from '@/components/scene-kit'
import { Block, Cut, DARK, GLASS, SchemeSvg, at, lagged, ring, type Built } from '@/components/scheme-kit'
import { MEASUREMENT_SLOTS } from '@/lib/measurement-slots'
import { cn } from '@/lib/utils'
import './booking-scenes.css'

/**
 * Сцены формы записи на замер (measurement-booking.tsx) — в каркасе, как
 * схемы квиза (scheme-kit.tsx). У каждого шага своя:
 *
 * 1. Время визита — лазер прочерчивает стену кухни, вдоль неё пунктиром
 *    встают будущие модули: замер — основа проекта.
 * 2. Контакты — звонок от «Модуль Эстет»: в сообщении уже выбранные дата и
 *    время, имя подставляется, пока его вводят; потом — напоминание.
 * 3. Адрес — план квартала: прочерчивается маршрут, на дом падает метка
 *    с введённым адресом, рядом — что мастер привезёт с собой.
 *
 * Тексты — из самой формы. Сцена встаёт, когда шаг уже выехал (Later), и
 * отыгрывает один раз; при «уменьшить движение» — сразу конечный кадр.
 */

const VIEW = { w: 400, h: 200 }
const PAD = { x: 12, top: 14, bottom: 12 }

/* ══════════════════════════════════════════════════════════════════════
   1. Время визита: лазерный замер стены
   ══════════════════════════════════════════════════════════════════════ */

const wall = axonometry({ deg: 8, scale: 0.95 }, { deg: 36, scale: 0.55 })
const ROOM = { W: 3000, H: 1700, D: 900 }
const BEAM = { y: 1000, z: ROOM.D - 120 }

function measureScene(): Built {
  const v = wall
  const { P, front, top } = v
  const { W, H, D } = ROOM
  const lower: Range[] = [[0, 600], [600, 1200], [1200, 1800], [1800, 2400], [2400, W]]
  const upper: Range[] = [[0, 600], [600, 1200], [1200, 1800]]
  const ghost = { fill: 'none', stroke: BRASS, strokeWidth: 1, strokeDasharray: '4 3' }
  return {
    view: v,
    extremes: [P(0, 0, 0), P(W, 0, 0), P(W, 0, D), P(0, H, D), P(W, H, D), P(0, H, 0)],
    body: () => (
      <g>
        <path d={top([0, W], 0, [0, D])} fill={FACE} stroke={INK} strokeWidth={0.8} />
        <g fill={SHADE_DEEP}>
          <Cut pts={[P(0, 0, 0), P(0, 0, D), P(0, H, D), P(0, H, 0)]} />
        </g>
        <g fill={SHADE}>
          <Cut pts={[P(0, 0, D), P(W, 0, D), P(W, H, D), P(0, H, D)]} />
        </g>
        {/* Окно: рама, створки, подоконник */}
        <path d={front([1950, 2700], [900, 1640], D)} fill={GLASS} stroke={INK} strokeWidth={0.9} />
        <path d={line([P(2325, 900, D), P(2325, 1640, D)])} stroke={INK} strokeWidth={0.7} />
        <path d={top([1910, 2740], 900, [D - 60, D])} fill={FACE} stroke={INK} strokeWidth={0.8} />
        {/* Розетки на стене */}
        {[450, 1250].map((x) => (
          <path key={x} d={front([x, x + 80], [1100, 1180], D)} fill={FACE} stroke={INK} strokeWidth={0.7} />
        ))}
        {/* Будущие модули встают пунктиром по размерам */}
        <g {...ghost}>
          {lower.map((x, i) => (
            <path key={x[0]} className="hs-fade" style={{ '--d': lagged(1.15 + i * 0.08), '--t': '0.35s' } as CSSProperties} d={front(x, [100, 858], D - 585)} />
          ))}
          <path className="hs-fade" style={{ '--d': lagged(1.55), '--t': '0.35s' } as CSSProperties} d={top([0, W], 858, [D - 585, D])} />
          {upper.map((x, i) => (
            <path key={x[0]} className="hs-fade" style={{ '--d': lagged(1.6 + i * 0.08), '--t': '0.35s' } as CSSProperties} d={front(x, [1400, H], D - 320)} />
          ))}
        </g>
        {/* Лазер на левой стене и луч вдоль стены */}
        <g className="hs-in" style={at(0.1, POP)}>
          <Block v={v} x={[0, 90]} y={[BEAM.y - 45, BEAM.y + 45]} z={[BEAM.z - 40, BEAM.z + 40]} fill={DARK} />
        </g>
        <path className="ss-line" pathLength={1} d={line([P(90, BEAM.y, BEAM.z), P(W, BEAM.y, BEAM.z)])} stroke={BRASS} strokeWidth={1.6} fill="none" style={{ '--d': lagged(0.35) } as CSSProperties} />
        <path className="hs-in" style={at(1.0, { t: 0.4, from: 'scale(0.2)', ease: 'var(--pop)' })} d={ring(v, W - 20, BEAM.y, BEAM.z, 70)} fill={BRASS} />
      </g>
    ),
    // Бирки — на свободных местах: над стеной справа (она уходит вниз) и на полу
    notes: [
      { at: [2300, H + 120, D], text: 'Лазерный замер', d: 1.0 },
      { at: [800, 0, 150], text: '40–90 минут', d: 1.9 },
    ],
  }
}

/* ══════════════════════════════════════════════════════════════════════
   3. Адрес: маршрут по кварталу и метка
   ══════════════════════════════════════════════════════════════════════ */

/** План сверху, как планировки в квизе: вертикаль укорочена */
const city = axonometry({ deg: 20, scale: 0.9 }, { deg: 40, scale: 0.85 }, 0.75)
const GROUND = { W: 6400, D: 2600 }
const COLS: Range[] = [[200, 1600], [2100, 3500], [4000, 5400], [5900, 6400]]
const ROWS: Range[] = [[200, 1100], [1600, 2500]]
const HEIGHTS = [[320, 520, 260, 420], [450, 300, 380, 520]]
/** Дом, куда едем: передний ряд, третий квартал */
const HOME = { x: COLS[2], z: ROWS[0], h: HEIGHTS[0][2] }
const PIN_AT: [number, number, number] = [(HOME.x[0] + HOME.x[1]) / 2, HOME.h, (HOME.z[0] + HOME.z[1]) / 2]
const ROUTE: Array<[number, number, number]> = [[0, 0, 1350], [3750, 0, 1350], [3750, 0, 650], [HOME.x[0], 0, 650]]
const PIN_H = 720
const ROOF = 'color-mix(in oklab, var(--primary) 22%, var(--card))'

const cityExtremes = () => {
  const { P } = city
  return [P(0, 0, 0), P(GROUND.W, 0, 0), P(GROUND.W, 0, GROUND.D), P(0, 0, GROUND.D), P(0, 600, GROUND.D), P(GROUND.W, 600, GROUND.D)]
}

/** Метка на карте — силуэтом без перекоса: голова-круг и острие вниз */
function Pin({ base }: { base: [number, number] }) {
  const r = 230
  const cy = PIN_H - r
  const head = Array.from({ length: 25 }, (_, i) => {
    const a = (-35 + (i / 24) * 250) * (Math.PI / 180)
    return [r * Math.cos(a), cy + r * Math.sin(a)] as [number, number]
  })
  const hole = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    return [90 * Math.cos(a), cy + 90 * Math.sin(a)] as [number, number]
  })
  return (
    <g>
      <path d={shape(base, [[0, 0], ...head.reverse()])} fill={BRASS} stroke={INK} strokeWidth={0.9} strokeLinejoin="round" />
      <path d={shape(base, hole)} fill={FACE} stroke={INK} strokeWidth={0.6} />
    </g>
  )
}

function routeScene(): Built {
  const v = city
  const { P, top } = v
  const blocks = ROWS.flatMap((z, r) => COLS.map((x, c) => ({ x, z, h: HEIGHTS[r][c] })))
  // Дальний ряд раньше ближнего, в ряду — слева направо: ближние перекрывают дальние
  const order = [...blocks].sort((a, b) => b.z[0] - a.z[0] || a.x[0] - b.x[0])
  return {
    view: v,
    extremes: cityExtremes(),
    body: () => (
      <g>
        <path d={top([0, GROUND.W], 0, [0, GROUND.D])} fill={FACE} stroke={INK} strokeWidth={0.8} />
        {/* Осевые улиц */}
        <g stroke={FAINT} strokeWidth={0.6} strokeDasharray="5 5">
          <path d={line([P(0, 0, 1350), P(GROUND.W, 0, 1350)])} />
          {[1850, 3750, 5650].map((x) => <path key={x} d={line([P(x, 0, 0), P(x, 0, GROUND.D)])} />)}
        </g>
        {order.map((b) => (
          // Дом, куда едем, — с латунной крышей
          <Block key={`${b.x[0]}-${b.z[0]}`} v={v} x={b.x} y={[0, b.h]} z={b.z} top={b.x === HOME.x && b.z === HOME.z ? ROOF : SHADE} />
        ))}
        {/* Маршрут прочерчивается поверх квартала */}
        <path className="ss-line" pathLength={1} d={line(ROUTE.map((p) => P(...p)))} fill="none" stroke={BRASS} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" style={{ '--d': lagged(0.3), animationDuration: '1s' } as CSSProperties} />
        <path className="hs-in" style={at(0.25, POP)} d={ring(v, ROUTE[0][0] + 60, 0, ROUTE[0][2], 70)} fill={BRASS} />
        {/* Метка падает на крышу, по крыше расходится круг */}
        <path className="hs-in" style={at(1.45, { t: 0.5, from: 'scale(0.3)', ease: 'var(--pop)' })} d={ring(v, PIN_AT[0], PIN_AT[1] + 1, PIN_AT[2], 330)} fill="none" stroke={BRASS} strokeWidth={1.2} />
        <g className="hs-in" style={at(1.25, { t: 0.6, from: 'translateY(-60px)', ease: 'var(--pop)' })}>
          <Pin base={P(...PIN_AT)} />
        </g>
      </g>
    ),
  }
}

const ROUTE_BUILT = routeScene()

/** Где на кадре встаёт подпись метки — над её головой, в процентах кадра */
function pinLabelAt() {
  const { fit, tx, ty } = fitTo(cityExtremes(), VIEW, PAD)
  const [x, y] = city.P(...PIN_AT)
  const headTop = y - (PIN_H + 60) * 0.26
  return { left: ((x * fit + tx) / VIEW.w) * 100, top: ((headTop * fit + ty) / VIEW.h) * 100 }
}
const PIN_LABEL = pinLabelAt()

/** Что мастер привозит — из описания шага: образцы, лазерный инструмент, каталоги фурнитуры */
const KIT = [
  { icon: Palette, text: 'Образцы' },
  { icon: Ruler, text: 'Лазер' },
  { icon: BookOpen, text: 'Каталоги' },
]

function RouteScene({ city: town, address }: { city: string; address: string }) {
  return (
    <>
      <SchemeSvg built={ROUTE_BUILT} id="booking-route" view={VIEW} pad={PAD} />
      <span className="hs-in pointer-events-none absolute max-w-[46%]" style={{ left: `${PIN_LABEL.left}%`, top: `${PIN_LABEL.top}%`, ...enter(1.65, POP) }}>
        <span className="plan-tag plan-tag--dot -translate-x-1/2 -translate-y-full">
          <span className="plan-tag__title">{town.trim() || 'Город'}</span>
          <span className="plan-tag__value block max-w-[11rem] truncate">{address.trim() || 'Адрес уточним по телефону'}</span>
        </span>
      </span>
      {/* Внизу слева под кварталом пусто — там то, что мастер везёт с собой */}
      <span className="pointer-events-none absolute bottom-[6%] left-[3%] flex gap-1">
        {KIT.map(({ icon: Icon, text }, i) => (
          <span key={text} className="hs-in inline-flex items-center gap-1 rounded-full border border-primary/50 bg-card/90 px-2 py-0.5 text-[10px] font-semibold text-foreground sm:text-[11px]" style={enter(2.0 + i * 0.15, POP)}>
            <Icon className="size-3 text-primary" aria-hidden="true" />
            {text}
          </span>
        ))}
      </span>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   2. Контакты: звонок с подтверждением
   ══════════════════════════════════════════════════════════════════════ */

/** «чт, 23 окт.» — коротко, как в подсказках дат формы */
function shortDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`)
  if (!iso || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' })
}

function CallScene({ name, date, time }: { name: string; date: string; time: string }) {
  const slot = MEASUREMENT_SLOTS.find((s) => s.value === time)
  const when = [shortDate(date), slot?.time].filter(Boolean).join(', ')
  const first = name.trim().split(/\s+/)[0]
  return (
    <div className="absolute inset-0 flex items-center justify-center p-3">
      <div className="hs-in w-full max-w-[340px] rounded-2xl border border-border bg-card p-3 shadow-[0_14px_30px_-18px_rgba(0,0,0,0.45)]" style={enter(0.1, { t: 0.7, from: 'translateY(14px) scale(0.96)' })}>
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-9 shrink-0 items-center justify-center">
            {/* Звонок: от аватара расходятся круги */}
            {[0.45, 0.85, 1.25].map((d) => (
              <span key={d} className="bk-ring absolute inset-0 rounded-full border-2 border-primary" style={{ '--d': `${d}s` } as CSSProperties} />
            ))}
            <span className="flyer-title relative flex size-9 items-center justify-center rounded-full bg-primary text-base text-primary-foreground">М</span>
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-bold text-foreground">Модуль Эстет</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="size-3 text-primary" aria-hidden="true" />
              подтверждение замера
            </span>
          </span>
        </div>
        <p className="hs-in mt-2.5 rounded-2xl rounded-tl-md bg-muted px-3 py-2 text-[12px] leading-snug text-foreground sm:text-[13px]" style={enter(0.75, { t: 0.5, from: 'translate(-6%, 20%) scale(0.92)' })}>
          {/* Это звонок, который будет после заявки: время на нём только
              подтверждают, закреплённым оно становится после разговора */}
          {first ? `${first}, здравствуйте!` : 'Здравствуйте!'} Звоним подтвердить замер{when ? <>: <b className="font-semibold">{when}</b>. Вам удобно?</> : '.'}
        </p>
        <span className="hs-in mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/60 px-2.5 py-1 text-[11px] font-semibold text-primary" style={enter(1.3, POP)}>
          <Bell className="size-3" aria-hidden="true" />
          Напомним и позвоним за 2 часа до выезда
        </span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Сцена шага
   ══════════════════════════════════════════════════════════════════════ */

const MEASURE_BUILT = measureScene()

/** Рамка сцены над полями шага: встаёт, когда шаг выехал, и отыгрывает один раз */
export function BookingScene({ step, date, time, name, city: town, address }: {
  step: number; date: string; time: string; name: string; city: string; address: string
}) {
  return (
    <div className="paper relative mx-auto w-full max-w-[440px] shrink-0 overflow-hidden rounded-2xl border border-primary/30" style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }} aria-hidden="true">
      <Later after={380}>
        <span className="hs ss ss-card absolute inset-0 block">
          {step === 1 && <SchemeSvg built={MEASURE_BUILT} id="booking-measure" view={VIEW} pad={PAD} />}
          {step === 2 && <CallScene name={name} date={date} time={time} />}
          {step === 3 && <RouteScene city={town} address={address} />}
        </span>
      </Later>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   Циферблат слота времени
   ══════════════════════════════════════════════════════════════════════ */

/** Точка на циферблате 40×40: угол от двенадцати по часовой */
const onDial = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return `${(20 + r * Math.sin(a)).toFixed(2)} ${(20 - r * Math.cos(a)).toFixed(2)}`
}

/**
 * Циферблат слота: латунная дуга — часы визита (из MEASUREMENT_SLOTS).
 * Выбрали слот — дуга прочерчивается заново и стрелка проходит от начала
 * к концу. Занятый — бледный, без дуги
 */
export function SlotDial({ slot, selected, busy, className }: { slot: string; selected: boolean; busy: boolean; className?: string }) {
  const s = MEASUREMENT_SLOTS.find((item) => item.value === slot)
  if (!s) return null
  const a0 = (s.startsHour % 12) * 30
  const a1 = a0 + (s.endsHour - s.startsHour) * 30
  return (
    // .hs — корень сцены: на нём кривые движения (scene-kit.css) и правило «уменьшить движение»
    <svg viewBox="0 0 40 40" className={cn('hs bk-dial shrink-0', busy && 'opacity-40', className)} aria-hidden="true">
      <circle cx={20} cy={20} r={17} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.2} />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${onDial(i * 30, 14.5)}L${onDial(i * 30, i % 3 === 0 ? 11.5 : 13)}`} stroke="currentColor" strokeOpacity={0.5} strokeWidth={i % 3 === 0 ? 1.4 : 0.9} strokeLinecap="round" />
      ))}
      {!busy && (
        <path
          className={cn(selected && 'bk-arc')}
          pathLength={1}
          d={`M${onDial(a0, 17)}A17 17 0 0 1 ${onDial(a1, 17)}`}
          fill="none"
          stroke={selected ? 'currentColor' : 'var(--primary)'}
          strokeWidth={3.2}
          strokeLinecap="round"
        />
      )}
      <g className={cn('bk-hand', selected && !busy && 'bk-hand--sweep')} style={{ '--a0': `${a0}deg`, '--a1': `${a1}deg`, transform: `rotate(${selected && !busy ? a1 : a0}deg)` } as CSSProperties}>
        <path d="M20 20L20 9.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      </g>
      <circle cx={20} cy={20} r={1.8} fill="currentColor" />
    </svg>
  )
}
