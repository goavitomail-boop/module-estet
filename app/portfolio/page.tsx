import Link from 'next/link'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { JsonLd } from '@/components/json-ld'
import { PlanButton } from '@/components/plan'
import { PortfolioCards } from '@/components/portfolio-cards'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { COMPANY } from '@/lib/company'
import { kitchenTypesWithProjects } from '@/lib/kitchen-types'
import { getPortfolioPages } from '@/lib/portfolio-source'
import { breadcrumbJsonLd, pageMetadata, siteUrl, webPageJsonLd } from '@/lib/seo'

const title = 'Фото кухонь на заказ: наши работы в Москве и области'
const description = `Готовые кухни «Модуль Эстет» в квартирах Москвы и Подмосковья: фото, материалы, фасады и решения каждого проекта. Изготовление за ${COMPANY.productionTime}.`
const path = '/portfolio'

export const metadata = pageMetadata({ title, description, path })

/** Проекты ведутся в панели: правки обновляют страницу сразу, а раз в час — на всякий случай */
export const revalidate = 3600

export default async function PortfolioIndexPage() {
  const projects = await getPortfolioPages()
  const types = kitchenTypesWithProjects(projects)

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ name: title, description, path }),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Наши кухни', path },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: projects.map((project, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: `${siteUrl}${path}/${project.id}`,
              name: project.title,
            })),
          },
        ]}
      />
      <SiteHeader overHero />
      <main className="min-h-screen bg-background text-foreground">
        <CatalogPageHeader
          eyebrow="Наши работы"
          label="Наши работы"
          keyword="Кухни на заказ: фото наших работ"
          title="Наши кухни"
          intro="Кухни, которые мы спроектировали, изготовили и собрали у клиентов. У каждой — своя страница: фото со всех сторон, фасады, столешница, техника и решения, которые сделали её удобной."
          sectionsLabel="Проекты"
          action={<PlanButton href="/quiz" onDark className="w-fit shrink-0">Хочу похожую кухню</PlanButton>}
        />

        <section aria-label="Проекты" className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
          {types.length > 0 && (
            <nav aria-label="Кухни по типам" className="mb-10 flex flex-wrap gap-2">
              {types.map(({ type, projects: list }) => (
                <Link key={type.slug} href={`/kuhni/${type.slug}`} className="plan-chip">
                  {type.title}
                  <span className="ml-1 tabular-nums opacity-60">{list.length}</span>
                </Link>
              ))}
            </nav>
          )}
          <PortfolioCards projects={projects} />
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
