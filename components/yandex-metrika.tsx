'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { CONSENT_EVENT, metrikaAllowed } from '@/lib/consent'
import { YANDEX_METRIKA_ID, reachGoal } from '@/lib/metrika'

/**
 * Яндекс.Метрика — счётчик из кабинета, с теми же настройками, что в коде,
 * который выдал Яндекс (вебвизор, карта кликов, отслеживание ссылок).
 *
 * Счётчик подключается сразу, не дожидаясь ответа на баннер: пока он ждал
 * «Принимаю», Метрика видела меньшинство посетителей. Кнопка «Только
 * необходимые» его выключает — в этом визите и во всех следующих. Поэтому
 * нет <noscript>-пикселя: его нельзя поставить в зависимость от выбора.
 *
 * Здесь же цели на нажатия телефона и ссылок на Макс: такие обращения
 * не проходят через формы и иначе в Метрике не видны.
 */

type Ym = ((id: number, method: string, ...args: unknown[]) => void) & { a?: unknown[]; l?: number }

declare global {
  interface Window {
    ym?: Ym
    dataLayer?: unknown[]
    /** Штатный выключатель Метрики: tag.js перестаёт отправлять данные счётчика */
    [key: `disableYaCounter${number}`]: boolean | undefined
  }
}

export function YandexMetrika() {
  const pathname = usePathname()
  const [allowed, setAllowed] = useState(false)
  const started = useRef(false)
  const lastUrl = useRef<string | null>(null)

  useEffect(() => {
    const sync = () => {
      const next = metrikaAllowed()
      // Отказ после загрузки: скрипт уже не выгрузить, но счётчик выключаем
      if (YANDEX_METRIKA_ID) window[`disableYaCounter${YANDEX_METRIKA_ID}`] = !next
      setAllowed(next)
    }
    sync()
    window.addEventListener(CONSENT_EVENT, sync)
    return () => window.removeEventListener(CONSENT_EVENT, sync)
  }, [])

  // Загрузка счётчика — один раз, если посетитель не отказался
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
    if (!YANDEX_METRIKA_ID || !allowed || !started.current || !window.ym) return
    const url = window.location.href
    if (lastUrl.current === url) return
    window.ym(YANDEX_METRIKA_ID, 'hit', url, { referer: lastUrl.current ?? document.referrer })
    lastUrl.current = url
  }, [pathname, allowed])

  // Звонки и переходы в Макс. Слушаем весь документ, а не каждую ссылку:
  // телефон и Макс стоят в шапке, подвале, виджете и формах
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href]')
      const href = link?.getAttribute('href') ?? ''
      if (href.startsWith('tel:')) reachGoal('click_phone')
      else if (/^https:\/\/(web\.)?max\.ru\//.test(href)) reachGoal('click_max')
    }
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  return null
}
