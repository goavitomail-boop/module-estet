'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, m } from 'framer-motion'
import {
  BarChart3,
  CalendarDays,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  MoreHorizontal,
  Search,
  Settings,
  UserRound,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePulse } from '../_components/pulse'
import { SPRING, SPRING_SOFT } from '../_components/motion'
import { ThemeToggle } from '../_components/theme-toggle'
import { openSearch } from '../_components/command-palette'

const items = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard, exact: true },
  { href: '/admin/leads', label: 'Заявки', icon: Inbox, exact: false },
  { href: '/admin/calendar', label: 'Замеры', icon: CalendarDays, exact: false },
  { href: '/admin/analytics', label: 'Аналитика', icon: BarChart3, exact: false },
  // Заказы клиентов живут внутри кабинетов — раздел подсвечен и на /admin/zakazy/…
  { href: '/admin/kabinety', label: 'Кабинеты', icon: UserRound, exact: false, also: '/admin/zakazy' },
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

const ALSO: Record<string, string> = Object.fromEntries(
  items.flatMap((item) => ('also' in item && item.also ? [[item.href, item.also]] : []))
)

function useActiveHref() {
  const pathname = usePathname()
  return (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href) || (ALSO[href] ? pathname.startsWith(ALSO[href]) : false)
}

/** Сколько новых заявок показать на вкладке «Заявки». Просроченные — красным */
function useLeadBadge() {
  const pulse = usePulse()
  if (!pulse || pulse.newCount === 0) return null
  return { count: pulse.newCount, urgent: pulse.overdue > 0 }
}

function Badge({ count, urgent, className }: { count: number; urgent: boolean; className?: string }) {
  return (
    <span
      // key — число сменилось, значок заново «выпрыгивает»
      key={count}
      aria-label={`новых: ${count}`}
      className={cn(
        'admin-pop inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums leading-none',
        urgent ? 'bg-destructive text-white' : 'bg-sidebar-primary text-sidebar-primary-foreground',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

/* ── Боковое меню ───────────────────────────────────────────────────── */

/**
 * Вертикальное меню для широких экранов. Подложка активного пункта одна
 * на всё меню и переезжает к выбранному разделу — видно, откуда куда ушёл.
 */
export function SidebarNav() {
  const isActive = useActiveHref()
  const badge = useLeadBadge()
  const navRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null)
  const [ready, setReady] = useState(false)
  const activeIndex = items.findIndex((item) => isActive(item.href, item.exact))

  useLayoutEffect(() => {
    const el = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
    setIndicator(el ? { top: el.offsetTop, height: el.offsetHeight } : null)
  }, [activeIndex])

  // Первое положение ставим без перехода — иначе подложка выезжала бы сверху
  useEffect(() => {
    if (!indicator || ready) return
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [indicator, ready])

  return (
    <nav ref={navRef} className="relative flex flex-col gap-0.5 px-3 py-2" aria-label="Разделы панели">
      <span
        aria-hidden
        data-pending={!ready || undefined}
        className="admin-nav-indicator pointer-events-none absolute inset-x-3 top-0 rounded-lg bg-white/[0.07] ring-1 ring-inset ring-white/[0.06]"
        style={{
          transform: `translateY(${indicator?.top ?? 0}px)`,
          height: indicator?.height ?? 0,
          opacity: indicator ? 1 : 0,
        }}
      >
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary shadow-[0_0_12px_var(--sidebar-primary)]" />
      </span>

      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-200',
              active
                ? 'text-sidebar-foreground'
                : 'text-sidebar-foreground/60 hover:bg-white/[0.035] hover:text-sidebar-foreground'
            )}
          >
            <Icon
              className={cn(
                'size-[18px] shrink-0 transition-[color,translate] duration-200',
                active ? 'text-sidebar-primary' : 'group-hover:translate-x-0.5'
              )}
              aria-hidden
            />
            {label}
            {href === '/admin/leads' && badge && <Badge {...badge} className="ml-auto" />}
          </Link>
        )
      })}
    </nav>
  )
}

/** Кнопка поиска для бокового меню: выглядит как поле, открывает палитру ⌘K */
export function SidebarSearch() {
  const [mac, setMac] = useState(false)
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), [])

  return (
    <button
      type="button"
      onClick={openSearch}
      className="flex h-10 w-full items-center gap-2.5 rounded-lg bg-white/[0.05] px-3 text-sm text-sidebar-foreground/55 ring-1 ring-inset ring-white/[0.07] hover:bg-white/[0.08] hover:text-sidebar-foreground/80"
    >
      <Search className="size-4 shrink-0" aria-hidden />
      Поиск
      <kbd className="ml-auto rounded border border-white/15 px-1.5 py-0.5 font-sans text-[10px] text-sidebar-foreground/50">
        {mac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  )
}

