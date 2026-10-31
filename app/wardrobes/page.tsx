import { WardrobesPage } from '@/components/wardrobes-page'
import { SiteFooter } from '@/components/site-footer'
import { PlainTerms } from '@/components/plain-terms'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Модульные шкафы на заказ в Москве и области'
const description =
  'Модульные шкафы на заказ в Москве и области: гардеробные, шкафы в гостиную, спальню и прихожую. Семь коллекций фасадов, витрины и наполнение под ваши вещи.'
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
      <PlainTerms terms={['mdf', 'lmdf', 'pvc', 'pet', 'pur', 'uv', 'line', 'edge']} />
      <SiteFooter />
    </>
  )
}
