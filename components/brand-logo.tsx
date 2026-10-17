import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'

/**
 * Логотип «Модуль Эстет» по фирменному макету.
 *
 * variant='full' — весь локап: слева золотая рама с надрезами и угловатой «М»,
 * справа кухня тонкой линией (навесные шкафы с золотыми ручками, подсветка,
 * столешница, смеситель с мойкой, чаша, нижние секции); ниже — «МОДУЛЬ ЭСТЕТ»
 * и золотое «КУХНИ НА ЗАКАЗ» с боковыми линиями. Используется в прелоадере
 * и футере.
 *
 * variant='compact' — только знак и текст в одну строку (шапка).
 *
 * Анимация `animated`: рама и линии кухни прорисовываются по очереди
 * (pathLength=1 + инлайн-задержка --d), золотые заливки проявляются,
 * затем вступают слова. При наведении на блок с классом .group (шапка)
 * знак перерисовывается заново. Обычные линии наследуют currentColor,
 * золото фиксировано — var(--primary).
 */

const STEP = 75

function delay(index: number): CSSProperties {
  return { '--d': `${index * STEP}ms` } as CSSProperties
}

/** Рама с надрезами + угловатая «М»: общий блок для обоих вариантов */
function LogoMark() {
  return (
    <>
      <g fill="none" stroke="var(--primary)" strokeWidth={16}>
        <path className="bl__frame" d="M148 536 V198 H420" pathLength={1} style={delay(0)} />
        <path className="bl__frame" d="M462 196 V292" pathLength={1} style={delay(1)} />
        <path className="bl__frame" d="M252 490 V536 H462 V312" pathLength={1} style={delay(2)} />
      </g>
      <g fill="var(--primary)">
        <path className="bl__mp" style={delay(3)} d="M204 204 L240 204 L322 446 L286 446 Z" />
        <path className="bl__mp" style={delay(4)} d="M362 204 L402 204 L320 446 L284 446 Z" />
        <rect className="bl__mp" style={delay(5)} x="366" y="204" width="36" height="154" />
      </g>
    </>
  )
}

export function BrandLogo({
  animated = false,
  variant = 'full',
  className,
}: {
  animated?: boolean
  variant?: 'full' | 'compact'
  className?: string
}) {
  return (
    <span
      className={cn(
        'bl',
        variant === 'compact' && 'bl--compact',
        animated && 'bl--animated',
        className,
      )}
    >
      {variant === 'compact' ? (
        <svg className="bl__art" viewBox="133 186 346 366" aria-hidden="true" focusable="false">
          <LogoMark />
        </svg>
      ) : (
        <svg className="bl__art" viewBox="0 170 1160 400" aria-hidden="true" focusable="false">
          <LogoMark />
          {/* Навесные шкафы */}
          <rect className="bl__ln" x="517" y="190" width="516" height="108" strokeWidth={4} pathLength={1} style={delay(6)} />
          <line className="bl__ln" x1="687" y1="190" x2="687" y2="298" strokeWidth={3.5} pathLength={1} style={delay(7)} />
          <line className="bl__ln" x1="861" y1="190" x2="861" y2="298" strokeWidth={3.5} pathLength={1} style={delay(8)} />
          {/* Ручки шкафов */}
          <line className="bl__gd" x1="600" y1="224" x2="600" y2="264" strokeWidth={5} strokeLinecap="round" pathLength={1} style={delay(9)} />
          <line className="bl__gd" x1="774" y1="224" x2="774" y2="264" strokeWidth={5} strokeLinecap="round" pathLength={1} style={delay(10)} />
          <line className="bl__gd" x1="948" y1="224" x2="948" y2="264" strokeWidth={5} strokeLinecap="round" pathLength={1} style={delay(11)} />
          {/* Подсветка под шкафами */}
          <line className="bl__gd" x1="585" y1="316" x2="905" y2="316" strokeWidth={5} strokeLinecap="round" pathLength={1} style={delay(12)} />
          {/* Столешница */}
          <line className="bl__ln" x1="517" y1="400" x2="1033" y2="400" strokeWidth={4} pathLength={1} style={delay(13)} />
          {/* Смеситель */}
          <path
            className="bl__ln"
            d="M598 398 V336 A17 17 0 0 1 632 336 L632 352"
            strokeWidth={3.5}
            strokeLinecap="round"
            pathLength={1}
            style={delay(14)}
          />
          {/* Мойка */}
          <rect className="bl__mp" style={delay(15)} x="576" y="388" width="56" height="12" rx="6" />
          {/* Чаша */}
          <path className="bl__ln" d="M962 396 A23 23 0 0 0 1008 396 Z"
                fill="none" strokeWidth={3.5} pathLength={1} style={delay(16)} />
          {/* Нижние секции */}
          <line className="bl__ln" x1="517" y1="400" x2="517" y2="543" strokeWidth={4} pathLength={1} style={delay(17)} />
          <line className="bl__ln" x1="692" y1="400" x2="692" y2="543" strokeWidth={4} pathLength={1} style={delay(18)} />
          <line className="bl__ln" x1="866" y1="400" x2="866" y2="543" strokeWidth={4} pathLength={1} style={delay(19)} />
          <line className="bl__ln" x1="1033" y1="400" x2="1033" y2="543" strokeWidth={4} pathLength={1} style={delay(20)} />
          {/* Ящики */}
          <line className="bl__gd" x1="722" y1="455" x2="838" y2="455" strokeWidth={5} strokeLinecap="round" pathLength={1} style={delay(21)} />
          <line className="bl__gd" x1="722" y1="492" x2="838" y2="492" strokeWidth={5} strokeLinecap="round" pathLength={1} style={delay(22)} />
          {/* Ручки дверец */}
          <line className="bl__gd" x1="930" y1="430" x2="930" y2="512" strokeWidth={5} strokeLinecap="round" pathLength={1} style={delay(23)} />
          <line className="bl__gd" x1="975" y1="430" x2="975" y2="512" strokeWidth={5} strokeLinecap="round" pathLength={1} style={delay(24)} />
        </svg>
      )}

      <span className="bl__text">
        <span className="bl__title">Модуль Эстет</span>
        <span className="bl__sub">Кухни на заказ</span>
      </span>
    </span>
  )
}