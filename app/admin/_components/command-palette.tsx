'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { AnimatePresence, m } from 'framer-motion'
import {
  BarChart3,
  CalendarDays,
  CornerDownLeft,
  Download,
  Images,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { STATUS_TEXT, prettyPhone, timeAgo } from '@/lib/admin-format'
import type { LeadStatus } from '@/lib/db'
import { cn } from '@/lib/utils'
import { STATUS_UI } from './ui'
import { SPRING } from './motion'

const OPEN_EVENT = 'admin:search'

/** Открыть палитру из любой кнопки: шапка, боковое меню */
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

interface LeadHit {
  id: string
  name: string
  phone: string
  status: LeadStatus
  type: 'measurement' | 'project'
  created_at: string
}

interface Entry {
  key: string
  group: 'Заявки' | 'Разделы' | 'Действия'
  label: string
  hint?: string
  icon: LucideIcon
  status?: LeadStatus
  run: () => void
}

const SECTIONS: Array<{ href: string; label: string; icon: LucideIcon; words: string }> = [
  { href: '/admin', label: 'Дашборд', icon: LayoutDashboard, words: 'главная сводка dashboard' },
  { href: '/admin/leads', label: 'Заявки', icon: Inbox, words: 'список leads' },
  { href: '/admin/leads?status=new', label: 'Новые заявки', icon: Inbox, words: 'новые требуют реакции' },
  { href: '/admin/calendar', label: 'Календарь замеров', icon: CalendarDays, words: 'замеры неделя calendar' },
  { href: '/admin/analytics', label: 'Аналитика', icon: BarChart3, words: 'отчёты воронка источники' },
  { href: '/admin/portfolio', label: 'Портфолио', icon: Images, words: 'проекты фото' },
  { href: '/admin/catalog', label: 'Каталог', icon: LayoutGrid, words: 'фасады столешницы наполнение' },
  { href: '/admin/settings', label: 'Настройки', icon: Settings, words: 'max бот уведомления слоты' },
]

const ACTIONS: Array<{ href: string; label: string; icon: LucideIcon; words: string; hard?: boolean }> = [
  { href: '/admin/portfolio/new', label: 'Новый проект в портфолио', icon: Plus, words: 'добавить проект' },
  { href: '/admin/catalog/new', label: 'Новая позиция каталога', icon: Plus, words: 'добавить позицию' },
  { href: '/admin/export', label: 'Выгрузить заявки в CSV', icon: Download, words: 'экспорт excel csv', hard: true },
]

function matches(query: string, ...texts: string[]) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return texts.some((text) => text.toLowerCase().includes(q))
}

/**
 * Палитра ⌘K: поиск заявки по телефону, имени или номеру и переход
 * в любой раздел с клавиатуры. На телефоне открывается кнопкой-лупой
 * в шапке и прижата к верху — снизу экран занимает клавиатура.
 */
