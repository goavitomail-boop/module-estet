'use client'

import { useRef, useState } from 'react'
import { EmptyState } from './ui'
import { cn } from '@/lib/utils'

interface Point {
  day: string
  total: number
  measurement?: number
  project?: number
}

function dayLabel(day: string, options: Intl.DateTimeFormatOptions) {
  return new Date(day).toLocaleDateString('ru-RU', options)
}

/**
 * График заявок по дням.
 *
 * Столбик — два цвета: снизу проекты (латунь), сверху замеры (графит).
 * Палец или мышь ведут по графику — подсказка скользит за ними и показывает
 * день и разбивку; остальные столбики притухают. Пунктир — среднее за период.
 * Рисуется на CSS, без библиотеки графиков: столбики растут по очереди при
 * появлении (.admin-bar-y в admin.css).
 */
export function DayChart({ data }: { data: Point[] }) {
  const [active, setActive] = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  if (data.length === 0) return <EmptyState title="Пока нет заявок" />

  const max = Math.max(...data.map((d) => d.total), 1)
  const sum = data.reduce((s, d) => s + d.total, 0)
  const avg = sum / data.length
  const split = data.some((d) => d.measurement !== undefined)

  const pick = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const index = Math.floor(((event.clientX - box.left) / box.width) * data.length)
    setActive(Math.min(Math.max(index, 0), data.length - 1))
  }

  const point = active !== null ? data[active] : null
  // Подсказка не выходит за края графика: у первых и последних дней прижимается
  const share = active !== null ? (active + 0.5) / data.length : 0.5
  const shift = share < 0.15 ? '0%' : share > 0.85 ? '-100%' : '-50%'

  return (
    <div>
      {/* container-type — чтобы подсказка ехала по transform в единицах ширины графика (cqw) */}
      <div className="relative [container-type:inline-size]">
        {/* Шкала: максимум и среднее */}
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" aria-hidden />
        <span className="pointer-events-none absolute -top-2.5 right-0 bg-card pl-1.5 text-[10px] tabular-nums text-muted-foreground" aria-hidden>
          {max}
        </span>
        {avg > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-primary/60"
            style={{ bottom: `${(avg / max) * 100}%` }}
            aria-hidden
          >
            <span className="absolute -top-2.5 left-0 rounded bg-card pr-1.5 text-[10px] tabular-nums text-accent-foreground">
              в среднем {avg.toFixed(1).replace('.', ',')}
            </span>
          </div>
        )}

        <div
          ref={ref}
          role="img"
          aria-label={`Заявки по дням: всего ${sum}, в среднем ${avg.toFixed(1)} в день, максимум ${max}`}
          className="relative flex h-44 touch-pan-y gap-[3px] sm:h-52"
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
        >
          {data.map((d, index) => {
            const height = Math.max((d.total / max) * 100, d.total > 0 ? 4 : 1.5)
            const measurement = d.measurement ?? 0
            const dimmed = active !== null && active !== index
            return (
              // Без h-full у колонки процентная высота столбика не к чему привязать
              <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div
                  className={cn(
                    'admin-bar-y flex w-full flex-col-reverse overflow-hidden rounded-t-[3px] transition-opacity duration-200',
                    d.total === 0 && 'bg-border',
                    dimmed && 'opacity-35'
                  )}
                  style={{ height: `${height}%`, '--i': index } as React.CSSProperties}
                >
                  {d.total > 0 &&
                    (split ? (
                      <>
                        <span className="w-full bg-primary" style={{ flexGrow: d.project ?? 0 }} />
                        <span className="w-full bg-foreground/70" style={{ flexGrow: measurement }} />
                      </>
                    ) : (
                      <span className="w-full flex-1 bg-primary" />
                    ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Подсказка скользит за пальцем */}
        {point && (
          <div
            className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 transition-transform duration-150 ease-out"
            style={{ transform: `translateX(${(share * 100).toFixed(2)}cqw)` }}
          >
            <div style={{ transform: `translateX(${shift})` }}>
            <div className="whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg">
              <p className="font-medium first-letter:uppercase">
                {dayLabel(point.day, { weekday: 'short', day: 'numeric', month: 'long' })}
              </p>
              <p className="mt-0.5 tabular-nums opacity-80">
                {point.total === 0 ? 'заявок нет' : `${point.total} всего`}
                {split && point.total > 0 && ` · ${point.measurement ?? 0} замер · ${point.project ?? 0} проект`}
              </p>
            </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>{dayLabel(data[0].day, { day: 'numeric', month: 'short' })}</span>
        {split && (
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-foreground/70" aria-hidden />
              замер
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-primary" aria-hidden />
              проект
            </span>
          </span>
        )}
        <span>сегодня</span>
      </div>
    </div>
  )
}
