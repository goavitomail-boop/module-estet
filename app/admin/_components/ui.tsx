import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import {
  CalendarCheck,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Inbox,
  PenTool,
  Ruler,
  type LucideIcon,
} from 'lucide-react'
import type { LeadStatus, LeadType } from '@/lib/db'
import { statusText, typeText } from '@/lib/admin-format'
import { cn } from '@/lib/utils'
import { ModuleEstetMark } from '@/components/module-estet-mark'

/* ── Логотип ──────────────────────────────────────────────────────────
   Тот же локап, что в шапке сайта (components/site-header.tsx): знак
   и «Модуль Эстет» прописными с разрядкой. Вместо статуса работы под
   названием — подпись панели. */

export function AdminBrand({ subtitle = 'Панель заявок', className }: { subtitle?: string; className?: string }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <ModuleEstetMark className="h-10 w-auto shrink-0" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-[1.05rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground">
          Модуль Эстет
        </span>
        <span className="mt-1.5 truncate text-[9px] uppercase tracking-[0.22em] text-sidebar-foreground/60">
          {subtitle}
        </span>
      </span>
    </span>
  )
}

/* ── Заголовок страницы ────────────────────────────────────────────── */

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  className,
}: {
  title: ReactNode
  /** Строчка над заголовком с латунной чертой: дата, раздел */
  eyebrow?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-3', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-accent-foreground">
            <span className="h-px w-5 bg-primary" aria-hidden />
            <span className="first-letter:uppercase">{eyebrow}</span>
          </p>
        )}
        <h1 className="admin-display text-[1.75rem] leading-[1.1] text-foreground sm:text-[2rem]">{title}</h1>
        {description && <div className="mt-1.5 text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions}
    </header>
  )
}

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

const TILE_TONES = {
  default: { box: 'border-border bg-card', icon: 'bg-secondary text-muted-foreground', bar: 'text-primary' },
  accent: {
    box: 'border-primary/35 bg-card',
    icon: 'bg-primary/15 text-accent-foreground',
    bar: 'text-primary',
  },
  danger: {
    box: 'border-destructive/40 bg-destructive/[0.035]',
    icon: 'bg-destructive/10 text-destructive',
    bar: 'text-destructive',
  },
  success: {
    box: 'border-emerald-500/35 bg-card',
    icon: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    bar: 'text-emerald-600 dark:text-emerald-400',
  },
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
  href,
  icon: Icon,
  spark,
  index = 0,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: keyof typeof TILE_TONES
  href?: string
  icon?: LucideIcon
  /** Ряд значений для мини-графика внизу плитки */
  spark?: number[]
  /** Место в ряду — для очереди появления */
  index?: number
}) {
  const ui = TILE_TONES[tone]
  const body = (
    <>
      {/* Латунный штрих сверху у акцентной плитки */}
      {tone !== 'default' && (
        <span
          aria-hidden
          className={cn('absolute inset-x-5 top-0 h-px', tone === 'danger' ? 'bg-destructive/60' : tone === 'success' ? 'bg-emerald-500/60' : 'bg-primary')}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-medium uppercase leading-tight tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        {Icon && (
          <span className={cn('-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg', ui.icon)}>
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <div className="admin-num mt-2 text-[2rem] leading-none text-foreground sm:text-[2.35rem]">{value}</div>
      {hint && <div className="mt-2 text-xs leading-snug text-muted-foreground">{hint}</div>}
      {spark && spark.length > 1 && (
        <Sparkline id={`admin-spark-${tone}`} values={spark} className={cn('mt-3 h-8 w-full', ui.bar)} />
      )}
    </>
  )
  const className = cn(
    'relative block overflow-hidden rounded-xl border p-4 shadow-sm sm:p-5',
    ui.box,
    href && 'admin-lift hover:border-primary/60'
  )
  const style = { '--i': index } as CSSProperties
  return href ? (
    <Link href={href} className={className} style={style}>
      {body}
    </Link>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  )
}

/** Мини-график: открывается слева направо, заливка проступает следом (admin.css, .admin-spark) */
export function Sparkline({ id, values, className }: { id: string; values: number[]; className?: string }) {
  const max = Math.max(...values, 1)
  const step = 100 / (values.length - 1)
  const points = values.map((v, i) => [i * step, 30 - (v / max) * 26] as const)
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const area = `${line} L100 32 L0 32 Z`

  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn('admin-spark overflow-visible', className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path data-area d={area} fill={`url(#${id})`} />
      <path
        data-line
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/* ── Бейджи ────────────────────────────────────────────────────────── */

/** Иконка и цвет для каждого статуса. Иконка несёт смысл, цвет — срочность. */
export const STATUS_UI: Record<LeadStatus, { icon: LucideIcon; tone: string; dot: string }> = {
  new: {
    icon: CircleDot,
    tone: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/25',
    dot: 'bg-blue-500',
  },
  in_progress: {
    icon: CircleDashed,
    tone: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25',
    dot: 'bg-amber-500',
  },
  scheduled: {
    icon: CalendarCheck,
    tone: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/25',
    dot: 'bg-violet-500',
  },
  done: {
    icon: CircleCheck,
    tone: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25',
    dot: 'bg-emerald-500',
  },
  rejected: {
    icon: CircleX,
    tone: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10',
    dot: 'bg-zinc-400',
  },
}

export const TYPE_UI: Record<LeadType, { icon: LucideIcon; tone: string }> = {
  measurement: {
    icon: Ruler,
    tone: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/25',
  },
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

/** «Просрочена»: красная плашка с пульсирующей точкой — видно краем глаза */
export function OverdueBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-destructive/10 font-medium text-destructive',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span className="admin-pulse" aria-hidden />
      {compact ? 'просрочена' : 'Просрочена'}
    </span>
  )
}

/* ── Пустое состояние ──────────────────────────────────────────────── */

export function EmptyState({ title, hint, icon: Icon = Inbox }: { title: string; hint?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground ring-8 ring-secondary/40">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

/* ── Горизонтальная столбчатая диаграмма ───────────────────────────
   Обычный список с полосками: читается и без JS, печатается, доступен
   для скринридера через явные числа рядом с названием. Полоски растут
   по очереди при появлении (.admin-bar-x).                            */

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
    <ul className="space-y-3">
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <li key={item.label} className="group">
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
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
                className={cn(
                  'admin-bar-x h-full rounded-full transition-[filter] duration-200 group-hover:brightness-110',
                  item.color ?? 'bg-primary'
                )}
                style={{ width: `${Math.max((item.value / max) * 100, 2)}%`, '--i': index } as CSSProperties}
              />
            </div>
          </li>
        )
      })}
    </ul>
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
        'admin-press inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:opacity-90'
          : 'border border-border bg-card text-foreground hover:bg-secondary'
      )}
    >
      {children}
    </Link>
  )
}

/* ── Скелетоны для loading.tsx ─────────────────────────────────────── */

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('admin-skeleton', className)} style={style} aria-hidden />
}

/** Заглушка заголовка страницы — повторяет размеры PageHeader */
export function PageHeaderSkeleton({ actions = false }: { actions?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3.5 w-64 max-w-[60vw]" />
      </div>
      {actions && <Skeleton className="hidden h-11 w-32 rounded-lg sm:block" />}
    </div>
  )
}

export function PanelSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card shadow-sm', className)}>
      <div className="border-b border-border px-5 py-4">
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="space-y-4 p-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-3/5" />
            </div>
            <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
