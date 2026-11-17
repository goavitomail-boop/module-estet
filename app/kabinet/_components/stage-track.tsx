import type { CSSProperties } from 'react'
import { Check } from 'lucide-react'
import { ORDER_STAGES, stageIndex } from '@/lib/cabinet-shared'
import { cn } from '@/lib/utils'

/**
 * Ход заказа: пять этапов, как в «Как мы работаем» на сайте. Пройденные —
 * латунью с галочкой, текущий «дышит», заливка линии доходит до него.
 * «Готово» — все пять пройдены. compact — без подписей, для карточки заказа.
 */
export function StageTrack({ stage, compact = false }: { stage: string; compact?: boolean }) {
  const current = stageIndex(stage)
  const steps = ORDER_STAGES.slice(0, 5)
  const fill = Math.min(current, 4) / 4

  return (
    <ol className="kb-track" aria-label={`Этап заказа: ${ORDER_STAGES[current].label}`}>
      <span className="kb-track__line" aria-hidden>
        <span className="kb-track__fill" style={{ '--p': fill } as CSSProperties} />
      </span>
      {steps.map((step, index) => {
        const done = index < current
        const now = index === current
        return (
          <li
            key={step.value}
            className={cn('flex flex-col items-center text-center', done && 'kb-step--done', now && 'kb-step--current')}
            aria-current={now ? 'step' : undefined}
          >
            <span className="kb-step__dot" style={{ '--i': index } as CSSProperties}>
              {done ? (
                <Check className="size-4" strokeWidth={2.5} aria-hidden />
              ) : (
                <span className="text-xs font-semibold tabular-nums">{index + 1}</span>
              )}
            </span>
            {!compact && (
              <span
                className={cn(
                  // На телефоне пять подписей не помещаются — видна только текущая
                  'mt-2 whitespace-nowrap px-0.5 text-[11px] font-medium leading-tight sm:whitespace-normal sm:text-xs',
                  now ? 'text-foreground' : 'hidden text-muted-foreground sm:block'
                )}
              >
                {step.label}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
