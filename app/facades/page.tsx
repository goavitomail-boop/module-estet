import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { CatalogCollectionPage } from '@/components/catalog-collection-page'
import { FacadePalette } from '@/components/facade-palette'
import { SiteFooter } from '@/components/site-footer'
import { PlainTerms } from '@/components/plain-terms'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { getCatalogSectionOrDraft } from '@/lib/catalog-source'
import type { CatalogRow } from '@/lib/db'
import { facadeOptionsFor } from '@/lib/pdf-catalog-data'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Фасады для кухни на заказ: цвета и характеристики'
const description =
  'Фасады для кухни на заказ: Soft & Wood, Touch, Flat, Velvet, Como и Garda — палитры цветов, формы, толщина и кромка. Витрины и профиль для кухни без ручек.'
const path = '/facades'

export const metadata = pageMetadata({ title, description, path })

/**
 * Страница собирается заранее, а раз в час — заново: если при сборке база
 * не ответила и встал черновик, позиции из панели вернутся сами. Правки
 * в панели обновляют страницу сразу (catalog-actions.ts)
 */
export const revalidate = 3600

export default async function FacadesPage() {
  const items = await getCatalogSectionOrDraft('facades')

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
        keyword="Фасады для кухни на заказ"
        title="Из чего собирается лицо кухни"
        intro="Материал фасада определяет и внешний вид, и то, как кухня переживёт десять лет ежедневной готовки. Ниже — то, с чем мы работаем постоянно."
        items={items}
        details={facadeDetails}
      />
      <PlainTerms terms={['pvc', 'mdf', 'edge', 'edgedAll', 'pur']} article={{ href: '/stati/fasady-dlya-kuhni-pvh-pet-lmdf', title: 'Фасады для кухни: ПВХ, PET или ЛМДФ — что выбрать' }} />
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
