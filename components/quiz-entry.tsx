'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import Image from 'next/image'
import { ArrowRight, Check } from 'lucide-react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { ProjectQuiz, type QuizProduct } from '@/components/project-quiz'
import { EASE_OUT, FormMotion } from '@/components/form-motion'
import { cn } from '@/lib/utils'

/**
 * Раскадровка экрана выбора, в секундах от начала. Первый заход — полный
 * «фильм»: блик по рейкам, логотип, свет в щели, защёлка, открытие. Повторный
 * заход в этой вкладке, клик по створкам или «уменьшить движение» в системе —
 * короткая версия без вступления.
 */
type Timeline = { sweep: number | null; logo: number; glow: number; crack: number; swing: number; swingDur: number; content: number }

const FULL: Timeline = { sweep: 0.15, logo: 0.3, glow: 0.95, crack: 1.35, swing: 1.7, swingDur: 1.5, content: 2.25 }
const FAST: Timeline = { sweep: null, logo: 0, glow: 0, crack: 0.05, swing: 0.25, swingDur: 1.05, content: 0.7 }

/** Тяжёлая створка трогается медленно; в конце доводчик мягко дотягивает её до упора */
const EASE_SWING = [0.55, 0, 0.2, 1] as const
/** Угол открытых створок: на широком экране они остаются по краям, как стенки шкафа */
const DOOR_ANGLE = 84
/** Пауза между выбором и началом вопросов: карточка успевает откликнуться */
const PICK_MS = 450
/** Отметка в sessionStorage: вступление уже показывали в этой вкладке */
const SEEN_KEY = 'me-quiz-doors-seen'

const options: Array<{
  product: QuizProduct
  image: string
  alt: string
  meta: string
  title: string
  text: string
  asks: string[]
  cta: string
}> = [
  {
    product: 'kitchen',
    image: '/quiz-options/choose-kitchen.webp',
    alt: 'Кухня с фасадами под дерево и чёрным мраморным фартуком',
    meta: '5 вопросов · около минуты',
    title: 'Кухня',
    text: 'Дизайнер предложит планировку, материалы и посчитает стоимость.',
    asks: ['Планировка', 'Размер', 'Стиль', 'Техника', 'Сроки'],
    cta: 'Рассчитать кухню',
  },
  {
    product: 'wardrobe',
    image: '/quiz-options/choose-wardrobe.webp',
    alt: 'Шкаф до потолка с подсвеченной нишей',
    meta: '6 вопросов · около минуты',
    title: 'Шкаф',
    text: 'Гардеробная, прихожая, спальня или гостиная — фасады и наполнение под ваши вещи.',
    asks: ['Комната', 'Тип шкафа', 'Ширина', 'Фасады', 'Наполнение'],
    cta: 'Рассчитать шкаф',
  },
]

/**
 * Рифлёный фасад Velvet в цвете «Пула»: тёмная основа и вертикальные рейки —
 * блик на грани, тень в желобке
 */
const FLUTED_FACADE = {
  backgroundColor: '#33302e',
  backgroundImage:
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0 2px, rgba(0,0,0,0.28) 2px 10px, rgba(255,255,255,0.02) 10px 13px)',
}

/** Пылинки в луче из щели. Координаты фиксированы — одинаково при каждом показе */
const DUST = Array.from({ length: 16 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  return { x: (r(1) - 0.5) * 180, y: 30 + r(2) * 60, size: 1.5 + r(3) * 2, drift: 50 + r(4) * 90, delay: r(5) * 0.9, dur: 2.2 + r(6) * 1.4 }
})

/**
 * Створка: рифлёный антрацит, латунный профиль LINE у стыка и половина
 * логотипа, проявляющаяся по буквам. У створки есть толщина — торец
 * с латунной кромкой виден, пока она поворачивается
 */
