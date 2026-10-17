import { CatalogPageGallery } from '@/components/catalog-page-gallery'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Коллекции фасадов'
const description =
  'Шесть коллекций фасадов кухонь «Модуль Эстет» — Soft & Wood, Touch, Flat, Velvet, Como и Garda: палитры цветов и декоров, толщина фасада, кромка и фото готовых кухонь.'
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
      <SiteFooter />
    </>
  )
}
