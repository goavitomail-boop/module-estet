'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import { FAINT, INK, K, fitTo, line, moduleView, type Pt, type Range } from '@/components/axo'
import { facadeCollections, mdfFrameDecors } from '@/lib/catalog-data'
import { slotexDecors } from '@/lib/pdf-catalog-data'
import { cn } from '@/lib/utils'
import './module-layers.css'

/**
 * Нижний модуль кухни в разрезе: столешница, каркас из МДФ, задняя стенка
 * и фасад. Когда блок виден, модуль разбирается на слои и по очереди
 * показывает каждый; кнопкой слой выбирают сами. Под описанием — декоры
 * выбранного слоя: у столешницы — образцы SLOTEX (на схеме встаёт сама
 * текстура), у фасада — коллекция и цвет (фасад принимает форму коллекции),
 * у каркаса — десять декоров МДФ.
 *
 * Все числа — из каталога производства: высота и глубина каркаса —
 * constructionSpecs, столешница и свес — countertopSpecs, фасады —
 * facadeCollections (lib/catalog-data.ts), кромка каркаса — раздел «Корпус
 * МДФ» (lib/pdf-catalog-data.ts). Ширины модуля и толщины плит в каталоге
 * нет, поэтому на схеме они не подписаны. Миллиметры и оси — как в axo.ts.
 */

const { P, AX_ANGLE, DEPTH_ANGLE, front, top, side, pullOut } = moduleView

const VIEW = { w: 520, h: 440 }

/** Каркас: ширина (на схеме без подписи), высота и глубина из каталога, плита */
const W = 600
const H = 720
const D = 530
const T = 16
/** Столешница 40 мм, свес 30 мм за каркас, глубина 600 */
const TOP_Y: Range = [H, H + 40]
const TOP_Z: Range = [-30, 570]
/** Фасад перед каркасом с зазором 2 мм, задняя стенка ХДФ в пазу у задней кромки */
const FACADE_GAP = 2
const BACK_Z: Range = [D - 22, D - 18]

/** Насколько слои разъезжаются, мм: столешница вверх, фасад к зрителю, стенка назад */
const APART = { top: 300, facade: 380, back: 300 }

const PARTS = [
  { id: 'top', label: 'Столешница' },
  { id: 'carcass', label: 'Каркас МДФ' },
  { id: 'back', label: 'Задняя стенка' },
  { id: 'facade', label: 'Фасад' },
] as const
type PartId = (typeof PARTS)[number]['id']

/** Сколько автопоказ держит каждый слой: разъезд, подписи и время прочитать */
const AUTO_STEP = 3

const HDF = 'color-mix(in oklab, var(--foreground) 9%, var(--card))'
const SHADE = 'color-mix(in oklab, var(--foreground) 7%, var(--card))'
const BRASS = 'var(--primary)'

/* ── Фасады: коллекции каталога ─────────────────────────────────────── */

type FacadeForm = 'flat' | 'ribbed' | 'frame' | 'thin-frame'

/** Форма полотна по коллекции: Velvet рифлёный, Como с филёнкой, Garda с тонкой рамкой */
const FORMS: Record<string, FacadeForm> = { velvet: 'ribbed', como: 'frame', garda: 'thin-frame' }

/** «SOFT & WOOD» → «Soft & Wood»: в кнопках названия читаются спокойнее */
const titleCase = (name: string) => name.toLowerCase().replace(/(^|\s)\S/g, (char) => char.toUpperCase())

const FACADES = facadeCollections.map((collection) => {
  const thickness = Number(collection.spec.match(/Толщина (\d+) мм/)?.[1]) || null
  return {
    id: collection.id,
    label: titleCase(collection.name),
    colors: collection.colors,
    spec: collection.spec,
    thickness,
    /** Кромка подписывается только там, где о ней говорит каталог */
    edge: collection.spec.includes('0,8 мм'),
    form: FORMS[collection.id] ?? 'flat',
  }
})

/* ── Детали ─────────────────────────────────────────────────────────── */

