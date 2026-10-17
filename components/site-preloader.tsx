'use client'

import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { markPreloaderShown, PLAN_VIEWBOX, planUnitsPerPx } from '@/lib/preloader-flag'

/**
 * Прелоадер «Замер и проект»: на тёмном листе чертится стена в разрезе с
 * разметкой розеток и воды → лазерная рулетка меряет стену → по размерам
 * встают модули кухни, рисуются фасады, загорается подсветка → чертёж
 * растворяется, под ним кухня → знак и название улетают в шапку.
 *
 * Чертёж — статичный SVG в миллиметрах, анимации — CSS (app/globals.css,
 * блок .vp). Поэтому заставка играет с первой отрисовки, ещё до того как
 * оживёт React. Толщину линий в пикселях держит переменная --vp-u (сколько
 * миллиметров чертежа в одном пикселе экрана), её ставит скрипт в <head>.
 * JS следит только за сменой фаз: чертёж уходит, когда дописана строка
 * и готово фото.
 */

/** Запасной срок конца чертежа, если браузер не умеет getAnimations, мс */
const PLAN_MS = 6000
/** Сколько ждём фото после того, как чертёж готов: дальше переходим всё равно, мс */
const PHOTO_WAIT = 4000
/** Страховка: к логотипу не позже этого от появления заставки, мс */
const SCENE_WALL_LIMIT = 14000
/** Сколько длится фаза логотипа (чертёж тает, знак и название рисуются) до выхода, мс */
const LOGO_HOLD = 3300
/** Растворение кадра и перелёт логотипа, мс */
const LEAVE_MS = 1000

/**
 * Показывать ли заставку, решил скрипт в <head> (lib/preloader-flag.ts) ещё
 * до первой отрисовки. Читаем один раз, когда выполняется модуль: эффекты
 * этот атрибут потом ставят и снимают сами
 */
const PRELOADER_DUE = typeof document !== 'undefined' && document.documentElement.dataset.preloader === 'active'
const CALM = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Phase = 'scene' | 'logo' | 'leaving'

/** Знак бренда: рамка с надрезами + «М». Рисуется штрихом (pathLength = 1) */
function Mark() {
  return (
    <svg viewBox="0 0 440 440" aria-hidden="true" focusable="false">
      <g transform="translate(10 10)">
        <path d="M18 18H402V118 M18 18V416H116 M402 416H304 M402 416V316" strokeWidth="16" pathLength={1} />
        <path d="M104 348V104L210 216L316 104V348" strokeWidth="16" pathLength={1} />
        <line x1="132" y1="262" x2="132" y2="314" strokeWidth="7" pathLength={1} />
      </g>
    </svg>
  )
}

/* ── Чертёж ──────────────────────────────────────────────────────────────
   Координаты в миллиметрах: x — вдоль стены от левого угла, y — вверх от
   пола. В SVG ось y смотрит вниз, поэтому Y() переворачивает высоту.
   Размеры условные, для картинки: стена 3 600 × 2 700, модули 450–800 */
const RW = 3600
const RH = 2700
const WALL = 140
const Y = (y: number) => RH - y
const rect = (x0: number, y0: number, x1: number, y1: number) => `M${x0} ${Y(y0)}H${x1}V${Y(y1)}H${x0}Z`
const seg = (x0: number, y0: number, x1: number, y1: number) => `M${x0} ${Y(y0)}L${x1} ${Y(y1)}`
/** Задержка и длительность анимации элемента, с */
const at = (delay: number, duration?: number) => ({ '--vp-d': `${delay}s`, ...(duration ? { '--vp-t': `${duration}s` } : {}) }) as CSSProperties

/** Нижние модули слева направо (ширина, мм) и как разбит фасад */
const BASE: Array<{ w: number; split: number[] | 'v' | null }> = [
  { w: 450, split: [340, 580] }, // три ящика
  { w: 600, split: 'v' }, // мойка, две двери
  { w: 800, split: [460] }, // два ящика под варочной
  { w: 600, split: null }, // посудомойка
  { w: 550, split: 'v' },
]
const BASE_X = BASE.reduce<number[]>((acc, { w }) => [...acc, acc[acc.length - 1] + w], [600])
const SINK_X = 1350

