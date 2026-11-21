import { CatalogPageGallery } from '@/components/catalog-page-gallery'
import { SiteFooter } from '@/components/site-footer'
import { PlainTerms } from '@/components/plain-terms'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Материалы для кухни на заказ: корпус, витрины, SLOTEX'
const description =
  'Из чего мы делаем кухни на заказ: корпус из МДФ, профиль LINE для фасадов без ручек, стеклянные витрины и декоры столешниц SLOTEX с артикулами и размерами.'
const path = '/materials'

export const metadata = pageMetadata({ title, description, path })

export default function MaterialsPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ name: title, description, path }),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Материалы и столешницы', path },
          ]),
        ]}
      />
      <SiteHeader overHero />
      <CatalogPageGallery section="materials" />
      <PlainTerms terms={['mdf', 'line', 'edge', 'edgedAll', 'pur']} article={{ href: '/stati/kuhnya-bez-ruchek', title: 'Кухня без ручек: как открываются фасады, плюсы и минусы' }} />
      <SiteFooter />
    </>
  )
}
