'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CONSENT_EVENT, analyticsAllowed } from '@/lib/consent'
import { YANDEX_METRIKA_ID } from '@/lib/metrika'

/**
 * Яндекс.Метрика — счётчик из кабинета, с теми же настройками, что в коде,
 * который выдал Яндекс (вебвизор, карта кликов, отслеживание ссылок).
 *
 * Отличие от стандартной вставки одно: счётчик подключается только после
 * того, как посетитель нажал «Принимаю» в баннере. До ответа и после отказа
 * Метрика не загружается вовсе — иначе кнопка «Только необходимые» обещала бы
 * выбор, которого нет. По той же причине нет <noscript>-пикселя: его нельзя
 * поставить в зависимость от согласия.
 */

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[]; l?: number }

declare global {
  interface Window {
    ym?: Ym
    dataLayer?: unknown[]
  }
}

export function YandexMetrika() {
  const pathname = usePathname()
  const [allowed, setAllowed] = useState(false)
  const started = useRef(false)
  const lastUrl = useRef<string | null>(null)

  useEffect(() => {
    const sync = () => setAllowed(analyticsAllowed())
    sync()
    window.addEventListener(CONSENT_EVENT, sync)
    return () => window.removeEventListener(CONSENT_EVENT, sync)
  }, [])

  // Загрузка счётчика — один раз, после согласия
  useEffect(() => {
    if (!YANDEX_METRIKA_ID || !allowed || started.current) return
    started.current = true

    // Очередь вызовов до загрузки tag.js — как в стандартном коде счётчика
    const queue: Ym = function (...args: unknown[]) {
      ;(queue.a = queue.a || []).push(args)
    } as Ym
    queue.l = Date.now()
    window.ym = window.ym || queue
    window.dataLayer = window.dataLayer || []

    const script = document.createElement('script')
    script.async = true
    script.src = `https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}`
    document.head.appendChild(script)

    window.ym(YANDEX_METRIKA_ID, 'init', {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: 'dataLayer',
      referrer: document.referrer,
      url: window.location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    })
    lastUrl.current = window.location.href
  }, [allowed])

  // Переходы между страницами без перезагрузки Метрика сама не видит
  useEffect(() => {
    if (!YANDEX_METRIKA_ID || !started.current || !window.ym) return
    const url = window.location.href
    if (lastUrl.current === url) return
    window.ym(YANDEX_METRIKA_ID, 'hit', url, { referer: lastUrl.current ?? document.referrer })
    lastUrl.current = url
  }, [pathname])

  return null
}