/** Тона декора для граней: лицо — сам декор, верх светлее, бок темнее */
function tones(hex: string) {
  return {
    face: hex,
    top: `color-mix(in oklab, ${hex} 82%, var(--card))`,
    side: `color-mix(in oklab, ${hex} 84%, var(--foreground))`,
  }
}

/** Плита: видны лицо, верх и правый бок */
function Slab({ x, y, z, face, topTone, sideTone, width = 0.8 }: { x: Range; y: Range; z: Range; face: string; topTone: string; sideTone: string; width?: number }) {
  return (
    <g stroke={INK} strokeWidth={width} strokeLinejoin="round">
      <path d={side(x[1], y, z)} fill={sideTone} />
      <path d={top(x, y[1], z)} fill={topTone} />
      <path d={front(x, y, z[0])} fill={face} />
    </g>
  )
}

/**
 * Фото образца, натянутое на грань: узор в плоскости грани, плитка ровно по
 * её размеру. Плоскость front — x и y (z = at), top — x и z (y = at),
 * side — z и y (x = at). Оси грани на экране берутся из самой проекции
 */
function Texture({ id, href, plane, u, v, at }: { id: string; href: string; plane: 'front' | 'top' | 'side'; u: Range; v: Range; at: number }) {
  const [ox, oy] = P(0, 0, 0)
  const axis = (x: number, y: number, z: number) => {
    const [px, py] = P(x, y, z)
    return [px - ox, py - oy]
  }
  const [ex, ey, ez] = [axis(1, 0, 0), axis(0, 1, 0), axis(0, 0, 1)]
  // Первая ось узора, вторая и сдвиг плоскости. Высота идёт вниз по картинке, поэтому -y
  const [a, c, shift] =
    plane === 'front' ? [ex, [-ey[0], -ey[1]], ez.map((value) => value * at)]
    : plane === 'top' ? [ex, ez, ey.map((value) => value * at)]
    : [ez, [-ey[0], -ey[1]], ex.map((value) => value * at)]
  const matrix = [...a, ...c, ...shift].map((value) => value.toFixed(4)).join(' ')
  const [w, h] = [u[1] - u[0], v[1] - v[0]]
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" x={u[0]} y={v[0]} width={w} height={h} patternTransform={`matrix(${matrix})`}>
      <image href={href} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
    </pattern>
  )
}

/** Слой схемы: едет при разборке, отступает, когда выбран другой */
function Part({ id, active, explode, d, children }: { id: PartId; active: PartId | null; explode: string; d: number; children: ReactNode }) {
  return (
    <g className="ml-part" data-on={active === id || undefined} style={{ '--explode': explode, '--d': `${d}s` } as CSSProperties}>
      {children}
    </g>
  )
}

/** Размер: выноски, линия прочерчивается, засечки, число вдоль линии */
function Dim({ a, b, from, label, angle, on, d, size }: { a: Pt; b: Pt; from: [Pt, Pt]; label: string; angle: number; on: boolean; d: number; size: number }) {
  const data = { 'data-on': on || undefined, style: { '--d': `${d}s` } as CSSProperties }
  const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return (
    <g>
      <path className="ml-show" {...data} d={`${line([from[0], a])}${line([from[1], b])}`} stroke={BRASS} strokeWidth={0.8} />
      <path className="ml-line" {...data} pathLength={1} d={line([a, b])} stroke={BRASS} strokeWidth={1.2} fill="none" />
      <g className="ml-show" {...data}>
        {[a, b].map(([x, y]) => (
          <path key={x} d={`M${(x - 5).toFixed(1)},${(y + 5).toFixed(1)}L${(x + 5).toFixed(1)},${(y - 5).toFixed(1)}`} stroke={BRASS} strokeWidth={1.4} />
        ))}
      </g>
      <g transform={`translate(${mid[0].toFixed(1)} ${mid[1].toFixed(1)}) rotate(${angle.toFixed(1)})`}>
        <text className="ml-show" {...data} y={(-size * 1.1).toFixed(1)} textAnchor="middle" fontSize={size.toFixed(1)} fontWeight={600} fill="var(--foreground)" style={{ ...data.style, fontFamily: 'var(--font-roboto), sans-serif' }}>
          {label}
        </text>
      </g>
    </g>
  )
}