/** Размерная линия по горизонтали: засечки-штрихи и выносные линии */
function DimH({ x0, x1, y, label, style, below }: { x0: number; x1: number; y: number; label: string; style: CSSProperties; below?: boolean }) {
  return (
    <g className="vp__fade" style={style}>
      <path className="vp__ln-dim" d={seg(x0, y, x1, y)} />
      {[x0, x1].map((x) => <path key={`t${x}`} className="vp__ln-tick" d={seg(x - 35, y - 35, x + 35, y + 35)} />)}
      {[x0, x1].map((x) => <path key={`e${x}`} className="vp__ln-ext" d={seg(x, y - 60, x, y + 60)} />)}
      <text className={below ? 'vp__lbl' : 'vp__lbl vp__lbl--b'} x={(x0 + x1) / 2} y={Y(y)} dy={below ? '1.35em' : '-0.55em'}>{label}</text>
    </g>
  )
}

function PlanDrawing() {
  let detailDelay = 4.05
  const nextDetail = (step = 0.06) => (detailDelay += step)

  return (
    <svg className="vp__svg" viewBox={PLAN_VIEWBOX.join(' ')} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="vp-room"><path d={rect(0, 0, RW, RH)} /></clipPath>
        <linearGradient id="vp-led" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity="0.42" />
          <stop offset="1" stopColor="#ffcf8a" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Пол, стены, перекрытие */}
      <path pathLength={1} className="vp__ln vp__ln-floor" d={seg(-WALL - 200, 0, RW + WALL + 200, 0)} style={at(0.1, 0.9)} />
      <path pathLength={1} className="vp__ln vp__ln-main" d={`M0 ${Y(0)}V${Y(RH)}H${RW}V${Y(0)}`} style={at(0.35, 1.1)} />
      <path pathLength={1} className="vp__ln vp__ln-faint" d={`M${-WALL} ${Y(-WALL)}V${Y(RH + WALL)}H${RW + WALL}V${Y(-WALL)}`} style={at(0.45, 1.1)} />

      {/* Разметка под ремонт: розетки, выводы воды, скрытая проводка пунктиром */}
      <g className="vp__fade" style={at(0.9, 0.6)}>
        {[1050, 2800, 3300].map((x, i) => (
          <g key={x}>
            <path className="vp__ln-util" d={rect(x - 40, 1060, x + 40, 1140)} />
            <circle className="vp__dot" cx={x - 14} cy={Y(1100)} r="6" />
            <circle className="vp__dot" cx={x + 14} cy={Y(1100)} r="6" />
            {i < 2 && <path className="vp__ln-hidden" d={seg(x, RH, x, 1140)} />}
          </g>
        ))}
        {[1820, 1900].map((x) => (
          <g key={x}>
            <circle className="vp__ln-util" cx={x} cy={Y(520)} r="28" />
            <path className="vp__ln-hidden" d={seg(x, 492, x, 0)} />
          </g>
        ))}
        <text className="vp__lbl" x="1860" y={Y(640)}>ВОДА</text>
        <text className="vp__lbl" x="1050" y={Y(1210)}>220 В</text>
      </g>

      {/* Луч лазерной рулетки на высоте 1 650 */}
      <path className="vp__beam" d={seg(0, 1650, RW, 1650)} pathLength={1} />

      {/* Общие размеры стены */}
      <DimH x0={0} x1={RW} y={RH + 330} label="3 600" style={at(2.75, 0.5)} />
      <g className="vp__fade" style={at(2.9, 0.5)}>
        <path className="vp__ln-dim" d={seg(RW + 330, 0, RW + 330, RH)} />
        {[0, RH].map((y) => <path key={y} className="vp__ln-tick" d={seg(RW + 295, y - 35, RW + 365, y + 35)} />)}
        {/* Подпись вдоль размерной линии, как на чертежах: так она не вылезает за край узкого экрана */}
        <text className="vp__lbl vp__lbl--b" x={RW + 330} y={Y(RH / 2)} dy="1.15em" transform={`rotate(-90 ${RW + 330} ${Y(RH / 2)})`}>2 700</text>
      </g>

      {/* Кухня: модули встают по размерам, внутри комнаты */}
      <g clipPath="url(#vp-room)">
        <g className="vp__drop" style={{ ...at(2.6), '--vp-fy': '420px' } as CSSProperties}>
          <path className="vp__box" d={rect(0, 100, 600, 2200)} />
        </g>
        {BASE.map(({ w }, i) => (
          <g key={`b${i}`} className="vp__drop" style={{ ...at(2.75 + i * 0.12), '--vp-fy': '380px' } as CSSProperties}>
            <path className="vp__box" d={rect(BASE_X[i], 100, BASE_X[i] + w, 820)} />
            <path className="vp__plinth" d={rect(BASE_X[i] + 20, 0, BASE_X[i] + w - 20, 100)} />
          </g>
        ))}
        <g className="vp__drop" style={{ ...at(3.45, 0.6), '--vp-fx': '1200px', '--vp-fy': '0px' } as CSSProperties}>
          <path className="vp__top" d={rect(600, 820, RW, 860)} />
        </g>
        {BASE.map(({ w }, i) => (
          <g key={`u${i}`} className="vp__drop" style={{ ...at(3.6 + i * 0.1), '--vp-fy': '-480px' } as CSSProperties}>
            <path className="vp__box" d={rect(BASE_X[i], 1450, BASE_X[i] + w, 2170)} />
          </g>
        ))}

        {/* Фасады: ниша духовки, ящики, двери; профиль и смеситель */}
        <path pathLength={1} className="vp__ln vp__ln-detail" d={rect(80, 900, 520, 1480)} style={at(detailDelay, 0.4)} />
        <path pathLength={1} className="vp__ln vp__ln-detail" d={seg(0, 1560, 600, 1560)} style={at(nextDetail(0.05), 0.4)} />
        {BASE.map(({ w, split }, i) => {
          const x = BASE_X[i]
          const delay = nextDetail()
          if (split === 'v') return <path key={`s${i}`} pathLength={1} className="vp__ln vp__ln-detail" d={seg(x + w / 2, 100, x + w / 2, 790)} style={at(delay, 0.4)} />
          if (!split) return null
          return split.map((y, j) => <path key={`s${i}-${y}`} pathLength={1} className="vp__ln vp__ln-detail" d={seg(x, y, x + w, y)} style={at(delay + j * 0.05, 0.4)} />)
        })}
        {BASE.map(({ w }, i) => {
          const delay = nextDetail(0.05)
          if (w < 600) return null
          const x = BASE_X[i] + w / 2
          return <path key={`d${i}`} pathLength={1} className="vp__ln vp__ln-detail" d={seg(x, 1450, x, 2170)} style={at(delay, 0.4)} />
        })}
        <path pathLength={1} className="vp__ln vp__ln-gola" d={seg(600, 790, RW, 790)} style={at(4.2, 0.7)} />
        <path
          pathLength={1}
          className="vp__ln vp__ln-detail"
          d={`M${SINK_X} ${Y(860)}L${SINK_X} ${Y(1180)}Q${SINK_X} ${Y(1260)} ${SINK_X + 80} ${Y(1260)}L${SINK_X + 140} ${Y(1200)}`}
          style={at(4.35, 0.5)}
        />
      </g>

      {/* Подсветка под верхними шкафами */}
      <g className="vp__led">
        <path d={rect(600, 860, RW, 1450)} fill="url(#vp-led)" />
        <path className="vp__led-line" d={seg(600, 1446, RW, 1446)} />
      </g>

      {/* Цепочка размеров под полом — появляется вместе с модулями */}
      <DimH x0={0} x1={600} y={-330} label="600" below style={at(2.75, 0.4)} />
      {BASE.map(({ w }, i) => (
        <DimH key={`c${i}`} x0={BASE_X[i]} x1={BASE_X[i] + w} y={-330} label={String(w)} below style={at(2.9 + i * 0.12, 0.4)} />
      ))}
    </svg>
  )
}

