import type { CSSProperties } from 'react'

/**
 * Слой «чертежа» поверх фото первого экрана: выноски к деталям кухни,
 * размерная линия, метки обреза по углам и подпись кадра.
 *
 * Координаты — в процентах от самого снимка (hero-kitchen-night.webp,
 * 1672×941), а не от экрана. Карта .hero-plan__map повторяет геометрию
 * object-fit: cover, поэтому точки держатся на своих предметах при любой
 * ширине окна. Сам логотип бренда — кухня, нарисованная тонкой линией;
 * этот слой продолжает тот же язык.
 */

type Direction = 'ul' | 'ur' | 'dl' | 'dr'

const callouts: { x: number; y: number; dir: Direction; title: string; value: string }[] = [
  { x: 1100, y: 230, dir: 'ul', title: 'Фасады', value: 'МДФ · матовая эмаль' },
  // Точка левее по ленте подсветки: при x≈1270 подпись вправо уходила
  // за край экрана на ширине 1024
  { x: 1150, y: 306, dir: 'ur', title: 'Подсветка', value: 'Тёплый свет · 3000 K' },
  { x: 1060, y: 590, dir: 'dr', title: 'Остров', value: 'Кварцевый агломерат' },
]

const IMAGE_W = 1672
const IMAGE_H = 941

const pct = (value: number, total: number) => `${((value / total) * 100).toFixed(2)}%`

export function HeroPlan() {
  return (
    <div className="hero-plan" aria-hidden="true">
      <span className="hero-plan__corner hero-plan__corner--tl" />
      <span className="hero-plan__corner hero-plan__corner--tr" />
      <span className="hero-plan__corner hero-plan__corner--bl" />
      <span className="hero-plan__corner hero-plan__corner--br" />
      {/* Честная подпись: на фото визуализация, а не снимок объекта */}
      <span className="hero-plan__caption">Визуализация проекта</span>

      <div className="hero-plan__map">
        {/* Размерная линия по верху острова */}
        <div
          className="hero-plan__dim"
          style={{ left: pct(940, IMAGE_W), top: pct(452, IMAGE_H), width: pct(1560 - 940, IMAGE_W) }}
        >
          <span className="hero-plan__dim-label">3 200</span>
        </div>

        {callouts.map((item, index) => (
          <div
            key={item.title}
            className={`hero-plan__callout hero-plan__callout--${item.dir}`}
            style={{ left: pct(item.x, IMAGE_W), top: pct(item.y, IMAGE_H), '--i': index } as CSSProperties}
          >
            <span className="hero-plan__dot" />
            <svg className="hero-plan__leader" viewBox="0 0 56 28" preserveAspectRatio="none">
              <path d="M0 28 L20 0 H56" pathLength={1} />
            </svg>
            <span className="hero-plan__label">
              <span className="hero-plan__label-title">{item.title}</span>
              <span className="hero-plan__label-value">{item.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