/** Иконка поиска для шапки на телефоне */
export function MobileSearchButton() {
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label="Поиск заявок"
      className="flex size-10 items-center justify-center rounded-lg text-sidebar-foreground/70 active:bg-sidebar-accent"
    >
      <Search className="size-5" aria-hidden />
    </button>
  )
}

/* ── Нижняя панель вкладок ──────────────────────────────────────────── */

/**
 * Нижняя панель вкладок для телефона.
 *
 * Держим её внизу, а не сверху: панель открывают на ходу одной рукой, и нижний
 * край — единственная зона, куда большой дотягивается без перехвата телефона.
 * Высота вкладки 56px с запасом перекрывает минимальную зону касания.
 */
export function BottomNav({ initialDark }: { initialDark: boolean }) {
  const isActive = useActiveHref()
  const pathname = usePathname()
  const badge = useLeadBadge()
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
  const primaryIndex = primary.findIndex((item) => isActive(item.href, item.exact))
  const indicatorIndex = open || secondaryActive ? PRIMARY_COUNT : primaryIndex

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <m.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
              onClick={() => setOpen(false)}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
            />

            {/* Лист выезжает из-под панели вкладок и уезжает под неё же;
                тянется вниз пальцем — закрывается */}
            <m.div
              key="sheet"
              role="dialog"
              aria-label="Другие разделы"
              className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 rounded-t-2xl border-t border-sidebar-border bg-sidebar px-2 pb-2 text-sidebar-foreground shadow-[0_-20px_40px_-20px_rgb(0_0_0/0.5)] lg:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%', transition: { type: 'tween', duration: 0.24, ease: [0.55, 0, 0.75, 0] } }}
              transition={SPRING_SOFT}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 70 || info.velocity.y > 450) setOpen(false)
              }}
            >
              <div className="flex justify-center pb-1 pt-2.5" aria-hidden>
                <span className="h-1 w-10 rounded-full bg-sidebar-foreground/20" />
              </div>
              <div className="mb-1 flex items-center justify-between px-2 py-1">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-sidebar-foreground/45">
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

              {secondary.map(({ href, label, icon: Icon, exact }, index) => {
                const active = isActive(href, exact)
                return (
                  <m.div
                    key={href}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...SPRING, delay: 0.04 + index * 0.04 }}
                  >
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium',
                        active
                          ? 'bg-white/[0.07] text-sidebar-foreground'
                          : 'text-sidebar-foreground/80 active:bg-sidebar-accent'
                      )}
                    >
                      <Icon className={cn('size-5 shrink-0', active && 'text-sidebar-primary')} aria-hidden />
                      {label}
                    </Link>
                  </m.div>
                )
              })}

              <m.div
                className="mt-1 border-t border-sidebar-border pt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.16 }}
              >
                <ThemeToggle initialDark={initialDark} variant="sheet" />
              </m.div>
            </m.div>
          </>
        )}
      </AnimatePresence>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-sidebar-border bg-sidebar pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Разделы панели"
      >
        {/* Латунная черта над активной вкладкой переезжает между вкладками */}
        <span
          aria-hidden
          className="admin-nav-indicator pointer-events-none absolute left-0 top-0 flex w-1/5 justify-center"
          style={{ transform: `translateX(${Math.max(indicatorIndex, 0) * 100}%)`, opacity: indicatorIndex < 0 ? 0 : 1 }}
        >
          <span className="h-[2px] w-8 rounded-b-full bg-sidebar-primary shadow-[0_0_10px_var(--sidebar-primary)]" />
        </span>

        {primary.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'admin-press flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-medium transition-colors',
                active ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 active:text-sidebar-foreground'
              )}
            >
              <span className="relative">
                {/* key — при выборе вкладки иконка коротко «отзывается» */}
                <Icon key={String(active)} className={cn('size-5 shrink-0', active && 'admin-pop')} aria-hidden />
                {href === '/admin/leads' && badge && (
                  <Badge {...badge} className="absolute -right-3 -top-1.5 h-4 min-w-4 px-1 text-[10px]" />
                )}
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={cn(
            'flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-medium',
            open || secondaryActive
              ? 'text-sidebar-primary'
              : 'text-sidebar-foreground/60 active:text-sidebar-foreground'
          )}
        >
          <MoreHorizontal
            className={cn('size-5 shrink-0 transition-transform duration-300', open && 'rotate-90')}
            aria-hidden
          />
          <span className="max-w-full truncate">Ещё</span>
        </button>
      </nav>
    </>
  )
}
