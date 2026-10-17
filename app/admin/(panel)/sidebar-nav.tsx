'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CalendarDays,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  MoreHorizontal,
  Settings,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard, exact: true },
  { href: '/admin/leads', label: 'Заявки', icon: Inbox, exact: false },
  { href: '/admin/calendar', label: 'Замеры', icon: CalendarDays, exact: false },
  { href: '/admin/analytics', label: 'Аналитика', icon: BarChart3, exact: false },
  { href: '/admin/portfolio', label: 'Портфолио', icon: Images, exact: false },
  { href: '/admin/catalog', label: 'Каталог', icon: LayoutGrid, exact: false },
  { href: '/admin/settings', label: 'Настройки', icon: Settings, exact: false },
]

/**
 * На телефоне внизу помещается пять вкладок — дальше подписи начинают
 * обрезаться. Поэтому там остаётся ежедневная работа, а разделы, куда
 * заходят раз в месяц, уезжают под кнопку «Ещё».
 */
const PRIMARY_COUNT = 4
const primary = items.slice(0, PRIMARY_COUNT)
const secondary = items.slice(PRIMARY_COUNT)

function useActiveHref() {
  const pathname = usePathname()
  return (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))
}

/** Вертикальное меню для широких экранов — здесь помещается всё */
export function SidebarNav() {
  const isActive = useActiveHref()

  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
              active
                ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Нижняя панель вкладок для телефона.
 *
 * Держим её внизу, а не сверху: панель открывают на ходу одной рукой, и нижний
 * край — единственная зона, куда большой дотягивается без перехвата телефона.
 * Высота вкладки 56px с запасом перекрывает минимальную зону касания.
 */
export function BottomNav() {
  const isActive = useActiveHref()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Перешли в другой раздел — лист закрываем сами
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const secondaryActive = secondary.some((item) => isActive(item.href, item.exact))

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {open && (
        <div
          className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 border-t border-sidebar-border bg-sidebar p-2 lg:hidden"
          role="dialog"
          aria-label="Другие разделы"
        >
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/50">
              Другие разделы
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
              className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          {secondary.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 active:bg-sidebar-accent'
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {label}
              </Link>
            )
          })}
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Разделы панели"
      >
        {primary.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-medium transition',
                active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 active:text-sidebar-foreground'
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={cn(
            'flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-medium transition',
            open || secondaryActive
              ? 'text-sidebar-primary'
              : 'text-sidebar-foreground/60 active:text-sidebar-foreground'
          )}
        >
          <MoreHorizontal className="size-5 shrink-0" aria-hidden />
          <span className="max-w-full truncate">Ещё</span>
        </button>
      </nav>
    </>
  )
}
