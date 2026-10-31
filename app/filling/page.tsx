import { CatalogPageGallery } from '@/components/catalog-page-gallery'
import { SiteFooter } from '@/components/site-footer'
import { PlainTerms } from '@/components/plain-terms'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { getCatalogGroups } from '@/lib/catalog-source'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Фурнитура и наполнение для кухни: ручки, подсветка'
const description =
  'Наполнение и фурнитура для кухни на заказ: LED-подсветка, ручки и профили, рейлинги, корзины и системы хранения, схемы модулей с размерами — всё в одном месте.'
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
      <PlainTerms terms={['line', 'brushed', 'holeSpacing', 'gasLift', 'edge']} />
      <SiteFooter />
    </>
  )
}
