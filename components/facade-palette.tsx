'use client'

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import Image from 'next/image'
import { ChevronsLeftRight, ChevronsRightLeft } from 'lucide-react'
import { RollingCount } from '@/components/rolling-count'
import type { CatalogItem } from '@/lib/pdf-catalog-data'
import { cn } from '@/lib/utils'
import './scene-kit.css'
import './facade-palette.css'

/**
 * Цветовые решения коллекции — веером образцов, как у мебельщика на замере:
 * сложенный веер занимает мало места, по наведению или нажатию раскрывается.
 * Ведут по вееру — выбранная пластина выдвигается, рядом крупный образец,
 * название и номер. Если у коллекции есть форма фасада, образец показан
 * прямо на ней. Под веером — подпись про торцы и тыльную сторону.
 *
 * Мышью: навели — раскрылся, увели — сложился; щёлкнули — остаётся открытым.
 * Пальцем: нажали — раскрылся, ведут или нажимают по вееру — выбирают.
 * С клавиатуры: «Раскрыть веер», дальше стрелками, Esc — сложить.
 */

/** Веер в долях ширины сцены (cqw) */
const LEN = 46
const LIFT = 3.5
/** Раскрытый веер — не шире полукруга с запасом */
const MAX_SPREAD = 150
/** Какая доля ширины пластины видна у кончика в раскрытом веере */
const SHOWN = 0.78
/** Наведение: раскрыть через, выбрать пластину, на которой задержались, через, сложить после ухода через — мс */
const HOVER = { open: 120, pick: 140, close: 350 }

const rad = (deg: number) => (deg * Math.PI) / 180

/**
 * Ширина пластин и угол веера по числу цветов: у кончиков пластины
 * перекрываются, а не расходятся спицами. Мало цветов — пластины шире,
 * веер уже
 */
function fanGeometry(n: number) {
  const gaps = Math.max(n - 1, 1)
  const width = Math.min(16, Math.max(8.5, (LEN * rad(MAX_SPREAD)) / (gaps * SHOWN)))
  const spread = n > 1 ? Math.min(MAX_SPREAD, (((n - 1) * SHOWN * width) / LEN) * (180 / Math.PI)) : 0
  const step = n > 1 ? spread / (n - 1) : 0
  /** Сложенный — стопка чуть веером: из-под верхней пластины видны края остальных */
  const closedStep = n > 1 ? Math.min(1.5, 16 / (n - 1)) : 0
  const pivot = width / 2 + 1.5
  return {
    width,
    spread,
    step,
    pivot,
    height: pivot + LEN + LIFT + 1.5,
    open: (i: number) => -spread / 2 + i * step,
    closed: (i: number) => -6 + i * closedStep,
  }
}

