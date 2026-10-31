'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { SitePreloader } from '@/components/site-preloader'
import { DesktopFloatingWidget } from '@/components/desktop-floating-widget'
import { SiteAnimations } from '@/components/site-animations'
import { CookieNotice } from '@/components/cookie-notice'
import { YandexMetrika } from '@/components/yandex-metrika'
import { captureAttribution } from '@/lib/attribution'
import { CONSENT_EVENT } from '@/lib/consent'
import { MEASUREMENT_BOOKING_ALT_EVENT, MEASUREMENT_BOOKING_EVENT, triggerMeasurementBooking } from '@/lib/booking-events'

/**
 * Форма записи на замер — самый тяжёлый общий кусок сайта: диалог, анимации
 * шагов, сцены. Открывают её немногие, поэтому грузим её не со страницей,
 * а при первом действии человека (прокрутка, касание, клавиша) или когда
 * браузер освободится. Первый экран рисуется быстрее — это и скорость для
 * поиска, и меньше уходов с медленного телефона.
 */
const MeasurementBooking = dynamic(
  () => import('@/components/measurement-booking').then((module) => module.MeasurementBooking),
  { ssr: false },
)

function LazyMeasurementBooking() {
  const [load, setLoad] = useState(false)
  const [ready, setReady] = useState(false)
  /** Кнопку нажали раньше, чем форма начала слушать события: откроем её, как только сможет */
  const pending = useRef(false)

  // Первое действие человека или свободная минута браузера — начинаем грузить
  useEffect(() => {
    if (load) return
    const start = () => setLoad(true)
    const interactions = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    interactions.forEach((type) => window.addEventListener(type, start, { once: true, passive: true }))
    const idle = window.setTimeout(start, 6000)
    return () => {
      interactions.forEach((type) => window.removeEventListener(type, start))
      window.clearTimeout(idle)
    }
  }, [load])

  // Нажатия «Записаться» ловим сами, пока форма не готова: загрузка идёт по
  // сети, и без этого первое нажатие на медленном телефоне терялось бы
  useEffect(() => {
    if (ready) return
    const openEarly = () => { pending.current = true; setLoad(true) }
    window.addEventListener(MEASUREMENT_BOOKING_EVENT, openEarly)
    window.addEventListener(MEASUREMENT_BOOKING_ALT_EVENT, openEarly)
    return () => {
      window.removeEventListener(MEASUREMENT_BOOKING_EVENT, openEarly)
      window.removeEventListener(MEASUREMENT_BOOKING_ALT_EVENT, openEarly)
    }
  }, [ready])

  const onReady = useCallback(() => {
    setReady(true)
    if (pending.current) {
      pending.current = false
      triggerMeasurementBooking()
    }
  }, [])

  if (!load) return null
  return <MeasurementBooking onReady={onReady} />
}

/**
 * Прелоадер и плавающий виджет — это витрина сайта. В админ-панели они мешают,
 * поэтому на /admin не рендерятся вовсе.
 *
 * Заодно слот прелоадера снимает utm-метки: он монтируется на первой же
 * странице визита, то есть ровно там, где метки ещё есть в адресе.
 */
export function SiteChrome({ slot }: { slot: 'preloader' | 'widget' }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin') ?? false

  useEffect(() => {
    if (slot !== 'preloader' || isAdmin) return

    // При заходе снимаем только если согласие уже дано в прошлый визит.
    captureAttribution()

    // А если человек соглашается прямо сейчас — снимаем повторно, не дожидаясь
    // следующей страницы: utm-метки ещё в адресе ровно в этот момент.
    const onConsent = () => captureAttribution()
    window.addEventListener(CONSENT_EVENT, onConsent)
    return () => window.removeEventListener(CONSENT_EVENT, onConsent)
  }, [slot, isAdmin])

  if (isAdmin) return null
  if (slot === 'preloader') return <SitePreloader />

  return (
    <>
      <DesktopFloatingWidget />
      {/* Форма замера — здесь, а не на главной: кнопка «Замер» в виджете
          есть на каждой странице и без формы ничего не открывала */}
      <LazyMeasurementBooking />
      <CookieNotice />
      {/* Метрика включается только после согласия в баннере выше */}
      <YandexMetrika />
      {/* После контента: к моменту запуска разметка секций уже в DOM */}
      <SiteAnimations />
    </>
  )
}