export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [leads, setLeads] = useState<LeadHit[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const [portal, setPortal] = useState<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => setPortal(document.getElementById('admin-portal')), [])

  const show = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setLeads([])
    setTotal(0)
    returnFocus.current?.focus?.({ preventScroll: true })
  }, [])

  // ⌘K / Ctrl+K — открыть и закрыть; «/» — открыть, если курсор не в поле
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (open) close()
        else show()
        return
      }
      const target = event.target as HTMLElement
      const typing = target.closest('input, textarea, select, [contenteditable="true"]')
      if (event.key === '/' && !open && !typing) {
        event.preventDefault()
        show()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_EVENT, show)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_EVENT, show)
    }
  }, [open, show, close])

  // Пока палитра открыта, страница под ней не прокручивается
  useEffect(() => {
    if (!open) return
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = previous
    }
  }, [open])

  // Поиск заявок с задержкой 180 мс: не дёргаем базу на каждую букву
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setLeads([])
      setTotal(0)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/admin/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        if (!response.ok) throw new Error(String(response.status))
        const data = (await response.json()) as { leads: LeadHit[]; total: number }
        setLeads(data.leads)
        setTotal(data.total)
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setLeads([])
          setTotal(0)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 180)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  const go = useCallback(
    (href: string, hard = false) => {
      close()
      if (hard) window.location.href = href
      else router.push(href)
    },
    [close, router]
  )

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = leads.map((lead) => ({
      key: `lead-${lead.id}`,
      group: 'Заявки',
      label: lead.name || 'Без имени',
      hint: `${lead.id} · ${prettyPhone(lead.phone)} · ${timeAgo(lead.created_at)}`,
      icon: Inbox,
      status: lead.status,
      run: () => go(`/admin/leads/${encodeURIComponent(lead.id)}`),
    }))
    for (const section of SECTIONS) {
      if (matches(query, section.label, section.words)) {
        list.push({
          key: section.href,
          group: 'Разделы',
          label: section.label,
          icon: section.icon,
          run: () => go(section.href),
        })
      }
    }
    for (const action of ACTIONS) {
      if (matches(query, action.label, action.words)) {
        list.push({
          key: action.href,
          group: 'Действия',
          label: action.label,
          icon: action.icon,
          run: () => go(action.href, action.hard),
        })
      }
    }
    return list
  }, [leads, query, go])

  useEffect(() => setActive(0), [entries.length, query])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (entries.length ? (i + 1) % entries.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (entries.length ? (i - 1 + entries.length) % entries.length : 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      entries[active]?.run()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  const searching = query.trim().length >= 2

  if (!portal) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-[12vh]">
          <m.div
            className="absolute inset-0 bg-black/45 backdrop-blur-[3px]"
            onClick={close}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          />

          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Поиск по панели"
            className="relative flex max-h-[min(34rem,calc(100dvh-1.5rem))] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)]"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.14 } }}
            transition={SPRING}
          >
            <div className="relative flex items-center gap-3 border-b border-border px-4">
              {loading ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden />
              ) : (
                <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <input
                ref={inputRef}
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKey}
                placeholder="Телефон, имя или номер заявки"
                inputMode="search"
                enterKeyHint="go"
                aria-label="Что найти"
                aria-controls="admin-palette-list"
                aria-activedescendant={entries[active] ? `palette-${entries[active].key}` : undefined}
                // 16px — иначе Safari на iPhone зумит страницу на фокусе
                className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
              />
              <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
                Esc
              </kbd>
              {/* Латунная полоска загрузки под полем */}
              {loading && (
                <m.span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-px h-px origin-left bg-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 0.85 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </div>

            <ul id="admin-palette-list" ref={listRef} role="listbox" className="overflow-y-auto overscroll-contain p-2">
              {searching && !loading && leads.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Заявок по «{query.trim()}» не найдено
                </li>
              )}

              {entries.map((entry, index) => {
                const first = index === 0 || entries[index - 1].group !== entry.group
                const Icon = entry.icon
                const isActive = index === active
                const status = entry.status ? STATUS_UI[entry.status] : null
                return (
                  <li key={entry.key} role="presentation">
                    {first && (
                      <p className="flex items-center justify-between px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground first:pt-1">
                        {entry.group}
                        {entry.group === 'Заявки' && total > leads.length && (
                          <span className="normal-case tracking-normal">
                            показаны {leads.length} из {total}
                          </span>
                        )}
                      </p>
                    )}
                    <button
                      type="button"
                      id={`palette-${entry.key}`}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onMouseMove={() => setActive(index)}
                      onClick={entry.run}
                      className="relative flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left"
                    >
                      {/* Подсветка одна и перетекает между строками */}
                      {isActive && (
                        <m.span
                          layoutId="palette-active"
                          className="absolute inset-0 rounded-xl bg-accent ring-1 ring-inset ring-primary/25"
                          transition={{ type: 'spring', stiffness: 700, damping: 48 }}
                          aria-hidden
                        />
                      )}
                      <span
                        className={cn(
                          'relative flex size-8 shrink-0 items-center justify-center rounded-lg',
                          isActive ? 'bg-card text-accent-foreground' : 'bg-secondary text-muted-foreground'
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{entry.label}</span>
                        {entry.hint && (
                          <span className="block truncate text-xs tabular-nums text-muted-foreground">{entry.hint}</span>
                        )}
                      </span>
                      {status && entry.status && (
                        <span className="relative hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                          <span className={cn('size-2 rounded-full', status.dot)} aria-hidden />
                          {STATUS_TEXT[entry.status]}
                        </span>
                      )}
                      {isActive && (
                        <CornerDownLeft className="relative hidden size-3.5 shrink-0 text-muted-foreground sm:block" aria-hidden />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="hidden items-center gap-4 border-t border-border bg-secondary/40 px-4 py-2 text-[11px] text-muted-foreground sm:flex">
              <span>
                <kbd className="font-sans">↑↓</kbd> выбрать
              </span>
              <span>
                <kbd className="font-sans">Enter</kbd> открыть
              </span>
              <span className="ml-auto">По цифрам ищет телефон, по буквам — имя и номер</span>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    portal
  )
}
