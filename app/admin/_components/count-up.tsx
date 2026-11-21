'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { formatMoney } from '@/lib/admin-format'

type Format = 'int' | 'percent' | 'money'

function render(value: number, format: Format): string {
  if (format === 'money') return formatMoney(Math.round(value))
  if (format === 'percent') return `${Math.round(value)}%`
  return Math.round(value).toLocaleString('ru-RU')
}

/** Насколько элемент виден с учётом прозрачности всех родителей до <main> */
function visibleOpacity(el: HTMLElement): number {
  let opacity = 1
  for (let node: HTMLElement | null = el; node && node.tagName !== 'MAIN'; node = node.parentElement) {
    opacity *= Number(getComputedStyle(node).opacity) || 0
  }
  return opacity
}

/**
 * Число на плитке докручивается от нуля, пока плитка проступает на экране.
 *
 * Сервер отдаёт готовое значение — без JavaScript и для поисковика видно
 * сразу итоговое число. Отсчёт запускается, только если плитку ещё не
 * успели рассмотреть (она в начале своего появления): если страница
 * оживилась поздно, число уже прочитано, и прыжок к нулю только мешал бы.
 */
export function CountUp({ value, format = 'int', duration = 900 }: { value: number; format?: Format; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(value)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !Number.isFinite(value) || value === 0) {
      setShown(value)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || visibleOpacity(el) > 0.6) {
      setShown(value)
      return
    }

    let frame = 0
    const startedAt = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - startedAt) / duration, 1)
      // Быстрый старт и долгий доводчик — как у стрелки прибора
      setShown(value * (1 - Math.pow(1 - t, 4)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    setShown(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return <span ref={ref}>{render(shown, format)}</span>
}
