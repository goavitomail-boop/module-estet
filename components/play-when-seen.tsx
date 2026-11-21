'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Сцена из scene-kit, которая ждёт, пока её увидят. До этого все её
 * CSS-анимации стоят на первом кадре (.hs-wait[data-wait] в scene-kit.css),
 * а когда блок вошёл в экран — отыгрывают один раз с нуля. Так сцена ниже
 * первого экрана не проигрывается впустую, пока человек её не долистал.
 */
export function PlayWhenSeen({
  children,
  className,
  rootMargin = '0px 0px -25% 0px',
}: {
  children: ReactNode
  className?: string
  /** Насколько блок должен войти в экран, чтобы сцена пошла */
  rootMargin?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setSeen(true)
        observer.disconnect()
      },
      { rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [rootMargin])

  return (
    <div ref={ref} className={cn('hs hs-wait', className)} data-wait={seen ? undefined : ''}>
      {/* Без JavaScript ждать некому — показываем всё как есть */}
      <noscript>
        <style>{'.hs-wait,.hs-wait *{animation:none!important}'}</style>
      </noscript>
      {children}
    </div>
  )
}

/**
 * Содержимое появляется через after мс и проявляется (.hs-later в
 * scene-kit.css). Так тяжёлые схемы встают уже после того, как шаг формы
 * выехал: если собрать их в кадрах выезда, экран дёргается
 */
export function Later({ after, children }: { after: number; children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), after)
    return () => clearTimeout(timer)
  }, [after])
  return ready ? <span className="hs-later absolute inset-0 block">{children}</span> : null
}
