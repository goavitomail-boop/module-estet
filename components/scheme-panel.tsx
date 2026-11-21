'use client'

import { useState, type ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'
import { PlayWhenSeen } from '@/components/play-when-seen'
import { cn } from '@/lib/utils'

/**
 * Рамка схемы раздела (scheme-kit.tsx): схема отыгрывает, когда её увидели,
 * кнопка «Ещё раз» запускает её заново. Справа (на телефоне — под ней) —
 * подпись и переключатели: смена цвета не перезапускает схему, а
 * перекрашивает её на месте
 */
export function SchemePanel({ ratio, children, aside, className }: { ratio: string; children: ReactNode; aside?: ReactNode; className?: string }) {
  const [run, setRun] = useState(0)
  return (
    <div className={cn('mb-8 grid items-center gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-10', className)}>
      <div className="paper relative overflow-hidden rounded-3xl border border-primary/35 bg-card" style={{ aspectRatio: ratio }}>
        <PlayWhenSeen key={run} className="ss absolute inset-0">
          {children}
        </PlayWhenSeen>
        <button
          type="button"
          onClick={() => setRun((value) => value + 1)}
          className="absolute left-3 top-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/35 bg-card/90 px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary"
        >
          <RotateCcw className="size-3.5 text-primary" aria-hidden="true" />
          Ещё раз
        </button>
      </div>
      {aside && <div className="flex flex-col gap-4">{aside}</div>}
    </div>
  )
}

/** Переключатель цвета: точка цвета и название, выбранный — тёмный */
export function ColorChips<T extends string>({ label, options, value, onChange }: {
  label: string
  options: { name: T; color: string }[]
  value: T
  onChange: (name: T) => void
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => {
          const on = option.name === value
          return (
            <button
              key={option.name}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(option.name)}
              className={cn(
                'inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors',
                on ? 'border-foreground bg-foreground text-background' : 'border-primary/35 bg-card text-foreground hover:border-primary',
              )}
            >
              <span className="size-3.5 shrink-0 rounded-full border border-foreground/25" style={{ background: option.color }} aria-hidden="true" />
              {option.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
