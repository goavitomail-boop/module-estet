import { CatalogPageGallery } from '@/components/catalog-page-gallery'
import { SiteFooter } from '@/components/site-footer'
import { PlainTerms } from '@/components/plain-terms'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Кухни на заказ: шесть коллекций фасадов с фото'
const description =
  'Кухни на заказ: шесть коллекций фасадов — Soft & Wood, Touch, Flat, Velvet, Como и Garda. Цвета и декоры, толщина фасада, кромка и фото готовых кухонь.'
const path = '/collections'

export const metadata = pageMetadata({ title, description, path })

export default function CollectionsPage() {
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
      <CatalogPageGallery section="collections" />
      <PlainTerms terms={['pvc', 'mdf', 'edge', 'edgedAll', 'pur']} />
      <SiteFooter />
    </>
  )
}