export function FacadePalette({
  items,
  shape,
  shapeAlt,
  note,
  label = 'Цвета и декоры',
  action,
}: {
  items: CatalogItem[]
  shape?: string
  shapeAlt?: string
  note?: string
  label?: string
  /** Ссылка справа от подписи палитры */
  action?: ReactNode
}) {
  const n = items.length
  const fan = fanGeometry(n)
  const fanId = useId()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  /** Пластина под мышью: выдвигается сразу, выбирается, если на ней задержались */
  const [hover, setHover] = useState<number | null>(null)
  /** Открыли нажатием — уход мыши веер не складывает */
  const pinned = useRef(false)
  const focusOnOpen = useRef(false)
  const timers = useRef<{ open?: number; pick?: number; close?: number }>({})
  const stage = useRef<HTMLDivElement>(null)
  const radios = useRef<(HTMLButtonElement | null)[]>([])
  const toggle = useRef<HTMLButtonElement>(null)

  // Крупный образец: прежний лежит под новым, пока тот въезжает шторкой
  const [tile, setTile] = useState({ i: 0, prev: null as number | null, n: 0, back: false })
  if (tile.i !== selected) setTile({ i: selected, prev: tile.i, n: tile.n + 1, back: selected < tile.i })

  const stop = (key: keyof typeof timers.current) => {
    window.clearTimeout(timers.current[key])
    timers.current[key] = undefined
  }

  useEffect(() => {
    const all = timers.current
    return () => Object.values(all).forEach((timer) => window.clearTimeout(timer))
  }, [])

  useEffect(() => {
    if (!open || !focusOnOpen.current) return
    focusOnOpen.current = false
    radios.current[selected]?.focus()
  }, [open, selected])

  function setFan(next: boolean, { pin = next, focus = false } = {}) {
    stop('open')
    stop('close')
    pinned.current = pin
    focusOnOpen.current = focus
    if (!next) setHover(null)
    setOpen(next)
  }

  /** Пластина в точке: по углу от заклёпки, так попасть легче, чем в узкий кончик */
  function indexAt(x: number, y: number): number | null {
    const box = stage.current?.getBoundingClientRect()
    if (!box) return null
    const unit = box.width / 100
    const dx = x - (box.left + box.width / 2)
    const dy = box.bottom - fan.pivot * unit - y
    const r = Math.hypot(dx, dy)
    if (r < fan.width * unit || r > (LEN + LIFT + 4) * unit) return null
    if (n < 2) return 0
    const angle = (Math.atan2(dx, dy) * 180) / Math.PI
    if (Math.abs(angle) > fan.spread / 2 + fan.step) return null
    return Math.max(0, Math.min(n - 1, Math.round((angle + fan.spread / 2) / fan.step)))
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') {
      if (!open) {
        // Только настоящее движение: страница, проехавшая под курсором, веер не раскрывает
        if ((event.movementX || event.movementY) && timers.current.open === undefined) {
          timers.current.open = window.setTimeout(() => {
            timers.current.open = undefined
            setOpen(true)
          }, HOVER.open)
        }
        return
      }
      const i = indexAt(event.clientX, event.clientY)
      if (i === hover) return
      setHover(i)
      stop('pick')
      if (i !== null) timers.current.pick = window.setTimeout(() => setSelected(i), HOVER.pick)
      return
    }
    // Палец ведут по раскрытому вееру — выбор едет следом
    if (open && event.buttons) {
      const i = indexAt(event.clientX, event.clientY)
      if (i !== null) setSelected(i)
    }
  }

  function onPointerEnter(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse') stop('close')
  }

  function onPointerLeave(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return
    stop('open')
    stop('pick')
    setHover(null)
    if (open && !pinned.current) timers.current.close = window.setTimeout(() => setFan(false), HOVER.close)
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    // Enter и пробел на пластине — их выбирает сама пластина
    if (event.detail === 0) return
    if (!open) return setFan(true)
    pinned.current = true
    const i = indexAt(event.clientX, event.clientY)
    if (i !== null) setSelected(i)
  }

  /** Esc складывает веер, где бы внутри блока ни был фокус */
  function onEscape(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    setFan(false)
    toggle.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const move = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key]
    const next = move ? (selected + move + n) % n : event.key === 'Home' ? 0 : event.key === 'End' ? n - 1 : null
    if (next === null) return
    event.preventDefault()
    setSelected(next)
    radios.current[next]?.focus()
  }

  const lifted = open ? (hover ?? selected) : null
  const current = items[tile.i]
  if (!current) return null

  return (
    <div className="fp hs @container" data-open={open || undefined} onKeyDown={onEscape}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {label} · {n}
        </p>
        {action}
      </div>

      <div className="grid items-center gap-x-10 gap-y-5 @2xl:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        <div
          ref={stage}
          className="fp-stage"
          style={
            {
              '--w': `${fan.width}cqw`,
              '--len': `${LEN}cqw`,
              '--lift': `${LIFT}cqw`,
              '--pivot': `${fan.pivot}cqw`,
              aspectRatio: `100 / ${fan.height}`,
            } as CSSProperties
          }
          onPointerEnter={onPointerEnter}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onClick={onClick}
        >
          <div id={fanId} role="radiogroup" aria-label={label} inert={!open} onKeyDown={onKeyDown}>
            {items.map((item, i) => (
              <button
                key={`${item.name}-${i}`}
                ref={(node) => {
                  radios.current[i] = node
                }}
                type="button"
                role="radio"
                aria-checked={selected === i}
                aria-label={item.name}
                tabIndex={selected === i ? 0 : -1}
                className="fp-arm"
                data-lift={lifted === i || undefined}
                style={{ '--open': `${fan.open(i)}deg`, '--closed': `${fan.closed(i)}deg`, '--i': i, zIndex: n - i } as CSSProperties}
                onClick={(event) => event.detail === 0 && setSelected(i)}
              >
                <span className="fp-strip">
                  <span className="fp-swatch">
                    <Image src={item.image} alt="" fill sizes="(max-width: 640px) 45vw, 16rem" className="object-cover" />
                  </span>
                </span>
              </button>
            ))}
          </div>
          <span className="fp-rivet" style={{ zIndex: n + 1 }} aria-hidden="true" />
        </div>

        <div className="flex items-end gap-5">
          <div
            className={cn(
              'fp-tile relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted',
              shape ? 'aspect-[3/5] w-20 @2xl:w-36' : 'aspect-square w-24 @2xl:w-40',
            )}
          >
            {[tile.prev, tile.i].map((index) =>
              index === null ? null : (
                <div
                  key={index}
                  className={cn('absolute inset-0', index === tile.i && tile.n > 0 && cn('hs-wipe', tile.back && 'hs-wipe--back'))}
                >
                  <div className="hs-wipe-img absolute inset-0">
                    <Image src={items[index].image} alt={items[index].name} fill sizes="(max-width: 640px) 6rem, 10rem" className="object-cover" />
                  </div>
                </div>
              ),
            )}
            {/* Форма фасада поверх образца: рельеф и рамка — в его цвете */}
            {shape && (
              <Image src={shape} alt={shapeAlt ?? 'Форма фасада'} fill sizes="(max-width: 640px) 5rem, 9rem" className="object-cover mix-blend-hard-light" />
            )}
          </div>

          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <p className="fp-name text-lg font-semibold leading-tight text-foreground @2xl:text-2xl">
              <span key={tile.n} data-new={tile.n > 0 || undefined}>
                {current.name}
              </span>
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              Цвет <RollingCount value={tile.i + 1} /> из {n}
            </p>
            <button
              ref={toggle}
              type="button"
              aria-expanded={open}
              aria-controls={fanId}
              onClick={(event) => setFan(!open, { focus: event.detail === 0 })}
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/35 bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary"
            >
              {open ? <ChevronsRightLeft className="size-4 text-primary" aria-hidden="true" /> : <ChevronsLeftRight className="size-4 text-primary" aria-hidden="true" />}
              {open ? 'Сложить веер' : 'Раскрыть веер'}
            </button>
          </div>
        </div>
      </div>

      {note && <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  )
}
