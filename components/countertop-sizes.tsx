import { PlanLabel } from '@/components/plan'

/**
 * Размеры плит SLOTEX — с тех же слайдов каталога, что и декоры. Одни
 * и те же для всех декоров, поэтому вынесены в отдельный раздел, а не
 * повторяются в каждой карточке.
 */
const SIZES = [
  { title: 'Столешница', lengths: ['3000', '4150'], depth: '600', thickness: '40' },
  { title: 'Стеновая панель', lengths: ['3000', '4150'], depth: '600', thickness: '10' },
]

export function CountertopSizes() {
  return (
    <section id="sizes" className="scroll-mt-24 border-t border-border py-12" data-anim="fade-up">
      <div className="mb-8">
        <PlanLabel className="mb-3">Размеры плит</PlanLabel>
        <h2 className="flyer-title text-3xl text-balance text-foreground md:text-5xl">Столешница и стеновая панель</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SIZES.map((size) => (
          <article key={size.title} className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-sans text-base font-semibold text-foreground">{size.title}</h3>
            <ul className="mt-4 flex flex-col gap-2">
              {size.lengths.map((length) => (
                <li key={length} className="flex items-baseline gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <span className="flyer-title text-2xl text-foreground">
                    {length} × {size.depth} × {size.thickness} мм
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Длина {size.lengths.join(' или ')} мм, ширина {size.depth} мм, толщина {size.thickness} мм.
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
