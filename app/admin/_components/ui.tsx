import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  CalendarCheck,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  PenTool,
  Ruler,
  type LucideIcon,
} from 'lucide-react'
import type { LeadStatus, LeadType } from '@/lib/db'
import { statusText, typeText } from '@/lib/admin-format'
import { cn } from '@/lib/utils'

/* ── Панель / карточка ─────────────────────────────────────────────── */

export function Panel({
  title,
  action,
  className,
  children,
}: {
  title?: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card shadow-sm', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

/* ── Плитка показателя ─────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
  href,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'accent' | 'danger' | 'success'
  href?: string
}) {
  const tones = {
    default: 'border-border bg-card',
    accent: 'border-primary/40 bg-primary/5',
    danger: 'border-destructive/40 bg-destructive/5',
    success: 'border-emerald-500/40 bg-emerald-500/5',
  }
  const body = (
    <>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold leading-none tabular-nums text-foreground">{value}</div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </>
  )
  const className = cn(
    'block rounded-xl border p-5 shadow-sm transition',
    tones[tone],
    href && 'hover:border-primary hover:shadow-md'
  )
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

/* ── Бейджи ────────────────────────────────────────────────────────── */

/** Иконка и цвет для каждого статуса. Иконка несёт смысл, цвет — срочность. */
export const STATUS_UI: Record<LeadStatus, { icon: LucideIcon; tone: string; dot: string }> = {
  new: { icon: CircleDot, tone: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-blue-500' },
  in_progress: { icon: CircleDashed, tone: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  scheduled: { icon: CalendarCheck, tone: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: 'bg-violet-500' },
  done: { icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  rejected: { icon: CircleX, tone: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20', dot: 'bg-zinc-400' },
}

export const TYPE_UI: Record<LeadType, { icon: LucideIcon; tone: string }> = {
  measurement: { icon: Ruler, tone: 'bg-sky-50 text-sky-700 ring-sky-600/20' },
  project: { icon: PenTool, tone: 'bg-primary/10 text-accent-foreground ring-primary/30' },
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const ui = STATUS_UI[status as LeadStatus] ?? STATUS_UI.rejected
  const Icon = ui.icon
  return (
    <span
      className={cn(
        // whitespace-nowrap — иначе «Замер назначен» переносится и ломает высоту строки таблицы
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        ui.tone,
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {statusText(status)}
    </span>
  )
}

export function TypeBadge({ type }: { type: string }) {
  const ui = TYPE_UI[type as LeadType]
  const Icon = ui?.icon ?? PenTool
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        ui?.tone ?? 'bg-secondary text-secondary-foreground ring-border'
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {typeText(type)}
    </span>
  )
}

/** Компактный маркер статуса для плотных списков, где бейдж занял бы слишком много */
export function StatusDot({ status }: { status: string }) {
  const ui = STATUS_UI[status as LeadStatus] ?? STATUS_UI.rejected
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={cn('size-2 shrink-0 rounded-full', ui.dot)} aria-hidden />
      {statusText(status)}
    </span>
  )
}

/* ── Пустое состояние ──────────────────────────────────────────────── */

export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="max-w-md text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/* ── Горизонтальная столбчатая диаграмма ───────────────────────────
   Обычный список с полосками: читается и без JS, печатается, доступен
   для скринридера через явные числа рядом с названием.               */

export function BarList({
  items,
  emptyText = 'Пока нет данных',
  valueSuffix = '',
}: {
  /** `icon` и `color` необязательны: без них строка рисуется нейтрально */
  items: Array<{ label: string; value: number; extra?: string; icon?: LucideIcon; color?: string }>
  emptyText?: string
  valueSuffix?: string
}) {
  if (items.length === 0) return <EmptyState title={emptyText} />
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-1.5 text-foreground" title={item.label}>
                {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {item.extra ? <span className="mr-2 text-xs">{item.extra}</span> : null}
                <span className="font-medium text-foreground">
                  {item.value}
                  {valueSuffix}
                </span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn('h-full rounded-full', item.color ?? 'bg-primary')}
                style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ── График заявок по дням ──────────────────────────────────────────
   Столбики на CSS: без внешней библиотеки графиков и лишних килобайт.  */

export function DayChart({ data }: { data: Array<{ day: string; total: number }> }) {
  if (data.length === 0) return <EmptyState title="Пока нет заявок" />
  const max = Math.max(...data.map((d) => d.total), 1)

  return (
    // Без items-stretch (по умолчанию) и h-full у колонок процентная высота столбика
    // не к чему привязать: у родителя высота по содержимому, и столбик схлопывается.
    <div className="flex h-44 gap-[3px]">
      {data.map((point) => {
        const label = new Date(point.day).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
        return (
          <div
            key={point.day}
            className="group relative flex h-full flex-1 flex-col items-center justify-end"
            title={`${label}: ${point.total}`}
          >
            <span className="mb-1 text-[10px] tabular-nums text-muted-foreground opacity-0 transition group-hover:opacity-100">
              {point.total}
            </span>
            <div
              className="w-full rounded-t bg-primary/70 transition group-hover:bg-primary"
              style={{ height: `${Math.max((point.total / max) * 100, 2)}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

/* ── Кнопка-ссылка в едином стиле ──────────────────────────────────── */

export function ButtonLink({
  href,
  children,
  variant = 'secondary',
}: {
  href: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:opacity-90'
          : 'border border-border bg-card text-foreground hover:bg-secondary'
      )}
    >
      {children}
    </Link>
  )
}
