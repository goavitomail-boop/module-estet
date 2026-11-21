'use client'

import { useState } from 'react'

/**
 * Число, которое при смене перекатывается: новое выезжает из-под маски снизу,
 * когда растёт, и сверху, когда уменьшается. dir задаёт направление явно —
 * когда счёт идёт по кругу (10 → 1 при листании вперёд). Стили — .rolling-count
 * в globals.css
 */
export function RollingCount({ value, dir }: { value: number; dir?: 1 | -1 }) {
  const [shown, setShown] = useState({ value, dir: 0, n: 0 })
  if (shown.value !== value) setShown({ value, dir: dir ?? (value > shown.value ? 1 : -1), n: shown.n + 1 })

  return (
    <span className="rolling-count">
      <span key={shown.n} data-dir={shown.n > 0 ? shown.dir : undefined}>
        {value}
      </span>
    </span>
  )
}