/** Сдвиг вверх на mm миллиметров — для CSS transform, в единицах чертежа */
const lift = (mm: number) => `translate(0px, ${(-K * mm).toFixed(1)}px)`
/** Точка разобранного слоя: столешница выше, фасад ближе, стенка дальше */
const up = (x: number, y: number, z: number) => P(x, y + APART.top, z)
const near = (x: number, y: number, z: number) => P(x, y, z - APART.facade)
const far = (x: number, y: number, z: number) => P(x, y, z + APART.back)

/** Чертёж вписан в кадр по разобранному модулю и его подписям */
const FRAME = fitTo(
  [
    P(0, 0, 0), P(W, 0, 0), P(W, 0, D), up(0, TOP_Y[1], TOP_Z[1]), up(W, TOP_Y[1], TOP_Z[0]), up(W, TOP_Y[0], TOP_Z[0]),
    near(0, 0, -20), near(W, 0, -20), near(0, H, -20),
    far(W, H, BACK_Z[1]), far(0, H, BACK_Z[1]),
    P(W + 140, 0, 0), P(W + 140, 0, D),
  ],
  VIEW,
  { x: 16, top: 16, bottom: 16 },
)

/* ── Схема ──────────────────────────────────────────────────────────── */

type Look = {
  carcass: string
  countertop: string
  facade: { hex: string; form: FacadeForm; thickness: number | null }
}

/** Полотно фасада: рифление, филёнка или тонкая рамка — по коллекции */
function FacadeRelief({ form, x, y, z, hex }: { form: FacadeForm; x: Range; y: Range; z: number; hex: string }) {
  const ink = `color-mix(in oklab, ${hex} 62%, var(--foreground))`
  if (form === 'ribbed') {
    const ribs = Array.from({ length: Math.floor((x[1] - x[0] - 40) / 24) }, (_, i) => x[0] + 20 + 12 + i * 24)
    return (
      <g stroke={ink} strokeWidth={0.6} opacity={0.8}>
        {ribs.map((rx) => (
          <path key={rx} d={line([P(rx, y[0] + 14, z), P(rx, y[1] - 14, z)])} />
        ))}
      </g>
    )
  }
  if (form === 'frame') {
    return (
      <g fill="none" stroke={ink} strokeWidth={0.8}>
        <path d={front([x[0] + 70, x[1] - 70], [y[0] + 70, y[1] - 70], z)} />
        <path d={front([x[0] + 84, x[1] - 84], [y[0] + 84, y[1] - 84], z)} opacity={0.7} />
      </g>
    )
  }
  if (form === 'thin-frame') {
    return <path d={front([x[0] + 28, x[1] - 28], [y[0] + 28, y[1] - 28], z)} fill="none" stroke={ink} strokeWidth={0.8} />
  }
  return null
}

