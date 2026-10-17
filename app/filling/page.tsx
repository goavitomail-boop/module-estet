import { CatalogPageGallery } from '@/components/catalog-page-gallery'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { getCatalogGroups } from '@/lib/catalog-source'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Наполнение кухни: фурнитура, ручки и подсветка'
const description =
  'Внутреннее наполнение кухонь на заказ: LED-подсветка, ручки, профили, рейлинги, системы хранения и технический конструктив модулей.'
const path = '/filling'

export const metadata = pageMetadata({ title, description, path })

export default async function FillingPage() {
  // null — раздел ещё не переносили в панель, показываем каталог из кода
  const groups = await getCatalogGroups('filling')

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ name: title, description, path }),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Наполнение кухни', path },
          ]),
        ]}
      />
      <SiteHeader overHero />
      <CatalogPageGallery section="filling" groups={groups ?? undefined} />
      <SiteFooter />
    </>
  )
}
