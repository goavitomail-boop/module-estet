import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { CatalogCollectionPage } from '@/components/catalog-collection-page'
import { FacadePalette } from '@/components/facade-palette'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { getCatalogSection } from '@/lib/catalog-source'
import type { CatalogRow } from '@/lib/db'
import { facadeOptionsFor } from '@/lib/pdf-catalog-data'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Фасады для кухни на заказ'
const description =
  'Фасады кухонь «Модуль Эстет»: Soft & Wood, Touch, Flat, Velvet, Como и Garda, стеклянные витрины и профиль без ручек — с характеристиками, формами фасада и палитрами цветов.'
const path = '/facades'

export const metadata = pageMetadata({ title, description, path })

export default async function FacadesPage() {
  const items = await getCatalogSection('facades')

  // Пока раздел не наполнили из панели, страницы на сайте нет: пустая
  // витрина хуже её отсутствия и для посетителя, и для поиска
  if (items.length === 0) notFound()

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ name: title, description, path }),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Фасады', path },
          ]),
        ]}
      />
      <SiteHeader overHero />
      <CatalogCollectionPage
        eyebrow="Фасады"
        title="Из чего собирается лицо кухни"
        intro="Материал фасада определяет и внешний вид, и то, как кухня переживёт десять лет ежедневной готовки. Ниже — то, с чем мы работаем постоянно."
        items={items}
        details={facadeDetails}
      />
      <SiteFooter />
    </>
  )
}

/** Цвета фасада — прямо в его карточке: название, форма и палитра читаются вместе */
function facadeDetails(item: CatalogRow) {
  const options = facadeOptionsFor(item.name)
  if (!options) return null

  return (
    <FacadePalette
      items={options.items}
      shape={options.shape}
      shapeAlt={`Форма фасада ${item.name}`}
      note={options.note}
      label={options.label}
      action={
        options.collectionId ? (
          <Link
            href={`/collections#${options.collectionId}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Фото кухонь коллекции <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        ) : undefined
      }
    />
  )
}
