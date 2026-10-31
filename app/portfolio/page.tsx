import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { JsonLd } from '@/components/json-ld'
import { PlanButton } from '@/components/plan'
import { PortfolioImage } from '@/components/portfolio-image'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { COMPANY } from '@/lib/company'
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
          keyword="Кухни на заказ: фото наших работ"
          title="Наши кухни"
          intro="Кухни, которые мы спроектировали, изготовили и собрали у клиентов. У каждой — своя страница: фото со всех сторон, фасады, столешница, техника и решения, которые сделали её удобной."
          sectionsLabel="Проекты"
          action={<PlanButton href="/quiz" onDark className="w-fit shrink-0">Хочу похожую кухню</PlanButton>}
        />

        <section aria-label="Проекты" className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <li key={project.id}>
                <Link href={`${path}/${project.id}`} className="group flex flex-col gap-4">
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
                    <PortfolioImage
                      src={project.coverSrc}
                      alt={project.alt}
                      fill
                      sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px"
                      priority={index < 3}
                      className="motion-safe:transition-transform motion-safe:duration-700 group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex flex-col gap-1">
                      <span className="flyer-title text-2xl leading-tight">{project.title}</span>
                      <span className="text-sm text-muted-foreground">
                        {[project.style, project.area].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <ArrowUpRight className="mt-1 size-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
