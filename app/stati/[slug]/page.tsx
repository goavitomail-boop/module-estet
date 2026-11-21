import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { ArticleBody } from '@/components/article-body'
import { CatalogPageHeader } from '@/components/catalog-page-header'
import { BookingPlanButton } from '@/components/footer-actions'
import { JsonLd } from '@/components/json-ld'
import { PlanButton } from '@/components/plan'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { articleDate, articles, getArticle } from '@/lib/articles'
import { breadcrumbJsonLd, businessName, pageMetadata, siteUrl } from '@/lib/seo'

type Params = { params: Promise<{ slug: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const article = getArticle((await params).slug)
  if (!article) return {}
  const base = pageMetadata({
    title: article.metaTitle,
    description: article.description,
    path: `/stati/${article.slug}`,
    image: article.cover.src,
  })
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: 'article',
      publishedTime: article.published,
      modifiedTime: article.updated,
    },
  }
}

export default async function ArticlePage({ params }: Params) {
  const article = getArticle((await params).slug)
  if (!article) notFound()

  const path = `/stati/${article.slug}`
  const url = `${siteUrl}${path}`
  const others = articles.filter((other) => other.slug !== article.slug).slice(0, 3)
  const sections = article.blocks.flatMap((block) => (block.type === 'h2' ? [{ id: block.id, title: block.text }] : []))

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            '@id': `${url}#article`,
            headline: article.title,
            description: article.description,
            image: [`${siteUrl}${article.cover.src}`],
            datePublished: article.published,
            dateModified: article.updated,
            inLanguage: 'ru-RU',
            mainEntityOfPage: url,
            author: { '@type': 'Organization', name: `Кухни «${businessName}»`, url: siteUrl },
            publisher: { '@id': `${siteUrl}/#business` },
          },
          breadcrumbJsonLd([
            { name: 'Главная', path: '/' },
            { name: 'Статьи', path: '/stati' },
            { name: article.title, path },
          ]),
        ]}
      />
      <SiteHeader overHero />
      <main className="min-h-screen bg-background text-foreground">
        <CatalogPageHeader
          eyebrow="Статьи"
          label={`Статьи · ${articleDate(article.updated)}`}
          title={article.title}
          intro={article.lead}
          sections={sections}
          sectionsLabel="Содержание статьи"
        />

        <article className="mx-auto flex max-w-3xl flex-col gap-10 px-5 py-14 md:px-8 md:py-20">
          <figure className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted md:aspect-[16/9]">
            <Image src={article.cover.src} alt={article.cover.alt} fill priority sizes="(max-width: 767px) 100vw, 768px" className="object-cover" />
          </figure>

          <ArticleBody blocks={article.blocks} />

          <p className="text-sm text-muted-foreground">
            Автор — команда кухонь «{businessName}». Опубликовано{' '}
            <time dateTime={article.published}>{articleDate(article.published)}</time>
            {article.updated !== article.published && (
              <>
                , обновлено <time dateTime={article.updated}>{articleDate(article.updated)}</time>
              </>
            )}
            .
          </p>

          <section aria-labelledby="article-cta" className="flex flex-col items-start gap-5 rounded-3xl bg-foreground p-8 text-background md:p-10">
            <h2 id="article-cta" className="flyer-title text-balance text-3xl md:text-4xl">Обсудим вашу кухню?</h2>
            <p className="text-pretty text-base leading-relaxed text-background/70">
              Ответьте на несколько вопросов — дизайнер предложит идеи и расчёт. Или пригласите мастера на бесплатный
              замер: привезём образцы фасадов и столешниц.
            </p>
            <div className="flex flex-wrap gap-3">
              <PlanButton href="/quiz" onDark>Рассчитать кухню</PlanButton>
              <BookingPlanButton onDark />
            </div>
          </section>
        </article>

        {others.length > 0 && (
          <section aria-labelledby="more-articles" className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-12">
              <h2 id="more-articles" className="flyer-title text-3xl md:text-4xl">Ещё статьи</h2>
              <Link href="/stati" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                Все статьи
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/stati/${other.slug}`} className="group flex flex-col gap-3">
                    <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                      <Image src={other.cover.src} alt={other.cover.alt} fill sizes="(max-width: 639px) 100vw, 400px" className="object-cover motion-safe:transition-transform motion-safe:duration-700 group-hover:scale-[1.03]" />
                    </span>
                    <span className="flyer-title text-lg leading-tight">{other.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
