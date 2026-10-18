import { WardrobesPage } from '@/components/wardrobes-page'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Модульные шкафы'
const description =
  'Модульные шкафы на заказ «Модуль Эстет»: гардеробные, шкафы для гостиной, спальни и прихожей. Семь коллекций фасадов — Soft & Wood, Touch, Touch Ultra, Arco, Garda, Como, Flat & Velvet, витрины Vetrine, наполнение и фурнитура Blum.'
const path = '/wardrobes'

export const metadata = pageMetadata({ title, description, path })

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ name: title, description, path }),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: title, path },
          ]),
        ]}
      />
      <SiteHeader overHero />
      <WardrobesPage />
      <SiteFooter />
    </>
  )
}