function Scheme({ active, open, look, uid }: { active: PartId | null; open: boolean; look: Look; uid: string }) {
  const { fit, tx, ty } = FRAME
  const size = 14 / fit
  const carcass = tones(look.carcass)
  const facade = tones(look.facade.hex)
  const facadeZ: Range = [-FACADE_GAP - (look.facade.thickness ?? 16), -FACADE_GAP]
  const on = (id: PartId) => open && active === id
  const show = (id: PartId, d: number) => ({ className: 'ml-show', 'data-on': on(id) || undefined, style: { '--d': `${d}s` } as CSSProperties })
  const tex = (face: string) => `url(#${uid}-top-${face})`

  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="absolute inset-0 size-full" aria-hidden="true">
      <defs>
        {/* Образец SLOTEX на верхе, переднем торце и боку столешницы */}
        <Texture id={`${uid}-top-top`} href={look.countertop} plane="top" u={[0, W]} v={TOP_Z} at={TOP_Y[1]} />
        <Texture id={`${uid}-top-front`} href={look.countertop} plane="front" u={[0, W]} v={[-TOP_Y[1], -TOP_Y[0]]} at={TOP_Z[0]} />
        <Texture id={`${uid}-top-side`} href={look.countertop} plane="side" u={TOP_Z} v={[-TOP_Y[1], -TOP_Y[0]]} at={W} />
      </defs>
      <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${fit.toFixed(3)})`}>
        <path d={line([P(-300, 0, 0), P(W + 400, 0, 0)])} stroke={FAINT} strokeWidth={0.8} strokeDasharray="4 4" />

        {/* Задняя стенка: дальше всех, рисуется первой */}
        <Part id="back" active={active} explode={pullOut(-APART.back)} d={0.16}>
          <Slab x={[T - 6, W - T + 6]} y={[T - 6, H - T + 6]} z={BACK_Z} face={HDF} topTone={HDF} sideTone={SHADE} />
          <g {...show('back', 0.9)}>
            <path d={front([T - 6, W - T + 6], [T - 6, H - T + 6], BACK_Z[0])} fill="none" stroke={BRASS} strokeWidth={1.6} />
          </g>
        </Part>

        {/* Каркас: левая боковина, дно, задняя и передняя царги, правая боковина */}
        <Part id="carcass" active={active} explode="none" d={0}>
          <Slab x={[0, T]} y={[0, H]} z={[0, D]} face={carcass.face} topTone={carcass.top} sideTone={carcass.side} />
          <Slab x={[T, W - T]} y={[0, T]} z={[0, D]} face={carcass.face} topTone={carcass.top} sideTone={carcass.side} />
          <Slab x={[T, W - T]} y={[H - T, H]} z={[D - 118, D - 18]} face={carcass.face} topTone={carcass.top} sideTone={carcass.side} />
          <Slab x={[T, W - T]} y={[H - T, H]} z={[0, 100]} face={carcass.face} topTone={carcass.top} sideTone={carcass.side} />
          <Slab x={[W - T, W]} y={[0, H]} z={[0, D]} face={carcass.face} topTone={carcass.top} sideTone={carcass.side} width={1} />
          {/* Кромка: торцы деталей спереди загораются латунью */}
          <g {...show('carcass', 0.5)} fill={BRASS} stroke="none">
            <path d={front([0, T], [0, H], 0)} />
            <path d={front([W - T, W], [0, H], 0)} />
            <path d={front([T, W - T], [0, T], 0)} />
            <path d={front([T, W - T], [H - T, H], 0)} />
          </g>
        </Part>

        {/* Фасад с ручкой: ближе всех к зрителю */}
        <Part id="facade" active={active} explode={pullOut(APART.facade)} d={0.08}>
          <Slab x={[2, W - 2]} y={[3, H - 3]} z={facadeZ} face={facade.face} topTone={facade.top} sideTone={facade.side} width={1} />
          <FacadeRelief form={look.facade.form} x={[2, W - 2]} y={[3, H - 3]} z={facadeZ[0]} hex={look.facade.hex} />
          <path d={line([P(W / 2 - 90, H - 70, facadeZ[0] - 8), P(W / 2 + 90, H - 70, facadeZ[0] - 8)])} stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <g {...show('facade', 0.9)} fill={BRASS} stroke="none">
            <path d={side(W - 2, [3, H - 3], facadeZ)} />
            <path d={top([2, W - 2], H - 3, facadeZ)} />
          </g>
        </Part>

        {/* Столешница: выше всех, рисуется последней */}
        <Part id="top" active={active} explode={lift(APART.top)} d={0}>
          <Slab x={[0, W]} y={TOP_Y} z={TOP_Z} face={tex('front')} topTone={tex('top')} sideTone={tex('side')} width={1} />
          <g {...show('top', 0.9)}>
            <path d={front([0, W], TOP_Y, TOP_Z[0])} fill="none" stroke={BRASS} strokeWidth={1.6} />
          </g>
        </Part>

        {/* Размеры каркаса — из каталога */}
        <Dim
          a={P(W + 110, 0, 0)}
          b={P(W + 110, H, 0)}
          from={[P(W + 10, 0, 0), P(W + 10, H, 0)]}
          label="720 мм"
          angle={-90}
          on={on('carcass')}
          d={0.7}
          size={size}
        />
        <Dim
          a={P(W + 110, 0, 0)}
          b={P(W + 110, 0, D)}
          from={[P(W + 10, 0, 0), P(W + 10, 0, D)]}
          label="530 мм"
          angle={DEPTH_ANGLE}
          on={on('carcass')}
          d={0.85}
          size={size}
        />
        {/* Свес столешницы за каркас */}
        <Dim
          a={up(-40, TOP_Y[0], TOP_Z[0])}
          b={up(-40, TOP_Y[0], 0)}
          from={[up(0, TOP_Y[0], TOP_Z[0]), up(0, TOP_Y[0], 0)]}
          label="30"
          angle={DEPTH_ANGLE}
          on={on('top')}
          d={0.8}
          size={size * 0.9}
        />
        <text
          {...show('top', 1)}
          x={up(W + 24, TOP_Y[0] + 20, TOP_Z[0])[0].toFixed(1)}
          y={up(W + 24, TOP_Y[0] + 20, TOP_Z[0])[1].toFixed(1)}
          fontSize={size.toFixed(1)}
          fontWeight={600}
          fill="var(--foreground)"
          dominantBaseline="middle"
          style={{ ...show('top', 1).style, fontFamily: 'var(--font-roboto), sans-serif' }}
        >
          40 мм
        </text>
        {/* Толщина фасада — только у коллекций, где каталог её называет */}
        {look.facade.thickness && (
          <text
            {...show('facade', 1)}
            x={near(W + 30, H / 2, facadeZ[0])[0].toFixed(1)}
            y={near(W + 30, H / 2, facadeZ[0])[1].toFixed(1)}
            fontSize={size.toFixed(1)}
            fontWeight={600}
            fill="var(--foreground)"
            dominantBaseline="middle"
            transform={`rotate(${AX_ANGLE.toFixed(1)} ${near(W + 30, H / 2, facadeZ[0])[0].toFixed(1)} ${near(W + 30, H / 2, facadeZ[0])[1].toFixed(1)})`}
            style={{ ...show('facade', 1).style, fontFamily: 'var(--font-roboto), sans-serif' }}
          >
            {look.facade.thickness} мм
          </text>
        )}
      </g>
    </svg>
  )
}

/* ── Бирки поверх схемы ─────────────────────────────────────────────── */

/** Бирка в точке чертежа: координаты в процентах кадра */
function Tag({ at, on, d, title, children }: { at: Pt; on: boolean; d: number; title: string; children: ReactNode }) {
  const [x, y] = [at[0] * FRAME.fit + FRAME.tx, at[1] * FRAME.fit + FRAME.ty]
  return (
    <span
      className="ml-show pointer-events-none absolute"
      data-on={on || undefined}
      style={{ left: `${(x / VIEW.w) * 100}%`, top: `${(y / VIEW.h) * 100}%`, '--d': `${d}s` } as CSSProperties}
    >
      <span className="plan-tag -translate-x-1/2 -translate-y-1/2">
        <span className="plan-tag__title">{title}</span>
        <span className="plan-tag__value">{children}</span>
      </span>
    </span>
  )
}

/* ── Выбор декора ───────────────────────────────────────────────────── */

/** Кружок образца: цвет или уменьшенное фото, выбранный — с латунным кольцом */
function Swatch({ name, on, onClick, hex, image }: { name: string; on: boolean; onClick: () => void; hex?: string; image?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={name}
      title={name}
      onClick={onClick}
      className={cn(
        'relative size-8 shrink-0 overflow-hidden rounded-full border transition-transform hover:scale-110',
        on ? 'border-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border',
      )}
      style={hex ? { backgroundColor: hex } : undefined}
    >
      {image && <Image src={image} alt="" fill sizes="32px" className="object-cover" />}
    </button>
  )
}

function PickerLabel({ title, value }: { title: string; value: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
      {title} · <span className="normal-case tracking-normal text-foreground">{value}</span>
    </p>
  )
}

/* ── Блок целиком ───────────────────────────────────────────────────── */

const indexOf = <T extends { name: string }>(list: T[], name: string) => Math.max(0, list.findIndex((item) => item.name === name))

export function ModuleLayers() {
  const uid = useId().replace(/:/g, '')
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<PartId | null>(null)
  // Сразу видно три разных материала: древесный каркас, белый фасад, тёмный мрамор
  const [decor, setDecor] = useState(() => indexOf(mdfFrameDecors, 'Дуб Каселла Натуральный'))
  const [countertop, setCountertop] = useState(() => indexOf(slotexDecors, 'Ankara Marble'))
  const [facadeSet, setFacadeSet] = useState(0)
  const [facadeColor, setFacadeColor] = useState(0)
  // Автопоказ идёт, пока человек сам ничего не выбрал
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
        if (!entry.isIntersecting) return
        // Первый показ: модуль разбирается и начинает со столешницы. При
        // «уменьшить движение» ничего не листается само
        setOpen(true)
        setActive((current) => current ?? PARTS[0].id)
        if (reduced) setAuto(false)
      },
      { threshold: 0.45 },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  const choose = (id: PartId) => {
    setAuto(false)
    setOpen(true)
    setActive((current) => (current === id && open ? null : id))
  }
  const next = () => {
    const index = PARTS.findIndex((part) => part.id === active)
    if (index < PARTS.length - 1) setActive(PARTS[index + 1].id)
    else setAuto(false)
  }
  const toggle = () => {
    setAuto(false)
    setActive(null)
    setOpen((value) => !value)
  }
  /** Выбор декора останавливает показ и выделяет свой слой */
  const pick = (id: PartId, apply: () => void) => {
    setAuto(false)
    setOpen(true)
    setActive(id)
    apply()
  }

  const set = FACADES[facadeSet]
  const color = set.colors[Math.min(facadeColor, set.colors.length - 1)]
  const slotex = slotexDecors[countertop]
  const look: Look = {
    carcass: mdfFrameDecors[decor].hex,
    countertop: slotex.image,
    facade: { hex: color.hex, form: set.form, thickness: set.thickness },
  }

  const texts: Record<PartId, { title: string; text: string }> = {
    top: {
      title: 'Столешница SLOTEX',
      text: 'Толщина 40 мм, свес спереди за каркасами — 30 мм, одинаковый для кухонь с ручками и с профилем LINE. Декоры однотонные, под камень и мрамор, под дерево.',
    },
    carcass: {
      title: 'Каркас из МДФ',
      text: 'Высота каркаса — 720 мм, глубина — 530 мм. Торцы деталей закрыты кромкой 0,4 мм на клее PUR со всех сторон. Декор — один из десяти.',
    },
    back: { title: 'Задняя стенка из ХДФ', text: 'Стенка ставится в паз каркаса.' },
    facade: { title: `Фасад ${set.label}`, text: `${set.spec}.` },
  }

  const part = active && open ? texts[active] : null
  const running = auto && visible && !paused
  const focus = open && active !== null
  const picker = active === 'top' || active === 'facade' ? active : 'carcass'

  return (
    <div
      ref={rootRef}
      className="hs ml flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr_auto] lg:gap-x-10"
      data-open={open || undefined}
      data-focus={focus || undefined}
    >
      <div className="lg:col-start-2">
        <p className="flyer-title text-2xl md:text-3xl">Каркасы из МДФ, а не ДСП</p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Нижний модуль кухни по слоям. Нажмите на слой — он выделится на схеме, рядом встанут размеры из каталога, а ниже — его декоры.
        </p>
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:-mx-8 md:px-8 lg:col-start-2 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="group" aria-label="Слой модуля">
        {PARTS.map((entry) => {
          const on = open && entry.id === active
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={on}
              onClick={() => choose(entry.id)}
              className={cn(
                'relative min-h-11 shrink-0 overflow-hidden rounded-full border px-4 text-sm font-semibold transition-colors',
                on ? 'border-foreground bg-foreground text-background' : 'border-primary/35 bg-card text-foreground hover:border-primary',
              )}
            >
              {entry.label}
              {on && auto && (
                <span
                  key={entry.id}
                  className="ml-progress absolute inset-x-3 bottom-1.5 block h-0.5 rounded-full bg-primary"
                  style={{ '--t': `${AUTO_STEP}s`, animationPlayState: running ? 'running' : 'paused' } as CSSProperties}
                  onAnimationEnd={next}
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
        {auto && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? 'Продолжить показ' : 'Остановить показ'}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/35 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
          </button>
        )}
      </div>

      <div className="paper relative aspect-[52/44] w-full overflow-hidden rounded-2xl border border-primary/35 lg:col-start-1 lg:row-span-5 lg:row-start-1 lg:self-start">
        <Scheme active={active} open={open} look={look} uid={uid} />
        <Tag at={up(W * 0.35, TOP_Y[1], TOP_Z[1])} on={open && active === 'top'} d={1.1} title="Свес спереди">
          30 мм за каркас
        </Tag>
        <Tag at={P(T + 40, H * 0.55, D * 0.4)} on={open && active === 'carcass'} d={1} title="Кромка">
          0,4 мм на PUR
        </Tag>
        <Tag at={far(W * 0.62, H - 40, BACK_Z[0])} on={open && active === 'back'} d={1} title="ХДФ">
          в паз каркаса
        </Tag>
        <Tag at={near(W * 0.3, H * 0.32, -20)} on={open && active === 'facade' && set.edge} d={1.1} title="Кромка">
          ПВХ 0,8 мм на PUR
        </Tag>
        <button
          type="button"
          onClick={toggle}
          className="absolute bottom-3 right-3 inline-flex min-h-9 items-center rounded-full border border-primary/35 bg-card/90 px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary"
        >
          {open ? 'Собрать модуль' : 'Разобрать модуль'}
        </button>
      </div>

      <div className="min-h-[7.5rem] rounded-2xl border border-border bg-card p-5 lg:col-start-2" aria-live="polite">
        {part ? (
          <>
            <p className="flyer-title text-xl md:text-2xl">{part.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{part.text}</p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Корпуса доступны в десяти декорах МДФ, а фасады, витрины и столешницы подбираются дизайнером индивидуально под ваш проект.
          </p>
        )}
      </div>

      {/* Декоры выбранного слоя. Высота с запасом под самый длинный список — при смене слоя ничего не прыгает */}
      <div className="min-h-[11.5rem] lg:col-start-2 lg:min-h-[6.5rem]">
        {picker === 'top' && (
          <>
            <PickerLabel title="Декор столешницы" value={`${slotex.name} · ${slotex.meta}`} />
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Декор столешницы">
              {slotexDecors.map((item, index) => (
                <Swatch
                  key={item.name}
                  name={`${item.name}, ${item.meta}`}
                  on={countertop === index}
                  onClick={() => pick('top', () => setCountertop(index))}
                  image={item.image}
                />
              ))}
            </div>
          </>
        )}
        {picker === 'facade' && (
          <>
            <PickerLabel title="Фасад" value={`${set.label} · ${color.name}`} />
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Коллекция фасадов">
              {FACADES.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={facadeSet === index}
                  onClick={() =>
                    pick('facade', () => {
                      // У PVC-коллекций палитра общая: тот же цвет остаётся выбранным
                      setFacadeSet(index)
                      setFacadeColor(Math.max(0, entry.colors.findIndex((item) => item.name === color.name)))
                    })
                  }
                  className={cn(
                    'min-h-8 rounded-full border px-3 text-xs font-semibold transition-colors',
                    facadeSet === index ? 'border-foreground bg-foreground text-background' : 'border-primary/35 bg-card text-foreground hover:border-primary',
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Цвет фасада ${set.label}`}>
              {set.colors.map((item, index) => (
                <Swatch key={item.name} name={item.name} on={color.name === item.name} onClick={() => pick('facade', () => setFacadeColor(index))} hex={item.hex} />
              ))}
            </div>
          </>
        )}
        {picker === 'carcass' && (
          <>
            <PickerLabel title="Декор каркаса" value={mdfFrameDecors[decor].name} />
            <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Декор каркаса">
              {mdfFrameDecors.map((item, index) => (
                <Swatch key={item.name} name={item.name} on={decor === index} onClick={() => pick('carcass', () => setDecor(index))} hex={item.hex} />
              ))}
            </div>
          </>
        )}
      </div>

      <Link
        href="/quiz"
        className="inline-flex items-center justify-center gap-2 self-start rounded-full bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground lg:col-start-2 lg:justify-self-start"
      >
        Подобрать материалы
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  )
}
