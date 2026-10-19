import type { CSSProperties } from 'react'
import './scene-kit.css'

/**
 * Общие приёмы сцен в стиле первого экрана: вход и уход слоя, палец.
 * Правила — в scene-kit.css, корень сцены — класс .hs.
 */

/** Вход слоя: когда, сколько, откуда и с какой кривой */
export function enter(d: number, { t = 0.8, from = 'translateY(14px)', ease = 'var(--spring)' } = {}) {
  return { '--d': `${d}s`, '--t': `${t}s`, '--from': from, '--e': ease } as CSSProperties
}

/** Уход слоя в момент od сцены */
export function leave(od: number, { t = 0.3, to = 'translateY(-8px)' } = {}) {
  return { '--od': `${od}s`, '--ot': `${t}s`, '--to': to } as CSSProperties
}

/** Значок или плашка появляется с лёгкой пружинкой */
export const POP = { t: 0.6, from: 'translateY(10px) scale(0.85)', ease: 'var(--pop)' }

/**
 * Палец внутри того, на что нажимает: прилетает (d), нажимает (tap),
 * уходит (out). Тёмный с белым кантом — виден и на белой кнопке
 */
export function Finger({ d, tap, out, from = 'translate(70%, 110%)', to = 'translate(30%, 60%)' }: { d: number; tap: number; out: number; from?: string; to?: string }) {
  return (
    <span
      className="hs-finger [--fs:1.75rem] md:[--fs:2.25rem]"
      style={{ '--d': `${d}s`, '--tap': `${tap}s`, '--o': `${out}s`, '--from': from, '--to': to } as CSSProperties}
      aria-hidden="true"
    >
      <span className="hs-finger-ring absolute inset-0 rounded-full border-2 border-white opacity-0" />
      <span className="hs-finger-dot block size-full rounded-full border-2 border-white bg-[rgba(20,18,16,0.4)] shadow-[0_6px_18px_rgba(0,0,0,0.45)]" />
    </span>
  )
}
