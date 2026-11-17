'use client'

import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { THEME_COOKIE } from '@/lib/admin-theme'

function root() {
  return document.querySelector('.admin-root')
}

/** Тема читается с самого .admin-root: переключателей на странице два
 *  (боковое меню и лист «Ещё»), и оба должны показывать одно и то же */
function subscribe(callback: () => void) {
  const el = root()
  if (!el) return () => {}
  const observer = new MutationObserver(callback)
  observer.observe(el, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

function useAdminDark(initialDark: boolean) {
  return useSyncExternalStore(
    subscribe,
    () => root()?.classList.contains('dark') ?? initialDark,
    () => initialDark
  )
}

/**
 * Светлая или тёмная тема панели. Выбор хранится в куке, а не в localStorage:
 * сервер сразу рисует нужную тему, и при открытии нет белой вспышки.
 *
 * Смена темы раскрывается кругом от кнопки (View Transitions API, Chrome 111+,
 * Safari 18+). Где его нет или включено «уменьшить движение» — мгновенно.
 */
export function ThemeToggle({
  initialDark,
  variant = 'sidebar',
}: {
  initialDark: boolean
  variant?: 'sidebar' | 'sheet'
}) {
  const dark = useAdminDark(initialDark)

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const el = root()
    if (!el) return
    const next = !el.classList.contains('dark')
    const apply = () => {
      el.classList.toggle('dark', next)
    }
    document.cookie = `${THEME_COOKIE}=${next ? 'dark' : 'light'}; Max-Age=31536000; path=/admin; SameSite=Lax`

    const doc = document as Document & {
      startViewTransition?: (callback: () => void) => { ready: Promise<void> }
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!doc.startViewTransition || reduced) {
      apply()
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))

    doc
      .startViewTransition(apply)
      .ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 560, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
        )
      })
      .catch(() => {})
  }

  const Icon = dark ? Sun : Moon
  const label = dark ? 'Светлая тема' : 'Тёмная тема'

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'flex items-center text-sidebar-foreground/70 hover:text-sidebar-foreground',
        variant === 'sheet'
          ? 'min-h-12 w-full gap-3 rounded-lg px-3 text-sm font-medium active:bg-sidebar-accent'
          : 'gap-2 rounded-md text-xs'
      )}
    >
      <Icon className={variant === 'sheet' ? 'size-5 shrink-0' : 'size-3.5 shrink-0'} aria-hidden />
      {label}
    </button>
  )
}
