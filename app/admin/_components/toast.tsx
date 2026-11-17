'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, m } from 'framer-motion'
import { BellRing, Check, Info, X, type LucideIcon } from 'lucide-react'
import { SPRING } from './motion'
import { cn } from '@/lib/utils'

/**
 * Короткие уведомления панели: «Сохранено», «Заявка удалена», «Новая заявка».
 *
 * Хранилище — модульное, без контекста: toast() можно звать из любого
 * клиентского компонента и из обработчика, не протаскивая провайдер.
 *
 * Экшены, которые после себя уводят на другую страницу (удаление, сохранение
 * проекта), сообщают об успехе кукой me_flash (lib/admin-flash.ts): компонент
 * формы к этому моменту уже размонтирован, а Toaster живёт в лейауте и
 * читает куку после перехода.
 */

type ToastKind = 'success' | 'error' | 'info' | 'lead'

interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  description?: string
  href?: string
  actionLabel?: string
  duration: number
}

interface ToastOptions {
  description?: string
  href?: string
  actionLabel?: string
  duration?: number
}

const MAX_VISIBLE = 3
const FLASH_COOKIE = 'me_flash'

let items: ToastItem[] = []
let seq = 0
const listeners = new Set<() => void>()
const EMPTY: ToastItem[] = []

function emit() {
  for (const listener of listeners) listener()
}

function push(kind: ToastKind, title: string, options: ToastOptions = {}): number {
  const id = ++seq
  const duration = options.duration ?? (kind === 'lead' ? 9000 : kind === 'error' ? 6000 : 3200)
  // Одинаковое сообщение подряд не плодим — заменяем, чтобы двойное нажатие не давало стопку
  items = [...items.filter((t) => t.title !== title), { id, kind, title, duration, ...options }].slice(-MAX_VISIBLE)
  emit()
  return id
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export const toast = Object.assign((title: string, options?: ToastOptions) => push('info', title, options), {
  success: (title: string, options?: ToastOptions) => push('success', title, options),
  error: (title: string, options?: ToastOptions) => push('error', title, options),
  lead: (title: string, options?: ToastOptions) => push('lead', title, options),
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Забирает сообщение, оставленное сервером, и стирает куку. Безопасно звать
 *  сколько угодно раз: второй вызов куку уже не найдёт */
export function readFlash() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${FLASH_COOKIE}=([^;]*)`))
  if (!match) return
  document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/admin`
  let text = match[1]
  try {
    text = decodeURIComponent(text)
  } catch {
    /* значение не закодировано — показываем как есть */
  }
  if (text) push('success', text)
}

const ICONS: Record<ToastKind, LucideIcon> = { success: Check, error: X, info: Info, lead: BellRing }

export function Toaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => EMPTY
  )
  const pathname = usePathname()

  useEffect(() => {
    readFlash()
  }, [pathname])

  return (
    <ol
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-3 z-[70] flex flex-col items-center gap-2',
        // На телефоне — над нижней панелью вкладок, под большим пальцем
        'bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)]',
        'lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[22rem] lg:items-stretch'
      )}
    >
      <AnimatePresence initial={false}>
        {list.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </ol>
  )
}

function ToastCard({ item }: { item: ToastItem }) {
  const Icon = ICONS[item.kind]
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startedAt = useRef(0)
  const left = useRef(item.duration)

  const start = () => {
    startedAt.current = Date.now()
    timer.current = setTimeout(() => dismissToast(item.id), left.current)
  }
  const pause = () => {
    if (timer.current) clearTimeout(timer.current)
    left.current -= Date.now() - startedAt.current
  }

  useEffect(() => {
    start()
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={SPRING}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.6}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 600) dismissToast(item.id)
      }}
      onPointerEnter={pause}
      onPointerLeave={start}
      role={item.kind === 'error' ? 'alert' : 'status'}
      className="admin-toast pointer-events-auto relative w-full max-w-sm touch-pan-y overflow-hidden rounded-xl bg-[oklch(0.2_0.004_84)] text-[oklch(0.97_0_0)] shadow-[0_18px_40px_-14px_oklch(0_0_0/0.55)] ring-1 ring-white/10 lg:max-w-none"
    >
      <div className="flex items-start gap-3 py-3 pl-3 pr-2">
        <span
          className={cn(
            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
            item.kind === 'error' ? 'bg-red-500/20 text-red-300' : 'bg-[oklch(0.72_0.075_82/0.18)] text-[oklch(0.8_0.08_82)]'
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-sm font-medium leading-snug">{item.title}</p>
          {item.description && <p className="mt-0.5 truncate text-xs text-white/60">{item.description}</p>}
        </div>

        {item.href && (
          <Link
            href={item.href}
            onClick={() => dismissToast(item.id)}
            className="admin-press shrink-0 self-center rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
          >
            {item.actionLabel ?? 'Открыть'}
          </Link>
        )}

        <button
          type="button"
          onClick={() => dismissToast(item.id)}
          aria-label="Закрыть"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-white/45 hover:bg-white/10 hover:text-white"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      {/* Сколько осталось до исчезновения — тонкая латунная полоска */}
      <span
        aria-hidden
        className="admin-toast-timer absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[oklch(0.72_0.075_82/0.7)]"
        style={{ animationDuration: `${item.duration}ms` }}
      />
    </m.li>
  )
}
