import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { JsonLd } from '@/components/json-ld'
import { PlanButton } from '@/components/plan'
import { PortfolioImage } from '@/components/portfolio-image'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { COMPANY, KITCHEN_PRICE } from '@/lib/company'
import { kitchenTypesWithProjects } from '@/lib/kitchen-types'
import { getPortfolioPages } from '@/lib/portfolio-source'
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from '@/lib/seo'

const title = 'Кухни на заказ по типам: угловые, без ручек, классика'
const description = `Кухни на заказ в Москве и области по типам: угловые, без ручек, современные и классические. Фото наших проектов, ${KITCHEN_PRICE}, изготовление за ${COMPANY.productionTime}.`
const path = '/kuhni'

export const metadata = pageMetadata({ title, description, path })
export const revalidate = 3600

export default async function KitchensPage() {
  const types = kitchenTypesWithProjects(await getPortfolioPages())

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ name: title, description, path }),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Кухни', path },
          ]),
        ]}
      />
      <SiteHeader overHero />
      <main className="min-h-screen bg-background text-foreground">
        <CatalogPageHeader
          eyebrow="Кухни"
          label="Кухни на заказ · Москва и область"
          title="Кухни на заказ"
          intro={`Выберите тип кухни — покажем наши проекты такого типа с фото, материалами и площадью. ${KITCHEN_PRICE}, изготовление за ${COMPANY.productionTime}, замер бесплатный.`}
          sectionsLabel="Типы кухонь"
          action={<PlanButton href="/quiz" onDark className="w-fit shrink-0">Рассчитать кухню</PlanButton>}
        />
        <section aria-label="Типы кухонь" className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2">
            {types.map(({ type, projects }, index) => (
              <li key={type.slug}>
                <Link href={`${path}/${type.slug}`} className="group flex flex-col gap-4">
                  <span className="relative block aspect-[16/10] overflow-hidden rounded-3xl bg-muted">
                    <PortfolioImage
                      src={projects[0].coverSrc}
                      alt={projects[0].alt}
                      fill
                      priority={index < 2}
                      sizes="(max-width: 639px) 100vw, 600px"
                      className="motion-safe:transition-transform motion-safe:duration-700 group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex flex-col gap-1">
                      <span className="flyer-title text-3xl leading-tight">{type.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {projects.length} {projects.length < 5 ? 'проекта' : 'проектов'} в портфолио
                      </span>
                    </span>
                    <ArrowUpRight className="mt-1 size-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-12 text-base text-muted-foreground">
            Все работы подряд — в{' '}
            <Link href="/portfolio" className="font-medium text-primary underline-offset-4 hover:underline">портфолио</Link>
            , а как выбрать планировку — в статье{' '}
            <Link href="/stati/pryamaya-ili-uglovaya-kuhnya" className="font-medium text-primary underline-offset-4 hover:underline">«Прямая или угловая кухня»</Link>.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
