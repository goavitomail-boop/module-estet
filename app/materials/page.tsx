import { CatalogPageGallery } from '@/components/catalog-page-gallery'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Материалы и столешницы для кухни'
const description =
  'Материалы корпусов, витрин и столешниц для кухонь на заказ: декоры SLOTEX с артикулами, кварцевый агломерат, массив и шпон.'
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
      <SiteFooter />
    </>
  )
}
