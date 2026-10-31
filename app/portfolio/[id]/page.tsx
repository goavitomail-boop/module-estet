import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { BookingPlanButton } from '@/components/footer-actions'
import { JsonLd } from '@/components/json-ld'
import { PlanButton, PlanLabel } from '@/components/plan'
import { PortfolioImage } from '@/components/portfolio-image'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { COMPANY } from '@/lib/company'
import { getPortfolioPages } from '@/lib/portfolio-source'
import { breadcrumbJsonLd, pageMetadata, snippet, webPageJsonLd } from '@/lib/seo'

/**
 * Страница одного проекта из портфолио.
 *
 * На главной проект открывается во всплывающем окне — его не видит поиск
 * и на него не сослаться. Здесь у каждой кухни свой адрес, заголовок и текст:
 * по запросам вида «кухня кашемир с дубом» человек попадает сразу на неё.
 */

/** Проекты ведутся в панели: новые страницы собираются по первому запросу, раз в час — заново */
export const revalidate = 3600
export const dynamicParams = true

type Params = { params: Promise<{ id: string }> }

async function findProject(id: string) {
  const projects = await getPortfolioPages()
  const index = projects.findIndex((project) => project.id === id)
  if (index === -1) return null
  // Соседние проекты — ссылки «Ещё кухни» внизу страницы
  const others = [1, 2, 3].map((step) => projects[(index + step) % projects.length]).filter((other) => other.id !== id)
  return { project: projects[index], others: Array.from(new Map(others.map((other) => [other.id, other])).values()) }
}

export async function generateStaticParams() {
  return (await getPortfolioPages()).map((project) => ({ id: project.id }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params
  const found = await findProject(id)
  if (!found) return { title: 'Проект не найден', robots: { index: false } }
  const { project } = found
  return pageMetadata({
    title: `${project.title} — кухня на заказ`,
    description: snippet(project.description),
    path: `/portfolio/${project.id}`,
    image: project.coverSrc,
  })
}

export default async function PortfolioProjectPage({ params }: Params) {
  const { id } = await params
  const found = await findProject(id)
  if (!found) notFound()
  const { project, others } = found
  const path = `/portfolio/${project.id}`
  const [main, ...rest] = project.photos

  const facts = [
    ['Изготовление', COMPANY.productionTime],
    ['Стиль', project.style],
    ['Площадь', project.area],
    ['Фасады', project.tag],
  ].filter(([, value]) => value)

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ name: project.title, description: snippet(project.description), path, image: project.coverSrc }),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Наши кухни', path: '/portfolio' },
            { name: project.title, path },
          ]),
        ]}
      />
      <SiteHeader overHero />
      <main className="min-h-screen bg-background text-foreground">
        <CatalogPageHeader
          eyebrow="Наши работы"
          label="Наши работы"
          keyword={`Кухня на заказ${project.style ? ` · ${project.style.toLowerCase()}` : ''}`}
          title={project.title}
          intro={project.tag}
          sectionsLabel="Разделы проекта"
          action={<PlanButton href="/quiz" onDark className="w-fit shrink-0">Хочу похожую кухню</PlanButton>}
        />

        <div className="mx-auto flex max-w-7xl flex-col gap-14 px-5 py-14 md:px-8 md:py-20">
          {main && (
            <figure className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted md:aspect-[16/9]">
              <PortfolioImage src={main.src} alt={main.alt} fill priority sizes="(max-width: 1279px) 100vw, 1216px" />
            </figure>
          )}

          <section aria-labelledby="project-about" className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
            <div className="flex flex-col gap-5">
              <PlanLabel index={1}>О проекте</PlanLabel>
              <h2 id="project-about" className="flyer-title text-3xl md:text-4xl">Какой получилась кухня</h2>
              <p className="text-pretty text-lg leading-relaxed text-muted-foreground">{project.description}</p>
              <dl className="grid grid-cols-2 gap-5 border-y border-border py-6">
                {facts.map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-1">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex flex-col gap-8">
              {project.materials.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">Материалы и техника</h2>
                  <ul className="flex flex-col gap-2">
                    {project.materials.map((material) => (
                      <li key={material} className="text-sm leading-relaxed text-muted-foreground">{material}</li>
                    ))}
                  </ul>
                </div>
              )}
              {project.features.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold">Решения</h2>
                  <ul className="flex flex-col gap-2">
                    {project.features.map((feature) => (
                      <li key={feature} className="text-sm leading-relaxed text-muted-foreground">{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {rest.length > 0 && (
            <section aria-labelledby="project-photos" className="flex flex-col gap-6">
              <PlanLabel index={2}>Фото</PlanLabel>
              <h2 id="project-photos" className="flyer-title text-3xl md:text-4xl">Кухня с разных сторон</h2>
              <ul className="grid gap-5 sm:grid-cols-2">
                {rest.map((photo) => (
                  <li key={photo.src}>
                    <figure className="flex flex-col gap-3">
                      <span className="relative block aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
                        <PortfolioImage src={photo.src} alt={photo.alt} fill sizes="(max-width: 639px) 100vw, 600px" />
                      </span>
                      <figcaption className="text-sm leading-relaxed text-muted-foreground">{photo.alt}</figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="project-cta" className="flex flex-col items-start gap-5 rounded-3xl bg-foreground p-8 text-background md:p-12">
            <h2 id="project-cta" className="flyer-title text-balance text-3xl md:text-5xl">Хотите похожую кухню?</h2>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-background/70 md:text-lg">
              Ответьте на несколько вопросов — дизайнер предложит идеи и расчёт. Или пригласите мастера на бесплатный
              замер: привезём образцы фасадов и столешниц. Изготовим за {COMPANY.productionTime}, доставим и соберём —
              {' '}{COMPANY.region.replace('Москва', 'в Москве').replace('Московская область', 'Московской области')}.
            </p>
            <div className="flex flex-wrap gap-3">
              <PlanButton href="/quiz" onDark>Рассчитать кухню</PlanButton>
              <BookingPlanButton onDark />
            </div>
          </section>

          {others.length > 0 && (
            <section aria-labelledby="project-more" className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="project-more" className="flyer-title text-3xl md:text-4xl">Ещё кухни</h2>
                <Link href="/portfolio" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  Все проекты
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <ul className="grid gap-6 sm:grid-cols-3">
                {others.map((other) => (
                  <li key={other.id}>
                    <Link href={`/portfolio/${other.id}`} className="group flex flex-col gap-3">
                      <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                        <PortfolioImage src={other.coverSrc} alt={other.alt} fill sizes="(max-width: 639px) 100vw, 400px" className="motion-safe:transition-transform motion-safe:duration-700 group-hover:scale-[1.03]" />
                      </span>
                      <span className="flyer-title text-lg leading-tight">{other.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
