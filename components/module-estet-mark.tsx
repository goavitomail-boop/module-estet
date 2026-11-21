/**
 * Знак «Модуль Эстет»: золотая рама с надрезами и «М» — тот, что в шапке
 * и подвале сайта. Единственный источник знака: им же пользуются панель
 * (/admin) и генератор иконок (scripts/gen-icons.mjs повторяет эти линии
 * для фавикона — менять знак нужно в обоих местах).
 *
 * Без 'use client': знак статичный и рисуется на сервере.
 * draw — линии получают pathLength=1, чтобы CSS мог их прорисовать
 * (экран входа в панель, .me-draw в app/admin/admin.css).
 */

export const MARK_GOLD = '#B2935A'

export function ModuleEstetMark({ className = '', draw = false }: { className?: string; draw?: boolean }) {
  const length = draw ? { pathLength: 1 } : {}
  return (
    <svg
      className={draw ? `me-draw ${className}` : className}
      viewBox="0 0 440 440"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      role="img"
      aria-label="Модуль Эстет"
    >
      <g transform="translate(10 10)" stroke={MARK_GOLD}>
        <path
          d="M18 18H402V118 M18 18V416H116 M402 416H304 M402 416V316"
          strokeWidth="16"
          strokeLinecap="square"
          strokeLinejoin="miter"
          {...length}
        />
        <path d="M104 348V104L210 216L316 104V348" strokeWidth="16" strokeLinecap="square" strokeLinejoin="miter" {...length} />
        <line x1="132" y1="262" x2="132" y2="314" strokeWidth="7" strokeLinecap="round" {...length} />
      </g>
    </svg>
  )
}
