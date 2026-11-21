import type { Metadata } from 'next'
import { VizKit } from '@/components/vizkit'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

/**
 * Демо визуализатора — для показа идеи. Ссылки на страницу с сайта нет,
 * в карту сайта она не входит, а поисковикам закрыта.
 */
export const metadata: Metadata = {
  title: 'Визуализатор мебели — демо',
  robots: { index: false, follow: false },
}

export default function VizKitPage() {
  return (
    <>
      <SiteHeader />
      <main className="paper">
        <VizKit />
      </main>
      <SiteFooter />
    </>
  )
}
