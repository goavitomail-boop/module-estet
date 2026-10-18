'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { AnimatePresence, m } from 'framer-motion'
import { ProjectQuiz, type QuizProduct } from '@/components/project-quiz'
import { EASE_OUT, FormMotion } from '@/components/form-motion'
import { cn } from '@/lib/utils'

/** Кривая выезда половин: разгон и мягкая посадка, как у шторки */
const EASE_PANEL = [0.76, 0, 0.24, 1] as const
/** Сколько выбранная половина раскрывается на весь экран, прежде чем начнётся квиз */
const PICK_MS = 750

const panels: Array<{
  product: QuizProduct
  from: string
  image: string
  alt: string
  eyebrow: string
  title: string
  text: string
  cta: string
}> = [
  {
    product: 'kitchen',
    from: '-100%',
    image: '/quiz-options/choose-kitchen.webp',
    alt: 'Кухня с фасадами под дерево и чёрным мраморным фартуком',
    eyebrow: '5 вопросов · около минуты',
    title: 'Кухня',
    text: 'Планировка, размер, стиль и техника — дизайнер предложит идеи и расчёт.',
    cta: 'Рассчитать кухню',
  },
  {
    product: 'wardrobe',
    from: '100%',
    image: '/quiz-options/choose-wardrobe.webp',
    alt: 'Шкаф до потолка с подсвеченной нишей',
    eyebrow: '6 вопросов · около минуты',
    title: 'Шкаф',
    text: 'Гардеробная, прихожая, спальня или гостиная — подберём фасады и наполнение.',
    cta: 'Рассчитать шкаф',
  },
]

/**
 * Первый экран квиза: две половины на весь экран — кухня и шкаф.
 * Выезжают навстречу друг другу, по наведению половина расширяется,
 * а выбранная раскрывается на весь экран и уступает место вопросам.
 */
function QuizChooser({ onChoose }: { onChoose: (product: QuizProduct) => void }) {
  const [picked, setPicked] = useState<QuizProduct | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const pick = (product: QuizProduct) => {
    if (picked) return
    setPicked(product)
    timer.current = setTimeout(() => onChoose(product), PICK_MS)
  }

  return (
    <m.section
      aria-labelledby="quiz-choose-title"
      className="relative flex h-[100dvh] min-h-[34rem] flex-col bg-foreground pt-16 md:pt-20"
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        {panels.map((panel, index) => {
          const isPicked = picked === panel.product
          const isOther = picked !== null && !isPicked
          return (
            <m.button
              key={panel.product}
              type="button"
              onClick={() => pick(panel.product)}
              aria-label={`${panel.cta}: ${panel.text}`}
              initial={{ x: panel.from }}
              animate={
                isOther
                  ? { x: panel.from, opacity: 0, transition: { duration: 0.6, ease: EASE_PANEL } }
                  : { x: 0, opacity: 1, transition: { duration: 1.1, ease: EASE_PANEL, delay: index * 0.08 } }
              }
              className={cn(
                'group relative min-h-0 shrink basis-0 overflow-hidden text-left text-background outline-none transition-[flex-grow] duration-700 ease-out focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary',
                // Рост задаётся одним классом: два разных grow-* на одном элементе
                // Tailwind упорядочивает не по смыслу
                isPicked ? 'grow-[40]' : 'grow',
                !picked && 'md:hover:grow-[1.35]',
              )}
            >
              {/* Фото приближается после выезда, а по наведению — ещё чуть-чуть */}
              <m.span
                className="absolute inset-0 block"
                initial={{ scale: 1.25 }}
                animate={{ scale: 1, transition: { duration: 1.8, ease: EASE_OUT } }}
              >
                <span className="absolute inset-0 block transition-transform duration-[1200ms] ease-out group-hover:scale-105">
                  <Image src={panel.image} alt={panel.alt} fill priority sizes="(max-width: 768px) 100vw, 60vw" className="object-cover" />
                </span>
              </m.span>
              <span
                className="absolute inset-0 bg-gradient-to-t from-foreground/95 via-foreground/45 to-foreground/10 transition-opacity duration-700 group-hover:opacity-90"
                aria-hidden="true"
              />

              <m.span
                className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-6 pb-8 md:gap-4 md:p-12 lg:p-16"
                initial={{ opacity: 0, y: 24 }}
                animate={
                  picked
                    ? { opacity: 0, y: 0, transition: { duration: 0.25 } }
                    : { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT, delay: 0.75 + index * 0.12 } }
                }
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)] md:text-xs">{panel.eyebrow}</span>
                <span className="flyer-title text-6xl leading-none md:text-8xl">{panel.title}</span>
                <span className="max-w-sm text-pretty text-sm leading-relaxed text-background/80 max-sm:hidden md:text-base">{panel.text}</span>
                <span className="mt-1 inline-flex min-h-12 items-center gap-3 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors group-hover:bg-background group-hover:text-foreground md:mt-3 md:min-h-14 md:px-7 md:text-base">
                  {panel.cta}
                  <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </m.span>
            </m.button>
          )
        })}

        {/* Заголовок и «или» поверх стыка половин: декоративны для клика,
            поэтому не перехватывают нажатия. На телефоне половины низкие,
            и заголовок налезал бы на подписи — там он только для чтения с экрана */}
        <m.div
          className="pointer-events-none absolute inset-x-0 top-6 flex flex-col items-center px-4 text-center text-background max-md:sr-only md:top-10"
          initial={{ opacity: 0, y: -12 }}
          animate={picked ? { opacity: 0 } : { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT, delay: 1 } }}
        >
          <span className="rounded-full border border-background/25 bg-foreground/40 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] backdrop-blur-sm">
            Бесплатный расчёт
          </span>
          <h1 id="quiz-choose-title" className="flyer-title mt-3 text-3xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] md:text-5xl">
            Что планируете?
          </h1>
        </m.div>
        <m.span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-foreground font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary md:size-20 md:text-sm"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={picked ? { opacity: 0, scale: 0.4 } : { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE_OUT, delay: 1.05 } }}
        >
          или
        </m.span>
      </div>
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
