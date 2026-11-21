import Link from 'next/link'
import { PlanLabel } from '@/components/plan'
import { GLOSSARY, type GlossaryKey } from '@/lib/glossary'

/** «Простыми словами»: объясняет термины, которые встречаются на странице */
export function PlainTerms({ terms, article }: { terms: GlossaryKey[]; article?: { href: string; title: string } }) {
  return (
    <section aria-labelledby="plain-terms" className="mx-auto max-w-7xl px-5 pb-16 md:px-8 md:pb-24">
      <div className="border-t border-border pt-12 md:pt-16">
        <PlanLabel className="mb-4">Словарь</PlanLabel>
        <h2 id="plain-terms" className="flyer-title text-balance text-3xl md:text-5xl">Простыми словами</h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
          Что значат слова из характеристик на этой странице.
        </p>
        <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map((key) => (
            <div key={key} className="flex flex-col gap-2">
              <dt className="text-base font-semibold">{GLOSSARY[key].term}</dt>
              <dd className="text-sm leading-relaxed text-muted-foreground">{GLOSSARY[key].text}</dd>
            </div>
          ))}
        </dl>
        {article && (
          <p className="mt-10 text-base">
            Подробнее — в статье{' '}
            <Link href={article.href} className="font-medium text-primary underline-offset-4 hover:underline">
              «{article.title}»
            </Link>
          </p>
        )}
      </div>
    </section>
  )
}