function Door({ side, angle, t }: { side: 'left' | 'right'; angle: number; t: Timeline }) {
  const left = side === 'left'
  const dir = left ? 1 : -1
  const word = left ? 'Модуль' : 'Эстет'
  const letterOffset = left ? 0 : 6

  return (
    <m.div
      className={cn('absolute inset-y-0 w-1/2', left ? 'left-0 origin-left' : 'right-0 origin-right')}
      style={{ transformStyle: 'preserve-3d' }}
      initial={{ x: 0, rotateY: 0 }}
      animate={{ x: -7 * dir, rotateY: [0, (angle + 3) * dir, angle * dir] }}
      transition={{
        x: { delay: t.crack, duration: 0.35, ease: EASE_OUT },
        rotateY: { delay: t.swing, duration: t.swingDur, ease: EASE_SWING, times: [0, 0.82, 1] },
      }}
    >
      {/* Лицевая сторона. Отдельный слой с overflow: hidden — на самой
          створке он сплющил бы торец, которому нужен объём */}
      <span className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="absolute inset-0" style={FLUTED_FACADE} />
        <span className={cn('absolute inset-0', left ? 'bg-gradient-to-r' : 'bg-gradient-to-l', 'from-black/45 via-black/15 to-transparent')} />
        {/* Блик скользит по рейкам слева направо, через обе створки */}
        {t.sweep !== null && (
          <m.span
            className="absolute inset-y-0 w-[45%] bg-[linear-gradient(100deg,transparent,rgba(255,236,205,0.16)_50%,transparent)] mix-blend-screen"
            initial={{ left: '-50%' }}
            animate={{ left: '110%' }}
            transition={{ delay: t.sweep + (left ? 0 : 0.42), duration: 0.9, ease: [0.45, 0, 0.55, 1] }}
          />
        )}
        {/* Блик на повороте и тень открытой створки */}
        <m.span
          className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,240,215,0.22),transparent)] mix-blend-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0] }}
          transition={{ delay: t.swing, duration: t.swingDur * 0.8, times: [0, 0.4, 1] }}
        />
        <m.span
          className="absolute inset-0 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: t.swing + 0.2, duration: t.swingDur, ease: EASE_SWING }}
        />
      </span>

      {/* Латунный профиль LINE у стыка: сначала холодный, перед открытием накаляется */}
      <span
        className={cn('absolute inset-y-0 w-2 bg-gradient-to-r from-[#6f5a35] via-[#d8bf8a] to-[#6f5a35]', left ? 'right-0' : 'left-0')}
        aria-hidden="true"
      >
        <m.span
          className="absolute inset-0 bg-[#ffe3ad] shadow-[0_0_18px_4px_rgba(255,214,150,0.55)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.75, 0.2] }}
          transition={{ delay: t.glow, duration: t.swing - t.glow + 0.6, times: [0, 0.55, 1] }}
        />
      </span>

      {/* Торец толщиной 19 мм — как у фасада Velvet */}
      <span
        className={cn('absolute inset-y-0 w-[19px] bg-gradient-to-b from-[#8a7046] via-[#d2b680] to-[#6a5532]', left ? 'right-0' : 'left-0')}
        style={{ transformOrigin: left ? 'right center' : 'left center', transform: `rotateY(${left ? -90 : 90}deg)` }}
        aria-hidden="true"
      />

      <span
        className={cn('absolute top-1/2 flex -translate-y-1/2 flex-col gap-3 text-[#f4e7cf]', left ? 'right-8 items-end md:right-14' : 'left-8 items-start md:left-14')}
        aria-hidden="true"
      >
        <m.span
          className="flex text-xl font-semibold uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] md:text-4xl"
          initial={{ letterSpacing: '0.6em' }}
          animate={{ letterSpacing: '0.32em' }}
          transition={{ delay: t.logo, duration: 1.3, ease: EASE_OUT }}
        >
          {Array.from(word).map((letter, i) => (
            <m.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ delay: t.logo + (letterOffset + i) * 0.05, duration: 0.6, ease: EASE_OUT }}
            >
              {letter}
            </m.span>
          ))}
        </m.span>
        <m.span
          className={cn('h-px w-16 bg-primary md:w-28', left ? 'origin-right' : 'origin-left')}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: t.logo + 0.55, duration: 0.8, ease: EASE_OUT }}
        />
      </span>
    </m.div>
  )
}

