'use client'

import { LazyMotion, MotionConfig } from 'framer-motion'

/**
 * framer-motion в панели — только там, где без него не обойтись: жесты
 * (свайп листа и уведомлений), выход элемента со сцены, перестройка стопки.
 * Всё остальное движение — на CSS (app/admin/admin.css).
 *
 * Возможности библиотеки грузятся отдельным файлом уже после первой
 * отрисовки: в основной сборке панели остаётся только лёгкий `m`.
 * reducedMotion="user" — при «уменьшить движение» в системе framer сам
 * ставит всё на место без перемещений.
 */
const loadFeatures = () => import('framer-motion').then((mod) => mod.domMax)

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

/** Пружины панели — короче и плотнее, чем на сайте: это инструмент */
export const SPRING = { type: 'spring', stiffness: 520, damping: 40, mass: 0.9 } as const
export const SPRING_SOFT = { type: 'spring', stiffness: 360, damping: 34 } as const