/** Положение элемента на листе чертежа в процентах — для стен со штриховкой и лазера */
function onSheet(x0: number, y1: number, x1: number, y0: number): CSSProperties {
  const [vx, vy, vw, vh] = PLAN_VIEWBOX
  return {
    left: `${((x0 - vx) / vw) * 100}%`,
    top: `${((Y(y1) - vy) / vh) * 100}%`,
    width: `${((x1 - x0) / vw) * 100}%`,
    height: `${((y1 - y0) / vh) * 100}%`,
  }
}

const STEPS = [
  { label: '01 Замер', on: 0.5, off: 2.6 },
  { label: '02 Проект', on: 2.6, off: 4.3 },
  { label: '03 Монтаж', on: 4.3, off: 6.2 },
]

export function SitePreloader() {
  const [visible, setVisible] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [phase, setPhase] = useState<Phase>('scene')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [flight, setFlight] = useState<CSSProperties>({})
  const logo = useRef<HTMLDivElement>(null)
  const note = useRef<HTMLParagraphElement>(null)
  const dialog = useRef<HTMLElement>(null)
  const phaseRef = useRef<Phase>('scene')
  const photoReady = useRef(false)
  /** Чертёж готов, ждём только фото */
  const planWaiting = useRef(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)) }

  const finish = useCallback(() => {
    delete document.documentElement.dataset.preloader
    const content = document.getElementById('site-content')
    if (content) content.inert = false
    // Фокус не переводим на первую ссылку: браузер рисовал вокруг логотипа
    // рамку фокуса, даже если человек не трогал клавиатуру. Диалог исчезает —
    // фокус сам возвращается в начало страницы, и Tab идёт с шапки
    setVisible(false)
  }, [])

  /** Растворение кадра + перелёт логотипа в шапку сайта */
  const leave = useCallback(() => {
    if (phaseRef.current === 'leaving') return
    phaseRef.current = 'leaving'
    markPreloaderShown()
    // Куда лететь: знак в шапке сайта. Нет шапки — логотип просто гаснет
    const target = document.querySelector<SVGElement>('header a[aria-label*="Модуль Эстет"] svg')
    const box = logo.current?.getBoundingClientRect()
    const from = logo.current?.querySelector('svg')?.getBoundingClientRect()
    const to = target?.getBoundingClientRect()
    if (box && from && to && to.width > 0) {
      // Масштаб — вокруг центра знака, а не всего блока с названием
      const ox = from.left + from.width / 2 - box.left
      const oy = from.top + from.height / 2 - box.top
      setFlight({
        transformOrigin: `${ox}px ${oy}px`,
        transform: `translate(${to.left + to.width / 2 - (from.left + from.width / 2)}px, ${to.top + to.height / 2 - (from.top + from.height / 2)}px) scale(${to.width / from.width})`,
      })
    }
    setPhase('leaving')
    document.documentElement.dataset.preloader = 'leaving'
    later(finish, reducedMotion ? 0 : LEAVE_MS)
  }, [finish, reducedMotion])

  /** Чертёж тает, под ним кухня; знак и название рисуются; через LOGO_HOLD — выход */
  const toLogo = useCallback(() => {
    if (phaseRef.current !== 'scene') return
    phaseRef.current = 'logo'
    setPhase('logo')
    later(leave, reducedMotion ? 900 : LOGO_HOLD)
  }, [leave, reducedMotion])

  const onPhotoLoad = useCallback((event: { currentTarget: HTMLImageElement }) => {
    // Декодируем заранее: иначе первый кадр проявления кухни уходит на расшифровку картинки
    const img = event.currentTarget
    const ready = () => {
      photoReady.current = true
      if (planWaiting.current) toLogo()
    }
    if (typeof img.decode === 'function') img.decode().then(ready, ready)
    else ready()
  }, [toLogo])

  useEffect(() => {
    if (!PRELOADER_DUE) {
      setVisible(false)
      delete document.documentElement.dataset.preloader
      return
    }
    document.documentElement.dataset.preloader = 'active'
    const content = document.getElementById('site-content')
    if (content) content.inert = true
    setReducedMotion(CALM)
    setEnabled(true)
    dialog.current?.focus({ preventScroll: true })
    // Повернули телефон или изменили окно — линии чертежа остаются в пиксель
    const syncUnits = () => document.documentElement.style.setProperty('--vp-u', planUnitsPerPx(window.innerWidth, window.innerHeight).toFixed(3))
    syncUnits()
    window.addEventListener('resize', syncUnits)
    const pending = timers.current
    return () => {
      window.removeEventListener('resize', syncUnits)
      pending.forEach(clearTimeout)
      if (content) content.inert = false
      delete document.documentElement.dataset.preloader
    }
  }, [])

  // Смена фаз. Без движения — сразу логотип. Иначе ждём, пока допишется
  // строка под чертежом (последняя анимация сцены), и, если фото уже готово,
  // переходим. Ориентируемся на сами анимации, а не на часы: заставка
  // начинает играть при первой отрисовке, а React оживает позже, и таймер от
  // его старта убежал бы вперёд сценария
  useEffect(() => {
    if (!enabled) return
    if (reducedMotion) { toLogo(); return }
    let cancelled = false
    let waiting: ReturnType<typeof setTimeout> | undefined
    const wall = setTimeout(toLogo, SCENE_WALL_LIMIT)

    const drawn = () => {
      if (cancelled) return
      if (photoReady.current) { toLogo(); return }
      planWaiting.current = true
      waiting = setTimeout(toLogo, PHOTO_WAIT)
    }
    const animations = note.current?.getAnimations?.() ?? []
    let done: ReturnType<typeof setTimeout> | undefined
    if (animations.length > 0) {
      Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)))
        .then(() => { done = setTimeout(drawn, 250) })
    } else {
      done = setTimeout(drawn, PLAN_MS)
    }

    // Фото могло догрузиться до гидратации, когда onLoad ещё некому было поймать
    const img = dialog.current?.querySelector<HTMLImageElement>('.vp__photo')
    if (img?.complete && img.naturalWidth > 0) photoReady.current = true

    return () => {
      cancelled = true
      planWaiting.current = false
      clearTimeout(wall)
      clearTimeout(done)
      clearTimeout(waiting)
    }
  }, [enabled, reducedMotion, toLogo])

  if (!visible) return null

  return (
    <section
      ref={dialog}
      tabIndex={-1}
      className="vp"
      data-phase={phase}
      data-mounted={enabled || undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Модуль Эстет — кухни на заказ"
      onKeyDown={(event) => { if (event.key === 'Escape') leave() }}
    >
      {/* Кадр кухни под чертежом. Геометрия та же, что у фото в hero, — чтобы
          растворение в конце не дёргало кадр */}
      <div className="vp__under" aria-hidden="true">
        <Image
          src="/images/hero-kitchen-night.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="vp__photo"
          onLoad={onPhotoLoad}
        />
        <div className="vp__vig" />
      </div>

      {!reducedMotion && (
        <div className="vp__plan" aria-hidden="true">
          <div className="vp__grid" />
          <p className="vp__head"><span>Модуль Эстет · </span>Проект кухни</p>
          <div className="vp__stage">
            <div className="vp__sheet">
              <i className="vp__hatch" style={onSheet(-WALL, RH + WALL, 0, -WALL)} />
              <i className="vp__hatch" style={onSheet(RW, RH + WALL, RW + WALL, -WALL)} />
              <i className="vp__hatch" style={onSheet(0, RH + WALL, RW, RH)} />
              <i className="vp__hatch" style={onSheet(0, 0, RW, -WALL)} />
              <PlanDrawing />
              {/* Точка лазера бежит по лучу, рядом — сколько намерено */}
              <div className="vp__laser" style={onSheet(0, 1650, RW, 1650)}>
                <span className="vp__laser-dot"><i /><b /></span>
              </div>
            </div>
            <p ref={note} className="vp__note">Для вашей красивой жизни</p>
          </div>
          <div className="vp__steps">
            {STEPS.map(({ label, on, off }) => (
              <span key={label} data-t={label} style={{ '--vp-on': `${on}s`, '--vp-off': `${off}s` } as CSSProperties}>{label}</span>
            ))}
          </div>
        </div>
      )}

      <div ref={logo} className="vp__logo" style={flight}>
        <Mark />
        <div className="vp__wordmark">
          <p className="vp__name">Модуль Эстет</p>
          <p className="vp__tagline">Кухни на заказ</p>
        </div>
      </div>

      <div className="vp__grain" aria-hidden="true" />

      <button type="button" className="vp__skip" onClick={leave} disabled={phase === 'leaving'}>
        Пропустить <ArrowRight size={16} aria-hidden="true" />
      </button>
    </section>
  )
}
