'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/** Последняя показанная неделя — переживает переходы, пока открыта панель */
let lastWeek: string | null = null

/**
 * Обёртка недели в календаре замеров.
 *
 * — Новая неделя въезжает с той стороны, куда листали (data-week-dir, admin.css).
 * — На телефоне неделю листают свайпом вбок; содержимое тянется за пальцем.
 * — На клавиатуре — стрелками ← и →.
 *
 * Родитель ставит key={неделя}: на каждую неделю — новый экземпляр, и анимация
 * запускается заново даже при листании дважды в одну сторону.
 */
export function WeekSwipe({
  week,
  prevHref,
  nextHref,
  children,
}: {
  week: string
  prevHref: string
  nextHref: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const [dir] = useState(() => (lastWeek && lastWeek !== week ? (week > lastWeek ? 1 : -1) : 0))

  useEffect(() => {
    lastWeek = week
  }, [week])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]') || event.metaKey || event.ctrlKey) return
      if (event.key === 'ArrowLeft') router.push(prevHref)
      if (event.key === 'ArrowRight') router.push(nextHref)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router, prevHref, nextHref])

  const reset = () => {
    const el = ref.current
    if (!el) return
    el.style.transition = 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)'
    el.style.transform = ''
    start.current = null
  }

  return (
    <div
      ref={ref}
      data-week-dir={dir || undefined}
      className="touch-pan-y"
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch') return
        start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
        if (ref.current) ref.current.style.transition = 'none'
      }}
      onPointerMove={(event) => {
        const s = start.current
        if (!s || s.id !== event.pointerId || !ref.current) return
        const dx = event.clientX - s.x
        const dy = event.clientY - s.y
        // Тянем только явно горизонтальный жест, с сопротивлением
        if (Math.abs(dx) > Math.abs(dy)) ref.current.style.transform = `translateX(${dx * 0.35}px)`
      }}
      onPointerUp={(event) => {
        const s = start.current
        if (!s || s.id !== event.pointerId) return
        const dx = event.clientX - s.x
        const dy = event.clientY - s.y
        reset()
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          navigator.vibrate?.(8)
          router.push(dx < 0 ? nextHref : prevHref)
        }
      }}
      onPointerCancel={reset}
    >
      {children}
    </div>
  )
}
