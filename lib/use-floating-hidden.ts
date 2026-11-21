'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Плавающие кнопки прячутся, пока в кадре блок с теми же кнопками —
 * финальный призыв и подвал. Там они дублируют друг друга, а внизу страницы
 * ещё и закрывают реквизиты: прокрутить их из-под кнопки уже некуда.
 * Такие блоки помечены атрибутом data-floating-hide.
 *
 * Виджеты живут в общем layout и переживают переходы между страницами,
 * поэтому наблюдение перезапускается на каждом новом адресе.
 */
export function useFloatingHidden(): boolean {
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(false)
    const targets = document.querySelectorAll('[data-floating-hide]')
    if (targets.length === 0) return

    const inView = new Set<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? inView.add(entry.target) : inView.delete(entry.target)))
        setHidden(inView.size > 0)
      },
      // Срабатывает, когда блок доходит до высоты самих кнопок, а не раньше
      // (rootMargin принимает только px и %)
      { rootMargin: '0px 0px -80px 0px' },
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [pathname])

  return hidden
}
