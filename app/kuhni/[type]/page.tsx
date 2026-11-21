import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { inline } from '@/components/article-body'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { BookingPlanButton } from '@/components/footer-actions'
import { JsonLd } from '@/components/json-ld'
import { PlanButton, PlanLabel } from '@/components/plan'
import { PortfolioCards } from '@/components/portfolio-cards'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { COMPANY } from '@/lib/company'
import { getKitchenType, kitchenTypes, kitchenTypesWithProjects, MIN_PROJECTS } from '@/lib/kitchen-types'
import { getPortfolioPages } from '@/lib/portfolio-source'
import { breadcrumbJsonLd, pageMetadata, siteUrl } from '@/lib/seo'

/** Проекты ведутся в панели: подборки пересобираются раз в час и после правок */
export const revalidate = 3600
export const dynamicParams = false

type Params = { params: Promise<{ type: string }> }

export function generateStaticParams() {
  return kitchenTypes.map((type) => ({ type: type.slug }))
}

async function load(slug: string) {
  const type = getKitchenType(slug)
  if (!type) return null
  const all = await getPortfolioPages()
  const projects = all.filter(type.matches)
  // Меньше трёх проектов — это не подборка, а пустая страница: не показываем
  if (projects.length < MIN_PROJECTS) return null
  const others = kitchenTypesWithProjects(all).filter((entry) => entry.type.slug !== slug)
  return { type, projects, others }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await load((await params).type)
  if (!found) return { title: 'Страница не найдена', robots: { index: false } }
  return pageMetadata({
    title: found.type.metaTitle,
    description: found.type.description,
    path: `/kuhni/${found.type.slug}`,
    image: found.projects[0]?.coverSrc,
  })
}

export default async function KitchenTypePage({ params }: Params) {
  const found = await load((await params).type)
  if (!found) notFound()
  const { type, projects, others } = found
  const path = `/kuhni/${type.slug}`

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${siteUrl}${path}#webpage`,
            url: `${siteUrl}${path}`,
            name: type.title,
            description: type.description,
            inLanguage: 'ru-RU',
            isPartOf: { '@id': `${siteUrl}/#website` },
            about: { '@id': `${siteUrl}/#business` },
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: projects.map((project, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `${siteUrl}/portfolio/${project.id}`,
                name: project.title,
              })),
            },
          },
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Кухни', path: '/kuhni' },
            { name: type.title, path },
          ]),
        ]}
      />
      <SiteHeader overHero />
      <main className="min-h-screen bg-background text-foreground">
        <CatalogPageHeader
          eyebrow="Кухни"
          label="Кухни на заказ · Москва и область"
          title={type.title}
          intro={`${projects.length} ${projects.length < 5 ? 'проекта' : 'проектов'} из нашего портфолио. Изготовление — ${COMPANY.productionTime}, замер бесплатный.`}
          sectionsLabel="Типы кухонь"
          action={<PlanButton href="/quiz" onDark className="w-fit shrink-0">Рассчитать кухню</PlanButton>}
        />

        <div className="mx-auto flex max-w-7xl flex-col gap-14 px-5 py-14 md:px-8 md:py-20">
          <section aria-label="О таких кухнях" className="flex max-w-3xl flex-col gap-5 text-lg leading-relaxed">
            {type.intro.map((paragraph) => (
              <p key={paragraph} className="text-pretty text-foreground/85">{inline(paragraph)}</p>
            ))}
          </section>

          <section aria-labelledby="type-projects" className="flex flex-col gap-8">
            <div>
              <PlanLabel className="mb-3">Наши работы</PlanLabel>
              <h2 id="type-projects" className="flyer-title text-3xl md:text-5xl">{type.short} кухни из портфолио</h2>
            </div>
            <PortfolioCards projects={projects} />
          </section>

          <section aria-labelledby="type-cta" className="flex flex-col items-start gap-5 rounded-3xl bg-foreground p-8 text-background md:p-12">
            <h2 id="type-cta" className="flyer-title text-balance text-3xl md:text-5xl">Сделаем такую же под вашу комнату</h2>
            <p className="max-w-2xl text-pretty text-base leading-relaxed text-background/70 md:text-lg">
              Ответьте на несколько вопросов — дизайнер предложит идеи и расчёт. Или пригласите мастера на бесплатный
              замер: привезём образцы фасадов и столешниц.
            </p>
            <div className="flex flex-wrap gap-3">
              <PlanButton href="/quiz" onDark>Рассчитать кухню</PlanButton>
              <BookingPlanButton onDark />
            </div>
          </section>

          {others.length > 0 && (
            <nav aria-labelledby="type-more" className="flex flex-col gap-5">
              <h2 id="type-more" className="flyer-title text-2xl md:text-3xl">Другие кухни</h2>
              <ul className="flex flex-wrap gap-2">
                {others.map(({ type: other, projects: list }) => (
                  <li key={other.slug}>
                    <Link href={`/kuhni/${other.slug}`} className="plan-chip">
                      {other.title}
                      <span className="ml-1 tabular-nums opacity-60">{list.length}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/portfolio" className="plan-chip">Все проекты</Link>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