/** Свет изнутри: тонкая нить в стыке, ореол на фасадах и пылинки в луче */
function SeamLight({ t, particles }: { t: Timeline; particles: boolean }) {
  const end = t.swing + t.swingDur
  return (
    <span className="pointer-events-none absolute inset-0 z-30 mix-blend-screen" aria-hidden="true">
      <m.span
        className="absolute inset-y-0 left-1/2 w-[340px] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(255,206,140,0.5),transparent_70%)] md:w-[560px]"
        initial={{ opacity: 0, scaleX: 0.15 }}
        animate={{ opacity: [0, 0.35, 0.95, 0], scaleX: [0.15, 0.3, 1, 2.6] }}
        transition={{ delay: t.glow, duration: end - t.glow, times: [0, (t.crack - t.glow) / (end - t.glow), (t.swing + 0.3 - t.glow) / (end - t.glow), 1], ease: 'easeInOut' }}
      />
      <m.span
        className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[#fff1d6] shadow-[0_0_24px_6px_rgba(255,214,150,0.8)]"
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: [0, 0.8, 1, 0], scaleY: [0, 1, 1, 1] }}
        transition={{ delay: t.glow, duration: t.swing - t.glow + 0.7, times: [0, 0.4, 0.75, 1], ease: 'easeOut' }}
      />
      {particles &&
        DUST.map((d, i) => (
          <m.span
            key={i}
            className="absolute rounded-full bg-[#ffeccb]"
            style={{ left: `calc(50% + ${d.x}px)`, top: `${d.y}%`, width: d.size, height: d.size }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 0.85, 0], y: -d.drift }}
            transition={{ delay: t.crack + d.delay, duration: d.dur, ease: 'easeOut' }}
          />
        ))}
    </span>
  )
}

/**
 * Карточка выбора с лёгким наклоном за курсором. Наклон пишется прямо
 * в style, без перерисовки компонента на каждое движение мыши
 */
function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !ref.current) return
    const box = ref.current.getBoundingClientRect()
    const dx = (event.clientX - box.left) / box.width - 0.5
    const dy = (event.clientY - box.top) / box.height - 0.5
    ref.current.style.transform = `rotateX(${(-dy * 6).toFixed(2)}deg) rotateY(${(dx * 8).toFixed(2)}deg)`
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = ''
  }
  return (
    <div className="[perspective:1200px]" onPointerMove={move} onPointerLeave={reset}>
      <div ref={ref} className="transition-transform duration-300 ease-out will-change-transform">
        {children}
      </div>
    </div>
  )
}

/**
 * Первый экран квиза — закрытый шкаф. Блик пробегает по рейкам, проявляется
 * логотип, в щели загорается свет, створки отходят на защёлке и распахиваются
 * внутрь, камера «въезжает» в шкаф, а в подсвеченном нутре — выбор: кухня
 * или шкаф. На узком экране створки уходят совсем.
 */
