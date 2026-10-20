import { CatalogCollectionPage } from '@/components/catalog-collection-page'
import { CountertopSizes } from '@/components/countertop-sizes'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { getCatalogSectionOrDraft } from '@/lib/catalog-source'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Столешницы для кухни на заказ'
const description =
  'Столешницы и стеновые панели SLOTEX для кухонь «Модуль Эстет»: 23 декора — камень и мрамор, однотонные и под дерево, с артикулами и размерами плит.'
const path = '/countertops'

export const metadata = pageMetadata({ title, description, path })

/**
 * Страница собирается заранее, а раз в час — заново: если при сборке база
 * не ответила и встал черновик, позиции из панели вернутся сами. Правки
 * в панели обновляют страницу сразу (catalog-actions.ts)
 */
export const revalidate = 3600

export default async function CountertopsPage() {
  const items = await getCatalogSectionOrDraft('countertops')

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ name: title, description, path }),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Столешницы', path },
          ]),
        ]}
      />
      <SiteHeader overHero />
      <CatalogCollectionPage
        eyebrow="Столешницы"
        title="Поверхность, на которой всё происходит"
        intro="Столешницы и стеновые панели SLOTEX: 23 декора — камень и мрамор, однотонные и под дерево. У каждого есть артикул, размеры плит указаны внизу страницы."
        items={items}
        extra={{ id: 'sizes', title: 'Размеры плит', node: <CountertopSizes /> }}
      />
      <SiteFooter />
    </>
  )
}
