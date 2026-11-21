'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from './toast'

export interface Pulse {
  newCount: number
  overdue: number
  latest: { id: string; name: string; type: 'measurement' | 'project'; created_at: string } | null
}

const PulseContext = createContext<Pulse | null>(null)

/** Сколько ждём между опросами, пока вкладка на экране */
const INTERVAL_MS = 45_000
/** Событие, по которому панель сверяется с сервером вне очереди (после смены статуса) */
export const PULSE_EVENT = 'admin:pulse'

export function refreshPulse() {
  window.dispatchEvent(new Event(PULSE_EVENT))
}

/**
 * Живой счётчик новых заявок.
 *
 * Опрашивает /admin/pulse, пока вкладка видна, и сразу — при возврате
 * на вкладку и при переходе между разделами. Когда приходит новая заявка:
 * уведомление с кнопкой «Открыть», короткая вибрация на Android, значок
 * с числом на иконке установленного приложения; дашборд и список заявок
 * обновляются сами.
 */
export function PulseProvider({ children }: { children: React.ReactNode }) {
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const pathRef = useRef(pathname)
  /** Время самой свежей известной заявки. undefined — ещё не спрашивали */
  const knownLatest = useRef<number | null | undefined>(undefined)
  const inFlight = useRef(false)

  useEffect(() => {
    pathRef.current = pathname
  }, [pathname])

  const check = useCallback(async () => {
    if (inFlight.current || document.visibilityState !== 'visible') return
    inFlight.current = true
    try {
      const response = await fetch('/admin/pulse', { cache: 'no-store' })
      if (!response.ok) return
      const data = (await response.json()) as Pulse
      setPulse(data)

      const latestAt = data.latest ? Date.parse(data.latest.created_at) : null
      // Первый ответ только запоминаем: всё, что было до открытия панели, — не новость.
      // Сравниваем время, а не номер: удалили самую свежую заявку — последней
      // стала более старая, и это не повод кричать «новая заявка»
      const isNew =
        knownLatest.current !== undefined && latestAt !== null && latestAt > (knownLatest.current ?? 0)
      if (isNew && data.latest) {
        toast.lead('Новая заявка', {
          description: `${data.latest.name} · ${data.latest.type === 'measurement' ? 'замер' : 'проект'}`,
          href: `/admin/leads/${encodeURIComponent(data.latest.id)}`,
        })
        navigator.vibrate?.([24, 60, 24])
        if (pathRef.current === '/admin' || pathRef.current === '/admin/leads') router.refresh()
      }
      if (knownLatest.current === undefined || isNew) knownLatest.current = latestAt

      // Число на иконке приложения на домашнем экране (iOS 16.4+, Chrome)
      const nav = navigator as Navigator & {
        setAppBadge?: (count?: number) => Promise<void>
        clearAppBadge?: () => Promise<void>
      }
      if (data.newCount > 0) nav.setAppBadge?.(data.newCount).catch(() => {})
      else nav.clearAppBadge?.().catch(() => {})
    } catch {
      /* сеть пропала — подождём следующего раза */
    } finally {
      inFlight.current = false
    }
  }, [router])

  useEffect(() => {
    check()
    const timer = setInterval(check, INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener(PULSE_EVENT, check)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener(PULSE_EVENT, check)
    }
  }, [check])

  // Сменили раздел — сверяемся: статус могли поменять в карточке
  const firstPath = useRef(true)
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false
      return
    }
    check()
  }, [pathname, check])

  return <PulseContext.Provider value={pulse}>{children}</PulseContext.Provider>
}

export function usePulse(): Pulse | null {
  return useContext(PulseContext)
}
