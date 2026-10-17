import Image from 'next/image'
import { Check } from 'lucide-react'
import { fillingCategories } from '@/lib/filling-data'
import { PlanButton, PlanLabel, PlanTag } from '@/components/plan'

const featuredCategories = fillingCategories.slice(0, 3)

export function FillingSection() {
  return (
    <section id="filling" className="paper overflow-hidden py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between" data-anim>
          <div className="max-w-3xl">
            <PlanLabel index={5} className="mb-4">Внутри всё продумано</PlanLabel>
            <h2 className="flyer-title mt-2 text-balance text-3xl text-foreground md:text-5xl">
              Наполнение для порядка без лишних движений
            </h2>
          </div>
          <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
            Подбираем системы хранения под вашу планировку, привычки и состав семьи — чтобы всё нужное всегда было под рукой.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3" data-anim="stagger">
          {featuredCategories.map((category, index) => (
            <article
              key={category.title}
              className="group overflow-hidden rounded-3xl border border-primary/35 bg-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <Image
                  src={category.image}
                  alt={category.imageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 380px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <PlanTag value={String(index + 1).padStart(2, '0')} dot className="absolute left-4 top-4 tabular-nums" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-5 pt-16">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">
                    {category.shortTitle}
                  </p>
                  <h3 className="flyer-title mt-1 text-2xl text-background">
                    {category.title}
                  </h3>
                </div>
              </div>
              <div className="p-5">
                <ul className="flex flex-col gap-2">
                  {category.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className="grain mt-8 flex flex-col gap-5 rounded-3xl bg-foreground p-6 text-background md:flex-row md:items-center md:justify-between md:p-8" data-anim>
          <div>
            <p className="flyer-title text-2xl md:text-3xl">Ещё больше решений внутри</p>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-background/65">
              Посмотрите все варианты: корзины для посуды, выдвижные сушилки и системы для каждого сантиметра кухни.
            </p>
          </div>
          <PlanButton href="/filling" onDark className="shrink-0">Всё наполнение</PlanButton>
        </div>
      </div>
    </section>
  )
}
