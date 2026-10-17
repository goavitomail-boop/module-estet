'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SitePreloader } from '@/components/site-preloader'
import { DesktopFloatingWidget } from '@/components/desktop-floating-widget'
import { MeasurementBooking } from '@/components/measurement-booking'
import { SiteAnimations } from '@/components/site-animations'
import { CookieNotice } from '@/components/cookie-notice'
import { YandexMetrika } from '@/components/yandex-metrika'
import { captureAttribution } from '@/lib/attribution'
import { CONSENT_EVENT } from '@/lib/consent'

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
      <MeasurementBooking />
      <CookieNotice />
      {/* Метрика включается только после согласия в баннере выше */}
      <YandexMetrika />
      {/* После контента: к моменту запуска разметка секций уже в DOM */}
      <SiteAnimations />
    </>
  )
}