function QuizChooser({ onChoose }: { onChoose: (product: QuizProduct) => void }) {
  const reduceMotion = useReducedMotion()
  const [picked, setPicked] = useState<QuizProduct | null>(null)
  const [narrow, setNarrow] = useState(false)
  const [fast, setFast] = useState(false)
  const doorsRef = useRef<HTMLDivElement>(null)
  const pickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const interiorRef = useRef<HTMLDivElement>(null)
  const t = fast || reduceMotion ? FAST : FULL

  useEffect(() => {
    setNarrow(window.matchMedia('(max-width: 767px)').matches)
    try {
      if (sessionStorage.getItem(SEEN_KEY)) setFast(true)
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Хранилище закрыто — просто покажем полную версию
    }
    return () => clearTimeout(pickTimer.current)
  }, [])

  // Пока створки закрыты, они ловят клик «открыть сразу»; потом пропускают
  // нажатия к карточкам. Пишем прямо в style: перерисовка компонента посреди
  // раскадровки сбросила бы ещё идущие анимации к началу
  useEffect(() => {
    const doors = doorsRef.current
    if (!doors) return
    doors.style.pointerEvents = ''
    const timer = setTimeout(() => {
      doors.style.pointerEvents = 'none'
      doors.style.cursor = ''
    }, (t.swing + t.swingDur * 0.6) * 1000)
    return () => clearTimeout(timer)
  }, [t])

  const pick = (product: QuizProduct) => {
    if (picked) return
    setPicked(product)
    pickTimer.current = setTimeout(() => onChoose(product), PICK_MS)
  }

  // Мягкий свет внутри шкафа следует за курсором
  const followLight = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !interiorRef.current) return
    const box = interiorRef.current.getBoundingClientRect()
    interiorRef.current.style.setProperty('--mx', `${event.clientX - box.left}px`)
    interiorRef.current.style.setProperty('--my', `${event.clientY - box.top}px`)
  }

  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT, delay } },
  })

  return (
    <m.section aria-labelledby="quiz-choose-title" data-own-motion className="bg-[#0b0a09] pt-16 md:pt-20" exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      {/* key: при переходе на короткую версию раскадровка начинается заново —
          створки в этот момент ещё закрыты, так что подмены не видно */}
      <m.div
        key={t === FULL ? 'full' : 'fast'}
        ref={interiorRef}
        onPointerMove={followLight}
        className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#161412] md:min-h-[calc(100dvh-5rem)]"
        initial={{ scale: 0.965 }}
        animate={{ scale: 1 }}
        transition={{ delay: t.swing, duration: t.swingDur + 0.4, ease: EASE_OUT }}
      >
        {/* Нутро шкафа: тёплая подсветка сверху, свет за курсором, тень пола */}
        <span
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,color-mix(in_oklab,var(--primary)_32%,transparent),transparent_70%)]"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_circle_at_var(--mx,50%)_var(--my,40%),rgba(255,214,160,0.07),transparent_65%)]"
          aria-hidden="true"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
        <m.span
          className="pointer-events-none absolute inset-x-[16%] top-0 h-0.5 rounded-full bg-primary shadow-[0_0_48px_14px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
          initial={{ opacity: 0, scaleX: 0.3 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.7, delay: t.swing + 0.45, ease: EASE_OUT }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[min(58rem,100%)] flex-1 flex-col justify-center px-4 py-8 md:w-[58vw] md:py-12">
          <div className="mb-6 text-center text-background md:mb-10">
            <m.p className="text-[11px] font-bold uppercase tracking-[0.26em] text-primary md:text-xs" {...reveal(t.content)}>
              Бесплатный расчёт · около минуты
            </m.p>
            <h1 id="quiz-choose-title" className="flyer-title mt-3 overflow-hidden pb-1 text-4xl md:text-6xl">
              <m.span
                className="inline-block"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ delay: t.content + 0.08, duration: 0.9, ease: EASE_OUT }}
              >
                Что рассчитываем?
              </m.span>
            </h1>
            <m.p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-background/60 md:text-base" {...reveal(t.content + 0.2)}>
              Выберите — и вопросы подстроятся под вашу задачу.
            </m.p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {options.map((option, index) => {
              const isPicked = picked === option.product
              const dimmed = picked !== null && !isPicked
              const delay = t.content + 0.25 + index * 0.14
              return (
                <m.div
                  key={option.product}
                  initial={{ opacity: 0, y: 40, scale: 0.94, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  transition={{ delay, duration: 0.95, ease: EASE_OUT }}
                >
                  <TiltCard>
                    <button
                      type="button"
                      onClick={() => pick(option.product)}
                      className={cn(
                        'group relative flex h-[clamp(14rem,34dvh,18rem)] w-full flex-col justify-end overflow-hidden rounded-3xl border border-primary/30 text-left text-background shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] outline-none transition duration-500 ease-out md:h-[min(34rem,56dvh)]',
                        'hover:-translate-y-1.5 hover:border-primary focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/40',
                        isPicked && 'scale-[1.02] border-primary',
                        dimmed && 'opacity-30',
                      )}
                    >
                      <span className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-105">
                        <Image src={option.image} alt={option.alt} fill priority sizes="(max-width: 768px) 100vw, 32vw" className="object-cover" />
                      </span>
                      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5" aria-hidden="true" />
                      {/* Подсветка по верхнему краю — включается вслед за LED шкафа */}
                      <m.span
                        className="absolute inset-x-6 top-0 h-px bg-primary opacity-60 shadow-[0_0_24px_6px_color-mix(in_oklab,var(--primary)_60%,transparent)] transition-opacity duration-500 group-hover:opacity-100"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: delay + 0.45, duration: 0.8, ease: EASE_OUT }}
                        aria-hidden="true"
                      />

                      <span className="relative flex flex-col gap-2.5 p-5 md:gap-3 md:p-8">
                        <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)] md:text-xs">{option.meta}</span>
                        <span className="flyer-title text-5xl leading-none md:text-7xl">{option.title}</span>
                        <span className="max-w-sm text-pretty text-sm leading-relaxed text-background/75 max-md:hidden">{option.text}</span>
                        <span className="flex flex-wrap gap-1.5" aria-label="О чём спросим">
                          {option.asks.map((item) => (
                            <span key={item} className="rounded-full border border-background/25 bg-black/20 px-2.5 py-1 text-[11px] text-background/85 backdrop-blur-sm md:text-xs">
                              {item}
                            </span>
                          ))}
                        </span>
                        <span className="mt-1.5 inline-flex min-h-12 w-fit items-center gap-3 rounded-full bg-primary pl-6 pr-1.5 text-sm font-bold text-primary-foreground transition-colors duration-300 group-hover:bg-background group-hover:text-foreground md:mt-3 md:text-base">
                          {option.cta}
                          <span className="flex size-9 items-center justify-center rounded-full bg-foreground/15">
                            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                          </span>
                        </span>
                      </span>
                    </button>
                  </TiltCard>
                </m.div>
              )
            })}
          </div>

          <m.p className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-background/55 md:mt-8" {...reveal(t.content + 0.75)}>
            {['Бесплатно', 'Ни к чему не обязывает', 'Ответы сохраняются'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" aria-hidden="true" />
                {item}
              </span>
            ))}
          </m.p>
        </div>

        {/* Темнота внутри закрытого шкафа — уходит, когда створки открываются */}
        <m.span
          className="pointer-events-none absolute inset-0 z-[15] bg-black"
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ delay: t.swing + 0.15, duration: t.swingDur, ease: EASE_OUT }}
          aria-hidden="true"
        />

        {/* Створки. Пока закрыты, клик по ним открывает шкаф сразу */}
        <div
          ref={doorsRef}
          className="absolute inset-0 z-20 cursor-pointer"
          onClick={() => !fast && setFast(true)}
          aria-hidden="true"
        >
          {/* Перспектива — на прямом родителе створок: на более дальних предков CSS её не распространяет */}
          <m.div
            className="absolute inset-0 [perspective:1800px]"
            initial={{ opacity: 1 }}
            animate={{ opacity: narrow ? 0 : 1 }}
            transition={{ duration: 0.45, delay: t.swing + t.swingDur * 0.55 }}
          >
            <Door side="left" angle={narrow ? 96 : DOOR_ANGLE} t={t} />
            <Door side="right" angle={narrow ? 96 : DOOR_ANGLE} t={t} />
          </m.div>
        </div>
        <SeamLight t={t} particles={t === FULL} />
      </m.div>
    </m.section>
  )
}

/**
 * Квиз со входом через выбор «кухня или шкаф». Выбор пишется в адрес
 * (?type=…), чтобы после обновления страницы человек остался в своём квизе,
 * а ссылки со страницы шкафов вели сразу в нужные вопросы.
 */
export function QuizEntry({ initialProduct }: { initialProduct: QuizProduct | null }) {
  const [product, setProduct] = useState<QuizProduct | null>(initialProduct)

  const choose = (next: QuizProduct) => {
    setProduct(next)
    window.history.replaceState(null, '', `/quiz?type=${next}`)
    window.scrollTo({ top: 0 })
  }

  const changeProduct = () => {
    setProduct(null)
    window.history.replaceState(null, '', '/quiz')
    window.scrollTo({ top: 0 })
  }

  return (
    <FormMotion>
      <AnimatePresence mode="wait">
        {product ? (
          <m.div
            key={product}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.45, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <ProjectQuiz product={product} onChangeProduct={changeProduct} />
          </m.div>
        ) : (
          <QuizChooser key="chooser" onChoose={choose} />
        )}
      </AnimatePresence>
    </FormMotion>
  )
}
