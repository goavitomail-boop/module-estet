'use client'

import { LazyMotion, MotionConfig, domAnimation, m, type Variants } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Общий «почерк» движения для форм: квиз и запись на замер.
 *
 * Плавное торможение в конце, без пружин и перелётов — как power3.out, на
 * котором построены анимации прокрутки сайта (lib/gsap.ts). framer-motion
 * подключается облегчённо: LazyMotion с набором domAnimation и компоненты m.
 */

/** Кривая «быстро начать, мягко остановиться» — cubic-bezier к power3.out */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
const EASE_IN = [0.4, 0, 1, 1] as const

/**
 * Обёртка для любых m-компонентов формы. reducedMotion="user": при
 * «уменьшить движение» в системе сдвиги и масштаб не анимируются, остаётся
 * только короткое проявление
 */
export function FormMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

/**
 * Шаг формы. custom — направление: 1 вперёд, −1 назад. Новый шаг приходит
 * с той стороны, куда листаем, старый уходит в противоположную. Вложенные
 * элементы с itemVariants проявляются за ним лесенкой
 */
export const stepVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: 28 * direction }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.42, ease: EASE_OUT, staggerChildren: 0.04, delayChildren: 0.03 },
  },
  exit: (direction: number) => ({ opacity: 0, x: -20 * direction, transition: { duration: 0.2, ease: EASE_IN } }),
}

/**
 * Элемент внутри шага: только проявляется, без сдвига. Шаг и так едет вбок —
 * если каждый элемент ещё и поднимается, всё содержимое «подпрыгивает»
 */
export const itemVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.35, ease: EASE_OUT } },
}

/** Элемент экрана, который появляется один раз (экран успеха): поднимается и проявляется */
export const riseVariants: Variants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

/**
 * Плавная смена высоты. Шаги разной длины: без этого карточка при переходе
 * мгновенно схлопывается или вырастает, и кнопки под ней прыгают. Внутренний
 * отступ с отрицательным полем — чтобы overflow не срезал рамки фокуса у краёв
 */
export function AutoHeight({ children, className }: { children: ReactNode; className?: string }) {
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>('auto')

  useEffect(() => {
    const node = inner.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setHeight(node.offsetHeight))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <m.div
      className={cn('-m-2 overflow-hidden', className)}
      initial={false}
      animate={{ height }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <div ref={inner} className="p-2">{children}</div>
    </m.div>
  )
}

/** Заголовок выезжает из-под маски — родитель с overflow-hidden */
export const maskVariants: Variants = {
  enter: { y: '105%' },
  center: { y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
}

/** Лесенка для сетки вариантов ответа — карточки выходят по очереди */
export const staggerVariants: Variants = {
  enter: {},
  center: { transition: { staggerChildren: 0.035 } },
}

/** Лесенка текста на экране успеха — после того как нарисовалась галочка */
export const successVariants: Variants = {
  enter: {},
  center: { transition: { staggerChildren: 0.08, delayChildren: 0.45 } },
}

/** Круг с галочкой: круг мягко вырастает, галочка прорисовывается линией */
export function SuccessMark({ className }: { className?: string }) {
  return (
    <m.span
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground', className)}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-1/2" aria-hidden="true">
        <m.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.3, duration: 0.45, ease: EASE_OUT }}
        />
      </svg>
    </m.span>
  )
}
