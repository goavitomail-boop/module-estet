import type { CSSProperties, ComponentType, SVGProps } from 'react'
import { cn } from '@/lib/utils'
import { enter } from '@/components/scene-kit'

/**
 * Экраны «спасибо» в стиле сцен: карточка, в которую влетают ответы
 * человека, со штампом поверх, и «Что дальше» — три шага с прочерчивающейся
 * латунной линией. Человек в этот момент сомневается, правильно ли сделал:
 * видно, что заявка дошла и что будет потом.
 */

const fly = (d: number) => enter(d, { t: 0.55, from: 'translateX(-12px)', ease: 'var(--out)' })

/** Латунный кружок выпрыгивает, галочка в нём прочерчивается */
export function CheckBadge({ d = 0, className }: { d?: number; className?: string }) {
  return (
    <span
      className={cn('hs hs-in flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground', className)}
      style={enter(d, { t: 0.6, from: 'scale(0.5)', ease: 'var(--pop)' })}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-1/2">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          pathLength={1}
          className="hs-tick"
          style={{ '--d': `${d + 0.3}s` } as CSSProperties}
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/** Сводка ответов: строки влетают по одной, затем опускается штамп */
export function SummaryCard({
  eyebrow,
  title,
  rows,
  stamp,
  d = 0,
  className,
}: {
  eyebrow: string
  title: string
  rows: Array<[string, string]>
  stamp?: string
  d?: number
  className?: string
}) {
  return (
    <div className={cn('hs relative', className)}>
      <div
        className="hs-in rounded-3xl bg-primary p-5 text-primary-foreground shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] md:p-7"
        style={enter(d, { t: 0.9, from: 'translateY(10%) rotate(-2deg) scale(0.96)' })}
      >
        <span className="block font-mono text-[10px] uppercase tracking-[0.2em] opacity-65 md:text-xs">{eyebrow}</span>
        <span className="flyer-title mt-2 block text-2xl leading-tight md:text-3xl">{title}</span>
        <dl className="mt-4 rounded-2xl bg-foreground/10 px-4 py-1.5 md:mt-5 md:px-5 md:py-2.5">
          {rows.map(([term, value], i) => (
            <div
              key={term}
              className="hs-in flex items-baseline justify-between gap-4 border-b border-dotted border-primary-foreground/25 py-2 text-sm last:border-b-0 md:text-base"
              style={fly(d + 0.45 + i * 0.14)}
            >
              <dt className="shrink-0 opacity-65">{term}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {stamp && (
        <span
          className="hs-in absolute -bottom-4 -right-1 -rotate-12 rounded-lg border-[3px] border-background bg-foreground px-3 py-1.5 text-center text-xs font-black uppercase leading-tight tracking-wider text-background shadow-xl md:-right-5 md:px-4 md:text-sm"
          style={enter(d + 0.6 + rows.length * 0.14, { t: 0.55, from: 'scale(1.9)', ease: 'var(--pop)' })}
        >
          {stamp}
        </span>
      )}
    </div>
  )
}

export type NextStep = { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; text: string }

/** «Что дальше»: линия прочерчивается сверху вниз, шаги встают по очереди */
export function NextSteps({
  steps,
  title = 'Что дальше',
  d = 0,
  tone = 'dark',
  className,
}: {
  steps: NextStep[]
  title?: string
  d?: number
  tone?: 'dark' | 'light'
  className?: string
}) {
  const dark = tone === 'dark'
  return (
    <div className={cn('hs', className)}>
      <p className="hs-in font-mono text-xs uppercase tracking-[0.2em] text-primary" style={enter(d, { t: 0.5, ease: 'var(--out)' })}>
        {title}
      </p>
      <ol className="relative mt-4 flex flex-col gap-4 md:gap-5">
        <span
          className="hs-draw-y absolute bottom-4 left-[1.125rem] top-4 w-px bg-primary/45"
          style={{ '--d': `${d + 0.15}s`, '--t': `${0.4 + steps.length * 0.25}s`, '--origin': 'top' } as CSSProperties}
          aria-hidden="true"
        />
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex gap-4">
            <span
              className={cn(
                'hs-in relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/55 text-primary',
                dark ? 'bg-[#161412]' : 'bg-background',
              )}
              style={enter(d + 0.2 + i * 0.25, { t: 0.55, from: 'scale(0.4)', ease: 'var(--pop)' })}
              aria-hidden="true"
            >
              <s.icon className="size-4" />
            </span>
            <span className="hs-in flex min-w-0 flex-col gap-0.5 pt-1.5" style={fly(d + 0.28 + i * 0.25)}>
              <span className={cn('font-semibold leading-snug', dark ? 'text-background' : 'text-foreground')}>{s.title}</span>
              <span className={cn('text-sm leading-relaxed', dark ? 'text-background/60' : 'text-muted-foreground')}>{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
