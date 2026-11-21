import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { JsonLd } from '@/components/json-ld'
import { PlanButton } from '@/components/plan'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { articleDate, articles } from '@/lib/articles'
import { breadcrumbJsonLd, pageMetadata, siteUrl, webPageJsonLd } from '@/lib/seo'

const title = 'Статьи о кухнях на заказ: фасады, замер, планировка'
const description =
  'Как выбрать фасады и столешницу, подготовиться к замеру и спланировать кухню без ручек — советы дизайнеров «Модуль Эстет» на примерах наших кухонь.'
const path = '/stati'

export const metadata = pageMetadata({ title, description, path })

export default function ArticlesPage() {
  const list = [...articles].sort((a, b) => b.published.localeCompare(a.published))

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd({ name: title, description, path }),
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Статьи', path },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: list.map((article, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: `${siteUrl}${path}/${article.slug}`,
              name: article.title,
            })),
          },
        ]}
      />
      <SiteHeader overHero />
      <main className="min-h-screen bg-background text-foreground">
        <CatalogPageHeader
          eyebrow="Статьи"
          label="Статьи"
          keyword="Статьи о кухнях на заказ"
          title="Как выбрать кухню"
          intro="Объясняем простыми словами то, что обычно узнают уже на замере: из чего делают фасады, как устроена кухня без ручек, что подготовить к приходу мастера."
          sectionsLabel="Статьи"
          action={<PlanButton href="/quiz" onDark className="w-fit shrink-0">Рассчитать кухню</PlanButton>}
        />

        <section aria-label="Все статьи" className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((article, index) => (
              <li key={article.slug}>
                <Link href={`${path}/${article.slug}`} className="group flex flex-col gap-4">
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-3xl bg-muted">
                    <Image
                      src={article.cover.src}
                      alt={article.cover.alt}
                      fill
                      priority={index < 3}
                      sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px"
                      className="object-cover motion-safe:transition-transform motion-safe:duration-700 group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="flex flex-col gap-2">
                    <time dateTime={article.updated} className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                      {articleDate(article.updated)}
                    </time>
                    <span className="flex items-start justify-between gap-3">
                      <span className="flyer-title text-2xl leading-tight">{article.title}</span>
                      <ArrowUpRight className="mt-1 size-5 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                    <span className="text-pretty text-sm leading-relaxed text-muted-foreground">{article.description}</span>
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
